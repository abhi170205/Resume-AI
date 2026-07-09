import { analyzeResume, askResumeQuestion, rankResumes } from "./api.js";

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

let resumes = [];
let activeResume = null;
let selectedRegion = null;
let messages = [];

resumeInput.addEventListener("change", renderFileList);
uploadForm.addEventListener("submit", handleUpload);
rankingMode.addEventListener("change", handleRankingChange);
promptBar.addEventListener("submit", handlePromptSubmit);
backBtn.addEventListener("click", showUploadPage);
clearRegionBtn.addEventListener("click", clearRegion);

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("drag-over");
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
        <div class="file-row">
          <span>${file.name}</span>
          <small>${formatFileSize(file.size)}</small>
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
}

function showUploadPage() {
  reviewPage.classList.add("hidden");
  uploadPage.classList.remove("hidden");
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
        <button class="candidate-card ${resume.id === activeResume.id ? "active" : ""}" data-id="${resume.id}" type="button">
          <span class="rank">#${index + 1}</span>
          <span>
            <strong>${resume.name}</strong>
            <small>${resume.title}</small>
          </span>
          <b>${resume.scores.overall}</b>
        </button>
      `
    )
    .join("");

  document.querySelectorAll(".candidate-card").forEach((button) => {
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
        <div class="score-card">
          <span>${label}</span>
          <strong>${score}</strong>
          <div class="meter"><i style="width: ${score}%"></i></div>
        </div>
      `
    )
    .join("");

  resumePreview.innerHTML = activeResume.sections
    .map(
      (section) => `
        <button class="resume-section ${selectedRegion?.title === section.title ? "selected" : ""}" data-title="${section.title}" type="button">
          <span>${section.title}</span>
          <p>${section.text}</p>
        </button>
      `
    )
    .join("");

  document.querySelectorAll(".resume-section").forEach((sectionButton) => {
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
        <div class="message ${message.role}">
          <span>${message.role === "user" ? "You" : "LLM"}</span>
          <p>${message.text}</p>
        </div>
      `
    )
    .join("");

  llmInsights.innerHTML = `
    ${activeResume.insights
      .map(
        (insight) => `
          <div class="insight-item">
            <span></span>
            <p>${insight}</p>
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
