import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/store/authStore';

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  username?: string;
  major?: string;
  gradYear?: number;
}

export interface SignInInput {
  email: string;
  password: string;
}

export class AuthError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'AuthError';
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function randomAvatarColor(): string {
  const palette = ['#3B5BDB', '#8B5CF6', '#F97316', '#10B981', '#EF4444', '#14B8A6', '#F59E0B', '#6366F1'];
  return palette[Math.floor(Math.random() * palette.length)];
}

export async function signUp(input: SignUpInput): Promise<Session> {
  const { email, password, name, username, major, gradYear } = input;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        username: username ?? null,
        initials: initialsFromName(name),
        avatar_color: randomAvatarColor(),
        major: major ?? null,
        grad_year: gradYear ?? null,
      },
    },
  });

  if (error) throw new AuthError(error.message, error);
  if (!data.session) throw new AuthError('Signup returned no session. Check email confirmation settings.');
  return data.session;
}

export async function signIn(input: SignInInput): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw new AuthError(error.message, error);
  if (!data.session) throw new AuthError('Sign-in returned no session.');
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AuthError(error.message, error);
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new AuthError(error.message, error);
  return data.session;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new AuthError(error.message, error);
  }
  return data as unknown as Profile;
}

export function onAuthChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
