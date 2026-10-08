import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '@/App';

describe('App', () => {
  it('renders the planes feature', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Planes' })).toBeInTheDocument();
  });
});
