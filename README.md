# Resume LLM Review UI

Backend-ready Tailwind frontend for a multi-company HR resume review product. It supports company login/signup, private company-scoped sessions, resume upload, ATS scoring, LLM review, region-specific Q&A, and resume ranking.

## What Is Included

- Tailwind CSS frontend using the CDN build for quick handoff.
- Company login and workspace signup screens.
- Company-scoped auth context for all backend calls.
- Real API integration layer in `src/api.js`.
- Central endpoint config in `src/config.js`.
- Firestore security rules example for company-isolated data.
- Upload support for PDF, DOC, DOCX, TXT, RTF, and ODT.
- Resume preview with clickable section selection.
- Bottom prompt bar for LLM Q&A.
- Ranking selector with score parameters.

## Run Locally

```bash
npm run dev
```

Then open `http://localhost:4173`.

To point the frontend at a different backend, define this before `src/app.js` in `index.html` or in a small config script:

```js
window.RESUME_AI_API_BASE_URL = "http://localhost:8000";
```

## Expected Backend Endpoints

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- `POST /api/resumes/analyze`
- `POST /api/resumes/ask`
- `POST /api/resumes/rank`

All protected endpoints receive:

```http
Authorization: Bearer <accessToken>
```

The backend must validate the token and enforce company isolation server-side. Do not trust a company ID chosen in the browser.

## Auth Contracts

`POST /api/auth/login`

```json
{
  "username": "hr@company.com",
  "password": "password"
}
```

`POST /api/auth/signup`

```json
{
  "companyName": "Company Name",
  "username": "hr@company.com",
  "password": "password"
}
```

Both auth endpoints should return:

```json
{
  "accessToken": "backend-issued-jwt-or-session-token",
  "user": {
    "id": "user-id",
    "email": "hr@company.com",
    "name": "HR User"
  },
  "company": {
    "id": "company-id",
    "name": "Company Name"
  }
}
```

For compatibility, the frontend also accepts older flat fields like `idToken`, `companyId`, and `companyName`, but the structured shape above is preferred.

## Resume Contracts

`POST /api/resumes/analyze`

Request: `multipart/form-data`

- `resumes`: one or more files
- `targetRole`: string
- `priority`: `balanced`, `skills`, `leadership`, or `risk`

Response:

```json
{
  "resumes": [
    {
      "id": "resume-id",
      "name": "Candidate Name",
      "title": "Senior Frontend Engineer",
      "ats": 88,
      "scores": {
        "overall": 91,
        "ats": 88,
        "skills": 94,
        "experience": 90,
        "impact": 89,
        "risk": 82
      },
      "insights": ["Shortlist-ready LLM summary"],
      "sections": [
        {
          "id": "section-id",
          "title": "Experience",
          "text": "Parsed resume section text"
        }
      ]
    }
  ]
}
```

`POST /api/resumes/ask`

```json
{
  "resumeId": "resume-id",
  "question": "What is the hiring risk?",
  "selectedRegion": {
    "sectionId": "section-id",
    "title": "Experience",
    "text": "Selected resume text"
  }
}
```

Response:

```json
{
  "answer": "LLM answer scoped to the selected region or full resume."
}
```

`POST /api/resumes/rank`

```json
{
  "rankingMode": "overall",
  "resumeIds": ["resume-id-1", "resume-id-2"]
}
```

Response: same `resumes` array shape as `/api/resumes/analyze`, sorted by backend ranking.

## Privacy Model

The included `firestore.rules` expects data under:

```text
companies/{companyId}/resumes/{resumeId}
companies/{companyId}/resumeAnalyses/{analysisId}
companies/{companyId}/shortlists/{shortlistId}
```

Only users whose verified token has the matching `companyId` should be able to read or write that company’s documents.
