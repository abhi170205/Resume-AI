import { analyzeResume, askResumeQuestion, rankResumes } from "./api.js";
import { initializeAuth } from "./auth.js";

const app = document.querySelector("#app");
const authGate = document.querySelector("#authGate");
const googleSignInBtn = document.querySelector("#googleSignInBtn");
const signOutBtn = document.querySelector("#signOutBtn");
const authError = document.querySelector("#authError");
const companyBadge = document.querySelector("#companyBadge");
const uploadPage = document.querySelector("#uploadPage");
const reviewPage = document.querySelector("#reviewPage");
const uploadForm = document.querySelector("#uploadForm");
const resumeInput = document.querySelector("#resumeInput");
const fileList = document.querySelector("#fileList");
const candidateList = document.querySelector("#candidateList");
const rankingMode = document.querySelector("#rankingMode");
const candidateName = document.querySelector("#candidateName");
const atsScore = document.querySelector("#atsScore");
const scoreGrid = document.querySelector("#scoreGrid");
const resumePreview = document.querySelector("#resumePreview");
const llmInsights = document.querySelector("#llmInsights");
const selectedRegionLabel = document.querySelector("#selectedRegionLabel");
const selectedRegionText = document.querySelector("#selectedRegionText");
const promptScope = document.querySelector("#promptScope");
const promptBar = document.querySelector("#promptBar");
const promptInput = document.querySelector("#promptInput");
const backBtn = document.querySelector("#backBtn");
const clearRegionBtn = document.querySelector("#clearRegionBtn");
const dropZone = document.querySelector("#dropZone");

const dropActiveClasses = [
  "border-blue-500",
  "bg-blue-50",
  "shadow-[0_0_0_4px_rgba(37,99,235,0.12)]",
  "-translate-y-0.5"
];

const cardBase =
  "w-full grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border bg-white p-3.5 text-left shadow-soft transition hover:-translate-y-0.5";
const cardActive = "border-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.12)]";
const cardInactive = "border-slate-200";
const resumeSectionBase =
  "w-full rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-600 hover:shadow-soft";
const resumeSectionActive =
  "border-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.15),inset_0_0_0_2px_rgba(37,99,235,0.10)]";
const resumeSectionInactive = "border-slate-200";

let resumes = [];
let activeResume = null;
let selectedRegion = null;
let messages = [];
let authControls = null;

authControls = await initializeAuth({
  onSignedIn: showAppForCompany,
  onSignedOut: showAuthGate,
  onError: showAuthError
});

googleSignInBtn.addEventListener("click", () => {
  authError.classList.add("hidden");
  authControls.signIn();
});

signOutBtn.addEventListener("click", () => {
  authControls.signOut();
});

resumeInput.addEventListener("change", renderFileList);
uploadForm.addEventListener("submit", handleUpload);
rankingMode.addEventListener("change", handleRankingChange);
promptBar.addEventListener("submit", handlePromptSubmit);
backBtn.addEventListener("click", showUploadPage);
clearRegionBtn.addEventListener("click", clearRegion);

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add(...dropActiveClasses);
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove(...dropActiveClasses);
  });
});

dropZone.addEventListener("drop", (event) => {
  resumeInput.files = event.dataTransfer.files;
  renderFileList();
});

function renderFileList() {
  const files = [...resumeInput.files];

  if (!files.length) {
    fileList.innerHTML = "";
    return;
  }

  fileList.innerHTML = files
    .map(
      (file) => `
        <div class="flex justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
          <span class="truncate">${file.name}</span>
          <small class="shrink-0 text-slate-500">${formatFileSize(file.size)}</small>
        </div>
      `
    )
    .join("");
}

async function handleUpload(event) {
  event.preventDefault();
  const files = [...resumeInput.files];
  setLoading(uploadForm, true);
  resumes = await analyzeResume(files);
  setLoading(uploadForm, false);
  activeResume = resumes[0];
  selectedRegion = null;
  messages = [];
  showReviewPage();
  await renderAll();
}

async function handleRankingChange() {
  resumes = await rankResumes(resumes, rankingMode.value);
  activeResume = resumes[0];
  clearRegion();
  renderAll();
}

async function handlePromptSubmit(event) {
  event.preventDefault();
  const question = promptInput.value.trim();

  if (!question || !activeResume) return;

  messages.push({ role: "user", text: question });
  promptInput.value = "";
  promptInput.placeholder = "Thinking with the selected context...";

  const answer = await askResumeQuestion({ question, selectedRegion, activeResume });
  messages.push(answer);

  promptInput.placeholder = "Ask another question about this resume...";
  renderInsights();
}

function showReviewPage() {
  uploadPage.classList.add("hidden");
  reviewPage.classList.remove("hidden");
  reviewPage.classList.add("grid");
}

