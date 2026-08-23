import mammoth from 'mammoth';
import type { JobDescription, CandidateScore, Tier } from './types';

// Lazy PDF.js initialization — do NOT run at module top level (crashes Vite 8 Rolldown)
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
  return pdfjsLib;
}

// ─── Text Extraction ────────────────────────────────────────────────────────

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return extractFromPDF(file);
  if (name.endsWith('.docx')) return extractFromDOCX(file);
  if (name.endsWith('.txt')) return extractFromTXT(file);
  throw new Error(`Unsupported file type: ${file.name}`);
}

async function extractFromPDF(file: File): Promise<string> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
      pages.push(content.items.map((item) => ('str' in item ? (item as { str: string }).str : '')).join(' '));
  }
  return pages.join('\n');
}

async function extractFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractFromTXT(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string ?? '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// ─── Keyword Matching ────────────────────────────────────────────────────────

const SYNONYM_MAP: Record<string, string[]> = {
  javascript: ['js', 'ecmascript', 'es6', 'es2015'],
  typescript: ['ts'],
  python: ['py'],
  kubernetes: ['k8s'],
  postgresql: ['postgres', 'pg'],
  mongodb: ['mongo'],
  'machine learning': ['ml'],
  'artificial intelligence': ['ai'],
  'amazon web services': ['aws'],
  'google cloud': ['gcp'],
  'microsoft azure': ['azure'],
  react: ['reactjs', 'react.js'],
  angular: ['angularjs', 'angular.js'],
  vue: ['vuejs', 'vue.js'],
  nodejs: ['node.js', 'node js'],
  'rest api': ['restful', 'rest'],
  graphql: ['gql'],
  docker: ['containerization', 'containers'],
  git: ['github', 'gitlab', 'bitbucket', 'version control'],
  sql: ['mysql', 'sqlite', 'mssql'],
  css: ['scss', 'sass', 'less'],
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s+]/g, ' ').replace(/\s+/g, ' ').trim();
}

function stemMatch(keyword: string, text: string): boolean {
  const root = keyword.length > 4 ? keyword.slice(0, Math.floor(keyword.length * 0.8)) : keyword;
  return text.includes(root);
}

function matchKeyword(keyword: string, text: string): number {
  const kw = normalize(keyword);
  const normalText = normalize(text);

  // Exact match
  if (normalText.includes(kw)) return 1.0;

  // Synonym match
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    const allForms = [canonical, ...synonyms];
    if (allForms.includes(kw)) {
      // check if any form of the synonym exists in text
      if (allForms.some((s) => normalText.includes(s))) return 0.8;
    }
  }

  // Stem match
  if (stemMatch(kw, normalText)) return 0.7;

  return 0;
}

// ─── Experience Extraction ───────────────────────────────────────────────────

function extractExperienceYears(text: string): number | null {
  const patterns = [
    /(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/gi,
    /experience\s*(?:of\s*)?(\d+)\+?\s*(?:years?|yrs?)/gi,
    /(\d+)\+?\s*(?:years?|yrs?)\s+(?:work|industry|professional|total)/gi,
    /20(\d{2})\s*[-–—]\s*20(\d{2})/g,  // year ranges
    /20(\d{2})\s*[-–—]\s*(?:present|current|now|date)/gi,
  ];

  let maxYears = 0;
  let found = false;

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[2] !== undefined && pattern.source.includes('20')) {
        // Year range
        const years = parseInt(match[2]) - parseInt(match[1]);
        if (years > 0 && years < 50) {
          maxYears = Math.max(maxYears, years);
          found = true;
        }
      } else if (match[2] === undefined && pattern.source.includes('present')) {
        // Current job since year
        const startYear = 2000 + parseInt(match[1]);
        const currentYear = new Date().getFullYear();
        const years = currentYear - startYear;
        if (years > 0 && years < 50) {
          maxYears = Math.max(maxYears, years);
          found = true;
        }
      } else if (match[1]) {
        const years = parseInt(match[1]);
        if (years > 0 && years < 50) {
          maxYears = Math.max(maxYears, years);
          found = true;
        }
      }
    }
  }

  return found ? maxYears : null;
}

function scoreExperience(
  extractedYears: number | null,
  minYears: number,
  maxYears: number
): number {
  if (extractedYears === null) return 0.3; // partial credit for detection failure
  if (extractedYears >= minYears && extractedYears <= maxYears) return 1.0;
  if (extractedYears > maxYears) return 0.85; // overqualified
  // Linear interpolation below min
  const ratio = extractedYears / Math.max(minYears, 1);
  return Math.max(0, Math.min(ratio, 1)) * 0.7;
}

// ─── Education Extraction ────────────────────────────────────────────────────

