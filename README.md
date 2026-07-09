# Resume LLM Review UI

A ready-to-use frontend prototype for an HR resume builder/reviewer. It supports resume uploads, ATS score preview, LLM-style review panels, region-specific prompting on resume content, bottom Q&A chat, and resume ranking by hiring parameters.

## What is included

- Tailwind CSS frontend using the CDN build for quick handoff and easy backend stitching.
- Google sign-in auth structure for HR users.
- Company-scoped auth context so backend/API calls include the signed-in company ID.
- Firestore security rules example that blocks cross-company database access.
- Landing upload page with supported formats: PDF, DOC, DOCX, TXT, RTF, ODT.
- Review workspace after upload with base ATS score.
- Resume preview with clickable text regions.
- Region selector inspired by circle-to-search: click a resume block and ask about only that section.
- Bottom prompt area for Q&A with the LLM backend.
- Resume ranking mode with weighted score parameters.
- Backend adapter file at `src/api.js` where your friend can connect real endpoints.

## Run locally

Open `index.html` directly in a browser.

Or run a local static server:

```bash
npm run dev
```

Then open `http://localhost:4173`.

## Push to GitHub

```bash
git init
git add .
git commit -m "Add resume LLM review frontend"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Backend stitching points

Edit `src/api.js` and replace the mock functions:

- `analyzeResume(files)`
- `askResumeQuestion({ question, selectedRegion, activeResume })`
- `rankResumes(resumes, rankingMode)`

Suggested backend endpoints:

- `POST /api/resumes/analyze`
- `POST /api/resumes/ask`
- `POST /api/resumes/rank`

The UI already passes selected resume region details, active resume data, ranking mode, and uploaded files.

## Company auth setup

The app includes `src/auth.js` for Google sign-in. In local mode it creates a demo HR session. For production:

1. Copy `src/firebase-config.example.js` to `src/firebase-config.js`.
2. Fill it with your Firebase web app config.
3. Load it before `src/app.js` in `index.html`.
4. Set a verified custom claim on each HR user:

```json
{
  "companyId": "company-slug",
  "companyName": "Company Name"
}
```

Do not trust a company ID selected in the browser. The backend or Firebase Admin SDK must set the claim after verifying the HR user's company membership.

The included `firestore.rules` expects company data to live under:

```text
companies/{companyId}/resumes/{resumeId}
companies/{companyId}/resumeAnalyses/{analysisId}
companies/{companyId}/shortlists/{shortlistId}
```

Only users whose token has the matching `companyId` claim can read or write that company's documents.
