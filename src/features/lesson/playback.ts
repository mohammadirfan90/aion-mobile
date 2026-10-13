/**
 * A tiny bridge between the lesson's video player (S12) and its sheets
 * (S13 notes, S14 summary). The sheets are separate routes stacked on top of
 * the lesson, so they can't reach the player through props. While a video
 * lesson is mounted it registers a handle here; the sheets read the current
 * time (to stamp new notes) and ask it to seek (timestamp chips, concepts).
 *
 * Not React state on purpose: nothing re-renders when the time changes.
 */

export interface PlaybackHandle {
  lessonId: string;
  getTime: () => number | null;
  seek: (seconds: number) => void;
}

let current: PlaybackHandle | null = null;

export const playback = {
  register(handle: PlaybackHandle): () => void {
    current = handle;
    return () => {
      if (current === handle) current = null;
    };
  },
  /** Current time of this lesson's video, or null when there is no seekable video. */
  time(lessonId: string): number | null {
    return current?.lessonId === lessonId ? current.getTime() : null;
  },
  /** True when this lesson has a native video the sheets can seek. */
  canSeek(lessonId: string): boolean {
    return current?.lessonId === lessonId;
  },
  seek(lessonId: string, seconds: number): boolean {
    if (current?.lessonId !== lessonId) return false;
    current.seek(seconds);
    return true;
  },
};
