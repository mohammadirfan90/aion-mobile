/**
 * Lesson helpers (SPEC §2, API §4): normalize lesson metadata, pick the S12
 * renderer, parse `dynamic_page` blocks, and walk the curriculum for
 * Previous / Next. Pure functions, no React, so they can be unit tested.
 */
import type {
  AssignmentSettings,
  Chapter,
  DynamicBlock,
  Lesson,
  LessonMetadata,
  LiveSettings,
} from '@/api/types';

import { parseClock, parseDate } from './format';

// ── Video sources ────────────────────────────────────────────────────────────

export type VideoSource =
  | { kind: 'youtube'; id: string; embedUrl: string }
  | { kind: 'vimeo'; id: string; embedUrl: string }
  | { kind: 'file'; uri: string };

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,})/i,
  /youtu\.be\/([\w-]{6,})/i,
  /youtube(?:-nocookie)?\.com\/(?:embed|shorts|live)\/([\w-]{6,})/i,
];

/** YouTube / Vimeo links → a WebView embed; anything else plays natively. */
export function videoSource(url: string | null | undefined, startSeconds = 0): VideoSource | null {
  if (!url) return null;
  for (const re of YOUTUBE_PATTERNS) {
    const m = url.match(re);
    if (m) {
      const start = startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : '';
      return {
        kind: 'youtube',
        id: m[1],
        embedUrl: `https://www.youtube.com/embed/${m[1]}?playsinline=1&rel=0${start}`,
      };
    }
  }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) {
    const start = startSeconds > 0 ? `#t=${Math.floor(startSeconds)}s` : '';
    return {
      kind: 'vimeo',
      id: vimeo[1],
      embedUrl: `https://player.vimeo.com/video/${vimeo[1]}?playsinline=1${start}`,
    };
  }
  return { kind: 'file', uri: url };
}

// ── Files ────────────────────────────────────────────────────────────────────

export function fileNameFromUrl(url: string | null | undefined): string {
  if (!url) return 'File';
  try {
    const path = url.split(/[?#]/)[0];
    const last = decodeURIComponent(path.split('/').filter(Boolean).pop() ?? '');
    return last || 'File';
  } catch {
    return 'File';
  }
}

/** "report.pdf" → "PDF". No extension → "Link". */
export function fileTypeLabel(nameOrUrl: string | null | undefined): string {
  const name = fileNameFromUrl(nameOrUrl);
  const ext = name.includes('.') ? name.split('.').pop() : '';
  return ext ? ext.toUpperCase() : 'Link';
}

// ── dynamic_page ─────────────────────────────────────────────────────────────

const KNOWN_BLOCKS = new Set<DynamicBlock['type']>([
  'hero',
  'typography',
  'code',
  'callout',
  'video',
  'quiz',
  'tabs',
  'accordion',
  'stepper',
  'resource',
  'embed',
  'glossary',
  'image',
  'checklist',
]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Keeps the blocks we know how to render; unknown or malformed ones are skipped. */
export function sanitizeBlocks(raw: unknown): DynamicBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b, i): b is DynamicBlock => {
    if (!isObject(b) || !isObject(b.data)) return false;
    if (!KNOWN_BLOCKS.has(b.type as DynamicBlock['type'])) return false;
    if (typeof b.id !== 'string') (b as { id: string }).id = `block-${i}`;
    return true;
  });
}

export type DynamicPageContent =
  | { kind: 'blocks'; blocks: DynamicBlock[] }
  | { kind: 'markdown'; markdown: string }
  | { kind: 'empty' };

/**
 * API §4 fallback chain: `metadata.blocks` → `JSON.parse(content)` as
 * `Block[]` or `{ blocks }` → `content` as one markdown block.
 */
export function parseDynamicPage(
  metadata: LessonMetadata | null | undefined,
  content: string | null | undefined,
): DynamicPageContent {
  if (Array.isArray(metadata?.blocks)) {
    const blocks = sanitizeBlocks(metadata.blocks);
    if (blocks.length) return { kind: 'blocks', blocks };
  }
  if (content) {
    try {
      const parsed: unknown = JSON.parse(content);
      const list = Array.isArray(parsed) ? parsed : isObject(parsed) ? parsed.blocks : null;
      const blocks = sanitizeBlocks(list);
      if (blocks.length) return { kind: 'blocks', blocks };
    } catch {
      // Not JSON: fall through to markdown.
    }
    return { kind: 'markdown', markdown: content };
  }
  return { kind: 'empty' };
}

// ── Renderer selection ───────────────────────────────────────────────────────

export type LiveStatus = 'upcoming' | 'live' | 'ended' | 'unscheduled';

