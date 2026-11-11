# Local Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Let users work with their own agreements without API keys or AI requests.

**Architecture:** Browser-local keyword suggestions feed the existing source-verified brief and review types. User editors verify exact quotes before saving. Existing templates and explicit persistence remain in use.

**Tech Stack:** React, TypeScript, Zod, Vitest; no new packages.

**Spec:** `docs/superpowers/specs/2026-11-12-local-workspace.md`

## Global Constraints

- No AI requests, account, model download, or new dependencies in the default UI.
- Keep current file, character, quote, request, and review limits.
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

- [ ] Write failing tests for own-document matches, repeated/long text, conservative decisions, source/hash validation, import round trip, and draft preservation.
- [ ] Run `npm test -- tests/local.test.ts` and observe missing implementation.
- [ ] Implement bounded keyword suggestions and verified manual updates; extend mode/provenance and optional `Draft.needsReview`.
- [ ] Run the new tests and existing domain tests; expect all passing.
- [ ] Commit the independently tested local data workflow.

### Task 2: Usable local workspace

Files: modify App, Intake, BriefView, ReviewView, DraftView, styles; create `client/components/AnnotationEditor.tsx`; extend `tests/workspace.test.tsx`.

Interface: shared modal accepts a term or review item, source document, and a validated save callback. User chooses source block, exact quote, status, title, and explanation.

- [ ] Add failing end-to-end UI test for own agreement → confirmed term → request → manual decision → draft, with fetch forbidden.
- [ ] Update existing cancellation test to assert that the sample remains after hashing completes.
- [ ] Implement local default intake/review, exact-quote editor, explicit provenance copy, and stale-draft notice/acknowledgment.
- [ ] Run `npm test` and `npm run build`; expect all passing.
- [ ] Verify the real browser flow, including PDF/TXT, mobile layout, persistence, and no AI calls.
- [ ] Update README with accurate local capabilities and optional provider status.
- [ ] Obtain independent code review, address material findings, rerun checks, commit, and push to the authorized new repository.
