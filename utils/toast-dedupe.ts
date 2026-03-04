export function shouldEmitToastOnce(key: string, windowMs = 4000): boolean {
  if (typeof window === "undefined") return true;

  const storageKey = `toast:dedupe:${key}`;
  const now = Date.now();

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    const last = raw ? Number(raw) : 0;
    if (Number.isFinite(last) && now - last < windowMs) {
      return false;
    }
    window.sessionStorage.setItem(storageKey, String(now));
    return true;
  } catch {
    return true;
  }
}
