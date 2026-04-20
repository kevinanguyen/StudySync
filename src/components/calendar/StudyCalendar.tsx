import { useState, useRef, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventContentArg, DatesSetArg, DateSelectArg, EventDropArg, EventClickArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { startOfWeek, endOfWeek, expandClassMeetings } from '@/lib/time';
import { useEvents } from '@/hooks/useEvents';
import { useCourses } from '@/hooks/useCourses';
import { useAuthStore } from '@/store/authStore';
import CreateEventDrawer from './CreateEventDrawer';
import EventDetailsPanel from './EventDetailsPanel';
import type { EventRow } from '@/types/domain';

function getCourseColor(courseId: string | null, courses: { id: string; color: string }[]): string {
  if (!courseId) return '#6B7280';
  return courses.find((c) => c.id === courseId)?.color ?? '#6B7280';
}

function EventContent({ eventInfo }: { eventInfo: EventContentArg }) {
  const { event } = eventInfo;
  const isClassMeeting = event.extendedProps.kind === 'class_meeting';
  return (
    <div className="h-full flex flex-col px-1 py-0.5 overflow-hidden">
      <span className={`font-bold text-[0.68rem] leading-tight truncate ${isClassMeeting ? 'opacity-70' : ''}`}>
        {event.title}
      </span>
      <span className="text-[0.6rem] opacity-80 leading-tight truncate">{eventInfo.timeText}</span>
    </div>
  );
}

interface CreateDraft {
  start: Date;
  end: Date;
}

export default function StudyCalendar() {
  const calRef = useRef<FullCalendar>(null);
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [weekRange, setWeekRange] = useState('');
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekEnd = useMemo(() => endOfWeek(anchorDate), [anchorDate]);

  const { events, createOne, updateOne, patchLocal, deleteOne } = useEvents(weekStart, weekEnd);
  const { courses, classMeetings } = useCourses();

  const userId = useAuthStore((s) => s.session?.user.id ?? null);

  const expandedMeetings = useMemo(() => expandClassMeetings(classMeetings, weekStart), [classMeetings, weekStart]);

  const fcEvents = useMemo(() => {
    const eventItems = events.map((e) => ({
      id: `event:${e.id}`,
      title: e.title,
      start: e.start_at,
      end: e.end_at,
      backgroundColor: getCourseColor(e.course_id, courses),
      borderColor: 'transparent',
      textColor: '#ffffff',
      editable: e.owner_id === userId,
      extendedProps: { kind: 'event', source: e },
    }));
    const meetingItems = expandedMeetings.map((m) => ({
      id: `meeting:${m.id}`,
      title: courses.find((c) => c.id === m.course_id)?.code ?? 'Class',
      start: m.start_at,
      end: m.end_at,
      backgroundColor: getCourseColor(m.course_id, courses),
      borderColor: 'transparent',
      textColor: '#ffffff',
      editable: false,
      display: 'background' as const,
      extendedProps: { kind: 'class_meeting' },
    }));
    return [...eventItems, ...meetingItems];
  }, [events, expandedMeetings, courses, userId]);

  const handleDateSelect = useCallback((info: DateSelectArg) => {
    setCreateDraft({ start: info.start, end: info.end });
    info.view.calendar.unselect();
  }, []);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const source = info.event.extendedProps.source as EventRow | undefined;
    if (source) setSelectedEvent(source);
  }, []);

  const handleEventResize = useCallback(
    async (info: EventResizeDoneArg) => {
      const ev = info.event;
      const source = ev.extendedProps.source as EventRow | undefined;
      if (!source) return;
      const rollback = patchLocal(source.id, { start_at: ev.startStr, end_at: ev.endStr });
      try {
        await updateOne(source.id, { start_at: ev.startStr, end_at: ev.endStr });
      } catch {
        rollback();
        info.revert();
      }
    },
    [patchLocal, updateOne]
  );

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const ev = info.event;
      const source = ev.extendedProps.source as EventRow | undefined;
      if (!source) return;
      const rollback = patchLocal(source.id, { start_at: ev.startStr, end_at: ev.endStr });
      try {
        await updateOne(source.id, { start_at: ev.startStr, end_at: ev.endStr });
      } catch {
        rollback();
        info.revert();
      }
    },
    [patchLocal, updateOne]
  );

  const handleDatesSet = useCallback((dateInfo: DatesSetArg) => {
    const start = dateInfo.start;
    const endDate = new Date(dateInfo.end);
    endDate.setDate(endDate.getDate() - 1);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', opts);
    const endStr = endDate.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    setWeekRange(`${startStr} – ${endStr}`);
    setAnchorDate(start);
  }, []);

  function navPrev() { calRef.current?.getApi().prev(); }
  function navNext() { calRef.current?.getApi().next(); }
  function navToday() { calRef.current?.getApi().today(); }

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-800 mr-1">This Week</h2>
        <button onClick={navPrev} aria-label="Previous week" className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-500 min-w-[150px] text-center select-none">{weekRange}</span>
        <button onClick={navNext} aria-label="Next week" className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setCreateDraft({ start: new Date(), end: new Date(Date.now() + 60 * 60 * 1000) })}
          className="ml-auto text-xs font-semibold text-white bg-[#3B5BDB] hover:bg-[#3451c7] px-3 py-1.5 rounded transition-colors"
        >
          + New Event
        </button>
        <button
          onClick={navToday}
          className="text-xs text-[#3B5BDB] border border-[#3B5BDB]/40 px-3 py-1 rounded hover:bg-blue-50 transition-colors font-medium"
        >
          Today
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <FullCalendar
          ref={calRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={false}
          allDaySlot={false}
          slotMinTime="08:30:00"
          slotMaxTime="19:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          slotLabelFormat={{ hour: 'numeric', omitZeroMinute: false, meridiem: 'short' }}
          firstDay={1}
          nowIndicator
          selectable
          selectMirror
          editable
          eventResizableFromStart={false}
          events={fcEvents}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventResize={handleEventResize}
          eventDrop={handleEventDrop}
          datesSet={handleDatesSet}
          eventContent={(info) => <EventContent eventInfo={info} />}
          height="100%"
          expandRows
          scrollTime="08:45:00"
          dayHeaderContent={(args) => {
            const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
            const dow = args.date.getDay();
            const label = dayNames[dow === 0 ? 6 : dow - 1];
            return (
              <div className={`text-center py-1 ${args.isToday ? 'text-[#3B5BDB]' : 'text-gray-500'}`}>
                <span className="text-[0.68rem] font-bold tracking-widest">{label}</span>
              </div>
            );
          }}
        />
      </div>

      <CreateEventDrawer
        open={!!createDraft}
        draft={createDraft}
        onClose={() => setCreateDraft(null)}
        onCreated={async (input) => {
          await createOne(input);
          setCreateDraft(null);
        }}
        existingEvents={events}
        expandedClassMeetings={expandedMeetings}
      />
      <EventDetailsPanel
        event={selectedEvent}
        courses={courses}
        currentUserId={userId}
        onClose={() => setSelectedEvent(null)}
        onUpdate={async (patch) => {
          if (!selectedEvent) return;
          const updated = await updateOne(selectedEvent.id, patch);
          setSelectedEvent(updated);
        }}
        onDelete={async () => {
          if (!selectedEvent) return;
          await deleteOne(selectedEvent.id);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
}
