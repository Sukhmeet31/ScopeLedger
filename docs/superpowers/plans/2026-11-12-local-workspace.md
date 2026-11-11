# Local Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Let users work with their own agreements without API keys or AI requests.

**Architecture:** Browser-local keyword suggestions feed the existing source-verified brief and review types. User editors verify exact quotes before saving. Existing templates and explicit persistence remain in use.

**Tech Stack:** React, TypeScript, Zod, Vitest; no new packages.

**Spec:** `docs/superpowers/specs/2026-11-12-local-workspace.md`

## Global Constraints

- No AI requests, account, model download, or new dependencies in the default UI.
- Keep current file, agreement-character, quote, request, and review limits; draft capacity is 32,000 characters after review to accommodate complete reasoning.
- Never infer inclusion or additional work from a keyword match.
- Preserve edited replies; flag them when a decision changes.

## Review Focus

- Long or repetitive paragraphs: suggestions must remain unique verbatim quotes or be omitted.
- No English keyword matches: users can manually select any source passage.
- Cancellation during hashing: a closed intake cannot replace the workspace.
- Imported records: preserve local mode and stale-draft flags while revalidating citations.
- Mixed requests: preserve the entire request and require the user to resolve conditions.

### Task 1: Local records and validation

Files: create `shared/local.ts`, `tests/local.test.ts`; modify `shared/schema.ts`, `shared/project.ts`, `client/workspace.ts`.

Interfaces: `createLocalProject(input: DocumentInput): Promise<Project>`, `reviewLocal(document: SourceDocument, request: string, context: string): RequestReview`, `updateLocalTerm(document, brief, term): ProjectBrief`, `updateLocalDecision(document, review, index, item): RequestReview`, `replaceReview(project, review): Project`.

- [x] Write failing tests for own-document matches, repeated/long text, conservative decisions, source/hash validation, import round trip, and draft preservation.
- [x] Run `npm test -- tests/local.test.ts` and observe missing implementation.
- [x] Implement bounded keyword suggestions and verified manual updates; extend mode/provenance and optional `Draft.needsReview`.
- [x] Run the new tests and existing domain tests; expect all passing.
- [x] Commit the independently tested local data workflow (`1d19fe4`).

### Task 2: Usable local workspace

Files: modify App, Intake, BriefView, ReviewView, DraftView, styles; create `client/components/AnnotationEditor.tsx`; extend `tests/workspace.test.tsx`.

Interface: shared modal accepts a term or review item, source document, and a validated save callback. User chooses source block, exact quote, status, title, and explanation.

- [x] Add failing end-to-end UI test for own agreement → confirmed term → request → manual decision → draft, with fetch forbidden.
- [x] Update existing cancellation test to assert that the sample remains after hashing completes.
- [x] Implement local default intake/review, exact-quote editor, explicit provenance copy, and stale-draft notice/acknowledgment (`2a130b0`).
- [x] Run `npm test` and `npm run build`; expect all passing.
- [x] Verify the real browser flow, including PDF/TXT, mobile layout, persistence, and no AI calls.
- [x] Update README with accurate local capabilities and optional provider status.
- [x] Obtain independent code review, address material findings with failing regressions first, and rerun checks: 47 tests and build passed.

Release target: the user's authorized `origin/main` in the independent ScopeLedger repository. Final commit and remote verification are reported at handoff.
