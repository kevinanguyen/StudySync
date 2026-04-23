import { supabase } from '@/lib/supabase';
import type { UserStatus } from '@/types/domain';
import type { Tables } from '@/types/db';

export type Profile = Tables<'profiles'>;

export class ProfileServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'ProfileServiceError';
  }
}

export interface ProfileUpdateInput {
  name?: string;
  username?: string;
  major?: string | null;
  grad_year?: number | null;
  avatar_color?: string;
  avatar_url?: string | null;
}

/** Update editable profile fields for the current user. */
export async function updateProfile(userId: string, patch: ProfileUpdateInput): Promise<Profile> {
  const clean: Partial<Profile> = {};
  if (patch.name !== undefined) clean.name = patch.name.trim();
  if (patch.username !== undefined) clean.username = patch.username.trim();
  if (patch.major !== undefined) clean.major = patch.major?.trim() || null;
  if (patch.grad_year !== undefined) clean.grad_year = patch.grad_year ?? null;
  if (patch.avatar_color !== undefined) clean.avatar_color = patch.avatar_color;
  if (patch.avatar_url !== undefined) clean.avatar_url = patch.avatar_url;

  // Keep initials in sync with name changes.
  if (patch.name !== undefined) {
    clean.initials = initialsFromName(patch.name.trim());
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(clean)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new ProfileServiceError(error.message, error);
  return data;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Update current user's status (available/studying/busy) and optional status text. */
export async function updateStatus(userId: string, status: UserStatus, statusText: string | null): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ status, status_text: statusText })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new ProfileServiceError(error.message, error);
  return data;
}

export async function uploadProfileAvatar(userId: string, file: Blob): Promise<string> {
  const path = `${userId}/${Date.now()}.png`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: false,
    contentType: 'image/png',
  });
  if (error) {
    if (/bucket.*not found/i.test(error.message)) {
      throw new ProfileServiceError(
        'Avatar uploads are not set up yet. The Supabase "avatars" storage bucket is missing. Apply the latest Supabase migration, then try again.',
        error
      );
    }
    throw new ProfileServiceError(error.message, error);
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

/** Change password via Supabase auth. User must have a current session. */
export async function changePassword(newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new ProfileServiceError('Password must be at least 8 characters.');
  }

  console.log('before updateUser');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  console.log('after updateUser', error);

  if (error) {
    throw new ProfileServiceError(error.message, error);
  }
}
