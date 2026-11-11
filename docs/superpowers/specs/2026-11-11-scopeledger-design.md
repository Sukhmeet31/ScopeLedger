# ScopeLedger — product and technical design

Date: 2026-11-11
Status: Approved by the user on 2026-11-11; implementation in progress.

## Intent and decisions

Build a new, independent repository for a usable product that also demonstrates original engineering to recruiters. The user chose ScopeLedger over a general Legal Simplifier upgrade and a renewal tracker, and requested a browser mockup.

ScopeLedger helps a freelancer understand an existing agreement and evaluate a new client request against its actual wording. The central workflow is: agreement → project terms with evidence → request review → editable clarification or change proposal.

Initial audience: freelance designers and developers working on fixed-scope projects. This audience, the English-only first release, implementation choices, and release boundaries below are the builder's proposals. The user approved the design and these proposed defaults on 2026-11-11.

Working name: ScopeLedger. Name and domain availability have not been established.

## What the existing project establishes

Reviewed Sukhmeet31/LegalEase at commit `a12684b085d54e8c9af3af3a10bfd505a221395f`, its upstream relationship to hemanth090/LegalEase, and the public landing/login flow at https://legal-simplifier-rho.vercel.app/#/.

The fork is eight commits ahead of upstream, with 52 changed paths. It adds useful original work: authentication/history, document chat, comparison, PDF presentation/exports, and retrieval. React, Node, document parsing, and structured AI results are relevant experience to retain.

Verified concerns that shape the new design:

- AI clause-analysis fallback labels extracted clauses `SAFE`; the aggregate then says `Low`. A local probe using the repository's actual functions reproduced this with unlimited-liability and indefinite-payment clauses. An empty clause list also returns a zero/Low score.
- Clause analysis reads only the first 14,000 characters and returns at most eight clauses, without an explicit coverage result.
- The embedding implementation hashes English-like tokens into 256 bins; it is lexical feature hashing, not learned semantic embeddings. A Hindi-text probe produced an all-zero vector.
- The landing page's 96% accuracy, 92% confidence, and other metrics are constants, not evaluation results. The PDF component explicitly renders without source highlights.
- The public analysis entry point requires login. I did not authenticate, inspect private saved documents, or verify the deployed backend's full processing flow.
- No tests or CI files appeared in the 59-file repository tree. The checked-in Supabase schema does not enable row-level security; this does not establish the live database configuration.

New implementation principle: missing or failed analysis is unavailable/unclear, never evidence that an agreement is safe. Showing an exact quote establishes traceability, not the correctness of the interpretation.

## Approaches considered

1. **Legal Simplifier 2.0:** improve citations, coverage, and uncertainty across general legal documents. Lowest conceptual migration cost, but an indistinct audience and broad evaluation burden.
2. **ScopeLedger (selected):** concentrate on freelance project terms and later scope changes. A concrete repeat-use workflow and a tractable set of evaluation cases; narrower document coverage.
3. **Renewal Desk:** extract dates/notice periods and manage obligations. Recurring value, but reminders, calendar semantics, and long-lived account infrastructure enlarge the first release.

Market context: Spellbook already reviews/redlines contracts; Juro extracts obligations and manages reminders; ScopeDue already offers freelance scope/change records and approvals. ScopeLedger is a focused implementation opportunity, not a claim to invent this category. Its proposed emphasis is importing an existing agreement, exact clause traceability, conservative uncertainty, and published reproducible evaluations. Willingness to pay remains unvalidated.

## First release: a complete narrow workflow

### 1. Try an example without signing up

A clearly labeled fictional web-design agreement opens a complete sample workspace. Three predefined client requests demonstrate included work, additional work, and missing context. Example results are fixtures, labeled as such. Arbitrary sample-mode input is not answered with fabricated canned AI output.

### 2. Bring an agreement

Accept pasted text, UTF-8 TXT, and text-based PDF. PDF extraction runs in the browser and preserves page references. The original binary is not uploaded; the extracted text is sent to the application's server and configured AI provider only when the user starts analysis. Show that data flow beside the analysis action.

