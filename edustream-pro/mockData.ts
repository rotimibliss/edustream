
import { Student, Teacher, SchoolStats } from './types';

export const MOCK_STUDENTS: Student[] = [
  {
    id: 'S001',
    name: 'Alex Johnson',
    grade: '10th Grade',
    parentName: 'Sarah Johnson',
    // Added missing parentPhone
    parentPhone: '+1 555-0101',
    // Added missing dob
    dob: '2008-05-15',
    // Added missing age
    age: 16,
    gender: 'Male', // Added gender
    email: 'alex.j@school.com',
    attendance: 94,
    performance: 88,
    status: 'Active',
    avatar: 'https://picsum.photos/seed/alex/200'
  },
  {
    id: 'S002',
    name: 'Maria Garcia',
    grade: '11th Grade',
    parentName: 'Luis Garcia',
    // Added missing parentPhone
    parentPhone: '+1 555-0102',
    // Added missing dob
    dob: '2007-09-20',
    // Added missing age
    age: 17,
    gender: 'Female', // Added gender
    email: 'maria.g@school.com',
    attendance: 98,
    performance: 92,
    status: 'Active',
    avatar: 'https://picsum.photos/seed/maria/200'
  },
  {
    id: 'S003',
    name: 'Kevin Smith',
    grade: '9th Grade',
    parentName: 'John Smith',
    // Added missing parentPhone
    parentPhone: '+1 555-0103',
    // Added missing dob
    dob: '2009-11-05',
    // Added missing age
    age: 15,
    gender: 'Male', // Added gender
    email: 'kevin.s@school.com',
    attendance: 82,
    performance: 75,
    status: 'Active',
    avatar: 'https://picsum.photos/seed/kevin/200'
  },
  {
    id: 'S004',
    name: 'Emily Chen',
    grade: '12th Grade',
    parentName: 'Wei Chen',
    // Added missing parentPhone
    parentPhone: '+1 555-0104',
    // Added missing dob
    dob: '2006-03-12',
    // Added missing age
    age: 18,
    gender: 'Female', // Added gender
    email: 'emily.c@school.com',
    attendance: 100,
    performance: 96,
    status: 'Active',
    avatar: 'https://picsum.photos/seed/emily/200'
  },
  {
    id: 'S005',
    name: 'James Wilson',
    grade: '10th Grade',
    parentName: 'Robert Wilson',
    // Added missing parentPhone
    parentPhone: '+1 555-0105',
    // Added missing dob
    dob: '2008-07-22',
    // Added missing age
    age: 16,
    gender: 'Male', // Added gender
    email: 'james.w@school.com',
    attendance: 65,
    performance: 68,
    status: 'On Leave',
    avatar: 'https://picsum.photos/seed/james/200'
  }
];

export const MOCK_TEACHERS: Teacher[] = [
  {
    id: 'T001',
    name: 'Dr. Sarah Miller',
    subject: 'Mathematics',
    email: 's.miller@school.com',
    classes: ['10A', '11B', '12A'],
    experience: 12,
    status: 'Active',
    avatar: 'https://picsum.photos/seed/sarah/200'
  },
  {
    id: 'T002',
    name: 'Prof. David Brown',
    subject: 'Physics',
    email: 'd.brown@school.com',
    classes: ['11A', '12B'],
    experience: 8,
    status: 'Active',
    avatar: 'https://picsum.photos/seed/david/200'
  },
  {
    id: 'T003',
    name: 'Elena Rodriguez',
    subject: 'Literature',
    email: 'e.rodriguez@school.com',
    classes: ['9C', '10B'],
    experience: 5,
    status: 'Active',
    avatar: 'https://picsum.photos/seed/elena/200'
  }
];

export const MOCK_STATS: SchoolStats = {
  totalStudents: 1240,
  totalTeachers: 85,
  averageAttendance: 92,
  upcomingEvents: 4
};

export const PERFORMANCE_DATA = [
  { month: 'Jan', average: 75 },
  { month: 'Feb', average: 78 },
  { month: 'Mar', average: 82 },
  { month: 'Apr', average: 80 },
  { month: 'May', average: 85 },
  { month: 'Jun', average: 88 },
];
