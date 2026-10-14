/**
 * The Supabase client (SPEC §5, D-03). Login, session storage, token refresh and
 * logout go through it; everything else uses the Aion API with its access token.
 *
 * - The session is persisted in AsyncStorage, so a restart stays signed in.
 * - Tokens auto-refresh only while the app is in the foreground (Supabase's Expo
 *   guidance): a backgrounded app doesn't keep timers alive, and refreshing on
 *   return is enough.
 * - Mock mode never touches the network: `getSupabase()` is only called from
 *   real-mode code paths.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import { env } from '@/lib/env';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  watchAppState(client);
  return client;
}

function watchAppState(supabase: SupabaseClient) {
  const apply = (state: AppStateStatus) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };
  apply(AppState.currentState);
  AppState.addEventListener('change', apply);
}
