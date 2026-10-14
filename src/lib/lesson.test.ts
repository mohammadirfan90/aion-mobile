import type { Chapter, Lesson } from '@/api/types';

import {
  fileNameFromUrl,
  fileTypeLabel,
  findLessonPosition,
  lessonView,
  liveStatus,
  parseDynamicPage,
  sanitizeBlocks,
  videoSource,
} from './lesson';

function lesson(partial: Partial<Lesson> & Pick<Lesson, 'id' | 'type'>): Lesson {
  return {
    chapterId: 'ch',
    courseId: 'c',
    title: partial.id,
    position: 1,
    metadata: null,
    completed: false,
    ...partial,
  };
}

describe('videoSource', () => {
  it('turns YouTube watch, short and embed links into an embed URL', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      'https://youtu.be/aqz-KE-bpKQ',
      'https://www.youtube.com/embed/aqz-KE-bpKQ',
      'https://youtube.com/shorts/aqz-KE-bpKQ',
    ]) {
      const s = videoSource(url);
      expect(s?.kind).toBe('youtube');
      expect(s && 'embedUrl' in s && s.embedUrl).toContain('youtube.com/embed/aqz-KE-bpKQ');
    }
  });

  it('adds the start time to YouTube embeds', () => {
    const s = videoSource('https://youtu.be/aqz-KE-bpKQ', 75);
    expect(s && 'embedUrl' in s && s.embedUrl).toContain('start=75');
  });

  it('turns Vimeo links into a player URL', () => {
    const s = videoSource('https://vimeo.com/123456');
    expect(s).toMatchObject({ kind: 'vimeo', id: '123456' });
  });

  it('plays anything else as a file', () => {
    expect(videoSource('https://cdn.example.com/a.mp4')).toEqual({
      kind: 'file',
      uri: 'https://cdn.example.com/a.mp4',
    });
  });

  it('returns null without a URL', () => {
    expect(videoSource(null)).toBeNull();
  });
});

describe('file helpers', () => {
  it('takes the file name from a URL, ignoring the query', () => {
    expect(fileNameFromUrl('https://x.com/files/My%20Notes.pdf?token=1')).toBe('My Notes.pdf');
  });

  it('labels the file type from its extension', () => {
    expect(fileTypeLabel('https://x.com/a.docx')).toBe('DOCX');
    expect(fileTypeLabel('https://x.com/page')).toBe('Link');
  });
});

describe('dynamic_page parsing (API §4 fallback chain)', () => {
  const block = { id: 'b1', type: 'typography', data: { content: 'Hi' } };

  it('uses metadata.blocks first and drops unknown block types', () => {
    const page = parseDynamicPage(
      { blocks: [block, { id: 'x', type: 'timeline', data: {} }] as never },
      null,
    );
    expect(page).toEqual({ kind: 'blocks', blocks: [block] });
  });

  it('parses content as a block array', () => {
    expect(parseDynamicPage({}, JSON.stringify([block]))).toEqual({ kind: 'blocks', blocks: [block] });
  });

  it('parses content as { blocks }', () => {
    expect(parseDynamicPage(null, JSON.stringify({ blocks: [block] }))).toEqual({
      kind: 'blocks',
      blocks: [block],
    });
  });

  it('falls back to markdown when content is not JSON', () => {
    expect(parseDynamicPage({}, '# Title')).toEqual({ kind: 'markdown', markdown: '# Title' });
  });

  it('is empty with nothing to show', () => {
    expect(parseDynamicPage(null, null)).toEqual({ kind: 'empty' });
  });

  it('skips malformed blocks and fills a missing id', () => {
    const out = sanitizeBlocks([null, { type: 'typography' }, { type: 'checklist', data: { items: [] } }]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('block-2');
  });
});

describe('lessonView', () => {
  it('reads only the settings block that matches the type', () => {
    const view = lessonView(
      lesson({
        id: 'd',
        type: 'document',
        metadata: {
          documentSettings: { fileUrl: 'https://x.com/a.pdf', allowDownload: false },
          resourceSettings: { fileUrl: 'https://x.com/wrong.zip' },
        },
      }),
    );
    expect(view).toMatchObject({ kind: 'document', fileUrl: 'https://x.com/a.pdf', allowDownload: false });
  });

  it('falls back to the top-level fileUrl', () => {
    expect(lessonView(lesson({ id: 'r', type: 'resource', metadata: { fileUrl: 'https://x.com/r' } }))).toMatchObject(
      { kind: 'resource', url: 'https://x.com/r', label: 'Open resource' },
    );
  });

  it('parses the video start time', () => {
    const view = lessonView(
      lesson({
        id: 'v',
        type: 'video',
        videoUrl: 'https://cdn.example.com/a.mp4',
        metadata: { videoSettings: { startTime: '01:30' } },
      }),
    );
    expect(view).toMatchObject({ kind: 'video', startSeconds: 90 });
  });

  it('uses markdownUrl for link-sourced markdown', () => {
    expect(
      lessonView(
        lesson({
          id: 'm',
          type: 'markdown',
          content: 'ignored',
          metadata: { markdownSettings: { sourceType: 'link', markdownUrl: 'https://x.com/a.md' } },
        }),
      ),
    ).toEqual({ kind: 'markdown', markdown: null, markdownUrl: 'https://x.com/a.md' });
  });

  it('never crashes on an unknown type', () => {
    expect(lessonView(lesson({ id: 'u', type: 'hologram' }))).toEqual({ kind: 'unknown', type: 'hologram' });
  });
});

describe('liveStatus', () => {
  const start = new Date('2026-10-20T15:00:00Z');
  it('is upcoming before the start', () => {
    expect(liveStatus(start, 60, new Date('2026-10-20T14:00:00Z'))).toBe('upcoming');
  });
  it('is live during the session', () => {
    expect(liveStatus(start, 60, new Date('2026-10-20T15:30:00Z'))).toBe('live');
  });
  it('has ended after it', () => {
    expect(liveStatus(start, 60, new Date('2026-10-20T16:30:00Z'))).toBe('ended');
  });
  it('is unscheduled without a start', () => {
    expect(liveStatus(null, 60)).toBe('unscheduled');
  });
});

describe('findLessonPosition', () => {
  const chapters: Chapter[] = [
    {
      id: 'c1',
      courseId: 'c',
      title: 'One',
      position: 1,
      locked: false,
      lessons: [lesson({ id: 'a', type: 'video' }), lesson({ id: 'b', type: 'markdown' })],
    },
    {
      id: 'c2',
      courseId: 'c',
      title: 'Locked',
      position: 2,
      locked: true,
      lessons: [lesson({ id: 'x', type: 'markdown' })],
    },
    {
      id: 'c3',
      courseId: 'c',
      title: 'Three',
      position: 3,
      locked: false,
      lessons: [
        lesson({ id: 'y', type: 'quiz', metadata: { isLocked: true } }),
        lesson({ id: 'c', type: 'quiz' }),
      ],
    },
  ];

  it('crosses chapters and skips locked chapters and lessons', () => {
    const pos = findLessonPosition(chapters, 'b');
    expect(pos?.previous?.id).toBe('a');
    expect(pos?.next?.id).toBe('c');
    expect(findLessonPosition(chapters, 'c')?.previous?.id).toBe('b');
  });

  it('has no previous at the start and no next at the end', () => {
    expect(findLessonPosition(chapters, 'a')?.previous).toBeNull();
    expect(findLessonPosition(chapters, 'c')?.next).toBeNull();
  });

  it('returns null for an unknown lesson', () => {
    expect(findLessonPosition(chapters, 'nope')).toBeNull();
  });
});
