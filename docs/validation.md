# Initial validation — 12 November 2026

## Automated checks

- `npm test`: 37 tests across six files, including three regressions found in independent review (final run below).
- `npm run build`: TypeScript check and Vite production bundle passed.
- `npm run eval`: **NOT_RUN**. No Groq key was configured. Six synthetic cases are available; no real-model accuracy or prompt-injection resistance claim is made.
- Provider/API tests use injected transports and outputs. They verify input validation, failure handling, prompt/data separation, output bounds and exact citation checks; they do not establish semantic model correctness.

## Browser checks

Verified in the desktop in-app browser at 1360×1000 and 375×812:

- Sample brief renders; mobile starts at the heading without horizontal overflow.
- Evidence opens the correct original clause, highlights the exact quote, and moves keyboard focus to the source; mobile scrolls to it only after a citation click.
- Mixed request separates a potential addition from included copy work. Missing revision usage asks for context.
- Edited reply survives navigation, browser save/restore and JSON export/import.
- Copy uses the edited reply. TXT download completes with the edited text.
- JSON export downloads and imports successfully with imported provenance.
- A real one-page synthetic PDF extracts in the browser with its text and actual page count. Fixture: `tests/fixtures/agreement.pdf`.
- Pasted agreement analysis with no key returns an explicit unavailable error and keeps the current sample workspace.

## Independent review fixes

- Unsubmitted request/context now survive view changes within the current project.
- Over-limit request/context pastes preserve all text, show an explicit limit error, and block analysis. They are not silently truncated by HTML `maxlength`.
- Closing intake during asynchronous source preparation invalidates the submission before any later network request can start.
- Save controls disclose that the browser record is local and unencrypted.

These checks use synthetic data only. Complex/multi-column PDFs, scanned documents, real model output and public hosting have not been validated.

## Boundaries

Quotes are checked as unique exact substrings, with source-derived offsets; this cannot prove the meaning of an AI interpretation. The API is a single-instance prototype with an in-memory limiter and no login. Public provider-funded hosting needs appropriate access/spend controls. Nothing sends a reply or accepts a client scope change.

## Repository decisions

Fresh Git history in `Legal-Simplifier/ScopeLedger`, ignored by the parent. This local nesting keeps all writes in the authorized workspace; it can be moved later without depending on the parent. The approved design and implementation plan are included under `docs/superpowers/`.
