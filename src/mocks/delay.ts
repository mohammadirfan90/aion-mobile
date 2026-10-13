/**
 * Tiny artificial delay so loading states are visible during development
 * (SPEC §4: "small artificial latency so loading states are visible").
 */
export function mockDelay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
