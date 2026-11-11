# ScopeLedger Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task-by-task. The user approved the design and explicitly requested implementation; no additional plan approval is needed.

**Goal:** Build the approved freelance agreement → cited project brief → request review → editable draft workflow in an independent repository.
**Architecture:** Shared validated types and deterministic evidence resolution support a React workspace and a bounded Node API. Browser PDF extraction sends text only; sample fixtures work without an AI key. Persistence is explicit and local.
**Tech Stack:** React, TypeScript, Vite, Zod, PDF.js, Node, Express, Vitest.
**Spec:** `docs/superpowers/specs/2026-11-11-scopeledger-design.md`

## Global Constraints

- 10 MB file, 30 PDF pages, 60,000 extracted characters, 5,000 request/context characters.
- English only; pasted text, UTF-8 TXT, text PDF; no OCR or DOCX.
- Exact verified citations, no invented offsets/pages, no legal risk/confidence score.
- Provider errors are explicit; sample fixtures are labeled and never answer arbitrary input.
- One active project; opt-in local saving; drafts are unsent and unaccepted.
- Fresh code and Git history. Credit LegalEase inspiration. New private GitHub repo if accessible.

## Review Focus

- Repeated quotations must not silently highlight the wrong occurrence (task 1).
- Unicode offsets and page boundaries must survive export/import (tasks 1 and 3).
- Delayed AI responses must not overwrite a replaced project (task 4).
- Corrupt/oversized imports and storage quota errors must preserve current work (task 3).
- Copy/download must reflect edits; missing contextual details cannot produce confident included-work decisions (tasks 2 and 4).

## Task 1: Source and evidence foundation

Files: `shared/schema.ts`, `shared/documents.ts`, `shared/evidence.ts`, `tests/evidence.test.ts`, tool configuration.
Interfaces: `createDocument(input: DocumentInput): Promise<SourceDocument>`; `verifyBrief(doc, raw): ProjectBrief`; `verifyReview(doc, raw): RequestReview`; model citations `{blockId, quote}` resolve to verified spans.

- [ ] Write assertions for canonical text/page preservation, literal quote offsets, unknown IDs, missing quotes, repeated quote ambiguity, blank/over-limit pages, and unsupported verdicts.
- [ ] Run `npm test -- tests/evidence.test.ts`; observe missing behavior failures.
- [ ] Implement bounded schemas, SHA-256 version identity, stable paragraph blocks, unique-substring citation resolution, six-category brief validation, and conservative verdict requirements.
- [ ] Run `npm test`; all foundation tests pass. Commit `feat: add source and evidence validation`.

## Task 2: Provider and HTTP API

Files: `server/provider.ts`, `server/app.ts`, `server/index.ts`, `tests/api.test.ts`, `tests/provider.test.ts`.
Interfaces: `createApp(provider?: AnalysisProvider): Express`; `AnalysisProvider.generate(kind, document, request?, context?): Promise<unknown>`; `POST /api/brief` and `/api/review`, `GET /api/status`.

- [ ] Write tests asserting missing provider is 503, invalid inputs are 400, fabricated evidence is 502, valid stub output is cited, oversized body is 413, and unapproved origin is denied.
- [ ] Run new tests and observe expected failures.
- [ ] Implement server-side document reconstruction, schema/evidence checks, timeouts/output bounds, provider JSON mode, document-as-data prompts, conservative missing-context instructions, no raw content logging, and rate limiting.
- [ ] Run `npm test`. Commit `feat: add bounded contract analysis API`.

## Task 3: Sample, durable project state, imports and drafts

Files: `shared/sample.ts`, `shared/project.ts`, `shared/drafts.ts`, `client/files.ts`, `client/storage.ts`, `tests/project.test.ts`, `tests/files.test.ts`.
Interfaces: `loadSample(): Promise<Project>`; `reviewSample(scenario): Promise<RequestReview>`; `parseProject(unknown): Promise<Project>`; `buildDraft(review, proposal): string`; `readAgreement(file): Promise<DocumentInput>`.

- [ ] Assert three distinct sample outcomes and exact citations; reject tampered hashes/citations on import; reject foreign-version reviews; preserve user edits and fee/schedule strings in exports; report quota errors; reject scanned/mixed PDF text and invalid UTF-8.
- [ ] Run tests red, implement validated state and opt-in storage, deterministic editable draft generation, client-only file extraction, then run suite green.
- [ ] Commit `feat: add sample workspace and portable project records`.

## Task 4: Usable responsive workspace

Files: `client/App.tsx`, `client/components/*.tsx`, `client/styles.css`, `client/main.tsx`, `client/api.ts`, `index.html`, `tests/workspace.test.tsx`.
Interfaces: consumes the shared Project/SourceDocument/ProjectBrief/RequestReview types; `requestBrief(input, signal)` and `requestReview(document, text, context, signal)` provide validated results.

- [ ] Write behavior tests for navigation, sample scenario changes, opening evidence, draft editing, explicit save/restore, import failure without state loss, and stale-result protection.
- [ ] Run the tests red, then implement the approved visual direction, intake dialog, accessible source panel, request/history views, draft editor with fee/schedule controls, export/import, local saving, and honest loading/error states.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build`. Commit `feat: build ScopeLedger review workspace`.

## Task 5: Evaluation, documentation, browser verification and repository handoff

Files: `scripts/evaluate.ts`, `eval/cases.json`, `README.md`, `.env.example`, `.github/workflows/ci.yml`, `docs/validation.md`.

- [ ] Add six synthetic evaluation cases: included, excluded, mixed, unknown revisions, conflicting terms, embedded instruction. Evaluator reports real model verdicts/citation validity only when a server key is configured; missing key exits explicitly as not run.
- [ ] Document local startup, provider setup, data flow, boundaries, deployment, lack of model evaluation if unavailable, and LegalEase attribution. Add CI for typecheck/tests/build.
- [ ] Run all checks and inspect local browser desktop/mobile sample flow, citations, drafts, exports, storage, and API-unavailable error. Save screenshot evidence.
- [ ] Dispatch one independent code reviewer, fix important findings with regression tests, and run final checks after any fixes.
- [ ] Commit verified release; create/push to a new private GitHub repository if authenticated creation is available. Otherwise finish the local repo and state the precise remote limitation.

## Execution decisions

- Native execution with one final independent review avoids duplicate interface work. The user's instruction to start building supplies authorization for implementation.
- Filesystem adaptation: the independent repo is `Legal-Simplifier/ScopeLedger`, inside the writable workspace, rather than the proposed sibling folder. It has its own Git history and is ignored by the parent.
- The new repository already isolates the work; another linked worktree would add no protection.
- The approved design makes public deployment a later step. Apply the Sites local-development workflow; no new Sites hosting account/project is required.
