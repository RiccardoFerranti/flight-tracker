import { describe, expect, it } from 'vitest';

import type { PlaneDetailed } from '@/data/planes/types';

import { getPlaneDetailsPanelContentState } from './planeDetailsPanel';

const plane = { id: 'plane-1' } as PlaneDetailed;

describe('getPlaneDetailsPanelContentState', () => {
  it('maps the details socket inputs to mutually exclusive UI states', () => {
    expect(getPlaneDetailsPanelContentState('connecting', null, null)).toEqual({ status: 'loading' });
    expect(getPlaneDetailsPanelContentState('connected', null, plane)).toEqual({ status: 'ready', plane });
    expect(getPlaneDetailsPanelContentState('error', 'Transport error', plane)).toEqual({ status: 'error' });
    expect(getPlaneDetailsPanelContentState('disconnected', null, plane)).toEqual({ status: 'disconnected' });
    expect(getPlaneDetailsPanelContentState('connected', 'Invalid message', null)).toEqual({ status: 'error' });
  });
});
