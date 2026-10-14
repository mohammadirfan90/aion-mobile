/**
 * Cold-start state of the API (INTEGRATION.md §2, decision 5). The free Render
 * instance sleeps when idle and takes 30–60 s to wake. While the first request
 * is still waiting after 5 s, `waking` is true and the app shows a banner.
 */
import { create } from 'zustand';

interface ServerStatus {
  waking: boolean;
}

export const useServerStatus = create<ServerStatus>(() => ({ waking: false }));

export function markServerSlow() {
  useServerStatus.setState({ waking: true });
}

export function markServerAwake() {
  if (useServerStatus.getState().waking) useServerStatus.setState({ waking: false });
}