function showUploadPage() {
  reviewPage.classList.add("hidden");
  reviewPage.classList.remove("grid");
  uploadPage.classList.remove("hidden");
}

function showAppForCompany(context) {
  authGate.classList.add("hidden");
  app.classList.remove("hidden");
  companyBadge.textContent = context.companyName || context.companyId;
  companyBadge.classList.remove("hidden");
}

function showAuthGate() {
  app.classList.add("hidden");
  authGate.classList.remove("hidden");
  companyBadge.classList.add("hidden");
  showUploadPage();
}

function showAuthError(error) {
  authError.textContent = error.message || "Google sign-in failed. Please try again.";
  authError.classList.remove("hidden");
}

function renderAll() {
  renderCandidateList();
  renderActiveResume();
  renderInsights();
  renderPromptScope();
}

function renderCandidateList() {
  candidateList.innerHTML = resumes
    .map(
      (resume, index) => `
        <button class="${cardBase} ${resume.id === activeResume.id ? cardActive : cardInactive}" data-id="${resume.id}" type="button">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 font-extrabold text-blue-700">#${index + 1}</span>
          <span>
            <strong class="block">${resume.name}</strong>
            <small class="block text-slate-500">${resume.title}</small>
          </span>
          <b class="text-slate-950">${resume.scores.overall}</b>
        </button>
      `
    )
    .join("");

  candidateList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      activeResume = resumes.find((resume) => resume.id === button.dataset.id);
      clearRegion();
      renderAll();
    });
  });
}

function renderActiveResume() {
  candidateName.textContent = activeResume.name;
  atsScore.textContent = activeResume.ats;

  const scoreLabels = [
    ["Skills", activeResume.scores.skills],
    ["Experience", activeResume.scores.experience],
    ["Impact", activeResume.scores.impact],
    ["Risk", activeResume.scores.risk]
  ];

  scoreGrid.innerHTML = scoreLabels
    .map(
      ([label, score]) => `
        <div class="rounded-[18px] border border-slate-200 bg-white p-[18px] shadow-lift">
          <span class="font-bold text-slate-500">${label}</span>
          <strong class="my-2 block text-3xl font-black">${score}</strong>
          <div class="h-2 overflow-hidden rounded-full bg-slate-200">
            <i class="block h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500" style="width: ${score}%"></i>
          </div>
        </div>
      `
    )
    .join("");

  resumePreview.innerHTML = activeResume.sections
    .map(
      (section) => `
        <button class="${resumeSectionBase} ${selectedRegion?.title === section.title ? resumeSectionActive : resumeSectionInactive}" data-title="${section.title}" type="button">
          <span class="font-black text-blue-700">${section.title}</span>
          <p class="mt-2 leading-7 text-slate-700">${section.text}</p>
        </button>
      `
    )
    .join("");

  resumePreview.querySelectorAll("button").forEach((sectionButton) => {
    sectionButton.addEventListener("click", () => {
      selectedRegion = activeResume.sections.find(
        (section) => section.title === sectionButton.dataset.title
      );
      renderActiveResume();
      renderPromptScope();
    });
  });
}

function renderInsights() {
  const conversation = messages
    .slice(-4)
    .map(
      (message) => `
        <div class="rounded-2xl border p-4 ${message.role === "user" ? "border-slate-300 bg-slate-50" : "border-blue-200 bg-blue-50"}">
          <span class="mb-1.5 block text-xs font-black uppercase text-slate-500">${message.role === "user" ? "You" : "LLM"}</span>
          <p class="leading-7 text-slate-700">${message.text}</p>
        </div>
      `
    )
    .join("");

  llmInsights.innerHTML = `
    ${activeResume.insights
      .map(
        (insight) => `
          <div class="grid grid-cols-[10px_1fr] gap-2.5 rounded-2xl border border-slate-200 bg-white p-4">
            <span class="mt-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-600 to-teal-500"></span>
            <p class="leading-7 text-slate-700">${insight}</p>
          </div>
        `
      )
      .join("")}
    ${conversation}
  `;

  selectedRegionLabel.textContent = selectedRegion ? selectedRegion.title : "None selected";
  selectedRegionText.textContent = selectedRegion
    ? selectedRegion.text
    : "Click a section in the resume to ask about that exact content.";
}

function renderPromptScope() {
  promptScope.textContent = selectedRegion
    ? `Scope: ${selectedRegion.title}`
    : "Scope: full resume";
}

function clearRegion() {
  selectedRegion = null;
  renderActiveResume();
  renderInsights();
  renderPromptScope();
}

function setLoading(form, isLoading) {
  const button = form.querySelector("button[type='submit']");
  button.disabled = isLoading;
  button.textContent = isLoading ? "Analyzing..." : "Analyze resumes";
}

function formatFileSize(size) {
  if (!size) return "0 KB";
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
