/**
 * Profile hooks (S25, S26, S27).
 *
 * The learning-summary query uses `qk.me.profileSummary()`
 * because Home caches a differently shaped summary under the bare key.
 * Prefix invalidation of `qk.me.learningSummary()` / `qk.me.all` still
 * reaches it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { Me, UpdateMeBody } from '@/api/types';
import { setCurrentMe } from '@/lib/auth-store';
import { env } from '@/lib/env';

import {
  fetchLearningSummary,
  fetchMe,
  patchMe,
  postChangePassword,
  signOut,
  switchFixtureRole,
  uploadAvatar,
  type PickedFile,
} from './api';

const profileSummaryKey = qk.me.profileSummary();

/** Keeps the auth store's profile (Home's name, `aiConsent`) in step with S25–S27. */
function syncMe(me: Me): Me {
  if (!env.useMocks) setCurrentMe(me);
  return me;
}

export function useMe() {
  return useQuery({
    queryKey: qk.me.detail(),
    queryFn: async () => syncMe(await fetchMe()),
    staleTime: 60_000,
  });
}

export function useProfileLearningSummary() {
  return useQuery({ queryKey: profileSummaryKey, queryFn: fetchLearningSummary, staleTime: 30_000 });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeBody) => patchMe(body),
    // S14 / S17 read `aiConsent` from the auth store, so syncing is enough.
    onSuccess: (me) => qc.setQueryData<Me>(qk.me.detail(), syncMe(me)),
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: (vars: { file: PickedFile; onProgress: (fraction: number) => void }) =>
      uploadAvatar(vars.file, vars.onProgress),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: (password: string) => postChangePassword(password) });
}

export function useSwitchFixtureRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (role: Me['role']) => switchFixtureRole(role),
    onSuccess: (me) => qc.setQueryData<Me>(qk.me.detail(), me),
  });
}

/** Ends the session and drops every cached query (SPEC §5). */
export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => qc.clear(),
  });
}
