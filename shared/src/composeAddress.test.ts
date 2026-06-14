import { describe, it, expect } from 'vitest';
import { composeAddress } from './index.js';

describe('composeAddress', () => {
  it('joins all parts into a single display line', () => {
    expect(
      composeAddress({
        street1: '123 Main St',
        street2: 'Apt 4',
        city: 'Davenport',
        state: 'FL',
        zip: '33896',
      }),
    ).toBe('123 Main St, Apt 4, Davenport, FL 33896');
  });

  it('omits an absent street2', () => {
    expect(
      composeAddress({ street1: '123 Main St', city: 'Davenport', state: 'FL', zip: '33896' }),
    ).toBe('123 Main St, Davenport, FL 33896');
  });

  it('trims surrounding whitespace on the street lines', () => {
    expect(
      composeAddress({
        street1: '  123 Main St  ',
        street2: '  Apt 4  ',
        city: 'Davenport',
        state: 'FL',
        zip: '33896',
      }),
    ).toBe('123 Main St, Apt 4, Davenport, FL 33896');
  });
});
