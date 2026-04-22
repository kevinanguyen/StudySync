import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/store/uiStore';

describe('uiStore toasts', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [], welcomeOpen: false });
  });

  it('starts with an empty toast queue', () => {
    expect(useUIStore.getState().toasts).toEqual([]);
  });

  it('showToast adds a toast with a generated id', () => {
    const id = useUIStore.getState().showToast({ level: 'success', message: 'Saved' });
    const { toasts } = useUIStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ id, level: 'success', message: 'Saved' });
  });

  it('dismissToast removes the matching toast', () => {
    const id1 = useUIStore.getState().showToast({ level: 'success', message: 'A' });
    const id2 = useUIStore.getState().showToast({ level: 'error', message: 'B' });
    useUIStore.getState().dismissToast(id1);
    const { toasts } = useUIStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(id2);
  });

  it('dismissToast with unknown id is a no-op', () => {
    useUIStore.getState().showToast({ level: 'info', message: 'A' });
    useUIStore.getState().dismissToast('does-not-exist');
    expect(useUIStore.getState().toasts).toHaveLength(1);
  });

  it('opens and closes the welcome guide', () => {
    useUIStore.getState().openWelcome();
    expect(useUIStore.getState().welcomeOpen).toBe(true);

    useUIStore.getState().closeWelcome();
    expect(useUIStore.getState().welcomeOpen).toBe(false);
  });
});
