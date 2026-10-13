/**
 * Validated environment variables. See SPEC §3 and `.env.example`.
 *
 * - `EXPO_PUBLIC_*` variables are inlined by Metro at build time and are
 *   safe to ship in the app bundle.
 * - When `useMocks` is true, the API / Supabase values fall back to safe
 *   local defaults so the app boots in mock mode without any real backend.
 * - When `useMocks` is false, missing or malformed values throw a clear
 *   error. The Phase-0.11 navigation skeleton will show a real error screen
 *   for that case.
 */
import { z } from 'zod';

const rawEnv = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  webUrl: process.env.EXPO_PUBLIC_WEB_URL,
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS,
};

const realSchema = z.object({
  apiUrl: z.string().url('EXPO_PUBLIC_API_URL must be a valid URL'),
  supabaseUrl: z.string().url('EXPO_PUBLIC_SUPABASE_URL must be a valid URL'),
  supabaseAnonKey: z
    .string()
    .min(20, 'EXPO_PUBLIC_SUPABASE_ANON_KEY looks too short'),
  webUrl: z.string().url('EXPO_PUBLIC_WEB_URL must be a valid URL'),
});

const mockSchema = z.object({
  apiUrl: z.string().min(1),
  supabaseUrl: z.string().min(1),
  supabaseAnonKey: z.string().min(1),
  webUrl: z.string().min(1),
});

function read(): {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  webUrl: string;
  useMocks: boolean;
} {
  const useMocks =
    (rawEnv.useMocks ?? 'true').toString().trim().toLowerCase() !== 'false';

  const values = {
    apiUrl: rawEnv.apiUrl?.trim() || 'http://localhost:3000',
    supabaseUrl:
      rawEnv.supabaseUrl?.trim() || 'http://localhost:54321',
    supabaseAnonKey:
      rawEnv.supabaseAnonKey?.trim() || 'mock-anon-key',
    webUrl: rawEnv.webUrl?.trim() || 'http://localhost:3000',
  };

  const schema = useMocks ? mockSchema : realSchema;
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Aion: invalid environment configuration (useMocks=${useMocks}):\n${issues}\n` +
        'See `.env.example` for the full list of required variables.',
    );
  }

  // For the `optionalUrl` consumers, we expose undefined when empty.
  const optional = {
    apiUrl: rawEnv.apiUrl?.trim() ? parsed.data.apiUrl : undefined,
    supabaseUrl: rawEnv.supabaseUrl?.trim()
      ? parsed.data.supabaseUrl
      : undefined,
    supabaseAnonKey: rawEnv.supabaseAnonKey?.trim()
      ? parsed.data.supabaseAnonKey
      : undefined,
    webUrl: rawEnv.webUrl?.trim() ? parsed.data.webUrl : undefined,
  };

  return {
    apiUrl: optional.apiUrl ?? parsed.data.apiUrl,
    supabaseUrl: optional.supabaseUrl ?? parsed.data.supabaseUrl,
    supabaseAnonKey: optional.supabaseAnonKey ?? parsed.data.supabaseAnonKey,
    webUrl: optional.webUrl ?? parsed.data.webUrl,
    useMocks,
  };
}

export const env = read();
export type Env = typeof env;
