// Helper: get the Monday of the current week
function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function weekDay(offset, startH, startM, endH, endM) {
  const base = getWeekStart();
  const start = new Date(base);
  start.setDate(base.getDate() + offset);
  start.setHours(startH, startM, 0, 0);
  const end = new Date(base);
  end.setDate(base.getDate() + offset);
  end.setHours(endH, endM, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

// offset: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
export const INITIAL_STUDY_BLOCKS = [
  // CS 1234 - Data Structures - Mon 9:00-11:00
  {
    id: 'block-1',
    courseId: 'CS1234',
    title: 'CS 1234',
    ...weekDay(0, 9, 0, 11, 0),
    ownerId: 'user-dasanie',
    participants: ['user-dasanie'],
    editable: true,
  },
  // CS 1234 - Wed 9:00-11:00 (Thomas also in it)
  {
    id: 'block-2',
    courseId: 'CS1234',
    title: 'CS 1234',
    ...weekDay(2, 9, 0, 11, 0),
    ownerId: 'user-dasanie',
    participants: ['user-dasanie', 'user-thomas'],
    editable: true,
  },
  // CS 4321 - Database Systems - Tue 12:00-1:00
  {
    id: 'block-3',
    courseId: 'CS4321',
    title: 'CS 4321',
    ...weekDay(1, 12, 0, 13, 0),
    ownerId: 'user-dasanie',
    participants: ['user-dasanie'],
    editable: true,
  },
  // CS 4444 - Capstone - Wed 12:00-3:00
  {
    id: 'block-4',
    courseId: 'CS4444',
    title: 'CS 4444',
    ...weekDay(2, 12, 0, 15, 0),
    ownerId: 'user-dasanie',
    participants: ['user-dasanie'],
    editable: true,
  },
  // CS 4063 - HCI Design - Fri 9:30-11:30 (from another student)
  {
    id: 'block-5',
    courseId: 'CS4063',
    title: 'CS 4063',
    ...weekDay(4, 9, 30, 11, 30),
    ownerId: 'user-allison',
    participants: ['user-allison'],
    editable: false,
  },
];
