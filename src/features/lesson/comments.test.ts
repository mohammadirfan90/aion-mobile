import { describe, expect, it } from '@jest/globals';

import type { Comment } from '@/api/types';

import { threadComments } from './hooks';

const c = (id: string, parentId: string | null = null) => ({ id, parentId, content: id }) as Comment;

describe('threadComments (API §9)', () => {
  it('nests replies, including replies to replies, under their top-level comment', () => {
    const threads = threadComments([c('a'), c('b'), c('a1', 'a'), c('a1x', 'a1'), c('b1', 'b')]);
    expect(threads.map((t) => [t.id, t.replies.map((r) => r.id)])).toEqual([
      ['a', ['a1', 'a1x']],
      ['b', ['b1']],
    ]);
  });

  it('shows a reply whose parent was deleted as top-level', () => {
    expect(threadComments([c('orphan', 'gone'), c('x')]).map((t) => t.id)).toEqual(['orphan', 'x']);
  });
});
