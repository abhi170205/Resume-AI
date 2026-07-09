import { companyScopedFetch, getCompanyId } from "./auth.js";

export async function analyzeResume(files) {
  await wait(450);
  const companyId = getCompanyId();

  const names = files.length
    ? files.map((file) => file.name.replace(/\.[^/.]+$/, ""))
    : ["Aarav Mehta", "Nisha Rao", "Kabir Sharma"];

  return names.map((name, index) => buildCandidate(name, index));
}

export async function askResumeQuestion({ question, selectedRegion, activeResume }) {
  await wait(250);
  getCompanyId();

  const scope = selectedRegion ? selectedRegion.title : "the full resume";
  return {
    role: "assistant",
    text: `Based on ${scope}, ${activeResume.name} looks strongest where the resume shows measurable ownership. For: "${question}", I would ask the backend LLM to verify evidence, compare it with the role requirements, and flag any unsupported claims.`
  };
}

export async function rankResumes(resumes, rankingMode) {
  await wait(200);
  getCompanyId();

  const scoreKeyByMode = {
    overall: "overall",
    ats: "ats",
    skills: "skills",
    experience: "experience",
    impact: "impact",
    risk: "risk"
  };

  const scoreKey = scoreKeyByMode[rankingMode] || "overall";
  return [...resumes].sort((a, b) => b.scores[scoreKey] - a.scores[scoreKey]);
}

export async function analyzeResumeWithBackend(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("resumes", file));

  const response = await companyScopedFetch("/api/resumes/analyze", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Resume analysis failed.");
  }

  return response.json();
}

function buildCandidate(name, index) {
  const base = [
    {
      name,
      title: "Senior Frontend Engineer",
      ats: 88,
      scores: { overall: 91, ats: 88, skills: 94, experience: 90, impact: 89, risk: 82 },
      insights: [
        "Strong React and TypeScript alignment with the target role.",
        "Good evidence of performance ownership and design system work.",
        "Needs deeper validation on backend collaboration and team leadership scope."
      ]
    },
    {
      name,
      title: "Product Engineer",
      ats: 81,
      scores: { overall: 84, ats: 81, skills: 86, experience: 83, impact: 87, risk: 78 },
      insights: [
        "Balanced product and engineering profile with clear feature ownership.",
        "Impact metrics are credible but should be checked against project scale.",
        "May need ramp-up for advanced frontend architecture responsibilities."
      ]
    },
    {
      name,
      title: "Frontend Developer",
      ats: 74,
      scores: { overall: 78, ats: 74, skills: 80, experience: 76, impact: 72, risk: 84 },
      insights: [
        "Solid implementation profile with a clean technical foundation.",
        "Lower seniority signal compared with the target role.",
        "Good low-risk backup candidate if senior candidates are unavailable."
      ]
    }
  ];

  const candidate = base[index % base.length];

  return {
    id: crypto.randomUUID(),
    ...candidate,
    sections: [
      {
        title: "Summary",
        text: `${candidate.title} with experience building responsive dashboards, reusable component systems, and data-heavy workflows for business teams.`
      },
      {
        title: "Experience",
        text: "Led delivery of a hiring analytics dashboard, reduced review time by 32%, and collaborated with backend teams on API contracts and data validation."
      },
      {
        title: "Skills",
        text: "React, TypeScript, JavaScript, HTML, CSS, accessibility, design systems, REST APIs, testing, performance tuning."
      },
      {
        title: "Projects",
        text: "Built an AI-assisted document review tool with upload parsing, scoring views, prompt workflows, and recruiter decision summaries."
      },
      {
        title: "Education",
        text: "Bachelor's degree in Computer Science with coursework in software engineering, databases, and human-computer interaction."
      }
    ]
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
