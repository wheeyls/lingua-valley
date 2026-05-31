/**
 * Guest identity — a stable local id so a guest's progress persists across
 * reloads before they create an account. Adapter-level concern (uses storage
 * and crypto), not domain.
 */

const GUEST_ID_KEY = "lingua-valley.guestId";

export function getOrCreateGuestId(): string {
  try {
    const existing = localStorage.getItem(GUEST_ID_KEY);
    if (existing) return existing;
    const id = "guest_" + cryptoRandom();
    localStorage.setItem(GUEST_ID_KEY, id);
    return id;
  } catch {
    // No storage (private mode): ephemeral id for this session.
    return "guest_" + cryptoRandom();
  }
}

function cryptoRandom(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
