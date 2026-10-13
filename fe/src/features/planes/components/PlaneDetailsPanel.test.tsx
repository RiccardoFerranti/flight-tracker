import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlaneDetailed } from '@/data/planes/types';

import { PlaneDetailsPanel } from './PlaneDetailsPanel';

const plane: PlaneDetailed = {
  id: 'plane-1',
  model: 'Airbus A320',
  airline: 'Example Air',
  flightNumber: 'EA123',
  registration: 'N123EA',
  latitude: 13.7563,
  longitude: 100.5018,
  altitude: 10_000,
  speed: 250,
  heading: 90,
  verticalSpeed: -2,
  origin: { airport: 'BKK', city: 'Bangkok' },
  destination: { airport: 'SIN', city: 'Singapore' },
  flightDuration: 125,
  estimatedArrival: 1_800_000_000_000,
  numberOfPassengers: 120,
  maxPassengers: 180,
  status: 'cruising',
  color: '#2563eb',
};

function renderPanel(overrides: Partial<ComponentProps<typeof PlaneDetailsPanel>> = {}) {
  const onClose = vi.fn();
  const result = render(
    <PlaneDetailsPanel error={null} isOpen={true} onClose={onClose} plane={plane} status="connected" {...overrides} />,
  );

  return { onClose, ...result };
}

afterEach(cleanup);

describe('PlaneDetailsPanel', () => {
  it('renders the selected aircraft details in semantic sections', () => {
    renderPanel();

    expect(screen.getByRole('complementary', { name: 'Flight details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'EA123' })).toBeInTheDocument();
    expect(screen.getByText('BKK')).toBeInTheDocument();
    expect(screen.getByText('SIN')).toBeInTheDocument();
    expect(screen.getByText('32,808 ft')).toBeInTheDocument();
    expect(screen.queryByText('N123EA', { selector: 'h1' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Flight status: Cruising')).toHaveTextContent('Cruising');
    expect(screen.getByLabelText('Live data connected')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('closes with its close control and Escape', async () => {
    const user = userEvent.setup();
    const { onClose, rerender } = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Close flight details' }));
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<PlaneDetailsPanel error={null} isOpen={true} onClose={onClose} plane={plane} status="connected" />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('focuses Close for a keyboard selection', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <PlaneDetailsPanel
        error={null}
        focusRequest={null}
        isOpen={false}
        onClose={onClose}
        plane={null}
        status="disconnected"
      />,
    );

    rerender(
      <PlaneDetailsPanel
        error={null}
        focusRequest={{ id: 1, target: 'close' }}
        isOpen={true}
        onClose={onClose}
        plane={plane}
        status="connected"
      />,
    );

    expect(screen.getByRole('button', { name: 'Close flight details' })).toHaveFocus();
  });

  it('focuses the panel after a pointer selection so Tab reaches Close next', async () => {
    const user = userEvent.setup();
    const { rerender } = renderPanel({ isOpen: false, plane: null, status: 'disconnected' });

    rerender(
      <PlaneDetailsPanel
        error={null}
        focusRequest={{ id: 1, target: 'panel' }}
        isOpen={true}
        onClose={vi.fn()}
        plane={plane}
        status="connected"
      />,
    );

    const panel = screen.getByRole('complementary', { name: 'Flight details' });
    expect(panel).toHaveAttribute('tabindex', '-1');
    expect(panel).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Close flight details' })).toHaveFocus();
  });

  it('does not move focus again when realtime details update', () => {
    const { rerender } = renderPanel({ focusRequest: { id: 1, target: 'close' } });
    const externalControl = document.body.appendChild(document.createElement('button'));
    externalControl.focus();

    rerender(
      <PlaneDetailsPanel
        error={null}
        focusRequest={{ id: 1, target: 'close' }}
        isOpen={true}
        onClose={vi.fn()}
        plane={{ ...plane, altitude: 10_100 }}
        status="connected"
      />,
    );

    expect(externalControl).toHaveFocus();
    externalControl.remove();
  });

  it('keeps the panel instance open while switching planes and shows loading before new data', () => {
    const { rerender } = renderPanel();
    const panel = screen.getByRole('complementary', { name: 'Flight details' });
    const closeButton = screen.getByRole('button', { name: 'Close flight details' });

    rerender(<PlaneDetailsPanel error={null} isOpen={true} onClose={vi.fn()} plane={null} status="connecting" />);

    expect(screen.getByRole('complementary', { name: 'Flight details' })).toBe(panel);
    expect(screen.getByRole('button', { name: 'Close flight details' })).toBe(closeButton);
    expect(screen.getByText('Loading flight details…')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Loading route' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Loading aircraft' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Loading live data' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'EA123' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Flight details' })).toBeInTheDocument();
    expect(screen.getByLabelText('Connecting to live data')).toBeInTheDocument();
    expect(screen.queryByText('Connecting…')).not.toBeInTheDocument();

    rerender(
      <PlaneDetailsPanel
        error={null}
        isOpen={true}
        onClose={vi.fn()}
        plane={{ ...plane, id: 'plane-2', flightNumber: 'EA456' }}
        status="connected"
      />,
    );

    expect(screen.getByRole('heading', { name: 'EA456' })).toBeInTheDocument();
    expect(screen.getByLabelText('Live data connected')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Flight details' })).toBe(panel);
    expect(screen.getByRole('button', { name: 'Close flight details' })).toBe(closeButton);
  });

  it('moves between fully off-canvas and open without remounting', () => {
    const { rerender } = renderPanel();
    const panel = screen.getByRole('complementary', { name: 'Flight details' });

    expect(panel).toHaveStyle({ transform: 'translateX(0)' });

    rerender(<PlaneDetailsPanel error={null} isOpen={false} onClose={vi.fn()} plane={null} status="disconnected" />);

    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel).toHaveStyle({ transform: 'translateX(100%)' });

    rerender(<PlaneDetailsPanel error={null} isOpen={true} onClose={vi.fn()} plane={plane} status="connected" />);

    expect(screen.getByRole('complementary', { name: 'Flight details' })).toBe(panel);
    expect(panel).toHaveStyle({ transform: 'translateX(0)' });
  });

  it('shows a readable error state without exposing the technical error', () => {
    renderPanel({ error: 'Received malformed plane details JSON.', plane, status: 'error' });

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load flight details');
    expect(screen.getByRole('alert')).toHaveTextContent('Flight information is currently unavailable.');
    expect(screen.queryByRole('status', { name: 'Loading flight details' })).not.toBeInTheDocument();
    expect(screen.queryByText('Flight details disconnected')).not.toBeInTheDocument();
    expect(screen.queryByText('Received malformed plane details JSON.')).not.toBeInTheDocument();
    expect(screen.queryByText('Example Air')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'EA123' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Flight status: Cruising')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Live data unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Live data unavailable')).not.toBeInTheDocument();
  });

  it('shows only the disconnected state when the details connection closes', () => {
    renderPanel({ error: null, plane, status: 'disconnected' });

    expect(screen.getByRole('status')).toHaveTextContent('Flight details disconnected');
    expect(screen.getByRole('status')).toHaveTextContent('The live data connection was interrupted.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading flight details' })).not.toBeInTheDocument();
    expect(screen.queryByText('Example Air')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'EA123' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Flight status: Cruising')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Live data disconnected')).toBeInTheDocument();
    expect(screen.queryByText('Live data disconnected')).not.toBeInTheDocument();
  });
});
