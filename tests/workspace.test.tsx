// @vitest-environment jsdom
import React from 'react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../client/App';
import { loadSample } from '../shared/sample';
import { appendReview } from '../client/workspace';
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
