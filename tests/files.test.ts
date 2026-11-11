import { expect, it } from 'vitest';
import { decodeText, validatePdfPages } from '../client/files';
it('decodes valid UTF-8 and rejects invalid text encoding', () => {
  expect(decodeText(new TextEncoder().encode('Fee: ₹60,000').buffer)).toBe('Fee: ₹60,000');
  expect(() => decodeText(new Uint8Array([0xff, 0xfe]).buffer)).toThrow(/UTF-8/i);
});
it('reports the missing page of a partially scanned PDF', () => {
  expect(() => validatePdfPages(['Readable text.', '  '])).toThrow(/page 2/i);
  expect(() => validatePdfPages(Array(31).fill('Text.'))).toThrow(/30/);
  expect(validatePdfPages(['Page one.', 'Page two.'])).toEqual(['Page one.', 'Page two.']);
});
