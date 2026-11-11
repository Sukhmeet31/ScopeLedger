// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../client/App';
import { loadSample } from '../shared/sample';
import { appendReview } from '../client/workspace';
import { saveProject } from '../client/storage';
import { createLocalProject } from '../shared/local';
import userEvent from '@testing-library/user-event';
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('fetch', async () => Response.json({ configured: false, model: null }));
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('opens sample terms and follows a citation to the exact source', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: 'Know what you agreed.' });
  expect(document.activeElement).not.toBe(
    screen.getByRole('region', { name: 'Supporting source' }),
  );
  fireEvent.click(screen.getByRole('button', { name: /View payment evidence/i }));
  const reader = screen.getByRole('region', { name: 'Supporting source' });
  expect(document.activeElement).toBe(reader);
  expect(within(reader).getByText(/The total project fee is INR 60,000/)).toBeTruthy();
  expect(reader.querySelector('mark')?.textContent).toContain('50% deposit');
});
it('keeps imported interpretations labeled after dismissing the toast and editing a term', async () => {
  saveProject(
    await createLocalProject({
      title: 'Saved local project',
      kind: 'text',
      pages: ['Payment is due on delivery.'],
    }),
  );
  render(<App />);
  await screen.findByRole('heading', { name: 'Know what you agreed.' });
  fireEvent.click(screen.getByRole('button', { name: 'Restore saved project' }));
  await screen.findByText(/Restored saved project/);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
  expect(screen.getByText(/Imported interpretations/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Payment terms' }));
  fireEvent.change(screen.getByLabelText('Your explanation'), {
    target: { value: 'Pay at delivery.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save term' }));
  expect(screen.getByText(/Imported interpretations/)).toBeTruthy();
});
it('switches sample scenarios and edits a draft without losing the changes on navigation', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: 'Know what you agreed.' });
  fireEvent.click(screen.getByRole('button', { name: 'Request review' }));
  fireEvent.click(screen.getByRole('button', { name: 'Missing context' }));
  await screen.findByText('How many revision rounds have already been used?');
  expect(screen.getByText('Needs clarification')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Prepare a reply/i }));
  fireEvent.change(screen.getByLabelText('Your reply'), {
    target: { value: 'My edited message.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Project brief' }));
  fireEvent.click(screen.getByRole('button', { name: /^Drafts/ }));
  expect((screen.getByLabelText('Your reply') as HTMLTextAreaElement).value).toBe(
    'My edited message.',
  );
});
it('saves only on explicit action and can restore the record', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: 'Know what you agreed.' });
  expect(localStorage.length).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Save on this device' }));
  expect(localStorage.length).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: 'Restore saved project' }));
  await waitFor(() => expect(screen.getByText(/Restored saved project/i)).toBeTruthy());
});
it('rejects invalid imports without replacing current project', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: 'Know what you agreed.' });
  const file = new File(['{}'], 'bad.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => '{}' });
  fireEvent.change(screen.getByLabelText('Import project record'), { target: { files: [file] } });
  await screen.findByText(/Could not import/i);
  expect(screen.getByRole('heading', { name: 'Know what you agreed.' })).toBeTruthy();
});
it('a delayed review for a replaced agreement cannot enter its history', async () => {
  const project = await loadSample();
  const stale = { ...project.reviews[0], documentHash: '0'.repeat(64) };
  expect(appendReview(project, stale)).toBe(project);
});