function extractEducation(text: string): { level: string; score: (req: string) => number } {
  const lower = text.toLowerCase();

  if (lower.includes('phd') || lower.includes('doctorate') || lower.includes('ph.d')) {
    return { level: 'PhD / Doctorate', score: (req) => req === 'any' ? 1 : 1 };
  }
  if (lower.includes('master') || lower.includes('m.tech') || lower.includes('m.s.') || lower.includes(' msc') || lower.includes('mba')) {
    return {
      level: "Master's Degree",
      score: (req) => (req === 'any' || req === 'bachelor' || req === 'master') ? 1 : 0.5,
    };
  }
  if (lower.includes('bachelor') || lower.includes('b.tech') || lower.includes('b.e.') || lower.includes('b.sc') || lower.includes('b.s.') || lower.includes('undergraduate')) {
    return {
      level: "Bachelor's Degree",
      score: (req) => {
        if (req === 'any' || req === 'bachelor') return 1;
        if (req === 'master' || req === 'phd') return 0.5;
        return 0;
      },
    };
  }
  if (lower.includes('associate') || lower.includes('diploma')) {
    return {
      level: 'Associate / Diploma',
      score: (req) => (req === 'any' ? 0.8 : 0.2),
    };
  }

  return { level: 'Not detected', score: () => 0 };
}

// ─── Extra Skills Detection ──────────────────────────────────────────────────

const TECH_VOCABULARY = [
  'python', 'java', 'javascript', 'typescript', 'go', 'rust', 'c++', 'c#', 'kotlin', 'swift',
  'react', 'angular', 'vue', 'svelte', 'nextjs', 'nuxtjs', 'gatsby',
  'nodejs', 'express', 'fastapi', 'django', 'flask', 'spring', 'rails',
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'ansible',
  'git', 'jenkins', 'github actions', 'circleci', 'travis ci',
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn',
  'graphql', 'rest api', 'grpc', 'websocket', 'kafka', 'rabbitmq',
  'linux', 'bash', 'powershell', 'nginx', 'apache',
  'figma', 'sketch', 'photoshop', 'illustrator',
  'agile', 'scrum', 'kanban', 'jira', 'confluence',
];

function detectExtraSkills(text: string, knownSkills: string[]): string[] {
  const lower = normalize(text);
  const known = new Set(knownSkills.map(normalize));
  const extras: string[] = [];

  for (const skill of TECH_VOCABULARY) {
    const normalSkill = normalize(skill);
    if (!known.has(normalSkill) && lower.includes(normalSkill)) {
      extras.push(skill);
    }
  }

  return extras;
}

// ─── Main Scoring Function ───────────────────────────────────────────────────

export function scoreCandidate(jd: JobDescription, rawText: string): CandidateScore {
  const { weights, requiredSkills, niceToHaveSkills, minExperience, maxExperience, requiredEducation } = jd;

  // Required skills
  const matchedRequired: string[] = [];
  const missingRequired: string[] = [];
  let reqTotal = 0;
  for (const skill of requiredSkills) {
    const score = matchKeyword(skill, rawText);
    reqTotal += score;
    if (score > 0) matchedRequired.push(skill);
    else missingRequired.push(skill);
  }
  const requiredSkillScore = requiredSkills.length > 0
    ? (reqTotal / requiredSkills.length) * 100
    : 100;

  // Nice-to-have skills
  const matchedNiceToHave: string[] = [];
  const missingNiceToHave: string[] = [];
  let niceTotal = 0;
  for (const skill of niceToHaveSkills) {
    const score = matchKeyword(skill, rawText);
    niceTotal += score;
    if (score > 0) matchedNiceToHave.push(skill);
    else missingNiceToHave.push(skill);
  }
  const niceToHaveScore = niceToHaveSkills.length > 0
    ? (niceTotal / niceToHaveSkills.length) * 100
    : 0;

  // Experience
  const extractedYears = extractExperienceYears(rawText);
  const experienceScore = scoreExperience(extractedYears, minExperience, maxExperience) * 100;

  // Education
  const { level: detectedEducation, score: eduScoreFn } = extractEducation(rawText);
  const educationScore = eduScoreFn(requiredEducation) * 100;

  // Extra skills
  const allKnown = [...requiredSkills, ...niceToHaveSkills];
  const extraSkills = detectExtraSkills(rawText, allKnown);

  // Weighted final score
  const w = weights;
  const totalWeight = w.required + w.niceToHave + w.experience + w.education;
  const totalScore = totalWeight > 0
    ? (
        (requiredSkillScore * w.required) +
        (niceToHaveScore * w.niceToHave) +
        (experienceScore * w.experience) +
        (educationScore * w.education)
      ) / totalWeight
    : 0;

  const tier: Tier =
    totalScore >= 80 ? 'top'
    : totalScore >= 60 ? 'good'
    : totalScore >= 40 ? 'borderline'
    : 'rejected';

  return {
    jdId: jd.id,
    totalScore: Math.round(totalScore * 10) / 10,
    requiredSkillScore: Math.round(requiredSkillScore * 10) / 10,
    niceToHaveScore: Math.round(niceToHaveScore * 10) / 10,
    experienceScore: Math.round(experienceScore * 10) / 10,
    educationScore: Math.round(educationScore * 10) / 10,
    matchedRequired,
    missingRequired,
    matchedNiceToHave,
    missingNiceToHave,
    extraSkills,
    extractedYears,
    detectedEducation,
    tier,
  };
}
