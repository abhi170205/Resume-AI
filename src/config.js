export const appConfig = {
  apiBaseUrl: window.RESUME_AI_API_BASE_URL || "http://localhost:8000",
  endpoints: {
    login: "/api/auth/login",
    signup: "/api/auth/signup",
    logout: "/api/auth/logout",
    analyzeResumes: "/api/resumes/analyze",
    listResumes: "/api/resumes",
    reanalyzeResumes: "/api/resumes/reanalyze",
    askResume: "/api/resumes/ask",
    rankResumes: "/api/resumes/rank"
  }
};