# Resume Screener — Rule-Based Edition
### Product Design Document (No AI Agent)

---

## 1. Overview

A web application that lets a recruiter or hiring manager upload one or more job descriptions and then batch-upload resumes daily. The system runs a deterministic, keyword-and-heuristic scoring engine against each resume for each active job description, ranks candidates into tiers, and presents the results in a structured, readable dashboard. No AI or language model is involved; all decisions are explainable and reproducible.

**Primary users:** Recruiters, hiring managers, solo founders doing their own hiring.  
**Core value:** Fast, consistent, transparent resume triage — no black box.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React (Vite) + TypeScript | Component reuse, strong ecosystem |
| Styling | Tailwind CSS | Fast, utility-first, dark mode ready |
| State management | Zustand | Lightweight, minimal boilerplate |
| PDF/DOCX parsing | pdf.js (browser) + mammoth.js | Client-side, no upload needed |
| Scoring engine | Pure TypeScript | Fully deterministic, easy to audit |
| Persistence | IndexedDB via idb | Survives browser refresh; no backend needed |
| File handling | File API + FileReader | Resume and JD uploads |

> All processing happens in the browser. No server, no API calls, fully private.

---

## 3. Application Structure

```
/
├── Layout
│   ├── Sidebar (navigation + active JD switcher)
│   └── Main content area
│
├── Pages
│   ├── /jobs          — Job Descriptions manager
│   ├── /upload        — Daily resume upload
│   ├── /results/:jdId — Ranked results for a JD
│   └── /resume/:id    — Individual resume detail
```

---

## 4. Page-by-Page Design

### 4.1 Job Descriptions Page (`/jobs`)

**Purpose:** Create, view, and manage job descriptions. Each JD becomes a lens through which resumes are scored.

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Job Descriptions                        [+ Add New JD] │
├────────────────────────────────────────────────────────-┤
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │ 🗂 Senior Frontend Dev│  │ 🗂 Data Engineer      │    │
│  │ Created: 12 Apr 2025  │  │ Created: 18 Apr 2025 │    │
│  │ 23 resumes screened  │  │ 11 resumes screened  │    │
│  │ [View Results] [Edit]│  │ [View Results] [Edit]│    │
│  └──────────────────────┘  └──────────────────────┘    │
│                                                         │
│  [+ Add New JD — large dashed card]                    │
└─────────────────────────────────────────────────────────┘
```

**Add / Edit JD — Slide-over panel (right side):**

```
┌──────────────────────────────────────────┐
│ New Job Description                  [✕] │
├──────────────────────────────────────────┤
│ Job Title *                              │
│ [Senior Frontend Developer           ]   │
│                                          │
│ Department                               │
│ [Engineering                         ]   │
│                                          │
│ Required Skills * (comma-separated)      │
│ [React, TypeScript, REST API, Git    ]   │
│                                          │
│ Nice-to-Have Skills                      │
│ [Next.js, GraphQL, Figma             ]   │
│                                          │
│ Required Experience (years)              │
│ [3] to [7]                               │
│                                          │
│ Required Education                       │
│ ○ Any   ● Bachelor's   ○ Master's        │
│                                          │
│ Full Job Description (optional paste)    │
│ ┌──────────────────────────────────────┐ │
│ │ Paste the full JD text here for      │ │
│ │ deeper keyword matching...           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Scoring Weights                          │
│ Required skills   [████████░░] 80%       │
│ Experience        [██████░░░░] 60%       │
│ Education         [████░░░░░░] 40%       │
│ Nice-to-have      [███░░░░░░░] 30%       │
│                                          │
│              [Cancel]  [Save JD]         │
└──────────────────────────────────────────┘
```

**Fields explained:**
- Required Skills — mandatory keywords; each matched = scored positively
- Nice-to-Have — optional; matched = bonus points
- Scoring Weights — sliders let the recruiter tune how much each dimension counts toward final score; weights are stored per-JD
- Full JD text — used to extract additional secondary keywords via frequency analysis (top N non-stopwords)

---

### 4.2 Upload Page (`/upload`)

**Purpose:** The daily workflow. Drop all today's resumes, pick the target JD(s), and kick off screening.

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Upload Resumes                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Target Job Description                                 │
│  [Senior Frontend Developer ▾]  (multi-select)         │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │        ⬆  Drag & drop resumes here               │  │
│  │       PDF, DOCX, TXT accepted                    │  │
│  │              or [Browse files]                   │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Queued Files (14)                    [Clear all]       │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 📄 john_doe_resume.pdf          [✕]             │    │
│  │ 📄 priya_sharma_cv.docx         [✕]             │    │
│  │ 📄 alex_kim.pdf                 [✕]             │    │
│  │ ... (scrollable list)                           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│               [▶ Run Screening]                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Processing: 9 / 14 ████████░░░░░░ 64%           │    │
│  │ Currently: priya_sharma_cv.docx                 │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Behaviours:**
- Multiple JDs can be selected; each resume is scored against each selected JD separately
- Progress bar updates in real time as parsing + scoring runs per file
- Errors (corrupted file, unreadable PDF) shown inline next to that file entry
- After completion, auto-navigate to Results page for the first selected JD

---

### 4.3 Results Page (`/results/:jdId`)

This is the core of the product. Everything feeds into this view.

**Layout — top bar:**

```
┌─────────────────────────────────────────────────────────┐
│  ← Jobs   Results for: Senior Frontend Developer        │
│  24 Apr 2025  •  14 resumes screened                    │
│                                                         │
│  [Search candidates...]   [Sort: Score ▾]  [Export CSV] │
└─────────────────────────────────────────────────────────┘
```

**Tier sections (collapsible accordions with counts in header):**

```
▼ ⭐ Top Candidates  (5)
  ┌──────────────────────────────────────────────────────┐
  │ #1  Priya Sharma                         Score: 91%  │
  │     Skills: React ✓ TypeScript ✓ REST ✓ Git ✓        │
  │     Experience: 5 yrs   Education: B.Tech CS         │
  │     ✚ Next.js ✚ Figma (nice-to-haves matched)        │
  │     [View Details]                                   │
  ├──────────────────────────────────────────────────────┤
  │ #2  John Doe                             Score: 84%  │
  │     Skills: React ✓ TypeScript ✓ REST ✓ Git ✗        │
  │     Experience: 4 yrs   Education: B.E. CS           │
  │     [View Details]                                   │
  └──────────────────────────────────────────────────────┘

