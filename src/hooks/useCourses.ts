import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  listEnrolledCourses,
  listClassMeetings,
  addOrEnrollCourse,
  dropEnrollment,
  updateEnrollment,
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
  updateCourse: (courseId: string, patch: { color?: string; instructor?: string | null }) => Promise<void>;
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
  const reloadRef = useRef<() => Promise<void>>(async () => {});

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
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    reload();
  }, [reload]);

  // If the tab was backgrounded and its initial reload stalled, re-fire on revive.
  // Also re-fire when ANY useCourses instance reports a mutation, so that sibling
  // consumers (e.g. CoursesSidebar mutates → StudyCalendar picks up the new color)
  // stay in sync without a full Zustand migration.
  useEffect(() => {
    function onChange() { void reloadRef.current(); }
    window.addEventListener('studysync:tab-revived', onChange);
    window.addEventListener('studysync:courses-changed', onChange);
    return () => {
      window.removeEventListener('studysync:tab-revived', onChange);
      window.removeEventListener('studysync:courses-changed', onChange);
    };
  }, []);

  function broadcastChange() {
    window.dispatchEvent(new CustomEvent('studysync:courses-changed'));
  }

  // Mutations: await the actual write + optimistic state update, but do NOT
  // await reload(). The reload is belt-and-suspenders to pick up joined data
  // (e.g. default_color fallback); it must not gate the caller's promise.
  const addCourse = useCallback(
    async (input: { code: string; name: string; color: string; instructor: string | null }) => {
      if (!userId) throw new Error('Not authenticated');
      const course = await addOrEnrollCourse({ user_id: userId, ...input });
      setCourses((prev) => {
        if (prev.some((c) => c.id === course.id)) return prev;
        const optimistic: EnrolledCourse = {
          ...course,
          color: input.color,
          instructor: input.instructor,
          joined_at: new Date().toISOString(),
        };
        return [...prev, optimistic];
      });
      broadcastChange();
      void reload().catch(() => {});
      return course;
    },
    [userId, reload]
  );

  const updateCourse = useCallback(
    async (courseId: string, patch: { color?: string; instructor?: string | null }) => {
      if (!userId) throw new Error('Not authenticated');
      await updateEnrollment({ user_id: userId, course_id: courseId, ...patch });
      setCourses((prev) => prev.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          color: patch.color ?? c.color,
          instructor: patch.instructor === undefined ? c.instructor : patch.instructor,
        };
      }));
      broadcastChange();
      void reload().catch(() => {});
    },
    [userId, reload]
  );

  const dropCourse = useCallback(
    async (courseId: string) => {
      if (!userId) throw new Error('Not authenticated');
      await dropEnrollment(userId, courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setClassMeetings((prev) => prev.filter((m) => m.course_id !== courseId));
      broadcastChange();
      void reload().catch(() => {});
    },
    [userId, reload]
  );

  const addMeeting = useCallback(
    async (input: { course_id: string; day_of_week: number; start_time: string; end_time: string }) => {
      if (!userId) throw new Error('Not authenticated');
      const m = await addClassMeeting({ user_id: userId, ...input });
      setClassMeetings((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      broadcastChange();
      void reload().catch(() => {});
      return m;
    },
    [userId, reload]
  );

  const removeMeeting = useCallback(
    async (meetingId: string) => {
      await deleteClassMeeting(meetingId);
      setClassMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      broadcastChange();
      void reload().catch(() => {});
    },
    [reload]
  );

  return { courses, classMeetings, loading, error, reload, addCourse, updateCourse, dropCourse, addMeeting, removeMeeting };
}
