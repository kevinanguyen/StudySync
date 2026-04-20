export const COURSES = [
  {
    id: 'CS1234',
    code: 'CS 1234',
    name: 'Data Structures',
    color: '#FA5252',       // red
    bgColor: 'bg-red-100',
    accentColor: '#FA5252',
    textColor: '#ffffff',
  },
  {
    id: 'CS4321',
    code: 'CS 4321',
    name: 'Database Systems',
    color: '#7950F2',       // purple
    bgColor: 'bg-purple-100',
    accentColor: '#7950F2',
    textColor: '#ffffff',
  },
  {
    id: 'CS4444',
    code: 'CS 4444',
    name: 'Capstone Design Project',
    color: '#F06292',       // pink
    bgColor: 'bg-pink-100',
    accentColor: '#F06292',
    textColor: '#ffffff',
  },
  {
    id: 'CS4063',
    code: 'CS 4063',
    name: 'HCI Design',
    color: '#00BCD4',       // teal/cyan
    bgColor: 'bg-cyan-100',
    accentColor: '#00BCD4',
    textColor: '#ffffff',
  },
];

export const getCourse = (id) => COURSES.find(c => c.id === id);
