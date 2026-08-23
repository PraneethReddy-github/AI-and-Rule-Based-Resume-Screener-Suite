import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import { parseResume } from './parser.js';
import { generateRoleProfile, evaluateCandidate, chatWithAgent } from './gemini.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// --- JD Routes ---

app.get('/api/jd', (req, res) => {
  console.log('GET /api/jd requested');
  const jds = db.prepare('SELECT * FROM job_descriptions ORDER BY created_at DESC').all();
  console.log(`Returning ${jds.length} JDs`);
  res.json(jds);
});

app.post('/api/jd', async (req, res) => {
  const { title, description } = req.body;
  console.log(`POST /api/jd: ${title}`);
  const id = uuidv4();
  
  try {
    const aiRoleProfile = await generateRoleProfile(title, description);
    const profileString = typeof aiRoleProfile === 'string' ? aiRoleProfile : JSON.stringify(aiRoleProfile);
    
    console.log('Inserting JD with:', { id, title, descriptionLength: description?.length, profileLength: profileString.length });
    
    db.prepare('INSERT INTO job_descriptions (id, title, description, ai_role_profile) VALUES (?, ?, ?, ?)')
      .run(id, title, description, profileString);
    
    const newJd = db.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(id);
    console.log('JD saved successfully:', newJd.id);
    res.json(newJd);
  } catch (error) {
    console.error('Error creating JD:', error);
    res.status(500).json({ error: 'Failed to create Job Description' });
  }
});

// --- Upload & Scoring Routes ---

