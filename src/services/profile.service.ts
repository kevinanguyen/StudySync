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
  /** URL of the original (uncropped) avatar source — what the editor re-loads
   * so a user can come back later and adjust the crop without re-uploading. */
  avatar_source_url?: string | null;
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
  if (patch.avatar_source_url !== undefined) clean.avatar_source_url = patch.avatar_source_url;

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

/**
 * Upload an image to the user's avatar storage folder.
 *
 * Two kinds of uploads:
 *   - `cropped`: the 512×512 displayed avatar. Goes into `avatar_url`.
 *   - `source`: the user's original uncropped upload. Goes into
 *     `avatar_source_url` so the editor can re-load it later for re-cropping.
 *
 * Both live under `avatars/{userId}/` so a single set of storage RLS
 * policies (already applied in migration 0008) governs everything.
 */
export async function uploadProfileAvatar(
  userId: string,
  file: Blob,
  kind: 'cropped' | 'source' = 'cropped'
): Promise<string> {
  // Pick a sensible extension from the blob's mime type. Fallback to png.
  const ext = file.type === 'image/jpeg' ? 'jpg'
    : file.type === 'image/webp' ? 'webp'
    : 'png';
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: false,
    contentType: file.type || 'image/png',
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

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new ProfileServiceError(error.message, error);
  }
}
