import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BasicPlanesConnectionBadge } from './BasicPlanesConnectionBadge';

afterEach(cleanup);

describe('BasicPlanesConnectionBadge', () => {
  it.each([
    ['connected', 'Live data'],
    ['connecting', 'Connecting...'],
    ['disconnected', 'Disconnected'],
  ] as const)('renders %s as %s', (status, label) => {
    render(<BasicPlanesConnectionBadge status={status} />);

    expect(screen.getByRole('status')).toHaveTextContent(label);
  });

  it('presents an error status as disconnected instead of adding a fourth visual state', () => {
    render(<BasicPlanesConnectionBadge status="error" />);

    expect(screen.getByRole('status')).toHaveTextContent('Disconnected');
  });
});
