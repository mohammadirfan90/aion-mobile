import { describe, expect, it } from '@jest/globals';

import { closeOpenFence, createSseReader, sseDelta } from './sse';

const openai = (content: string | null) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}`;
const gemini = (text: string) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}`;
const FENCE = '```';

describe('sseDelta (API §13)', () => {
  it('reads OpenAI / NIM and Gemini chunks', () => {
    expect(sseDelta(openai('Hi'))).toBe('Hi');
    expect(sseDelta(`${gemini('Yo')}\r`)).toBe('Yo');
  });

  it('ignores [DONE], null reasoning chunks, other lines and bad JSON', () => {
    expect(sseDelta('data: [DONE]')).toBe('');
    expect(sseDelta(openai(null))).toBe('');
    expect(sseDelta(': keep-alive')).toBe('');
    expect(sseDelta('event: message')).toBe('');
    expect(sseDelta('data: {not json')).toBe('');
  });

  it('strips the literal backslash-n pair after the JSON instead of losing the chunk', () => {
    expect(sseDelta(`${openai(FENCE)}\\n\\n`)).toBe(FENCE);
  });
});

describe('createSseReader', () => {
  it('joins lines split across chunks and treats EOF as the end', () => {
    const deltas: string[] = [];
    const reader = createSseReader((d) => deltas.push(d));
    const stream = `${openai('Hel')}\n\n${openai('lo')}\n${gemini(' world')}`;
    reader.push(stream.slice(0, 20));
    reader.push(stream.slice(20, 45));
    reader.push(stream.slice(45));
    expect(reader.end()).toBe('Hello world');
    expect(deltas.join('')).toBe('Hello world');
  });

  it('keeps the partial text and closes an open code fence', () => {
    const reader = createSseReader(() => {});
    reader.push(`${openai(`Try:\n${FENCE}js\nlet a = 1;`)}\n`);
    expect(reader.text()).toBe(`Try:\n${FENCE}js\nlet a = 1;\n${FENCE}`);
  });
});

describe('closeOpenFence', () => {
  it('leaves balanced fences and plain text alone', () => {
    expect(closeOpenFence(`${FENCE}\ncode\n${FENCE}`)).toBe(`${FENCE}\ncode\n${FENCE}`);
    expect(closeOpenFence('no code')).toBe('no code');
  });
});
