import type { Tables, Enums } from './db';

// Direct aliases of Supabase rows (snake_case preserved)
export type Course = Tables<'courses'>;
export type Enrollment = Tables<'enrollments'>;
export type ClassMeeting = Tables<'class_meetings'>;
export type EventRow = Tables<'events'>;
export type EventParticipant = Tables<'event_participants'>;

// Enum aliases
export type UserStatus = Enums<'user_status'>;
export type EventVisibility = Enums<'event_visibility'>;
export type ParticipantStatus = Enums<'participant_status'>;

// Course with the user's enrollment metadata joined in — the shape the sidebar needs
export interface EnrolledCourse extends Course {
  color: string;               // from enrollment (falls back to default_color)
  instructor: string | null;   // from enrollment
  joined_at: string;
}

// A class meeting expanded to a concrete date range for a given week
export interface ExpandedClassMeeting {
  id: string;
  user_id: string;
  course_id: string;
  start_at: Date;
  end_at: Date;
}

// Conflict detail returned by the availability engine
export interface Conflict {
  kind: 'event' | 'class_meeting';
  id: string;
  title: string;          // event title or "CS4063 class"
  start: Date;
  end: Date;
}

// Minimal profile info piggybacked onto events so shared events can render
// the creator's avatar without a separate lookup per event.
export interface EventOwnerInfo {
  id: string;
  name: string;
  initials: string;
  avatar_color: string;
}

export interface EventWithOwner extends EventRow {
  owner_profile: EventOwnerInfo | null;
}
