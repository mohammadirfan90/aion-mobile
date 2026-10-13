/**
 * "View full certificate" (S28): the `html` document from API §14 in a
 * full-screen WebView, with a close button. Links inside it open in the
 * system browser instead of replacing the certificate.
 */
import { useState } from 'react';
import { ActivityIndicator, Modal, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { env } from '@/lib/env';
import { useTheme } from '@/theme';

export function FullCertificateModal({
  visible,
  html,
  title,
  onClose,
}: {
  visible: boolean;
  html: string;
  title: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      onShow={() => setLoading(true)}
    >
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.three,
            paddingTop: insets.top + theme.spacing.two,
            paddingHorizontal: theme.spacing.four,
            paddingBottom: theme.spacing.two,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text variant="heading" numberOfLines={1} accessibilityRole="header" style={{ flex: 1 }}>
            {title}
          </Text>
          <IconButton
            icon={<X size={20} color={theme.colors.foreground} />}
            label="Close certificate"
            variant="muted"
            onPress={onClose}
          />
        </View>
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          <WebView
            source={{ html, baseUrl: env.webUrl }}
            originWhitelist={['*']}
            style={{ flex: 1, backgroundColor: theme.colors.background }}
            onLoadEnd={() => setLoading(false)}
            onShouldStartLoadWithRequest={(req) => {
              const isDocument = req.url === 'about:blank' || req.url.startsWith(env.webUrl);
              if (isDocument || !req.isTopFrame) return true;
              void WebBrowser.openBrowserAsync(req.url);
              return false;
            }}
            accessibilityLabel="Full certificate"
          />
          {loading ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.background,
              }}
            >
              <ActivityIndicator color={theme.colors.mutedForeground} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
