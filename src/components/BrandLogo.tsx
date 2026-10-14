/**
 * The Aion logo (mark + wordmark) from `assets/brand/`, black in light mode
 * and white in dark mode (DESIGN.md rule 8). The artwork is 10:3, so the
 * width follows the height.
 */
import { Image } from 'expo-image';

import logoDark from '@/assets/brand/logo-dark.png';
import logoLight from '@/assets/brand/logo.png';
import { useTheme } from '@/theme';

export interface BrandLogoProps {
  /** Height in points; the width is 10/3 of it. */
  height?: number;
}

export function BrandLogo({ height = 24 }: BrandLogoProps) {
  const theme = useTheme();
  return (
    <Image
      source={theme.mode === 'dark' ? logoDark : logoLight}
      style={{ width: Math.round((height * 10) / 3), height }}
      contentFit="contain"
      // No cross-fade: the header logo should be there on the first frame.
      transition={0}
      accessibilityRole="image"
      accessibilityLabel="Aion"
    />
  );
}
