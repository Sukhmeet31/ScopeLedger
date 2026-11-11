# ScopeLedger without an API key

The user has requested a working version without an API key. This is a change to the approved workspace, not a new product direction. The default UI must support the user's own agreements without any AI service, account, model download, or API request.

Use deterministic English keyword matches to suggest source passages in all six existing brief categories. Label every suggestion as needing review; absence of a keyword is not evidence of a missing contractual term. The user can edit a term, select a verbatim source quote, and confirm it. All quotations keep the existing exact-match and document-hash checks.

A request produces one review item and possible related passages, always initially Needs clarification. The full request and context are preserved. The user can record an included, additional, or unclear decision with their explanation. Included and additional decisions require an exact source quote. This is a manual working aid, not automated legal interpretation. English keyword matching can miss wording, exceptions, or implications; users must read the full agreement.

Keep PDF/TXT intake, source navigation, editable template replies, explicit browser saves, and JSON import/export. If a decision changes after drafting, preserve the edited reply and flag it for review. Do not overwrite drafts. Persist this flag. Imported projects remain usable in the local workflow and their interpretations remain unverified imported content.

Keep the optional Groq server integration for future use, but the default UI must not call it or request a key. No new dependencies. Existing size limits and cancellation guards remain. No OCR, account sync, or installed local model is part of this change.
