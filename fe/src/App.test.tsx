import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '@/App';

describe('App', () => {
  it('renders the flight map', () => {
    render(<App />);

    expect(screen.getByText('OpenStreetMap')).toBeInTheDocument();
  });
});
