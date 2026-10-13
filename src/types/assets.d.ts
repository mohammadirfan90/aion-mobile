/**
 * Type declarations for non-TS assets imported in screens and components.
 * Expo's built-in types cover CSS modules but not binary assets, so we add
 * a tiny declaration here for the formats the app actually uses. This keeps
 * `import logo from '@/assets/brand/logo.png'` type-safe.
 */
declare module '*.png' {
  const asset: number;
  export default asset;
}

declare module '*.jpg' {
  const asset: number;
  export default asset;
}

declare module '*.jpeg' {
  const asset: number;
  export default asset;
}

declare module '*.webp' {
  const asset: number;
  export default asset;
}

declare module '*.gif' {
  const asset: number;
  export default asset;
}

declare module '*.svg' {
  const asset: number;
  export default asset;
}

declare module '*.ttf' {
  const asset: number;
  export default asset;
}

declare module '*.otf' {
  const asset: number;
  export default asset;
}