Limits: 10 MB file, 30 PDF pages, 60,000 extracted characters, and 5,000 characters per client request. Refuse over-limit input clearly rather than silently truncating it. Reject empty/image-only PDFs with an actionable explanation. OCR, DOCX, non-English analysis, password-protected PDFs, and combining several agreements are outside release one. Mixed PDFs with pages lacking text report the incomplete extraction and block a complete-review claim; users may paste verified text instead.

### 3. Review a project brief

Organize findings into deliverables, exclusions, revision allowance, payment terms, timeline/dependencies, and ownership/handoff. Each finding has a plain-language interpretation and a clickable verbatim source quotation. Missing and ambiguous terms stay visible. There is no global legal risk score or percentage confidence.

The original extracted text stays immutable during a review. Findings are review aids. Users may add a clearly labeled personal note but cannot silently change a quoted term. Replacing the agreement invalidates its analysis, request assessments, and drafts.

### 4. Check a new client request

Paste a client request and optionally describe work already completed or revisions already used. Split a mixed request into individual items. Each item receives `appears included`, `potential addition`, or `needs clarification`, with source evidence and a plain explanation. If revision history, acceptance status, or a necessary clause is missing, ask for that context rather than assuming it.

An absence in the supplied agreement is not sufficient proof that work is chargeable. The result explains the supplied text and context; it does not determine enforceability, entitlement to payment, or what a court would decide. Conflicting terms yield `needs clarification`.

### 5. Prepare the next conversation

Generate an editable client-facing clarification or change-proposal draft from the reviewed items. The user supplies any proposed fee and schedule impact; the model must not invent them. Provide copy and plain-text/Markdown download. No automatic sending, signing, acceptance, invoicing, or payment processing.

### 6. Keep a local record

One active project per browser workspace in release one. Offer explicit `Save on this device`, `Restore saved project`, JSON export/import, and `Clear saved project`. Browser storage holds only the selected project's extracted text, review, request history, and drafts; explain that it is not encrypted storage or cloud backup. Storage is opt-in, and quota/unavailable-storage failures must not discard the current in-memory work.

## Experience and visual direction

A calm, readable workspace: warm neutral canvas, dark ink, restrained teal, and amber for uncertainty. Prioritize the project and next action over a long marketing page. The browser mockup is a disposable design artifact with fictional content, not a working product.

Desktop: narrow navigation rail, project/brief or request-review content, and an adjacent source panel. On smaller screens, navigation becomes a compact tab bar and citations open an inline source section. The main modes are Project brief, Request review, and Drafts. The agreement name and sample/live status remain visible.

Clicking a citation focuses the exact source span and page/section. Labels and text accompany all status colors. Keyboard navigation, clear focus, reduced-motion support, and usable mobile layout are required. Loading, extraction error, provider unavailable, malformed response, missing evidence, storage failure, and empty states are designed explicitly.

## Technical proposal

Use React + TypeScript and Vite for the interface, a small Node/TypeScript API, shared Zod schemas, and standard CSS. Keep the React/Node foundation familiar while making the result contracts explicit. No vector database, authentication, or cloud document storage in release one: the bounded agreement fits in context and does not require a retrieval subsystem.

Use a server-only Groq adapter initially, matching the existing project's provider. Model name and API key come from environment variables. The adapter is replaceable. The API key must never appear in the client bundle or browser storage. If no key is configured, sample mode works and real analysis clearly reports that it is unavailable. Never turn provider failures into successful-looking analysis.

The repository should run locally with one documented development command. Include a frontend production build and a server entry point. Document deployment and environment requirements; do not change the existing Vercel deployment. A new public deployment is a later step after validation and necessary credentials/configuration are available.

### Data and evidence contract

- `SourceDocument`: schema version, generated ID, title, content hash, canonical extracted text, page/section blocks, extraction coverage, created time.
- `SourceBlock`: stable ID, optional actual PDF page, start/end offsets into canonical text, and exact block text. Plain text uses sections without invented page numbers.
- `Evidence`: source block ID plus verbatim quote. Server code resolves offsets deterministically and checks that every quote belongs to the supplied document. The model cannot invent trusted offsets or pages.
- `ProjectBrief`: six term categories with `found`, `unclear`, or `not found in supplied text`; findings, evidence, review questions, and provenance (`example` or provider/model).
- `RequestReview`: document hash, request/context text, item assessments, evidence, missing-context questions, created time, and provenance.
- `Draft`: request-review reference, editable text, user-supplied fee/schedule fields, and an explicit unaccepted-draft state.

