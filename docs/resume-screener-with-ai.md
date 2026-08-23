# Resume Screener — AI Agent Edition
### Product Design Document (Gemini-Powered)

---

## 1. Overview

A web application that combines the same recruiter workflow (upload JDs, batch-upload daily resumes) with a Gemini-powered AI backend that understands context, infers meaning, evaluates fit holistically, and answers follow-up questions about any candidate in natural language. Unlike the rule-based version, the AI engine can reason about transferable skills, cultural fit signals, career trajectory, writing quality, and nuanced role alignment — not just keyword presence.

An embedded chat agent lets the recruiter ask questions like "Why is Priya ranked #1?", "Would John be better suited for the backend role?", or "Who among the rejected candidates has the most potential?" and receive grounded, cited answers.

**Primary users:** Recruiters and hiring managers who want deeper insight than a keyword match can give.  
**Core value:** Human-level contextual evaluation at machine speed, with an explainable AI agent you can interrogate.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React (Vite) + TypeScript | Same as no-AI version for consistency |
| Styling | Tailwind CSS | Utility-first, dark mode |
| State | Zustand | Lightweight |
| PDF/DOCX parsing | pdf.js + mammoth.js | Client-side text extraction |
| AI Backend | Gemini CLI / Gemini API (gemini-2.5-pro) | Context-aware reasoning, large context window |
| Orchestration | Node.js backend (Express) | Handles Gemini API calls, batching, sessions |
| Agent memory | Server-side session store (Map / Redis) | Keeps conversation context per session |
| Persistence | PostgreSQL (or SQLite for local) | JDs, candidates, scores, chat history |
| File storage | Local filesystem / S3 | Resume originals |

> Unlike the no-AI version, this edition requires a lightweight Node.js server to proxy Gemini API calls and maintain agent conversation state. The frontend remains a React SPA.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER (React SPA)                  │
│  JD Manager  │  Upload  │  Results Dashboard  │  Chat Panel │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                    NODE.JS SERVER (Express)                  │
│                                                             │
│  ┌────────────────┐   ┌──────────────────┐  ┌───────────┐  │
│  │  Resume Parser │   │  Scoring Agent   │  │  Chat     │  │
│  │  (pdf/docx→txt)│   │  (Gemini calls)  │  │  Agent    │  │
│  └────────────────┘   └──────────────────┘  └───────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Database (PostgreSQL / SQLite)          │    │
│  │   job_descriptions | candidates | scores | chats    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    GEMINI API (Google AI)                    │
│            gemini-2.5-pro  •  1M token context              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Application Structure

```
/
├── Layout
│   ├── Sidebar (JD switcher, navigation, chat toggle)
│   └── Main content area + optional right Chat Panel
│
├── Pages
│   ├── /jobs            — JD manager (same as no-AI version)
│   ├── /upload          — Daily resume upload + AI processing
│   ├── /results/:jdId   — AI-ranked results with reasoning
│   ├── /resume/:id      — Full AI analysis + candidate chat
│   └── /compare         — Side-by-side AI comparison (v2)
│
└── Persistent UI
    └── Chat Panel (slides in from right on any page)
```

---

## 5. Page-by-Page Design

### 5.1 Job Descriptions Page (`/jobs`)

Identical in structure to the no-AI version. The key difference: when saving a JD, the server sends the JD text to Gemini to generate a structured "role profile" — a semantic summary used later during scoring.

**Additional field in the Add/Edit panel:**

```
AI Role Profile (auto-generated)               [Regenerate]
┌──────────────────────────────────────────────────────────┐
│ This role requires an experienced frontend engineer with  │
│ strong React and TypeScript skills. Key success factors  │
│ include: component architecture ownership, cross-team    │
│ collaboration, and performance optimisation. A candidate │
│ with data visualisation background would stand out.      │
└──────────────────────────────────────────────────────────┘
```

This AI-generated profile is shown read-only and used as the evaluation rubric sent to Gemini with each resume.

---

### 5.2 Upload Page (`/upload`)

Same drag-and-drop interface as the no-AI version. Differences in the processing stage:

**Processing progress — AI mode:**

