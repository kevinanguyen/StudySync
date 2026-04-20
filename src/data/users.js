export const CURRENT_USER = {
  id: 'user-dasanie',
  name: 'Dasanie Le',
  username: 'Dasanie001',
  status: 'available',
  enrolledCourses: ['CS1234', 'CS4321', 'CS4444', 'CS4063'],
  avatar: null,
  avatarColor: '#F59E0B',
  initials: 'DL',
};

export const FRIENDS = [
  {
    id: 'user-allison',
    name: 'Allison Helling',
    username: 'allison_h',
    status: 'available',
    statusText: 'Available',
    enrolledCourses: ['CS1234', 'CS4063'],
    avatar: null,
    avatarColor: '#F97316',
    initials: 'AH',
  },
  {
    id: 'user-thomas',
    name: 'Thomas Duffy',
    username: 'thomas_d',
    status: 'studying',
    statusText: 'Studying CS 1234',
    studyingCourse: 'CS1234',
    enrolledCourses: ['CS1234', 'CS4321'],
    avatar: null,
    avatarColor: '#8B5CF6',
    initials: 'TD',
  },
  {
    id: 'user-kevin',
    name: 'Kevin Nguyen',
    username: 'kevin_n',
    status: 'available',
    statusText: 'Available',
    enrolledCourses: ['CS1234', 'CS4444'],
    avatar: null,
    avatarColor: '#10B981',
    initials: 'KN',
  },
  {
    id: 'user-tony',
    name: 'Tony Hoang',
    username: 'tony_h',
    status: 'busy',
    statusText: 'Busy',
    enrolledCourses: ['CS4321', 'CS4063'],
    avatar: null,
    avatarColor: '#EF4444',
    initials: 'TH',
  },
];

export const statusConfig = {
  available: { color: '#22C55E', label: 'Available' },
  studying:  { color: '#EAB308', label: 'Studying'  },
  busy:      { color: '#EF4444', label: 'Busy'      },
};