Shared validation caps list sizes and strings. Unknown source IDs, quotes absent from source text, malformed JSON, and unsupported enum values must fail validation. The API may return valid partial findings only with an explicit incomplete state; an unsupported item cannot become an included-work verdict. Citation checks prove that quotations exist, not that the model reasoned correctly.

### Processing and boundaries

1. Browser extracts/canonicalizes text, tracks pages, and validates limits.
2. API revalidates all limits and derives trusted blocks/hash from submitted page text; it does not trust browser-provided offsets or assessment results.
3. AI receives the bounded full agreement as untrusted data and returns a structured brief or request assessment.
4. API validates schema and citation membership; only verified source positions reach the UI.
5. UI renders results, highlights source evidence, and makes uncertainty explicit.
6. A changed document hash invalidates dependent reviews. Saved/imported data is schema-validated and treated as untrusted; imports do not bypass evidence checks.

Document text is data, never instructions. Prompts explicitly reject instructions embedded in agreements or client requests. Render all source content and model text safely as text; no raw HTML. The API uses body limits, timeouts, origin configuration, bounded output, and rate limiting with documented single-instance limitations. Do not log request bodies, contracts, prompts, or raw provider responses. No claim of zero retention by an external provider.

## Success and validation

User-facing acceptance: a first-time visitor can inspect the fictional agreement, click from a finding to its exact quote, try all three sample request types, edit/copy a draft, and understand what requires clarification. With a configured provider, the same workflow handles a user-supplied bounded English agreement.

Required engineering verification:

- Source/evidence tests: correct quote offsets, repeated text, wrong source IDs, invented quotes, and document-version mismatch.
- Failure tests: unavailable provider, malformed/oversized output, over-limit inputs, blank/scanned PDFs, mixed PDFs with missing text, and invalid imports.
- Scope cases: clearly included request, explicit exclusion, mixed request, unknown revision usage, conflicting scope terms, and an injected instruction within source text.
- API tests with a stub provider verify schemas, error responses, and failure behavior. Real-model evaluation is separate and must never be claimed if credentials are unavailable.
- A small published synthetic evaluation set records expected outcomes, verified citation rate, abstentions, and actual model results when run. Do not present fixture pass rates as live model accuracy or legal correctness.
- Typecheck, production build, and focused unit/integration tests. Browser verification of sample flow, citation selection, editing/copy/export, saving/restoring, desktop, and mobile.

## Repository and attribution

Create a new local `ScopeLedger` folder/repository beside `Legal-Simplifier`, with a new history and a `codex/` implementation branch. Create a separate GitHub repository under Sukhmeet31 if the connected account supports it. Proposed default: private during initial development; publishing to a public portfolio can be decided after review. If remote creation is blocked, complete the local repository and state the exact limitation.

Start with fresh product code. Credit LegalEase as the inspiration in the README and document the evolution honestly. If any upstream code is reused, retain its MIT copyright/license notice. Preserve the current fork and deployment.

This design is temporarily in the current empty workspace for review. Copy it into the new repository when implementation is approved. Mockups and local server state remain ignored design artifacts.

## Explicitly deferred

Authentication, team accounts, cloud syncing, approvals/e-signatures, email integrations, reminders, invoice/payment services, jurisdiction-specific legal judgments, legal risk scores, full contract drafting, OCR, DOCX, multilingual output, multi-document precedence, and automatic contract amendments.

## Builder discretion

Exact component hierarchy, CSS tokens, icons, package versions after checking current official documentation, test tooling, internal filenames, and low-impact UI copy are implementation decisions. Fees, business promises, provider credentials, and public launch are not assumed.

## Sources

- Fork: https://github.com/Sukhmeet31/LegalEase
- Upstream: https://github.com/hemanth090/LegalEase
- Live project: https://legal-simplifier-rho.vercel.app/#/
- Spellbook contract review: https://help.spellbook.legal/en/articles/15656286-comprehensive-review
- Juro obligation/reminder workflow: https://juro.com/product-updates/august-2025
- ScopeDue's existing scope/change workflow: https://scopedue.com/
- Bonsai on freelance scope creep: https://www.hellobonsai.com/blog/how-to-avoid-scope-creep
