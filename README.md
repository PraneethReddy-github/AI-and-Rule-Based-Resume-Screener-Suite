# AI & Rule-Based Resume Screener Suite

A comprehensive dual-architecture platform for automated resume screening, ranking, and contextual candidate evaluation. This suite contains two distinct implementations designed to balance absolute local privacy with advanced cognitive AI reasoning:

1. **Rule-Based Screener (Browser-Only)**: A fully private, deterministic keyword-matching application running entirely in the client-side browser sandbox.
2. **AI-Powered Screener (Node + SQLite + Gemini)**: A contextual evaluation pipeline powered by Google Gemini, complete with an interactive conversational recruiting agent.



## 1. Rule-Based Screener (Client-Only)

Designed for organizations requiring absolute privacy. No resume text, metadata, or job description details ever leave the user's local machine.

### Key Features
* **100% Client-Side Processing**: Document text extraction and scoring run completely in the browser sandbox.
* **Local Persistence**: Candidate databases, job descriptions, and scores are persisted in IndexedDB via `idb`.
* **Zero Backend Costs**: Runs entirely on local resources with zero external API dependencies.

### Heuristics & Scoring Engine Logic
The scoring algorithm is fully deterministic and auditable:
1. **Keyword Matching**:
   * **Exact Match**: Full points.
   * **Stemming**: Soft matches using root words (e.g., "manage" matches "manager") receive a `70%` weight.
   * **Synonyms**: Configured synonyms mapping (e.g., "JS" maps to "JavaScript") receives an `80%` weight.
2. **Experience Extraction**:
   * Scans text with regular expressions (e.g., `(\d+)\+?\s*(?:years?|yrs?)\b`) to extract claimed years of experience.
   * Normalizes values and validates them against the target job description's min/max bounds.
3. **Education Tiering**:
   * Evaluates degrees according to a hierarchy: `PhD > Master's > Bachelor's > Associate's`.
   * Matches candidate's highest degree against the minimum required education.

### User Interface & Page Layouts

* **Job Descriptions Page (`/jobs`)**: Create and manage job descriptions. Each JD contains required/nice-to-have skills, experience ranges, and custom weight sliders (Required skills, Experience, Education, Nice-to-haves).
* **Upload Page (`/upload`)**: Drag-and-drop file uploader supporting PDF and DOCX. Real-time file processing status updates via a client-side progress bar.
* **Results Dashboard (`/results/:jdId`)**: Shows ranked candidates grouped into four distinct collapsible tiers:
  * **Top Candidates (⭐)**: Score $\ge$ 80%
  * **Good Candidates (👍)**: Score 60% – 79%
  * **Borderline (🔍)**: Score 40% – 59%
  * **Not a Fit (✗)**: Score $<$ 40%
* **Resume Detail View (`/resume/:id`)**: Displays individual scores, breakdown charts, and matched/missing keyword logs.

```
┌──────────────────────────────────────────────────────────┐
│ ← Back to Results                                        │
│                                                          │
│  Priya Sharma                              Score: 91%    │
│  priya.sharma@email.com  •  linkedin.com/in/priya        │
│ ├────────────────────────────────────────────────────────┤
│ │                                                        │
│ │  ┌─────────────────────┐  ┌──────────────────────────┐ │
│ │  │  SCORE BREAKDOWN    │  │  SKILL MATCH             │ │
│ │  │                     │  │                          │ │
│ │  │  Required skills    │  │  ✓ React                 │ │
│ │  │  ████████████ 95%   │  │  ✓ TypeScript            │ │
│ │  │                     │  │  ✓ REST API              │ │
│ │  │  Experience         │  │  ✓ Git                   │ │
│ │  │  █████████░░  80%   │  │  ✗ GraphQL (required)    │ │
│ │  │                     │  │                          │ │
│ │  │  Education          │  │  Nice-to-haves:          │ │
│ │  │  ████████████ 100%  │  │  ✚ Next.js               │ │
│ │  │                     │  │  ✚ Figma                 │ │
│ │  │  Nice-to-have       │  │  - Redux (not mentioned) │ │
│ │  │  ██████████░░  82%  │  │                          │ │
│ │  └─────────────────────┘  └──────────────────────────┘ │
│ └────────────────────────────────────────────────────────┘
```

