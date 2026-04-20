import { supabase } from '@/lib/supabase';
import type { Course, EnrolledCourse, ClassMeeting } from '@/types/domain';

export class CoursesServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'CoursesServiceError';
  }
}

/** Case-insensitive lookup by code. Returns null if not found. */
export async function lookupCourseByCode(code: string): Promise<Course | null> {
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .ilike('code', normalized)
    .maybeSingle();
  if (error) throw new CoursesServiceError(error.message, error);
  return data;
}

/** Create a new global course row. */
export async function createCourse(input: {
  code: string;
  name: string;
  default_color: string;
  created_by: string;
}): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .insert({
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      default_color: input.default_color,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error) throw new CoursesServiceError(error.message, error);
  return data;
}

/** Enroll a user in a course with personal color/instructor metadata. */
export async function enrollUserInCourse(input: {
  user_id: string;
  course_id: string;
  color: string;
  instructor: string | null;
}): Promise<void> {
  const { error } = await supabase.from('enrollments').insert({
    user_id: input.user_id,
    course_id: input.course_id,
    color: input.color,
    instructor: input.instructor,
  });
  if (error) throw new CoursesServiceError(error.message, error);
}

/** List the current user's enrollments joined with course data. */
export async function listEnrolledCourses(userId: string): Promise<EnrolledCourse[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('color, instructor, joined_at, courses(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true });
  if (error) throw new CoursesServiceError(error.message, error);
  return (data ?? []).map((row) => {
    const course = row.courses as unknown as Course;
    return {
      ...course,
      color: row.color ?? course.default_color,
      instructor: row.instructor ?? null,
      joined_at: row.joined_at,
    };
  });
}

/** Remove the user's enrollment. Class meetings for that course are also deleted via separate service. */
export async function dropEnrollment(userId: string, courseId: string): Promise<void> {
  // Delete class meetings first (no cascade from enrollment).
  const delMeetings = await supabase
    .from('class_meetings')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
  if (delMeetings.error) throw new CoursesServiceError(delMeetings.error.message, delMeetings.error);

  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
  if (error) throw new CoursesServiceError(error.message, error);
}

/** Update the user's enrollment metadata (color, instructor). */
export async function updateEnrollment(input: {
  user_id: string;
  course_id: string;
  color?: string;
  instructor?: string | null;
}): Promise<void> {
  const patch: { color?: string; instructor?: string | null } = {};
  if (input.color !== undefined) patch.color = input.color;
  if (input.instructor !== undefined) patch.instructor = input.instructor;
  const { error } = await supabase
    .from('enrollments')
    .update(patch)
    .eq('user_id', input.user_id)
    .eq('course_id', input.course_id);
  if (error) throw new CoursesServiceError(error.message, error);
}

/** Add a recurring class meeting. */
export async function addClassMeeting(input: {
  user_id: string;
  course_id: string;
  day_of_week: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
}): Promise<ClassMeeting> {
  const { data, error } = await supabase
    .from('class_meetings')
    .insert(input)
    .select()
    .single();
  if (error) throw new CoursesServiceError(error.message, error);
  return data;
}

/** List all class meetings for a user (typically the current user). */
export async function listClassMeetings(userId: string): Promise<ClassMeeting[]> {
  const { data, error } = await supabase
    .from('class_meetings')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week', { ascending: true });
  if (error) throw new CoursesServiceError(error.message, error);
  return data ?? [];
}

/** Delete a single class meeting. */
export async function deleteClassMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('class_meetings').delete().eq('id', id);
  if (error) throw new CoursesServiceError(error.message, error);
}

/**
 * Convenience: atomically add-or-enroll.
 * Looks up the course by code. Creates it if missing. Then enrolls the user.
 * Throws if the user is already enrolled (pass existing-enrollment check at call site).
 */
export async function addOrEnrollCourse(input: {
  user_id: string;
  code: string;
  name: string;
  color: string;
  instructor: string | null;
}): Promise<Course> {
  const existing = await lookupCourseByCode(input.code);
  let course: Course;
  if (existing) {
    course = existing;
  } else {
    course = await createCourse({
      code: input.code,
      name: input.name,
      default_color: input.color,
      created_by: input.user_id,
    });
  }
  await enrollUserInCourse({
    user_id: input.user_id,
    course_id: course.id,
    color: input.color,
    instructor: input.instructor,
  });
  return course;
}
