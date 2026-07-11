import { companyScopedFetch } from "./auth.js";
import { appConfig } from "./config.js";

export async function analyzeResume(files, { targetRole, priority }) {
  if (!files.length) {
    throw new Error("Upload at least one resume before analysis.");
  }

  const formData = new FormData();
  files.forEach((file) => formData.append("resumes", file));
  formData.append("targetRole", targetRole);
  formData.append("priority", priority);

  const response = await companyScopedFetch(appConfig.endpoints.analyzeResumes, {
    method: "POST",
    body: formData
  });

  const payload = await parseJsonResponse(response, "Resume analysis failed.");
  return normalizeResumeList(payload.resumes || payload);
}
export async function askResumeQuestion({ question, selectedRegion, activeResume }) {
  const response = await companyScopedFetch(appConfig.endpoints.askResume, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeId: activeResume.id,
      question,
      selectedRegion: selectedRegion
        ? {
            title: selectedRegion.title,
            text: selectedRegion.text,
            sectionId: selectedRegion.id || null
          }
        : null
    })
  });

  const payload = await parseJsonResponse(response, "Resume question failed.");

  return {
    role: "assistant",
    text: payload.answer || payload.text || ""
  };
}

export async function rankResumes(resumes, rankingMode) {
  const response = await companyScopedFetch(appConfig.endpoints.rankResumes, {
    method: "POST",
    body: JSON.stringify({
      rankingMode,
      resumeIds: resumes.map((resume) => resume.id)
    })
  });

  const payload = await parseJsonResponse(response, "Resume ranking failed.");
  return normalizeResumeList(payload.resumes || payload);
}

async function parseJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
}

function normalizeResumeList(resumes) {
  if (!Array.isArray(resumes)) {
    throw new Error("Backend response must include an array of resumes.");
  }

  return resumes.map((resume) => ({
    id: resume.id,
    name: resume.name || resume.candidateName || "Unnamed candidate",
    title: resume.title || resume.currentTitle || "Candidate",
    ats: Number(resume.ats ?? resume.scores?.ats ?? 0),
    scores: {
      overall: Number(resume.scores?.overall ?? 0),
      ats: Number(resume.scores?.ats ?? resume.ats ?? 0),
      skills: Number(resume.scores?.skills ?? 0),
      experience: Number(resume.scores?.experience ?? 0),
      impact: Number(resume.scores?.impact ?? 0),
      risk: Number(resume.scores?.risk ?? 0)
    },
    insights: Array.isArray(resume.insights) ? resume.insights : [],
    sections: Array.isArray(resume.sections) ? resume.sections : []
  }));
}

export async function listExistingResumes() {
  const response = await companyScopedFetch(appConfig.endpoints.listResumes, {
    method: "GET"
  });
  return parseJsonResponse(response, "Could not load existing resumes.");
}

export async function reanalyzeResumes(resumeIds, { targetRole, priority }) {
  const response = await companyScopedFetch(appConfig.endpoints.reanalyzeResumes, {
    method: "POST",
    body: JSON.stringify({ resumeIds, targetRole, priority })
  });

  const payload = await parseJsonResponse(response, "Re-analysis failed.");
  return normalizeResumeList(payload.resumes || payload);
}