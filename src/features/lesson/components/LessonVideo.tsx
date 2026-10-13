/**
 * S12 video area. YouTube / Vimeo URLs play in a WebView embed; anything else
 * plays with `expo-video` and native controls.
 *
 * For native video (API §4):
 *   - resumes from `resumeAt` (the saved `lastPositionSeconds`),
 *   - sends a heartbeat at most every 6 s while playing, plus once on pause
 *     and once when the screen is left,
 *   - marks the lesson complete when the video ends,
 *   - registers with `playback` so the Notes / Summary sheets can read the
 *     time and seek.
 */
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';

import type { VideoSource } from '@/lib/lesson';
import { palettes } from '@/theme';

import { playback } from '../playback';
import { EmbedFrame } from './EmbedFrame';

const HEARTBEAT_MS = 6_000;

export interface LessonVideoProps {
  lessonId: string;
  source: VideoSource;
  resumeAt: number;
  posterUrl?: string | null;
  onHeartbeat?: (positionSeconds: number, durationSeconds: number) => void;
  onEnded?: () => void;
  /** Off for inline videos on dynamic pages: no progress, no sheet bridge. */
  trackProgress?: boolean;
}

export function LessonVideo(props: LessonVideoProps) {
  if (props.source.kind !== 'file') {
    return (
      <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: palettes.dark.background }}>
        <EmbedFrame url={props.source.embedUrl} asIframe style={{ flex: 1 }} title="Video player" />
      </View>
    );
  }
  return <NativeVideo {...props} uri={props.source.uri} />;
}

function NativeVideo({
  lessonId,
  uri,
  resumeAt,
  onHeartbeat,
  onEnded,
  trackProgress = true,
}: LessonVideoProps & { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.timeUpdateEventInterval = 1;
    if (resumeAt > 0) p.currentTime = resumeAt;
  });

  const lastTime = useRef(resumeAt);
  const lastBeat = useRef(0);
  const callbacks = useRef({ onHeartbeat, onEnded });
  useEffect(() => {
    callbacks.current = { onHeartbeat, onEnded };
  });

  const beat = () => {
    if (!trackProgress) return;
    lastBeat.current = Date.now();
    callbacks.current.onHeartbeat?.(lastTime.current, player.duration || 0);
  };

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    lastTime.current = currentTime;
    if (player.playing && Date.now() - lastBeat.current >= HEARTBEAT_MS) beat();
  });

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (!isPlaying && lastTime.current > 0) beat();
  });

  useEventListener(player, 'playToEnd', () => {
    lastTime.current = player.duration || lastTime.current;
    beat();
    if (trackProgress) callbacks.current.onEnded?.();
  });

  // Bridge for the sheets, and one last heartbeat when the lesson is left.
  useEffect(() => {
    if (!trackProgress) return;
    const unregister = playback.register({
      lessonId,
      getTime: () => lastTime.current,
      seek: (seconds) => {
        player.currentTime = seconds;
        lastTime.current = seconds;
        player.play();
      },
    });
    return () => {
      unregister();
      if (lastTime.current > 0) {
        callbacks.current.onHeartbeat?.(lastTime.current, player.duration || 0);
      }
    };
  }, [lessonId, player, trackProgress]);

  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: palettes.dark.background }}>
      <VideoView
        player={player}
        style={{ flex: 1 }}
        nativeControls
        contentFit="contain"
        allowsPictureInPicture
        accessibilityLabel="Lesson video"
      />
    </View>
  );
}
