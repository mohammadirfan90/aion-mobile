/**
 * Course price and access logic (API §3).
 *
 * The `pricingConfig` and `accessConfig` fields on a course are both optional
 * JSON blobs, and the "is this course free?" question can be answered by
 * either. The rule is:
 *
 *   1. If `pricingConfig.type !== 'free'` and `pricingConfig.price > 0`,
 *      the course is **paid** at `pricingConfig.price` in `pricingConfig.currency`.
 *   2. Otherwise, if `accessConfig.pricingType === 'paid'` and
 *      `accessConfig.price > 0`, the course is **paid** at that price in USD.
 *   3. Otherwise it's **free**.
 *
 * `lib/course.ts` is the single place that knows the rule. Screens and
 * hooks import from here so the logic never drifts.
 */
import type { Course } from '@/api/types';

export function isFreeCourse(course: Pick<Course, 'pricingConfig' | 'accessConfig'>): boolean {
  const p = course.pricingConfig;
  if (p && p.type !== 'free' && p.price > 0) return false;
  const a = course.accessConfig;
  if (a?.pricingType === 'paid' && (a.price ?? 0) > 0) return false;
  return true;
}

/**
 * A short, single-line price string for course cards. `Free` for free
 * courses, otherwise `$NN` (whole dollars) since the catalog is USD-only.
 */
export function formatCoursePrice(course: Pick<Course, 'pricingConfig' | 'accessConfig'>): string {
  if (isFreeCourse(course)) return 'Free';
  const p = course.pricingConfig;
  if (p && p.type !== 'free' && p.price > 0) return `$${(p.price / 100).toFixed(0)}`;
  const a = course.accessConfig;
  if (a?.price && a.price > 0) return `$${a.price}`;
  return 'Free';
}

/** Capitalize a level (`beginner` → `Beginner`) for chip labels. */
export function levelLabel(level: Course['level']): string {
  if (!level) return 'All';
  return level[0]!.toUpperCase() + level.slice(1);
}
