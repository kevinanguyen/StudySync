import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  listEnrolledCourses,
  listClassMeetings,
  addOrEnrollCourse,
  dropEnrollment,
  addClassMeeting,
  deleteClassMeeting,
} from '@/services/courses.service';
import type { EnrolledCourse, ClassMeeting, Course } from '@/types/domain';

interface UseCoursesResult {
  courses: EnrolledCourse[];
  classMeetings: ClassMeeting[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addCourse: (input: { code: string; name: string; color: string; instructor: string | null }) => Promise<Course>;
  dropCourse: (courseId: string) => Promise<void>;
  addMeeting: (input: { course_id: string; day_of_week: number; start_time: string; end_time: string }) => Promise<ClassMeeting>;
  removeMeeting: (meetingId: string) => Promise<void>;
}

export function useCourses(): UseCoursesResult {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [classMeetings, setClassMeetings] = useState<ClassMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setCourses([]);
      setClassMeetings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [c, m] = await Promise.all([listEnrolledCourses(userId), listClassMeetings(userId)]);
      setCourses(c);
      setClassMeetings(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addCourse = useCallback(
    async (input: { code: string; name: string; color: string; instructor: string | null }) => {
      if (!userId) throw new Error('Not authenticated');
      const course = await addOrEnrollCourse({ user_id: userId, ...input });
      await reload();
      return course;
    },
    [userId, reload]
  );

  const dropCourse = useCallback(
    async (courseId: string) => {
      if (!userId) throw new Error('Not authenticated');
      await dropEnrollment(userId, courseId);
      await reload();
    },
    [userId, reload]
  );

  const addMeeting = useCallback(
    async (input: { course_id: string; day_of_week: number; start_time: string; end_time: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const m = await addClassMeeting({ user_id: userId, ...input });
      await reload();
      return m;
    },
    [userId, reload]
  );

  const removeMeeting = useCallback(
    async (meetingId: string) => {
      await deleteClassMeeting(meetingId);
      await reload();
    },
    [reload]
  );

  return { courses, classMeetings, loading, error, reload, addCourse, dropCourse, addMeeting, removeMeeting };
}
