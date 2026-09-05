# MedLens — local project

A complete, single-user local edition of MedLens. Run it on your own computer, edit it in VS Code, and push the source to your GitHub repository. No ChatGPT Sites account or Cloudflare setup is required.

## 1. Install prerequisites

Install Node.js 24 LTS (or Node.js >=22.13) from https://nodejs.org and Git from https://git-scm.com. Open a new terminal after installing. Check:

```sh
node --version
npm --version
git --version
```

Node 20 is not supported: this project uses Node's built-in SQLite module.

## 2. Run on localhost

Extract `MedLens.zip`. Open the extracted `MedLens` folder in VS Code. Choose Terminal > New Terminal, then run:

```sh
npm install
npm run dev
```

Open http://localhost:3000 (or http://127.0.0.1:3000) in your browser. Keep the terminal running; Ctrl+C stops the app. You only need `npm install` on first setup or after dependency changes. On later visits, open the folder and run `npm run dev`.

Windows PowerShell: if scripts are blocked, use `npm.cmd install` and `npm.cmd run dev`, or select Command Prompt as the VS Code terminal. The project scripts do not require Bash.

## 3. Try the application

1. Explore the synthetic sample record.
2. Click New patient and save intake details.
3. Click Upload report; use `sample-report.txt` in this folder or paste one test per line:

```text
Hemoglobin | 11.2 | g/dL | 12.0 - 15.5 | 2026-09-01 |
Ferritin | 9 | ng/mL | 15 - 150 | 2026-09-01 |
Vitamin D | 24 | ng/mL | | 2026-09-01 | Range not provided
```

The parser format is `Test | Value | Unit | Reference range | Date | Observation`. Leave absent fields blank. Arbitrary paragraphs and scanned reports need AI extraction. Review a result using its right-hand arrow, compare it with the original excerpt, edit if necessary, and check the verification box. Try searching, filtering, source download, the activity log, and Export.

## 4. Enable AI (optional)

Text parsing and rule-based summaries work without a key. For PDF/image extraction and AI-assisted summaries:

1. Copy `.env.example` to `.env.local` in the project root.
2. Edit `.env.local`:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4.1-mini
```

3. Restart `npm run dev`.
4. Select the AI processing checkbox when uploading a report or refreshing a summary.

Never put the key in frontend code or commit it. `.gitignore` excludes `.env.local` and all patient data. AI processing sends the supplied report/results to OpenAI. `store:false` is used, which does not guarantee zero provider retention. The default model can be changed to a compatible model supporting the required inputs and structured outputs. Live AI calls have not been tested because no API key was supplied.

## 5. Push to GitHub

Sign into https://github.com/new and create an **empty** repository named `medlens`. Choose public or private as appropriate. Do not initialize it with a README, .gitignore, or license because these files already exist locally.

In your MedLens terminal, run the following. Replace `YOUR_USERNAME` with your actual GitHub username:

```sh
git init
git add .
git commit -m "Initial MedLens project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/medlens.git
git push -u origin main
```

Git may open a browser to authenticate. If it says your identity is unknown, run the following with your own details, then retry the commit and push:

```sh
git config user.name "Your Name"
git config user.email "your-email@example.com"
```

Your source repository will then be at `https://github.com/YOUR_USERNAME/medlens`. This is a URL template, not an already-created repository. This project has not been pushed to your GitHub account.

Before committing, `git status --short` should not show `.env.local`, `data/`, `node_modules/`, or `.next/`. The included ignore file excludes secrets, patient records, uploads, dependencies and build output.

## 6. Run the project after cloning GitHub

On a computer with Node.js and Git installed:

```sh
git clone https://github.com/YOUR_USERNAME/medlens.git
cd medlens
npm install
npm run dev
```

Then open http://localhost:3000. Your GitHub URL holds the code; localhost is the running application. Cloning does not copy patient records or API keys. Create `.env.local` separately if needed. A public repository is not a publicly hosted application, and GitHub Pages cannot run this Node/SQLite backend.

## 7. Save later changes

```sh
git add .
git commit -m "Describe your changes"
git push
```

## 8. Production-style local build

Stop the development server first, then run:

```sh
npm run build
npm start
```

Open the same http://localhost:3000 URL. Both start commands bind only to the local computer. This edition intentionally has a single local user; add real authentication and deployment-specific security before exposing it to other people.

## Structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Patient workspace, intake, upload, review, filtering, source/history views |
| `app/globals.css` | Responsive visual styling |
| `app/api/records/route.ts` | Patient records, editing, verification and audit events |
| `app/api/reports/route.ts` | Upload and extraction |
| `app/api/source/route.ts` | Original file download |
| `app/api/summary/route.ts` | Summaries from recorded findings |
| `lib/local-storage.ts` | SQLite initialization and filesystem uploads |
| `lib/medical.ts` | Validation, text parser, numeric range comparison |
| `lib/ai.ts` | OpenAI extraction and source-constrained summary adapter |
| `lib/server.ts` | Local-only request checks and backend helpers |
| `components/`, `hooks/`, `vendor/` | Reusable interface components and styles |
| `tests/medical.test.ts` | Range, parser and summary tests |
| `data/` | Automatically generated local database and uploaded files (not committed) |

## Workflow and algorithms

Patient intake -> report extraction -> field-by-field source review -> structured record -> summary/export.

All intake details are labeled user provided. Extracted findings retain method, source excerpt and verification state. Human edits retain originals and create audit entries. Optimistic concurrency checks prevent silent stale edits; edits and conditional audit entries use SQLite transactions.

Range classification is deterministic, not an LLM decision. It uses only a printed numeric range or inequality. Missing ranges, ambiguous demographic ranges, qualitative values, reversed intervals and unsupported formats return Unknown. No invented ranges, inferred unit conversion, diagnosis or treatment advice.

AI uses a strict JSON schema followed by Zod validation. Every extraction is initially unverified. For summaries the AI selects existing finding IDs; the server validates these IDs and renders the facts using constrained templates. This limits free-form advice. The fallback is explicitly labeled rule-based.

## Storage and limitations

Local records live in `data/medlens.sqlite`; originals live in `data/uploads/`. They survive restarts. Back up the full `data` folder while the app is stopped. It is not encrypted by this application. Anyone with access to your computer/account may access local files. Use synthetic/de-identified data for demonstrations. This is not a clinically validated system.

There is no multi-user login in this localhost edition, no public deployment, no dedicated PDF export, and no automatic clinical conflict resolution. JSON export is included. A model API key is required for PDF/image extraction. Image/OCR errors must be reviewed by a person.

## Checks and troubleshooting

```sh
npm test
npm run typecheck
```

- `node:sqlite` missing: upgrade Node to 24 LTS, then open a new terminal.
- Port 3000 in use: stop the other server or a previously running MedLens terminal.
- No findings: use the pipe-delimited format above or configure AI.
- SQLite warning: Node may label this built-in API experimental; that warning alone is not a failure.
- AI checkbox disabled: check `.env.local`, the key variable name, and restart the server.
- If dependency installation fails: check internet connectivity and your Node version.

Official references: [Next.js commands](https://nextjs.org/docs/app/api-reference/cli/next), [Node SQLite](https://nodejs.org/api/sqlite.html), [pushing local code to GitHub](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).

## Validation performed for this package

Next.js production build and TypeScript validation passed. Five medical parser/range/summary tests passed. A local HTTP smoke test passed for page serving, patient creation, report extraction, verification, audit history, saved-record retrieval and summaries. Browser interaction testing and live AI calls were not performed.

## Analytics and glossy UI update

The workspace opens on the new Analytics tab:

- Reference-range breakdown chart: Low, Normal, High and Unknown counts.
- Verification donut: verified and pending results with exact counts.
- Results-over-time chart: choose one test and unit, inspect each dated numeric point and source in the tooltip, and expand the exact-value list.
- Missing numeric values or invalid dates are excluded and counted. No unit conversion, interpolation or inferred ranges is performed. These visuals are descriptive, not diagnoses.

For a synthetic time comparison, upload both `sample-report.txt` and `sample-report-previous.txt` to the same patient, then select Hemoglobin, Ferritin or Glucose. Uploaded findings start unverified.

Glossy gradients, translucent surfaces, highlights and shadows are applied across the workspace. Reduced-motion preferences are respected. No browser visual QA was performed.

To update an existing installation, stop the server and copy the new source files into the existing project. Preserve your `data/` folder and `.env.local`. Run `npm install`, then `npm run dev`. Neither patient records nor secrets are included in the ZIP.
