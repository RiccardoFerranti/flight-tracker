import { describe, expect, it } from 'vitest';

import { planesMessageSchema } from './schemas';

describe('planesMessageSchema', () => {
  it('accepts a valid basic planes payload', () => {
    const payload = {
      type: 'planes',
      data: [
        {
          id: 'plane-1',
          latitude: 13.7563,
          longitude: 100.5018,
          altitude: 10000,
          color: '#2563eb',
        },
      ],
    };

    expect(planesMessageSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects a payload with invalid basic plane data', () => {
    const payload = {
      type: 'planes',
      data: [
        {
          id: 'plane-1',
          latitude: '13.7563',
          longitude: 100.5018,
          altitude: 10000,
          color: '#2563eb',
        },
      ],
    };

    expect(planesMessageSchema.safeParse(payload).success).toBe(false);
  });
});
