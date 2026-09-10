export const MASTER_VOLUME_KEY = 'moonlit:master-volume';
export const DEFAULT_MASTER_VOLUME = 0.8;

export function clampMasterVolume(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : DEFAULT_MASTER_VOLUME));
}

export function readMasterVolume(): number {
  try {
    const stored = window.localStorage.getItem(MASTER_VOLUME_KEY);
    return stored === null ? DEFAULT_MASTER_VOLUME : clampMasterVolume(Number(stored));
  } catch {
    return DEFAULT_MASTER_VOLUME;
  }
}

export function writeMasterVolume(volume: number): number {
  const clamped = clampMasterVolume(volume);
  try {
    window.localStorage.setItem(MASTER_VOLUME_KEY, String(clamped));
  } catch {
    // Storage is optional; the control remains functional for this document.
  }
  window.dispatchEvent(new CustomEvent('moonlit:volume-change', { detail: clamped }));
  return clamped;
}