▼ 👍 Good Candidates  (5)
  [collapsed — click to expand]

▼ 🔍 Borderline  (2)
  [collapsed]

▼ ✗ Not a Fit  (2)
  [collapsed]
```

**Tier definitions:**
| Tier | Score range | Label |
|---|---|---|
| Top Candidates | ≥ 80% | ⭐ |
| Good Candidates | 60–79% | 👍 |
| Borderline | 40–59% | 🔍 |
| Not a Fit | < 40% | ✗ |

Each card shows a compact summary. Clicking "View Details" expands or navigates to the full resume view.

---

### 4.4 Resume Detail Page (`/resume/:id`)

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│ ← Back to Results                                        │
│                                                          │
│  Priya Sharma                              Score: 91%    │
│  priya.sharma@email.com  •  linkedin.com/in/priya        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │  SCORE BREAKDOWN    │  │  SKILL MATCH             │  │
│  │                     │  │                          │  │
│  │  Required skills    │  │  ✓ React                 │  │
│  │  ████████████ 95%   │  │  ✓ TypeScript            │  │
│  │                     │  │  ✓ REST API              │  │
│  │  Experience         │  │  ✓ Git                   │  │
│  │  █████████░░  80%   │  │  ✗ GraphQL (required)    │  │
│  │                     │  │                          │  │
│  │  Education          │  │  Nice-to-haves:          │  │
│  │  ████████████ 100%  │  │  ✚ Next.js               │  │
│  │                     │  │  ✚ Figma                 │  │
│  │  Nice-to-have       │  │  - Redux (not mentioned) │  │
│  │  ██████████░░  82%  │  │                          │  │
│  └─────────────────────┘  └──────────────────────────┘  │
│                                                          │
│  HIGHLIGHTS (why this candidate ranks high)              │
│  • Matched 4 of 5 required skills                       │
│  • 5 years experience — within required range (3–7 yrs) │
│  • Bachelor's in Computer Science — meets requirement   │
│  • Matched 2 of 3 nice-to-have skills (bonus)          │
│                                                          │
│  GAPS (why this candidate did not score higher)          │
│  • GraphQL not found in resume                          │
│  • No mention of system design or architecture          │
│                                                          │
│  EXTRA EXPERIENCE (beyond JD scope — informational)     │
│  • Mentions: AWS, Docker, Kubernetes                    │
│  • Languages: Python, Go (not required)                 │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│  EXTRACTED RESUME TEXT                 [View raw text]   │
│  (Parsed text shown with matched keywords highlighted)   │
│                                                          │
│  [◀ Previous]                            [Next ▶]       │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Scoring Engine (How It Works)

The scoring engine is a transparent, deterministic function. Every score is fully explainable.

### 5.1 Text Extraction

1. PDF files → pdf.js extracts raw text
2. DOCX files → mammoth.js extracts raw text
3. TXT files → read directly
4. Text is lowercased and normalised (remove special chars, collapse whitespace)

### 5.2 Keyword Matching

For each required skill in the JD:
- Exact match: the skill keyword appears verbatim → full point
- Stem match: keyword root found (e.g. "manage" matches "manager") → 0.7 points
- Synonym match: predefined synonym map (e.g. "js" = "javascript") → 0.8 points
- No match → 0 points

Score component: `(matched_required / total_required) × required_weight`

For nice-to-have skills, same logic, lower weight.

### 5.3 Experience Scoring

Regex patterns extract year mentions near experience-signalling words:
- Patterns: `X years of experience`, `X+ years`, `20XX – 20YY`, `X yrs`
- Maximum extracted value is used as candidate's experience years
- Score: clamped linear interpolation between JD min and JD max

### 5.4 Education Scoring

Keywords scanned: `bachelor`, `b.tech`, `b.e.`, `master`, `m.tech`, `phd`, `doctorate`
- Meets requirement → full points
- One level below → 50% points
- No detectable degree → 0 points

### 5.5 Extra Skills Detection

Any technical keyword in the resume that is NOT in the JD (required or nice-to-have) is surfaced as "Extra Experience." This is informational only — not counted for or against the score. Detected from a curated vocabulary list of common tech skills.

### 5.6 Final Score

```
FinalScore = (reqScore × reqWeight + niceScore × niceWeight 
              + expScore × expWeight + eduScore × eduWeight)
           ÷ (reqWeight + niceWeight + expWeight + eduWeight)
