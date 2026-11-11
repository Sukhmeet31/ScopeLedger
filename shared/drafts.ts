import type { RequestReview } from './schema';
export function buildDraft(
  review: RequestReview,
  proposal: { fee?: string; schedule?: string } = {},
): string {
  const lines = [
    'Hi,',
    '',
    'Thanks for the request. I checked it against the supplied project agreement.',
  ];
  const local = review.workflow === 'local';
  if (local) lines.push('', 'Your request:', review.request);
  const groups = [
    [
      'included',
      'These items appear to fit the agreed scope, subject to the conditions in the agreement:',
    ],
    [
      'addition',
      'These items may expand the agreed scope. Let’s discuss them as a separate addition before starting:',
    ],
    ['unclear', 'I need to clarify the scope or project context before committing to these items:'],
  ] as const;
  for (const [verdict, heading] of groups) {
    const items = review.items.filter((i) => i.verdict === verdict);
    if (items.length)
      lines.push(
        '',
        heading,
        ...items.map((i) => {
          const label = local && review.items.length === 1 ? 'The request above' : i.title;
          return `- ${label}${local && i.recordedByUser ? `\n  My reading: ${i.explanation}` : ''}`;
        }),
      );
  }
  if (local)
    lines.push(
      '',
      'Could you confirm any outstanding deliverable, revision, or approval details for this request?',
    );
  else if (review.questions.length)
    lines.push('', 'Could you confirm the following?', ...review.questions.map((q) => `- ${q}`));
  if (proposal.fee?.trim())
    lines.push('', `Proposed additional fee for discussion: ${proposal.fee.trim()}`);
  if (proposal.schedule?.trim())
    lines.push(`Proposed schedule impact for discussion: ${proposal.schedule.trim()}`);
  lines.push(
    '',
    'Please confirm the details so we can agree any changes in writing before additional work begins.',
    '',
    'Thanks!',
  );
  return lines.join('\n');
}
