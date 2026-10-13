import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Award, BookOpen, Bot, CheckCircle2, Compass, Sparkles } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { getHasSeenWelcome } from '@/lib/auth-storage';
import { useTheme } from '@/theme';

interface WelcomeSlide {
  id: string;
  title: string;
  description: string;
  cardTitle: string;
  iconType: 'learn' | 'tutor' | 'certificate';
}

const SLIDES: WelcomeSlide[] = [
  {
    id: 'learn',
    title: 'Learn anywhere',
    description: 'Access world-class courses anytime, anywhere at your own pace.',
    cardTitle: 'Courses',
    iconType: 'learn',
  },
  {
    id: 'tutor',
    title: 'Ask the AI tutor',
    description: 'Stuck on a lesson? Get a clear explanation in seconds.',
    cardTitle: 'AI Tutor',
    iconType: 'tutor',
  },
  {
    id: 'certificate',
    title: 'Earn certificates',
    description: 'Complete courses, pass quizzes, and earn verifiable certificates.',
    cardTitle: 'Certificates',
    iconType: 'certificate',
  },
];

export function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isCheckingWelcome, setIsCheckingWelcome] = useState(true);
  const listRef = useRef<FlatList<WelcomeSlide>>(null);

  // Check whether user has already completed/seen the welcome screen
  useEffect(() => {
    let active = true;
    getHasSeenWelcome().then((seen) => {
      if (!active) return;
      if (seen) {
        router.replace('/(auth)/login');
      } else {
        setIsCheckingWelcome(false);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideWidth = event.nativeEvent.layoutMeasurement.width;
    if (slideWidth > 0) {
      const offset = event.nativeEvent.contentOffset.x;
      const index = Math.round(offset / slideWidth);
      if (index >= 0 && index < SLIDES.length && index !== activeIndex) {
        setActiveIndex(index);
      }
    }
  };

  const handleDotPress = (index: number) => {
    setActiveIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleGetStarted = () => {
    router.push('/(auth)/signup');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  if (isCheckingWelcome) {
    return (
      <Screen edges={{ top: true, bottom: true }}>
        <View style={{ flex: 1 }} />
      </Screen>
    );
  }

  // Responsive sizing for smaller viewports (e.g. 360x640)
  const isSmallScreen = windowHeight < 700;
  const slideContentWidth = windowWidth - theme.spacing.four * 2;
  const heroCardHeight = isSmallScreen ? 230 : Math.min(320, windowHeight * 0.38);

  const renderSlideIllustration = (type: WelcomeSlide['iconType'], cardTitle: string) => {
    const isTutor = type === 'tutor';
    const isLearn = type === 'learn';

    return (
      <View
        style={{
          width: '100%',
          height: heroCardHeight,
          backgroundColor: theme.colors.muted,
          borderRadius: theme.radius.xl * 2,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Subtle decorative concentric circle in background */}
        <View
          style={{
            position: 'absolute',
            width: heroCardHeight * 0.85,
            height: heroCardHeight * 0.85,
            borderRadius: theme.radius.full,
            borderWidth: 1,
            borderColor: theme.colors.border,
            opacity: 0.7,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: heroCardHeight * 1.25,
            height: heroCardHeight * 1.25,
            borderRadius: theme.radius.full,
            borderWidth: 1,
            borderColor: theme.colors.border,
            opacity: 0.35,
          }}
        />

        {/* Center floating card (matches Stitch S01-welcome.png) */}
        <View
          style={{
            width: '78%',
            maxWidth: 270,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.four,
            gap: theme.spacing.three,
            shadowColor: theme.colors.foreground,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          {/* Card header row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.three }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colors.foreground,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isTutor && <Bot size={18} color={theme.colors.background} />}
                {isLearn && <BookOpen size={18} color={theme.colors.background} />}
                {!isTutor && !isLearn && <Award size={18} color={theme.colors.background} />}
              </View>
              <Text variant="bodyStrong">{cardTitle}</Text>
            </View>

            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: theme.radius.full,
                backgroundColor: theme.colors.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isTutor && <Sparkles size={14} color={theme.colors.foreground} />}
              {isLearn && <Compass size={14} color={theme.colors.foreground} />}
              {!isTutor && !isLearn && <CheckCircle2 size={14} color={theme.colors.foreground} />}
            </View>
          </View>

          {/* Skeleton placeholder bars simulating content */}
          <View style={{ gap: theme.spacing.two, marginTop: theme.spacing.one }}>
            <View
              style={{
                width: '88%',
                height: 8,
                borderRadius: theme.radius.full,
                backgroundColor: theme.colors.muted,
              }}
            />
            <View
              style={{
                width: '68%',
                height: 8,
                borderRadius: theme.radius.full,
                backgroundColor: theme.colors.muted,
              }}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen edges={{ top: true, bottom: true }} padded={false} style={{ flex: 1 }}>
      {/* Top Header with App Name */}
      <View
        style={{
          paddingTop: theme.spacing.two,
          paddingBottom: theme.spacing.two,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="heading" weight="bold">
          Aion
        </Text>
      </View>

      {/* Swipeable Carousel */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          getItemLayout={(_, index) => ({
            length: windowWidth,
            offset: windowWidth * index,
            index,
          })}
          renderItem={({ item }) => (
            <View
              style={{
                width: windowWidth,
                paddingHorizontal: theme.spacing.four,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Illustration Hero Card */}
              {renderSlideIllustration(item.iconType, item.cardTitle)}

              {/* Title & Description */}
              <View
                style={{
                  alignItems: 'center',
                  marginTop: isSmallScreen ? theme.spacing.four : theme.spacing.six,
                  paddingHorizontal: theme.spacing.three,
                  maxWidth: slideContentWidth,
                }}
              >
                <Text
                  variant={isSmallScreen ? 'title' : 'display'}
                  weight="bold"
                  style={{ textAlign: 'center' }}
                >
                  {item.title}
                </Text>
                <Text
                  variant="body"
                  tone="muted"
                  style={{
                    textAlign: 'center',
                    marginTop: theme.spacing.two,
                    lineHeight: 22,
                    maxWidth: 290,
                  }}
                >
                  {item.description}
                </Text>
              </View>
            </View>
          )}
        />

        {/* Pagination Dots */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: theme.spacing.two,
            marginTop: isSmallScreen ? theme.spacing.three : theme.spacing.five,
            marginBottom: theme.spacing.two,
          }}
          accessibilityRole="tablist"
        >
          {SLIDES.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <Pressable
                key={slide.id}
                onPress={() => handleDotPress(idx)}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${idx + 1}: ${slide.title}`}
                style={{
                  height: 6,
                  width: isActive ? 24 : 6,
                  borderRadius: theme.radius.full,
                  backgroundColor: isActive ? theme.colors.foreground : theme.colors.border,
                }}
              />
            );
          })}
        </View>
      </View>

      {/* Bottom CTA Area */}
      <View
        style={{
          paddingHorizontal: theme.spacing.four,
          paddingBottom: theme.spacing.four,
          paddingTop: theme.spacing.two,
          gap: theme.spacing.two,
        }}
      >
        <Button label="Get started" size="lg" fullWidth onPress={handleGetStarted} />
        <Pressable
          onPress={handleLogin}
          accessibilityRole="button"
          accessibilityLabel="I already have an account"
          style={({ pressed }) => [
            {
              paddingVertical: theme.spacing.three,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text variant="body" tone="muted">
            I already have an account
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