export type LessonView =
  | {
      kind: 'video';
      source: VideoSource | null;
      startSeconds: number;
      posterUrl: string | null;
      description: string | null;
    }
  | { kind: 'markdown'; markdown: string | null; markdownUrl: string | null }
  | { kind: 'dynamic_page'; page: DynamicPageContent }
  | {
      kind: 'document';
      fileUrl: string | null;
      fileName: string;
      fileType: string;
      allowDownload: boolean;
      notes: string | null;
    }
  | { kind: 'embed'; url: string | null; height: number; description: string | null }
  | { kind: 'resource'; url: string | null; label: string; description: string | null }
  | { kind: 'quiz'; description: string | null }
  | { kind: 'assignment'; brief: string | null; settings: AssignmentSettings }
  | {
      kind: 'live_session';
      settings: LiveSettings;
      startsAt: Date | null;
      agenda: string | null;
    }
  | { kind: 'unknown'; type: string };

const DEFAULT_EMBED_HEIGHT = 450;

/** Picks how S12 renders a lesson. Reads only the settings block for its type. */
export function lessonView(lesson: Lesson): LessonView {
  const md: LessonMetadata = lesson.metadata ?? {};
  const content = lesson.content ?? null;
  switch (lesson.type) {
    case 'video': {
      const settings = md.videoSettings ?? {};
      const startSeconds = parseClock(settings.startTime);
      return {
        kind: 'video',
        source: videoSource(lesson.videoUrl, startSeconds),
        startSeconds,
        posterUrl: settings.posterImageUrl ?? null,
        description: content,
      };
    }
    case 'markdown': {
      const settings = md.markdownSettings ?? {};
      const isLink = settings.sourceType === 'link' && !!settings.markdownUrl;
      return {
        kind: 'markdown',
        markdown: isLink ? null : content,
        markdownUrl: isLink ? (settings.markdownUrl ?? null) : null,
      };
    }
    case 'dynamic_page':
      return { kind: 'dynamic_page', page: parseDynamicPage(md, content) };
    case 'document': {
      const fileUrl = md.documentSettings?.fileUrl ?? md.fileUrl ?? null;
      return {
        kind: 'document',
        fileUrl,
        fileName: fileNameFromUrl(fileUrl),
        fileType: fileTypeLabel(fileUrl),
        allowDownload: md.documentSettings?.allowDownload ?? true,
        notes: content,
      };
    }
    case 'embed':
      return {
        kind: 'embed',
        url: md.embedSettings?.embedUrl ?? md.embedUrl ?? null,
        height: md.embedSettings?.height ?? DEFAULT_EMBED_HEIGHT,
        description: content,
      };
    case 'resource':
      return {
        kind: 'resource',
        url: md.resourceSettings?.fileUrl ?? md.fileUrl ?? null,
        label: md.resourceSettings?.buttonLabel || 'Open resource',
        description: content,
      };
    case 'quiz':
      return { kind: 'quiz', description: md.description ?? content };
    case 'assignment':
      return { kind: 'assignment', brief: content, settings: md.assignmentSettings ?? {} };
    case 'live_session': {
      const settings = md.liveSettings ?? {};
      return {
        kind: 'live_session',
        settings,
        startsAt: parseDate(settings.startsAt),
        agenda: content,
      };
    }
    default:
      return { kind: 'unknown', type: String(lesson.type) };
  }
}

export function liveStatus(
  startsAt: Date | null,
  durationMinutes: number | undefined,
  now: Date = new Date(),
): LiveStatus {
  if (!startsAt) return 'unscheduled';
  const start = startsAt.getTime();
  const end = start + Math.max(1, durationMinutes ?? 60) * 60_000;
  const t = now.getTime();
  if (t < start) return 'upcoming';
  if (t <= end) return 'live';
  return 'ended';
}

// ── Curriculum walking ───────────────────────────────────────────────────────

export function isLessonLocked(chapter: Chapter, lesson: Lesson): boolean {
  return chapter.locked || lesson.metadata?.isLocked === true;
}

export interface LessonPosition {
  chapter: Chapter;
  lesson: Lesson;
  previous: Lesson | null;
  next: Lesson | null;
}

/**
 * Finds a lesson in the curriculum and its neighbours. Previous / Next cross
 * chapter boundaries and skip locked chapters and lessons.
 */
export function findLessonPosition(chapters: Chapter[], lessonId: string): LessonPosition | null {
  const open: { chapter: Chapter; lesson: Lesson }[] = [];
  let found: { chapter: Chapter; lesson: Lesson } | null = null;
  for (const chapter of chapters) {
    for (const lesson of chapter.lessons) {
      if (lesson.id === lessonId) found = { chapter, lesson };
      if (!isLessonLocked(chapter, lesson) || lesson.id === lessonId) open.push({ chapter, lesson });
    }
  }
  if (!found) return null;
  const i = open.findIndex((x) => x.lesson.id === lessonId);
  return {
    chapter: found.chapter,
    lesson: found.lesson,
    previous: i > 0 ? open[i - 1].lesson : null,
    next: i >= 0 && i < open.length - 1 ? open[i + 1].lesson : null,
  };
}
