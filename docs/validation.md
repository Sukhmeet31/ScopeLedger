# Validation — 12 November 2026

## Current release: no-key local workspace

- `npm test`: **47/47 passed** across seven files. Includes own-agreement creation, conservative matches, exact citations, manual confirmation, foreign-source rejection, stale draft preservation, and import round trips.
- `npm run build`: TypeScript and production bundle passed after review fixes.
- The UI regression forbids `fetch()` throughout own-agreement intake, term editing, request review, decision recording, and drafting. No live model calls were made; the user chose local mode instead of API setup.
- Real browser: uploaded the synthetic TXT fixture, confirmed its payment term, rejected a fabricated quote, selected an exclusion passage manually, recorded a decision, edited a reply, saved/restored, and exported/imported JSON. The edited reply survived. PDF intake produced source-linked page 1 evidence from the existing synthetic PDF.
- Layout: checked the new editor at 375×812 and the workspace at 1360×1000, with no horizontal overflow. Screenshot: `docs/images/scopeledger-local.jpg`.
- Browser-verified that changing a decision preserves the edited reply and displays the reminder to review it.
- Independent review found omitted conditions in long-request replies, loss of the persistent imported interpretation notice, and reviewer instructions leaking into client-facing templates. Regression tests failed before fixes and passed afterward. Browser checks verified the final complete reply and persistent import notice.
- Draft capacity is now 32,000 characters to fit the full 5,000-character request and all 12 possible recorded explanations. A maximum-size manual review round-trips without losing its reply. Agreement, request, file, page, quote, and review-count limits are unchanged.
- The no-key workflow is the default even when an optional provider key exists. Public hosting was not provisioned. Legal correctness, OCR, complex PDF reading order, account sync, and live model quality remain outside these checks.

The sections below record earlier milestones and are historical. In particular, the old no-key error behavior has been replaced by the working local workflow above.

## Initial release

## Automated checks

- Final `npm test`: **37/37 passed** across six files, including three regressions found in independent review.
- `npm run build`: TypeScript check and Vite production bundle passed.
- `npm run eval`: **NOT_RUN**. No Groq key was configured. Six synthetic cases are available; no real-model accuracy or prompt-injection resistance claim is made.
- Provider/API tests use injected transports and outputs. They verify input validation, failure handling, prompt/data separation, output bounds and exact citation checks; they do not establish semantic model correctness.

## Free-plan setup follow-up

On 12 November 2026, Groq's current model catalog listed the original Llama default as Enterprise. The configuration now defaults to `openai/gpt-oss-120b`, which appears in Groq's Free-plan limits, and live evaluations are paced 65 seconds apart. All 37 automated tests and the production build passed after this configuration change. The live evaluation remains **NOT_RUN** pending a key from a confirmed Free-plan account. No paid billing or public hosting was enabled.

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

The independent reviewer rechecked the fixes and normal submission; no remaining code-review blockers for the local/private handoff. The final full suite and production build both passed after these fixes.

These checks use synthetic data only. Complex/multi-column PDFs, scanned documents, real model output and public hosting have not been validated.

## Boundaries

Quotes are checked as unique exact substrings, with source-derived offsets; this cannot prove the meaning of an AI interpretation. The API is a single-instance prototype with an in-memory limiter and no login. Public provider-funded hosting needs appropriate access/spend controls. Nothing sends a reply or accepts a client scope change.

## Repository decisions

Fresh Git history in `Legal-Simplifier/ScopeLedger`, ignored by the parent. This local nesting keeps all writes in the authorized workspace; it can be moved later without depending on the parent. The approved design and implementation plan are included under `docs/superpowers/`.
