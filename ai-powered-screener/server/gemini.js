import { spawn } from 'child_process';
import { platform } from 'os';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Executes a prompt using the Gemini CLI and returns the text output.
 * Uses spawn() instead of exec() to avoid Windows CMD shell-quoting issues.
 * On Windows, npm global installs create a .cmd wrapper, so we use gemini.cmd.
 */
function runGeminiCLI(prompt) {
  return new Promise((resolve, reject) => {
    const isWindows = platform() === 'win32';
    const cmd = isWindows ? 'gemini.cmd' : 'gemini';

    const proc = spawn(cmd, ['--prompt', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (stderr && stderr.includes('Error')) {
        console.error('Gemini CLI Stderr:', stderr);
      }
      if (code !== 0) {
        console.error('Gemini CLI Execution Error (code ' + code + '):', stderr);
        reject(new Error('Failed to communicate with Gemini CLI'));
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on('error', (err) => {
      console.error('Gemini CLI Spawn Error:', err);
      reject(new Error('Failed to communicate with Gemini CLI'));
    });
  });
}

/**
 * Cleans the output from Gemini CLI to extract JSON.
 */
function cleanJSONResponse(text) {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
  return jsonMatch[1].trim();
}

export async function generateRoleProfile(jdTitle, jdDescription) {
  const prompt = `
    You are an expert technical recruiter. Based on the following job description, generate a structured "role profile" — a semantic summary that highlights key success factors, required technologies, and the ideal candidate profile. This profile will be used to evaluate resumes.
    
    Job Title: ${jdTitle}
    Job Description: ${jdDescription}
    
    Return a JSON object with a single field "aiRoleProfile". Return ONLY the JSON object.
  `;

  console.log('Generating Role Profile...');
  const output = await runGeminiCLI(prompt);
  try {
    const cleaned = cleanJSONResponse(output);
    return JSON.parse(cleaned).aiRoleProfile;
  } catch (e) {
    console.error('Failed to parse Gemini output:', output);
    throw new Error('Invalid AI response format');
  }
}

export async function evaluateCandidate(resumeText, jd, roleProfile) {
  const prompt = `
    SYSTEM:
    You are an expert technical recruiter. You evaluate resumes against job descriptions with precision, fairness, and depth. Return only valid JSON.

    USER:
    ## JOB DESCRIPTION
    Title: ${jd.title}
    Role Profile: ${roleProfile}
    Full JD: ${jd.description}

    ## RESUME TEXT
    ${resumeText}

    ## TASK
    Evaluate this candidate against the job description. Return a JSON object with the following fields:
    {
      "totalScore": number (0-100),
      "tier": "top" | "good" | "borderline" | "rejected",
      "requiredSkillScore": number,
      "niceToHaveScore": number,
      "experienceScore": number,
      "educationScore": number,
      "aiBonus": number (-10 to +10, for holistic factors),
      "matchedRequired": string[],
      "missingRequired": string[],
      "matchedNiceToHave": string[],
      "extraSkills": string[],
      "highPoints": string[],
      "lowPoints": string[],
      "placementRationale": string,
      "interviewQuestions": string[],
      "detectedYears": number | null,
      "detectedEducation": string
    }
    
    Return ONLY the JSON object.
  `;

  console.log(`Evaluating Candidate: ${jd.title}`);
  const output = await runGeminiCLI(prompt);
  try {
    const cleaned = cleanJSONResponse(output);
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse evaluation output:', output);
    throw new Error('AI Evaluation failed to return valid JSON');
  }
}

export async function chatWithAgent(history, userMessage, context) {
  let conversationString = "";
  history.filter(h => h.parts[0].text.indexOf('System Context') !== 0).forEach(turn => {
    const role = turn.role === 'user' ? 'User' : 'Assistant';
    conversationString += `${role}: ${turn.parts[0].text}\n`;
  });

  const prompt = `
    SYSTEM: You are a direct and professional technical recruiting assistant. 
    Your goal is to answer questions about a batch of candidates based ONLY on the provided context.
    
    CRITICAL RULES:
    1. Do NOT explain your thought process. 
    2. Do NOT say "I will search" or "I will read".
    3. Give a STRAIGHTFORWARD answer immediately.
    4. Be concise.
    5. If the answer is not in the context, say you don't have that specific information.

    ## CONTEXT (CANDIDATE DATA)
    ${JSON.stringify(context)}
    
    ## CONVERSATION HISTORY
    ${conversationString}
    
    User Question: ${userMessage}
    
    Assistant Answer:
  `;

  console.log('Chat Agent Thinking...');
  const response = await runGeminiCLI(prompt);
  return response;
}
