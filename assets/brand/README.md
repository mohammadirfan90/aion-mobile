# Aion brand assets

These are copied from the Aion web app. Each source SVG has a matching PNG rendered from it.

| File | What it is | Use in the app |
|---|---|---|
| `logo.png` (1200×360) | Mark + "aion" wordmark, **black**, transparent background | Headers and auth screens in **light** mode |
| `logo-dark.png` (1200×360) | Mark + wordmark, **white**, transparent background | The same places in **dark** mode |
| `icon-1024.png` (1024×1024) | The mark alone, black, transparent background | Source for the app icon, splash and small brand spots |
| `logo.svg`, `logo-dark.svg`, `icon.svg` | Original vector files | Reference only; see the note below |

- **Use the PNGs in the app** with `expo-image`, and pick the light or dark logo from `useTheme()`. The SVGs
  contain embedded images inside luminance masks and filters, which `react-native-svg` doesn't render reliably.
- The wordmark is 10:3. At 32px tall it is about 107px wide.
- **App icon and splash (P4-01):** the mark is black on a transparent background. Place it on a white (or
  `#0A0A0A`) square with about 20% padding. Make the Android adaptive-icon foreground fit inside the safe zone (the
  middle 66%).
- To re-render after the web logo changes, convert the SVGs with `sharp` at the sizes above.