async function openImportedReview() {
  saveProject(await loadSample());
  render(<App />);
  await screen.findByRole('heading', { name: 'Know what you agreed.' });
  fireEvent.click(screen.getByRole('button', { name: 'Restore saved project' }));
  await screen.findByText(/Restored saved project/i);
  fireEvent.click(screen.getByRole('button', { name: 'Request review' }));
}
it('keeps an unsubmitted request and its context while checking the brief', async () => {
  await openImportedReview();
  fireEvent.change(screen.getByLabelText('Paste the new request'), {
    target: { value: 'Change the headline.' },
  });
  fireEvent.change(screen.getByLabelText(/Relevant project context/), {
    target: { value: 'First approval is pending.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Project brief' }));
  fireEvent.click(screen.getByRole('button', { name: 'Request review' }));
  expect((screen.getByLabelText('Paste the new request') as HTMLTextAreaElement).value).toBe(
    'Change the headline.',
  );
  expect((screen.getByLabelText(/Relevant project context/) as HTMLTextAreaElement).value).toBe(
    'First approval is pending.',
  );
});
it('retains over-limit pasted conditions and blocks analysis instead of silently truncating', async () => {
  const user = userEvent.setup();
  await openImportedReview();
  const text = 'x'.repeat(5000) + ' Only after approval.';
  await user.click(screen.getByLabelText('Paste the new request'));
  await user.paste(text);
  expect((screen.getByLabelText('Paste the new request') as HTMLTextAreaElement).value).toBe(text);
  expect(
    (screen.getByRole('button', { name: 'Find related clauses' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(screen.getByRole('alert').textContent).toMatch(/5,000/);
});
it('cannot start analysis after closing intake while source hashing is pending', async () => {
  const fetchSpy = vi.fn(async (_url: string, _init?: RequestInit) =>
    Response.json({ configured: false }),
  );
  vi.stubGlobal('fetch', fetchSpy);
  render(<App />);
  await screen.findByRole('heading', { name: 'Know what you agreed.' });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal('crypto', {
    randomUUID: () => webcrypto.randomUUID(),
    subtle: {
      digest: async () => {
        await gate;
        return new ArrayBuffer(32);
      },
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Use your agreement' }));
  fireEvent.change(screen.getByLabelText('Or paste the agreement'), {
    target: { value: 'A website for INR 30,000.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Open local workspace' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close agreement intake' }));
  await act(async () => {
    release();
    await gate;
  });
  expect(fetchSpy.mock.calls.some((args) => String(args[0]) === '/api/brief')).toBe(false);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByText('EXAMPLE WORKSPACE')).toBeTruthy();
});

it('uses an own agreement, confirms terms and decisions, and preserves drafts without any fetch', async () => {
  const fetchSpy = vi.fn(() => {
    throw new Error('Network is forbidden in local mode');
  });
  vi.stubGlobal('fetch', fetchSpy);
  render(<App />);
  await screen.findByRole('heading', { name: 'Know what you agreed.' });
  fireEvent.click(screen.getByRole('button', { name: 'Use your agreement' }));
  fireEvent.change(screen.getByLabelText('Or paste the agreement'), {
    target: {
      value:
        'Payment: 40% deposit.\n\nDeliverables: three illustrations.\n\nAnimation is excluded.',
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Open local workspace' }));
  await screen.findByText('LOCAL WORKSPACE');
  fireEvent.click(screen.getByRole('button', { name: 'Edit Payment terms' }));
  fireEvent.change(screen.getByLabelText('Summary title'), { target: { value: '40% upfront' } });
  fireEvent.change(screen.getByLabelText('Your explanation'), {
    target: { value: 'Deposit is due before starting.' },
  });
  fireEvent.change(screen.getByLabelText('Term status'), { target: { value: 'found' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save term' }));
  expect(screen.getByRole('heading', { name: '40% upfront' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Request review' }));
  fireEvent.change(screen.getByLabelText('Paste the new request'), {
    target: { value: 'Add animation.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find related clauses' }));
  await screen.findByText('Needs clarification');
  fireEvent.click(screen.getByRole('button', { name: 'Record decision' }));
  fireEvent.change(screen.getByLabelText('Scope decision'), { target: { value: 'addition' } });
  fireEvent.change(screen.getByLabelText('Your explanation'), {
    target: { value: 'Animation is expressly excluded.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
  expect(screen.getByText('Potential addition')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Prepare a reply' }));
  expect((screen.getByLabelText('Your reply') as HTMLTextAreaElement).value).toContain(
    'Add animation.',
  );
  fireEvent.change(screen.getByLabelText('Your reply'), {
    target: { value: 'My edited reply stays here.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Request review' }));
  fireEvent.click(screen.getByRole('button', { name: 'Record decision' }));
  fireEvent.change(screen.getByLabelText('Scope decision'), { target: { value: 'unclear' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
  fireEvent.click(screen.getByRole('button', { name: 'Drafts' }));
  expect((screen.getByLabelText('Your reply') as HTMLTextAreaElement).value).toBe(
    'My edited reply stays here.',
  );
  expect(screen.getByText(/The review changed after this reply was drafted/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'I’ve checked this reply' }));
  expect(screen.queryByText(/The review changed after this reply was drafted/)).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
});
