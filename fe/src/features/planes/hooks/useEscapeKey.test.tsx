import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useEscapeKey } from './useEscapeKey';

describe('useEscapeKey', () => {
  it('handles Escape only while enabled and cleans up on unmount', () => {
    const onEscape = vi.fn();
    const { rerender, unmount } = renderHook(({ enabled }) => useEscapeKey(enabled, onEscape), {
      initialProps: { enabled: false },
    });

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(onEscape).not.toHaveBeenCalled();

    rerender({ enabled: true });
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(onEscape).toHaveBeenCalledOnce();

    unmount();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(onEscape).toHaveBeenCalledOnce();
  });
});