app.post('/api/upload', upload.array('resumes'), async (req, res) => {
  const { jdId } = req.body;
  const files = req.files;

  if (!jdId || !files || files.length === 0) {
    return res.status(400).json({ error: 'jdId and resumes are required' });
  }

  const jd = db.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(jdId);
  if (!jd) return res.status(404).json({ error: 'JD not found' });

  // Start processing in background (simplified for now, ideally use a queue)
  // We'll process them and return the status, but the client will poll for results
  
  const results = [];
  
  for (const file of files) {
    try {
      const text = await parseResume(file.buffer, file.mimetype);
      const candidateId = uuidv4();
      
      // Save candidate
      db.prepare('INSERT INTO candidates (id, name, resume_text, jd_id) VALUES (?, ?, ?, ?)')
        .run(candidateId, file.originalname, text, jdId);
      
      // Evaluate with Gemini
      const evaluation = await evaluateCandidate(text, jd, jd.ai_role_profile);
      
      // Save scores
      db.prepare(`
        INSERT INTO scores (
          candidate_id, total_score, tier, required_skill_score, nice_to_have_score, 
          experience_score, education_score, ai_bonus, matched_required, 
          missing_required, matched_nice_to_have, extra_skills, high_points, 
          low_points, placement_rationale, interview_questions, detected_years, 
          detected_education, gemini_raw_response
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        candidateId,
        evaluation.totalScore,
        evaluation.tier,
        evaluation.requiredSkillScore,
        evaluation.niceToHaveScore,
        evaluation.experienceScore,
        evaluation.educationScore,
        evaluation.aiBonus,
        JSON.stringify(evaluation.matchedRequired),
        JSON.stringify(evaluation.missingRequired),
        JSON.stringify(evaluation.matchedNiceToHave),
        JSON.stringify(evaluation.extraSkills),
        JSON.stringify(evaluation.highPoints),
        JSON.stringify(evaluation.lowPoints),
        evaluation.placementRationale,
        JSON.stringify(evaluation.interviewQuestions),
        evaluation.detectedYears,
        evaluation.detectedEducation,
        JSON.stringify(evaluation)
      );

      results.push({ candidateId, name: file.originalname, status: 'success' });
    } catch (error) {
      console.error(`Error processing ${file.originalname}:`, error);
      results.push({ name: file.originalname, status: 'error', error: error.message });
    }
  }

  res.json({ results });
});

app.get('/api/results/:jdId', (req, res) => {
  const { jdId } = req.params;
  const results = db.prepare(`
    SELECT 
      c.id, c.name, c.jd_id, c.created_at,
      s.total_score, s.tier, s.detected_years, s.detected_education, s.placement_rationale,
      s.matched_required, s.missing_required, s.matched_nice_to_have, s.extra_skills
    FROM candidates c 
    JOIN scores s ON c.id = s.candidate_id 
    WHERE c.jd_id = ?
    ORDER BY s.total_score DESC
  `).all(jdId);
  
  // Parse JSON strings back to arrays
  const parsedResults = results.map(r => ({
    ...r,
    matched_required: JSON.parse(r.matched_required || '[]'),
    missing_required: JSON.parse(r.missing_required || '[]'),
    matched_nice_to_have: JSON.parse(r.matched_nice_to_have || '[]'),
    extra_skills: JSON.parse(r.extra_skills || '[]')
  }));

  res.json(parsedResults);
});

app.get('/api/candidate/:id', (req, res) => {
  const { id } = req.params;
  const candidate = db.prepare(`
    SELECT c.*, s.* 
    FROM candidates c 
    JOIN scores s ON c.id = s.candidate_id 
    WHERE c.id = ?
  `).get(id);

  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const parsed = {
    ...candidate,
    matched_required: JSON.parse(candidate.matched_required || '[]'),
    missing_required: JSON.parse(candidate.missing_required || '[]'),
    matched_nice_to_have: JSON.parse(candidate.matched_nice_to_have || '[]'),
    extra_skills: JSON.parse(candidate.extra_skills || '[]'),
    high_points: JSON.parse(candidate.high_points || '[]'),
    low_points: JSON.parse(candidate.low_points || '[]'),
    interview_questions: JSON.parse(candidate.interview_questions || '[]')
  };

  res.json(parsed);
});

// --- Chat Routes ---

app.post('/api/chat', async (req, res) => {
  const { sessionId, jdId, message } = req.body;
  
  let session = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(sessionId);
  let history = [];
  let context = {};
  
  // Always fetch context to ensure it's fresh
  const jd = db.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(jdId);
  const candidates = db.prepare(`
    SELECT c.name, s.total_score, s.tier, s.placement_rationale 
    FROM candidates c 
    JOIN scores s ON c.id = s.candidate_id 
    WHERE c.jd_id = ?
  `).all(jdId);
  
  context = {
    job_title: jd?.title,
    summary_of_candidates: candidates.map(c => ({
      name: c.name,
      score: c.total_score,
      tier: c.tier,
      rationale: c.placement_rationale
    }))
  };

  if (session) {
    history = JSON.parse(session.history);
  } else {
    // Initial system prompt for a new session
    history = [
      { role: 'user', parts: [{ text: `System Context: You are a screening agent. Here is the context for the current batch of candidates: ${JSON.stringify(context)}` }] },
      { role: 'model', parts: [{ text: 'Understood. I am ready to answer questions about these candidates and how they fit the role.' }] }
    ];
  }

  try {
    const response = await chatWithAgent(history, message, context);
    
    // Update history
    history.push({ role: 'user', parts: [{ text: message }] });
    history.push({ role: 'model', parts: [{ text: response }] });
    
    const newSessionId = sessionId || uuidv4();
    if (session) {
      db.prepare('UPDATE chat_sessions SET history = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(JSON.stringify(history), newSessionId);
    } else {
      db.prepare('INSERT INTO chat_sessions (id, jd_id, history) VALUES (?, ?, ?)')
        .run(newSessionId, jdId, JSON.stringify(history));
    }
    
    res.json({ sessionId: newSessionId, response, history });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat agent failed' });
  }
});

app.get('/api/chat/:sessionId', (req, res) => {
  const session = db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ ...session, history: JSON.parse(session.history) });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
