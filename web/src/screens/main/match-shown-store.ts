/**
 * Module-level dedupe for the MatchMoment popup. Both Discover (which
 * shows the popup optimistically from the POST /likes response) and
 * AppShell (which listens for the WS `match:new` event, firing to both
 * parties) call `markMatchShown(matchId)` after they display it.
 * Either side then checks `wasMatchShown(matchId)` before opening
 * their own version to avoid the initiator seeing two popups.
 */
const shown = new Set<string>();

export function markMatchShown(matchId: string): void {
  shown.add(matchId);
}

export function wasMatchShown(matchId: string): boolean {
  return shown.has(matchId);
}