```

All weights are configurable per-JD. Default: required skills 80%, experience 60%, education 40%, nice-to-have 30%.

---

## 6. UI Components Inventory

| Component | Description |
|---|---|
| `JDCard` | Job description card on the /jobs page |
| `JDFormPanel` | Slide-over form for add/edit JD |
| `DropZone` | Drag-and-drop resume upload area |
| `FileQueue` | Scrollable list of queued files with remove action |
| `ProgressBar` | Live batch processing progress |
| `TierAccordion` | Collapsible tier section in results |
| `CandidateCard` | Compact candidate row in tier section |
| `ScoreBar` | Horizontal progress bar for a score dimension |
| `SkillPill` | Green/red/blue pill for matched/missing/bonus skills |
| `ResumeDetail` | Full-page candidate breakdown |
| `HighlightText` | Resume text with matched keywords highlighted |
| `ExportButton` | Downloads results as CSV |

---

## 7. Data Models

### JobDescription

```typescript
interface JobDescription {
  id: string
  title: string
  department?: string
  requiredSkills: string[]
  niceToHaveSkills: string[]
  minExperience: number
  maxExperience: number
  requiredEducation: 'any' | 'bachelor' | 'master' | 'phd'
  fullText?: string
  weights: {
    required: number    // 0–1
    niceToHave: number
    experience: number
    education: number
  }
  createdAt: string
  resumeCount: number
}
```

### Resume / Candidate

```typescript
interface Candidate {
  id: string
  fileName: string
  rawText: string
  parsedAt: string
  scores: Record<string, CandidateScore>  // keyed by JD id
}

interface CandidateScore {
  jdId: string
  totalScore: number          // 0–100
  requiredSkillScore: number
  niceToHaveScore: number
  experienceScore: number
  educationScore: number
  matchedRequired: string[]
  missingRequired: string[]
  matchedNiceToHave: string[]
  extraSkills: string[]
  extractedYears: number | null
  detectedEducation: string
  tier: 'top' | 'good' | 'borderline' | 'rejected'
}
```

---

## 8. UX Details & Edge Cases

- If a resume cannot be parsed, it is placed in a "Parse Error" section at the bottom of Results with the filename and error reason.
- If no JD is selected before clicking Run Screening, the upload button is disabled and a tooltip explains why.
- If zero resumes match ≥ 80%, the "Top Candidates" accordion header shows "0 — consider relaxing requirements" with a soft advisory.
- Each JD stores its own historical screening sessions; switching sessions via a date picker is planned for v2.
- CSV export contains: Rank, Name (from filename), Total Score, Tier, Matched Skills, Missing Skills, Experience (detected), Education (detected).
- The sidebar shows all JDs with a badge indicating how many resumes were screened against each.

---

## 9. Colour & Visual Language

- Background: neutral off-white (#FAFAF9) / dark (#1A1A18)
- Accent: indigo (#4F46E5) for primary actions
- Tier colours: Top = green, Good = blue, Borderline = amber, Rejected = red/muted
- Skill pills: matched = green-100 text-green-800, missing = red-100 text-red-800, bonus = blue-100 text-blue-800, extra = gray-100 text-gray-700
- Score bars: fill colour interpolates green → amber → red based on score level
- Fonts: Inter (sans-serif), monospace for extracted resume text

---

## 10. Future Scope (v2)

- Historical session tracking per JD (compare today's batch vs last week's)
- Custom synonym maps per company
- Exportable PDF report per candidate
- Side-by-side candidate comparison view
- Shareable candidate link (read-only)
