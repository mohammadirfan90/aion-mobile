/**
 * Small display helpers for the community screens.
 */
import type { ForumCategoryValue, ForumSort } from '@/api/types';
import { formatDate, parseDate } from '@/lib/format';

export const CATEGORY_LABELS: Record<ForumCategoryValue, string> = {
  question: 'Question',
  general: 'General',
  feedback: 'Feedback',
  bug: 'Bug',
  showcase: 'Showcase',
};

/** Categories are free text in the DB; unknown ones are title-cased. */
export function categoryLabel(category: string): string {
  return (
    CATEGORY_LABELS[category as ForumCategoryValue] ??
    (category ? category[0].toUpperCase() + category.slice(1) : 'General')
  );
}

export const SORT_LABELS: Record<Exclude<ForumSort, 'oldest'>, string> = {
  latest: 'Latest',
  activity: 'Recent activity',
  upvotes: 'Most upvoted',
  replies: 'Most replies',
};

/** "just now", "5m ago", "3h ago", "2d ago", then a date. */
export function timeAgo(value: string | null | undefined, now: Date = new Date()): string {
  const d = parseDate(value);
  if (!d) return '';
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

/** 1234 → "1.2k". */
export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/** Plain-text excerpt of markdown content for feed cards. */
export function excerpt(markdown: string, max = 160): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[`*_>#~]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Staff roles get a badge next to the author's name. */
export function roleBadge(role: string | null | undefined): string | null {
  if (role === 'admin' || role === 'instructor') return 'Instructor';
  return null;
}
