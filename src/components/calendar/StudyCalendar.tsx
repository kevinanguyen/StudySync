import { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventContentArg, DatesSetArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getCourse } from '../../data/courses';
import { FRIENDS } from '../../data/users';
import { INITIAL_STUDY_BLOCKS } from '../../data/studyBlocks';
import CreateBlockModal from '../shared/CreateBlockModal';

interface Block {
  id: string;
  courseId: string;
  title: string;
  start: string;
  end: string;
  ownerId: string;
  participants: string[];
  editable: boolean;
}

interface ModalState {
  position: { x: number; y: number };
  timeInfo: {
    startStr: string;
    endStr: string;
    start: Date;
    end: Date;
  };
}

let blockCounter = 100;

function toFCEvents(blocks: Block[]) {
  return blocks.map((block) => {
    const course = getCourse(block.courseId);
    return {
      id: block.id,
      title: block.title,
      start: block.start,
      end: block.end,
      backgroundColor: course?.color || '#6B7280',
      borderColor: 'transparent',
      textColor: '#ffffff',
      editable: block.editable !== false,
      extendedProps: {
        courseId: block.courseId,
        ownerId: block.ownerId,
        participants: block.participants || [],
        editable: block.editable !== false,
      },
    };
  });
}

interface ParticipantAvatarsProps {
  participants: string[];
}

function ParticipantAvatars({ participants }: ParticipantAvatarsProps) {
  const friends = FRIENDS.filter((f: { id: string }) => participants.includes(f.id));
  if (friends.length === 0) return null;
  return (
    <div className="flex gap-0.5 mt-0.5 flex-wrap">
      {friends.map((f: { id: string; avatarColor: string; initials: string; name: string }) => (
        <div
          key={f.id}
          className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-white/60"
          style={{ backgroundColor: f.avatarColor }}
          title={f.name}
        >
          {f.initials}
        </div>
      ))}
    </div>
  );
}

function EventContent({ eventInfo }: { eventInfo: EventContentArg }) {
  const { event } = eventInfo;
  const { participants, editable } = event.extendedProps as { participants: string[]; editable: boolean };
  const isOwned = editable !== false;

  return (
    <div className="h-full flex flex-col px-1 py-0.5 overflow-hidden">
      <span className="font-bold text-[0.68rem] leading-tight truncate">{event.title}</span>
      <div className="flex items-center gap-0.5">
        <span className="text-[0.6rem] opacity-80 leading-tight truncate">{eventInfo.timeText}</span>
        {!isOwned && (
          <span className="text-[0.5rem] bg-white/30 rounded px-0.5 leading-tight flex-shrink-0">shared</span>
        )}
      </div>
      {participants && participants.length > 0 && <ParticipantAvatars participants={participants} />}
    </div>
  );
}

export default function StudyCalendar() {
  const calRef = useRef<FullCalendar>(null);
  const [blocks, setBlocks] = useState<Block[]>(INITIAL_STUDY_BLOCKS as Block[]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [weekRange, setWeekRange] = useState('');

  const fcEvents = toFCEvents(blocks);

  function getModalPosition(jsEvent: MouseEvent | null) {
    if (jsEvent) {
      return {
        x: Math.min(jsEvent.clientX + 10, window.innerWidth - 250),
        y: Math.min(jsEvent.clientY - 20, window.innerHeight - 320),
      };
    }
    const rect = document.querySelector('.fc-timegrid-body')?.getBoundingClientRect();
    return { x: (rect?.left || 300) + 100, y: (rect?.top || 200) + 80 };
  }

  function handleDateSelect(selectInfo: DateSelectArg) {
    setModal({
      position: getModalPosition(selectInfo.jsEvent as MouseEvent | null),
      timeInfo: {
        startStr: selectInfo.startStr,
        endStr: selectInfo.endStr,
        start: selectInfo.start,
        end: selectInfo.end,
      },
    });
    selectInfo.view.calendar.unselect();
  }

  function handleModalConfirm(course: { id: string; code: string }) {
    if (!modal?.timeInfo) return;
    const newBlock: Block = {
      id: `block-new-${++blockCounter}`,
      courseId: course.id,
      title: course.code,
      start: modal.timeInfo.startStr,
      end: modal.timeInfo.endStr,
      ownerId: 'user-dasanie',
      participants: ['user-dasanie'],
      editable: true,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setModal(null);
  }

  function handleEventResize(info: EventResizeDoneArg) {
    const { event } = info;
    setBlocks((prev) =>
      prev.map((b) => (b.id === event.id ? { ...b, start: event.startStr, end: event.endStr } : b))
    );
  }

  function handleEventDrop(info: EventDropArg) {
    const { event } = info;
    setBlocks((prev) =>
      prev.map((b) => (b.id === event.id ? { ...b, start: event.startStr, end: event.endStr } : b))
    );
  }

  function handleDatesSet(dateInfo: DatesSetArg) {
    const start = dateInfo.start;
    const end = new Date(dateInfo.end);
    end.setDate(end.getDate() - 1);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', opts);
    const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    setWeekRange(`${startStr} – ${endStr}`);
  }

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
        <button onClick={navToday} className="ml-auto text-xs text-[#3B5BDB] border border-[#3B5BDB]/40 px-3 py-1 rounded hover:bg-blue-50 transition-colors font-medium">
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
          nowIndicator={true}
          selectable={true}
          selectMirror={true}
          editable={true}
          eventResizableFromStart={false}
          events={fcEvents}
          select={handleDateSelect}
          eventResize={handleEventResize}
          eventDrop={handleEventDrop}
          datesSet={handleDatesSet}
          eventContent={(info) => <EventContent eventInfo={info} />}
          height="100%"
          expandRows={true}
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

      {modal && (
        <CreateBlockModal
          position={modal.position}
          timeInfo={modal.timeInfo}
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
