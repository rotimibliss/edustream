
export type UserRole = 'admin' | 'teacher' | 'headteacher' | 'principal' | 'parent';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  signature?: string; // ← add this
}

export interface RolePermissions {
  teacher: {
    canManageStudents: boolean;
    canEnterResults: boolean;
    canViewAllStudents: boolean;
    canEditProfiles: boolean;
    canViewBroadsheet: boolean; // Added broadsheet permission
  };
  parent: {
    canViewResults: boolean;
    canViewAttendance: boolean;
    canViewRemarks: boolean;
  };
}

export interface SchoolSettings {
  name: string;
  logo: string;
  address: string;
  email: string;
  phone: string;
  primaryColor: string;
  enableAI: boolean;
  permissions: RolePermissions;
}

export interface Parent {
  id: string;
  title?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  religion?: string;
  occupation?: string;
  stateOfOrigin?: string;
  maritalStatus?: string;
  username?: string;
  password?: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  classId?: string;
  parentId?: string;
  parentName: string;
  parentPhone: string;
  dob: string;
  age: number;
  gender?: 'Male' | 'Female' | 'Other';
  email: string;
  attendance: number;
  performance: number;
  status: 'Active' | 'On Leave' | 'Graduated';
  avatar: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  email: string;
  classes: string[]; 
  experience: number;
  status: 'Active' | 'On Leave';
  avatar: string;
  username?: string;
  password?: string;
  role?: 'teacher' | 'headteacher' | 'principal'; // ← add this
  signature?: string; // ← add this
}

export interface SchoolClass {
  id: string;
  name: string;
  arm: string;
  classTeacherId?: string;
}

export interface Subject {
  id: string;
  name: string;
  classIds: string[];
  teacherId: string;
  isElective?: boolean;
  studentIds?: string[];
}

export interface Result {
  id: string;
  studentId: string;
  subjectId: string;
  classId: string;
  term: string;
  session: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  remark: string;
}

export interface AffectiveTrait {
  id: string;
  name: string;
}

export interface PsychomotorTrait {
  id: string;
  name: string;
}

export interface StudentReport {
  id: string;
  studentId: string;
  classId: string;
  term: string;
  session: string;
  affectiveScores: Record<string, number>;
  psychomotorScores: Record<string, number>;
  teacherComment: string;
  headComment?: string;    // ← add this
  isApproved?: boolean;    // ← add this
  approvedBy?: string;     // ← add this
  timesOpened?: number;
  timesPresent?: number;
  timesAbsent?: number;
}

export interface AcademicSession {
  id: string;
  year: string;
  term: '1st Term' | '2nd Term' | '3rd Term';
  isActive: boolean;
}

export interface SchoolStats {
  totalStudents: number;
  totalTeachers: number;
  averageAttendance: number;
  upcomingEvents: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type View = 'dashboard' | 'teacher-dashboard' | 'students' | 'teachers' | 'classes' | 'subjects' | 'results' | 'reports' | 'parents' | 'parent-portal' | 'sessions' | 'traits' | 'ai-assistant' | 'settings' | 'class-list' | 'maintenance' | 'broadsheet' | 'class-performance' | 'view-subject-results' | 'promotions';