---

## 2. AI-Powered Screener (Client-Server)

Goes beyond keyword presence by leveraging LLMs to evaluate transferable skills, career growth trajectories, communication quality, and nuanced role alignment.

### Key Features
* **Google Gemini Pro Integration**: Deep semantic reasoning regarding applicant capability.
* **Explainable AI Outputs**: Every evaluation contains a natural language placement rationale, identified strengths (High Points), and gaps (Low Points).
* **Interactive Conversational Recruiter**: A context-aware chat agent allowing recruiters to query the candidate database in natural language.

### AI Scoring prompt Architecture
For each parsed resume, the backend builds a detailed evaluation prompt:
```
SYSTEM:
You are an expert technical recruiter. Evaluate the candidate resume against the job description.
Return only valid JSON.

USER:
## JOB DESCRIPTION
Title: Senior Frontend Developer
Required Skills: React, TypeScript, REST API, Git
Nice-to-Have: Next.js, GraphQL, Figma
Experience: 3–7 years
Education: Bachelor's minimum
Role Profile: [AI-generated role profile summary]

## RESUME TEXT
[full extracted resume text]

## TASK
Evaluate the candidate and return the response in this exact JSON structure:
{
  "totalScore": number (0–100),
  "tier": "top" | "good" | "borderline" | "rejected",
  "requiredSkillScore": number,
  "niceToHaveScore": number,
  "experienceScore": number,
  "educationScore": number,
  "aiBonus": number (-10 to +10),
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
```

### AI Bonus Dimension (Holistic Scoring)
The `aiBonus` field captures elements standard search indices miss:
* **Career Trajectory**: Consistent promotion, increasing scope, and stable transitions.
* **Writing Quality**: Concise, action-oriented descriptions and clear structure.
* **Transferable Skills**: Demonstrable mastery of adjacent architectures or paradigms.
* **Impact Metrics**: Quantifiable results (e.g., "reduced latency by 45%").

### Conversational Recruiter Agent
A persistent chat drawer slides in from the right on any page. Initialized with details of the current job description and all associated candidate scores:
* **Scope**: It knows all candidate experience levels, gaps, and rationales.
* **Prompts**: Suggests contextual chips such as *"Compare our top 2 frontrunners"* or *"Any hidden gems in the borderline tier?"*
* **Memory Management**: Keeps a rolling history window to preserve conversation turns while respecting context limits.

```
┌──────────────────────────────────────────┐
│  🤖 Screening Agent            [✕ Close] │
│  Senior Frontend Developer — Batch #3   │
│ ├────────────────────────────────────────┤
│ │                                        │
│ │  ● You                                 │
│ │  Why is John in the "Good" tier and not│
│ │  in Top Candidates?                    │
│ │                                        │
│ │  🤖 Agent                              │
│ │  John scored 81% overall. While strong,│
│ │  he lacks direct Next.js experience    │
│ │  and his 3 years of experience is at   │
│ │  the lower bound of your 3-7 yr range. │
│ │                                        │
│ ├────────────────────────────────────────┤
│ │ Suggested questions:                   │
│ │ [Why is she #1?] [Compare top 2]       │
│ ├────────────────────────────────────────┤
│ │ [Ask anything about these candidates...]│
│ └────────────────────────────────────────┘
```