```
┌─────────────────────────────────────────────────────────┐
│  🤖  AI Screening in Progress                           │
│                                                         │
│  ████████████░░░░░  9 / 14 resumes analysed            │
│                                                         │
│  Currently analysing: priya_sharma_cv.docx             │
│  Stage: Gemini evaluating fit against JD...            │
│                                                         │
│  ⚡ Estimated time remaining: ~45 seconds              │
└─────────────────────────────────────────────────────────┘
```

**What happens per resume under the hood:**

1. Text extracted from PDF/DOCX on the server
2. Resume text + AI Role Profile + JD structured fields are sent to Gemini as a structured prompt
3. Gemini returns a JSON object: score, tier, highlights, gaps, extras, reasoning, a one-line placement rationale
4. Results saved to database; frontend streams updates via polling or WebSocket

---

### 5.3 Results Page (`/results/:jdId`)

The most significant visual upgrade over the no-AI version. AI reasoning is surfaced at every level.

**Top bar:**

```
┌────────────────────────────────────────────────────────────────┐
│ ← Jobs   Results for: Senior Frontend Developer     🤖 AI Mode │
│ 24 Apr 2025  •  14 resumes screened  •  Batch #3              │
│                                                                │
│ [Search candidates...]  [Sort: AI Rank ▾]  [Export]  [💬 Chat]│
└────────────────────────────────────────────────────────────────┘
```

**Tier sections — AI-enriched cards:**

```
▼ ⭐ Top Candidates  (5)
┌────────────────────────────────────────────────────────────────┐
│ #1  Priya Sharma                                   Score: 94%  │
│                                                                │
│ "Priya demonstrates exceptional depth in React and            │
│  TypeScript, with measurable impact in her current role.       │
│  Her experience migrating a legacy system to React 18 is      │
│  directly transferable. She's the strongest applicant."       │
│                                                                │
│  ✓ React  ✓ TypeScript  ✓ REST  ✓ System design              │
│  ✚ Next.js  ✚ Performance optimisation                        │
│                                                                │
│  [View Full Analysis]              [💬 Ask about Priya]       │
├────────────────────────────────────────────────────────────────┤
│ #2  John Doe                                       Score: 81%  │
│                                                                │
│ "Strong generalist with solid React experience. Lacks         │
│  demonstrated ownership of large-scale components, but        │
│  his open-source contributions show initiative."              │
│                                                                │
│  [View Full Analysis]              [💬 Ask about John]        │
└────────────────────────────────────────────────────────────────┘

▼ 👍 Good Candidates  (5)   [collapsed — click to expand]

▼ 🔍 Borderline  (2)        [collapsed]

▼ ✗ Not a Fit  (2)          [collapsed]
```

**Key differences from no-AI version:**
- Each card shows a 2–3 sentence natural language rationale generated by Gemini — not just skill pills
- "Ask about [candidate]" button pre-seeds the chat panel with context about that person
- Sort options include AI Rank, Score, Experience, and "Potential" (AI-assessed growth trajectory)

---

### 5.4 Resume Detail Page (`/resume/:id`)

