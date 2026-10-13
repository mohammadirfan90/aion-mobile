/**
 * Profile hooks (S25, S26, S27).
 *
 * The learning-summary query uses `[...qk.me.learningSummary(), 'profile']`
 * because Home caches a differently shaped summary under the bare key.
 * Prefix invalidation of `qk.me.learningSummary()` / `qk.me.all` still
 * reaches it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { Me, UpdateMeBody } from '@/api/types';

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

const profileSummaryKey = [...qk.me.learningSummary(), 'profile'] as const;

export function useMe() {
  return useQuery({ queryKey: qk.me.detail(), queryFn: fetchMe, staleTime: 60_000 });
}

export function useProfileLearningSummary() {
  return useQuery({ queryKey: profileSummaryKey, queryFn: fetchLearningSummary, staleTime: 30_000 });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeBody) => patchMe(body),
    onSuccess: (me) => qc.setQueryData<Me>(qk.me.detail(), me),
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