### Database Schema (SQLite)
The backend uses SQLite to store all JDs, parsed candidates, evaluations, and conversation histories:
```sql
CREATE TABLE job_descriptions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    ai_role_profile TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    resume_text TEXT NOT NULL,
    jd_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(jd_id) REFERENCES job_descriptions(id)
);

CREATE TABLE scores (
    candidate_id TEXT PRIMARY KEY,
    total_score INTEGER,
    tier TEXT,
    required_skill_score INTEGER,
    nice_to_have_score INTEGER,
    experience_score INTEGER,
    education_score INTEGER,
    ai_bonus INTEGER,
    matched_required TEXT,
    missing_required TEXT,
    matched_nice_to_have TEXT,
    extra_skills TEXT,
    high_points TEXT,
    low_points TEXT,
    placement_rationale TEXT,
    interview_questions TEXT,
    detected_years INTEGER,
    detected_education TEXT,
    gemini_raw_response TEXT,
    FOREIGN KEY(candidate_id) REFERENCES candidates(id)
);

CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY,
    jd_id TEXT,
    history TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(jd_id) REFERENCES job_descriptions(id)
);
```

---

## Setup & Running Instructions

### Prerequisites
* **Node.js**: v20 or higher.
* **npm**: Enabled locally.

### 1. Rule-Based Screener (Client-Only)
```bash
cd rule-based-screener
npm install
npm run dev
```
Navigate to [http://localhost:5173](http://localhost:5173).

### 2. AI-Powered Screener (Client-Server)

#### A. Configure the Environment
1. Navigate to the server folder:
   ```bash
   cd ai-powered-screener/server
   ```
2. Copy the template configuration:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=3001
   ```

#### B. Start the Backend Server
```bash
npm install
node index.js
```
The server will boot, initialize the SQLite file (`database.sqlite`), and listen on port `3001`.

#### C. Start the Client UI
1. Open a new terminal.
2. Navigate to the client directory:
   ```bash
   cd ai-powered-screener/client
   ```
3. Boot the Vite server:
   ```bash
   npm install
   npm run dev
   ```
Open the URL shown in your shell (typically [http://localhost:5173](http://localhost:5173)).

---

## API Endpoints Reference (AI Server)

| HTTP Method | Endpoint | Description |
|---|---|---|
| **GET** | `/api/jd` | Returns list of all job descriptions. |
| **POST** | `/api/jd` | Creates a new JD and generates an AI Role Profile. |
| **POST** | `/api/upload` | Processes multi-file resume uploads and evaluates them with Gemini. |
| **GET** | `/api/results/:jdId` | Retrieves all evaluated candidates and scores for a specific JD. |
| **GET** | `/api/candidate/:id` | Retrieves full candidate information, scores, strengths, and questions. |
| **POST** | `/api/chat` | Sends a message to the batch recruiter agent and returns the response. |
| **GET** | `/api/chat/:sessionId` | Retrieves chat conversation logs for a specific session. |

---

## Design Decision: Gemini CLI vs. Direct API/SDK

A unique aspect of the AI-powered edition is its reliance on the `@google/gemini-cli` command-line interface (spawned as a subprocess) rather than direct HTTP REST calls or the official Google Generative AI Node.js SDK. This design choice was made based on several key operational advantages:

1. **Simplified Secret & Auth Configuration**:
   * The Gemini CLI handles credential configuration globally (via `gemini config set api-key $GEMINI_API_KEY`). The Express application does not need to manage API clients, handle secure key instantiation, or keep SDK client configurations in server memory.
2. **Built-in Workspace Context & Tooling**:
   * The CLI tool possesses built-in capabilities to parse local directories, load context windows, and manage system prompts. Utilizing it avoids the need to build custom context loaders or text chunking wrappers within the Node.js application.
3. **Local Testing Alignment**:
   * Development, prompt debugging, and execution run on identical engines. Developers can run and tweak identical prompts in their native shell (e.g., `gemini --prompt "..."`) to immediately see the expected JSON structure prior to testing the full Node-React cycle.
4. **Resiliency & Auto-retries**:
   * The CLI wrapper natively handles backoffs, rate-limit boundaries, and execution timeouts, providing a robust execution buffer between the backend server and Google's API endpoints.
5. **Free-Tier API Key Integration**:
   * The CLI runs calls directly against Google AI Studio's developer APIs. By supplying a standard AI Studio key, the platform utilizes Google's generous **Free Tier** (e.g., free access within RPM/TPM limits) without requiring paid enterprise billing plans or credit cards.