Full AI analysis view. Richer than the no-AI version's score breakdown.

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back to Results                              🤖 AI Analysis │
│                                                              │
│  Priya Sharma                                   Score: 94%   │
│  priya.sharma@email.com  •  5 yrs exp  •  B.Tech CS         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  AI EVALUATION SUMMARY                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Priya is the strongest candidate in this batch.      │   │
│  │ She has direct experience with the exact problems    │   │
│  │ this role will solve — React 18 migration, component │   │
│  │ library ownership, and cross-timezone collaboration. │   │
│  │ Her work at FinTech Co maps closely to your stack.   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────────────┐  ┌────────────────────────────┐  │
│  │  SCORE BREAKDOWN      │  │  SKILL MATCH               │  │
│  │  Required  ██████ 95% │  │  ✓ React          (5 yrs)  │  │
│  │  Exp       █████  80% │  │  ✓ TypeScript     (4 yrs)  │  │
│  │  Education ██████100% │  │  ✓ REST API       (3 yrs)  │  │
│  │  Nice-have ████   82% │  │  ✓ Git            (5 yrs)  │  │
│  │  AI Bonus  ████   +8% │  │  ✗ GraphQL        (not found)│ │
│  │                       │  │  ✚ Next.js        (2 yrs)  │  │
│  │  TOTAL     ██████ 94% │  │  ✚ Figma          (mentioned)│ │
│  └───────────────────────┘  └────────────────────────────┘  │
│                                                              │
│  HIGH POINTS (AI-identified strengths)                       │
│  • Led migration of 200k-line codebase to React 18          │
│  • Owns component library used by 4 product teams           │
│  • Contributed to open-source react-query library           │
│  • Strong written communication visible in resume           │
│                                                              │
│  LOW POINTS (AI-identified gaps)                            │
│  • No GraphQL experience — will need ramp-up               │
│  • Limited backend exposure; mostly frontend-only roles     │
│  • No mention of testing practices (Jest, RTL)              │
│                                                              │
│  EXTRA EXPERIENCE (beyond JD scope)                         │
│  • AWS S3, CloudFront — infrastructure awareness            │
│  • Python scripting — occasional tooling work               │
│  • Mentored 2 junior developers — potential tech lead       │
│                                                              │
│  AI PLACEMENT RATIONALE                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ "Placed #1 because she uniquely combines deep React  │   │
│  │  expertise with real-world scale experience. While   │   │
│  │  GraphQL is missing, the rest of her profile so far  │   │
│  │  outpaces others in this batch that it does not      │   │
│  │  offset her ranking."                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  💬 ASK THE AGENT ABOUT PRIYA                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Why is she ranked #1?                                │   │
│  │ Would she be a good fit for the backend role too?    │   │
│  │ What interview questions should I ask her?           │   │
│  └──────────────────────────────────────────────────────┘   │
│  [Ask a question about Priya...                    ] [Send]  │
│                                                              │
│  [◀ Previous Candidate]                  [Next Candidate ▶]  │
└──────────────────────────────────────────────────────────────┘
```

---

### 5.5 Chat Panel (Global — Available on All Pages)

The chat panel slides in from the right on any page. It is context-aware: it knows which JD is active, which batch is being viewed, and which candidate was last opened.

**Chat panel layout:**

```
┌──────────────────────────────────────────┐
│  🤖 Screening Agent            [✕ Close] │
│  Senior Frontend Developer — Batch #3   │
├──────────────────────────────────────────┤
│                                          │
│  ● You                                   │
│  Why is John in the "Good" tier and not  │
│  in Top Candidates?                      │
│                                          │
│  🤖 Agent                               │
│  John scored 81% overall — strong, but  │
│  just below the 85%+ threshold for Top  │
│  placement in this batch. Specifically: │
│                                          │
│  • He matched 4 of 5 required skills    │
│    but has no Git history visible in    │
│    his resume.                          │
│  • His experience (3 yrs) is at the    │
│    lower bound of your 3–7 yr range.   │
│  • Priya, Alex, and two others all      │
│    score higher on both dimensions.    │
│                                          │
│  That said, John's open-source work     │
│  suggests initiative. He could be a    │
│  good pick if your top 5 don't convert.│
│                                          │
│  ● You                                   │
│  Who should I interview first?           │
│                                          │
│  🤖 Agent                               │
│  Based on this batch, I'd suggest:      │
│  1. Priya Sharma — strongest overall    │
│  2. Alex Kim — fast ramp, high ceiling  │
│  3. John Doe — solid backup             │
│                                          │
│  Would you like suggested interview     │
│  questions for any of them?             │
│                                          │
├──────────────────────────────────────────┤
│ Suggested questions:                     │
│ [Why is she #1?] [Compare top 2]        │
│ [Best for backend role?] [Red flags?]   │
├──────────────────────────────────────────┤
│ [Ask anything about these candidates...] │
│                                  [Send]  │
└──────────────────────────────────────────┘
```

**Suggested question chips** appear dynamically based on context:
- On Results page: "Who should I interview first?", "Any hidden gems in borderline?", "Summarise this batch"
- On a candidate detail page: "Why is [name] ranked here?", "What are the interview red flags?", "Would [name] fit the other open role?"
- After a response: follow-up chips generated by the agent itself

**Agent capabilities:**
- Knows the full JD (structured + text)
- Knows every candidate's extracted resume text and AI score breakdown for the current batch
- Maintains conversation context across the session (multi-turn)
- Can compare candidates head-to-head
- Can suggest interview questions tailored to a candidate's profile and the JD
- Can re-rank candidates if you change a weight ("What if experience mattered more?")
- Can identify hidden gems in the borderline/rejected tier
- Responds in 2–4 seconds

---

## 6. AI Scoring Engine

### 6.1 Prompt Architecture

For each resume, the server constructs a structured prompt sent to Gemini:

```
SYSTEM:
You are an expert technical recruiter. You evaluate resumes against job descriptions 
with precision, fairness, and depth. Return only valid JSON.

USER:
## JOB DESCRIPTION
Title: Senior Frontend Developer
Required Skills: React, TypeScript, REST API, Git
Nice-to-Have: Next.js, GraphQL, Figma
Experience: 3–7 years
Education: Bachelor's minimum
Role Profile: [AI-generated semantic summary of the role]
Full JD: [raw JD text if provided]

## RESUME TEXT
[full extracted resume text]

## TASK
Evaluate this candidate against the job description. Return a JSON object with 
the following fields:

{
  "totalScore": number (0–100),
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
  "highPoints": string[],      // 3–5 specific strengths with evidence
  "lowPoints": string[],       // 2–4 specific gaps
  "placementRationale": string, // 2–3 sentence explanation of tier placement
  "interviewQuestions": string[], // 3 suggested questions
  "detectedYears": number | null,
  "detectedEducation": string
}
```

### 6.2 AI Bonus Dimension

The `aiBonus` field is Gemini's holistic signal — it can range from -10 to +10 and captures things keyword matching cannot:

| Factor | Positive signal | Negative signal |
|---|---|---|
| Career trajectory | Consistent growth, increasing responsibility | Frequent unexplained gaps or lateral moves |
| Writing quality | Clear, results-oriented language | Vague, generic bullets |
| Transferable skills | Strong adjacent skills that support the role | None |
| Leadership signals | Mentions mentoring, leading teams | None |
| Impact language | Quantified achievements ("reduced load time by 40%") | No measurable outcomes |

### 6.3 Batching Strategy

Resumes are processed in parallel batches of 5 to stay within Gemini rate limits. A queue manager on the server handles throttling, retries on 429, and result streaming back to the frontend via polling.

---

## 7. Chat Agent Implementation

### 7.1 Session Context

Each chat session is initialised with a system context object sent to Gemini on the first turn:

```json
{
  "jd": { ...full JD object },
  "candidates": [
    {
      "name": "Priya Sharma",
      "score": 94,
      "tier": "top",
      "highPoints": [...],
      "lowPoints": [...],
      "resumeText": "..." 
    },
    ...all other candidates
  ],
  "batchDate": "2025-04-24",
  "totalScreened": 14
}
```

This context is prepended to every subsequent turn, giving Gemini full visibility into the entire batch.

### 7.2 Gemini CLI Integration

The agent uses the Gemini CLI (`@google/gemini-cli`) on the server:

```bash
# Install
npm install -g @google/gemini-cli

# Initialise with API key
gemini config set api-key $GEMINI_API_KEY

# Usage in Node.js server (via child_process or SDK)
```

The Node.js server uses `@google/generative-ai` SDK directly for the scoring pipeline and the chat agent. The Gemini CLI is used for local development and testing of prompts.

### 7.3 Multi-Turn Conversation

The server maintains a `conversationHistory` array per session:

```typescript
interface Turn {
  role: 'user' | 'model'
  parts: [{ text: string }]
}

const conversationHistory: Turn[] = [
  { role: 'user', parts: [{ text: systemContextPrompt }] },
  { role: 'model', parts: [{ text: 'Understood. Ready to answer questions.' }] },
  // ...subsequent turns appended here
]
```

Each new user question appends to this array, and the full history is sent to Gemini with each API call. The server trims history if it exceeds the context budget (keeping the system context + last 10 turns).

---

## 8. UI Components Inventory

All components from the no-AI version, plus:

| Component | Description |
|---|---|
| `AIRationale` | Styled blockquote showing Gemini's placement reason |
| `ChatPanel` | Slide-over right panel with full conversation UI |
| `SuggestedChips` | Dynamic suggested question buttons below chat |
| `AIBadge` | Small "🤖 AI Mode" indicator in page headers |
| `AISummaryCard` | Top-of-page evaluation summary block |
| `InterviewQuestions` | Collapsible list of AI-generated interview questions |
| `AIRoleProfile` | Read-only AI-generated role profile in JD form |
| `ProcessingStage` | Richer progress indicator showing which AI stage is running |
| `HighPoints` | Bulleted list of AI-identified strengths with evidence |
| `LowPoints` | Bulleted list of AI-identified gaps |

---

## 9. Data Models

### Extends no-AI models, with additions:

```typescript
interface CandidateScore {
  // ...all fields from no-AI version, plus:
  aiBonus: number
  highPoints: string[]
  lowPoints: string[]
  placementRationale: string
  interviewQuestions: string[]
  geminiRawResponse: string  // stored for audit/debug
}

interface ChatSession {
  id: string
  jdId: string
  batchDate: string
  history: Turn[]
  createdAt: string
  updatedAt: string
}

interface JobDescription {
  // ...all fields from no-AI version, plus:
  aiRoleProfile: string   // Gemini-generated semantic summary
}
```

---

## 10. API Endpoints (Node.js Server)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/jd` | Create JD + trigger AI role profile generation |
| GET | `/api/jd` | List all JDs |
| PUT | `/api/jd/:id` | Update JD |
| POST | `/api/upload` | Upload resumes + trigger AI scoring batch |
| GET | `/api/results/:jdId` | Get all scored candidates for a JD |
| GET | `/api/candidate/:id` | Get full candidate detail |
| POST | `/api/chat` | Send a message to the chat agent (returns response + updated history) |
| GET | `/api/chat/:sessionId` | Get chat history for a session |
| DELETE | `/api/batch/:id` | Delete a screening batch |

---

## 11. UX Details & Edge Cases

- If Gemini returns an invalid JSON (rare), the server retries once with a stricter prompt, then falls back to the keyword engine for that resume and flags it as "AI unavailable — keyword score used."
- The chat panel gracefully handles "I don't know" answers: if the recruiter asks about a candidate not in the current batch, the agent says so clearly.
- Long resume texts are truncated to 6,000 tokens before sending to Gemini to manage cost. A warning is shown on the candidate card if truncation occurred.
- If the API key is missing or quota is exceeded, the app falls back to the keyword-based engine with a banner: "AI scoring unavailable — running rule-based fallback."
- The recruiter can re-run AI scoring on an individual candidate after updating a JD (rescores that one resume against the new JD).
- Chat history is stored per session per JD — the recruiter can return to an earlier conversation.

---

## 12. Colour & Visual Language

Inherits everything from the no-AI version, with additions:
- AI-generated content blocks: subtle left border in indigo-300, background indigo-50/dark:indigo-950
- Chat panel: white/dark card sliding from right, 400px wide on desktop, full-screen on mobile
- AI badge: small pill — "🤖 AI" in indigo
- Processing stage: uses animated shimmer on the "Gemini evaluating…" line
- Interview question chips: ghost buttons with blue outline
- Suggested chat chips: rounded pill buttons, gray background, appear below AI responses

---

## 13. Privacy & Cost Considerations

- Resume texts are sent to Gemini's API. Users should be informed of this in an onboarding modal ("Your resume data is processed by Google Gemini AI").
- The server never stores resume files after text extraction unless explicitly configured; only extracted text and scores are persisted.
- Estimated API cost per resume: ~0.002 USD (Gemini 2.5 Pro pricing, assuming avg 2,000 token resume). 14 resumes/day ≈ $0.03/day.
- A "cost estimator" widget in Settings shows estimated monthly spend based on daily volume.

---

## 14. Future Scope (v2)

- Candidate comparison: ask AI "Compare Priya and John" and get a structured side-by-side with a recommendation
- Auto-draft outreach emails tailored to each top candidate
- Interview scorecard template generated per candidate
- Batch summary PDF: AI-written report of the day's screening
- Webhook support: new resumes emailed to an inbox auto-trigger screening
- Multi-JD agent: "Who in today's batch is best suited across all three open roles?"
