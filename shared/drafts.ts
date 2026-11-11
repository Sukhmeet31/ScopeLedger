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
    if (items.length) lines.push('', heading, ...items.map((i) => `- ${i.title}`));
  }
  if (review.questions.length)
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
