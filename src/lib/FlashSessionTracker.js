/**
 * Tracks which chat sessions are currently "flashing" (have an unread message
 * that triggered the tray icon flash).
 *
 * Why this exists: the Rust side only knows the *sender address* (FLASH_ICONS),
 * which is ambiguous for group messages (a member can be in many groups). The
 * frontend knows the exact session (private address / group hash), so it tracks
 * that here. When the user clicks the tray, the frontend reads this tracker to
 * decide where to navigate:
 *   - exactly 1 flashing session → open that session
 *   - multiple flashing sessions → go to the chat page (user picks)
 *
 * The tracker is kept in sync with the actual flash state:
 *   - populated when a flash starts (messenger.ws.js)
 *   - cleared when a session is opened (messenger.private.js / messenger.group.js)
 *   - cleared when the tray is clicked (MainLayout event handler)
 */
const flashing = new Set()

/** Record a session as flashing. key = `private:<addr>` or `group:<hash>`. */
export function addFlashingSession(key) {
  flashing.add(key)
}

/** Clear all flashing sessions (flash stopped / acknowledged). */
export function clearFlashingSessions() {
  flashing.clear()
}

/** @returns {string[]} current flashing session keys. */
export function getFlashingSessions() {
  return [...flashing]
}
