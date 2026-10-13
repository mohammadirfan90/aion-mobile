/**
 * A WebView for embeds: `embed` lessons, YouTube / Vimeo videos, and embed
 * blocks on dynamic pages. Shows a skeleton while loading and a retry state
 * if the page fails.
 */
import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { env } from '@/lib/env';
import { useTheme } from '@/theme';

export interface EmbedFrameProps {
  url: string;
  /** Render the URL inside an `<iframe>` page (YouTube / Vimeo players need a page origin). */
  asIframe?: boolean;
  style?: StyleProp<ViewStyle>;
  title?: string;
}

function iframePage(url: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:transparent}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${url}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;
}

export function EmbedFrame({ url, asIframe = false, style, title }: EmbedFrameProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (failed) {
    return (
      <View style={[{ justifyContent: 'center' }, style]}>
        <ErrorState
          title="Couldn’t load this content"
          description="Check your connection and try again."
          onRetry={() => {
            setFailed(false);
            setLoading(true);
            setAttempt((a) => a + 1);
          }}
        />
      </View>
    );
  }

  return (
    <View style={[{ overflow: 'hidden' }, style]} accessibilityLabel={title}>
      <WebView
        key={attempt}
        source={
          asIframe
            ? // The page needs a real origin, or YouTube refuses to play.
              { html: iframePage(url), baseUrl: env.webUrl || 'https://localhost' }
            : { uri: url }
        }
        style={{ flex: 1, backgroundColor: 'transparent' }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => setLoading(false)}
        onError={() => setFailed(true)}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 400) setFailed(true);
        }}
      />
      {loading ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            inset: 0,
            padding: theme.spacing.four,
            gap: theme.spacing.two,
            backgroundColor: theme.colors.card,
          }}
        >
          <Skeleton width="60%" />
          <Skeleton width="90%" />
          <Skeleton width="75%" />
        </View>
      ) : null}
    </View>
  );
}
