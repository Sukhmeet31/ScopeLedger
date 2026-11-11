import { createDocument } from './documents';
import { verifyBrief, verifyReview } from './evidence';
import type { DocumentInput, Project, RequestReview } from './schema';

export const SAMPLE_INPUT: DocumentInput = {
  title: 'Willow Studio agreement',
  kind: 'pdf',
  pages: [
    `1. Deliverables
The freelancer will design and implement a responsive portfolio website. The website will contain five pages: Home, About, Services, Work, and Contact.

2. Revisions
The project includes two rounds of revisions within the agreed website scope. Homepage copy adjustments are included before the first design approval. Additional rounds require a separate written agreement.

3. Scope changes
Any work beyond the deliverables described in section 1 must be agreed in writing by both parties before it begins. E-commerce, online payments, and product catalogue pages are excluded from this project and require a separate written scope, fee, and timeline.`,
    `4. Payment
The total project fee is INR 60,000. A 50% deposit is due before work begins, with the remaining 50% due on delivery.

5. Timeline
The planned project duration is four weeks after receipt of the deposit and all client-supplied assets. Client feedback and required assets are dependencies for delivery.

6. Handoff
Ownership of the final designs and project implementation transfers to the client upon receipt of final payment. The freelancer retains pre-existing tools and reusable components.`,
  ],
};
const cite = (blockId: string, quote: string) => ({ blockId, quote });
export const SAMPLE_SCENARIOS = {
  mixed: {
    label: 'Mixed request',
    request:
      'Love the direction! Could we also add an online store with three product pages, and change the headline on the homepage?',
    context: 'The first design has not yet been approved. No revision rounds have been used.',
  },
  included: {
    label: 'Included work',
    request: 'Before we approve the first design, could you change the headline on the homepage?',
    context: 'The first design approval is still pending.',
  },
  unclear: {
    label: 'Missing context',
    request: 'Could we do another round of revisions to the page layouts?',
    context: '',
  },
} as const;
export type SampleScenario = keyof typeof SAMPLE_SCENARIOS;
const included = {
  title: 'Update the homepage headline',
  verdict: 'included',
  basis: 'explicit',
  explanation:
    'Homepage copy adjustments are included before the first design approval. The supplied context says this stage is still open.',
  evidence: [
    cite('p1-b2', 'Homepage copy adjustments are included before the first design approval.'),
  ],
};
const addition = {
  title: 'An online store + three product pages',
  verdict: 'addition',
  basis: 'explicit',
  explanation:
    'The agreement explicitly excludes e-commerce and product catalogue pages. Discuss a separate scope, fee, and timeline before committing to this addition.',
  evidence: [
    cite(
      'p1-b3',
      'E-commerce, online payments, and product catalogue pages are excluded from this project and require a separate written scope, fee, and timeline.',
    ),
  ],
};
const unclear = {
  title: 'Another round of layout revisions',
  verdict: 'unclear',
  basis: 'missing_context',
  explanation:
    'Two revision rounds are included, but the number already used was not supplied. Confirm that before deciding whether this request is covered.',
  evidence: [
    cite('p1-b2', 'The project includes two rounds of revisions within the agreed website scope.'),
  ],
};

export async function reviewSample(scenario: string): Promise<RequestReview> {
  if (!(scenario in SAMPLE_SCENARIOS))
    throw new Error('Choose one of the three predefined sample requests.');
  const selected = SAMPLE_SCENARIOS[scenario as SampleScenario];
  return verifyReview(
    await createDocument(SAMPLE_INPUT),
    {
      items:
        scenario === 'mixed'
          ? [addition, included]
          : scenario === 'included'
            ? [included]
            : [unclear],
      questions: scenario === 'unclear' ? ['How many revision rounds have already been used?'] : [],
    },
    { ...selected, provenance: { kind: 'example' } },
  );
}

export async function loadSample(): Promise<Project> {
  const document = await createDocument(SAMPLE_INPUT);
  const brief = verifyBrief(
    document,
    {
      terms: [
        {
          category: 'deliverables',
          status: 'found',
          title: 'A five-page portfolio website',
          explanation:
            'Responsive design and implementation for Home, About, Services, Work, and Contact.',
          evidence: [
            cite(
              'p1-b1',
              'The website will contain five pages: Home, About, Services, Work, and Contact.',
            ),
          ],
        },
        {
          category: 'exclusions',
          status: 'found',
          title: 'E-commerce is separate',
          explanation:
            'An online store, payments, and catalogue pages need a separate written agreement.',
          evidence: addition.evidence,
        },
        {
          category: 'revisions',
          status: 'found',
          title: 'Two revision rounds',
          explanation:
            'Within the agreed website scope. Extra rounds need a separate written agreement.',
          evidence: unclear.evidence,
        },
        {
          category: 'payment',
          status: 'found',
          title: 'INR 60,000',
          explanation: '50% before work begins; the remaining 50% on delivery.',
          evidence: [
            cite(
              'p2-b1',
              'The total project fee is INR 60,000. A 50% deposit is due before work begins, with the remaining 50% due on delivery.',
            ),
          ],
        },
        {
          category: 'timeline',
          status: 'found',
          title: 'Four weeks, with dependencies',
          explanation:
            'Starts after the deposit and client assets arrive. Client feedback is a dependency.',
          evidence: [
            cite(
              'p2-b2',
              'The planned project duration is four weeks after receipt of the deposit and all client-supplied assets.',
            ),
          ],
        },
        {
          category: 'ownership',
          status: 'found',
          title: 'Ownership after final payment',
          explanation:
            'The final designs and implementation transfer; pre-existing tools and reusable components remain with the freelancer.',
          evidence: [
            cite(
              'p2-b3',
              'Ownership of the final designs and project implementation transfers to the client upon receipt of final payment. The freelancer retains pre-existing tools and reusable components.',
            ),
          ],
        },
      ],
      questions: [
        'How long does the client have to provide feedback? The supplied text does not set a feedback deadline.',
      ],
    },
    { kind: 'example' },
  );
  return {
    schemaVersion: 1,
    mode: 'sample',
    document,
    brief,
    reviews: [await reviewSample('mixed')],
    drafts: [],
    note: '',
  };
}
