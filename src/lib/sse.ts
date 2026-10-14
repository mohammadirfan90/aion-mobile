/**
 * Parser for the tutor's `text/event-stream` (API §13 parsing rules).
 *
 *   1. Buffer chunks and split on `\n`; keep the last partial line.
 *   2. Only `data: ` lines count; `data: [DONE]` is ignored (it isn't always
 *      sent: EOF ends the message).
 *   3. Take `choices[0].delta.content` (NIM / OpenAI, may be null) or
 *      `candidates[0].content.parts[0].text` (Gemini, `\r\n` separators).
 *   5. The server sometimes puts a literal backslash-n pair after the JSON
 *      (`data: {...}\n\n`); strip it before parsing or that chunk is lost, and
 *      close a code fence left open at the end (INTEGRATION.md #15, B-05g).
 */

const FENCE = '```';

/** The text delta in one stream line, or `''`. */
export function sseDelta(rawLine: string): string {
  const line = rawLine.replace(/\r$/, '');
  if (!line.startsWith('data:')) return '';
  const payload = line
    .slice(5)
    .trim()
    .replace(/(\\[nr])+$/, '');
  if (!payload || payload === '[DONE]') return '';
  try {
    const json = JSON.parse(payload) as {
      choices?: { delta?: { content?: string | null } }[];
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return json.choices?.[0]?.delta?.content ?? json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } catch {
    return '';
  }
}

/** Appends a closing fence when the text has an odd number of fence lines. */
export function closeOpenFence(text: string): string {
  const fences = text.match(/^\s*```/gm)?.length ?? 0;
  if (fences % 2 === 0) return text;
  return `${text}${text.endsWith('\n') ? '' : '\n'}${FENCE}`;
}

export interface SseReader {
  /** Feeds decoded text; calls `onDelta` for each complete line's delta. */
  push(chunk: string): void;
  /** Flushes the last partial line and returns the whole message. */
  end(): string;
  /** Everything received so far (to keep partial text after an error). */
  text(): string;
}

export function createSseReader(onDelta: (delta: string) => void): SseReader {
  let buffer = '';
  let full = '';
  const take = (line: string) => {
    const delta = sseDelta(line);
    if (!delta) return;
    full += delta;
    onDelta(delta);
  };
  return {
    push(chunk) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) take(line);
    },
    end() {
      if (buffer) take(buffer);
      buffer = '';
      return closeOpenFence(full);
    },
    text: () => closeOpenFence(full),
  };
}
