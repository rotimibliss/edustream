
import { Student, Teacher, SchoolClass, Subject, AcademicSession, Result, Parent, AffectiveTrait, PsychomotorTrait, StudentReport, AuthUser, SchoolSettings, RolePermissions } from '../types';
import { MOCK_STUDENTS, MOCK_TEACHERS } from '../mockData';

const STORAGE_KEYS = {
  INITIALIZED: 'edustream_system_initialized',
  STUDENTS: 'edustream_students',
  TEACHERS: 'edustream_teachers',
  CLASSES: 'edustream_classes',
  SUBJECTS: 'edustream_subjects',
  SESSIONS: 'edustream_sessions_list',
  RESULTS: 'edustream_results',
  PARENTS: 'edustream_parents',
  TRAITS_AFFECTIVE: 'edustream_traits_aff',
  TRAITS_PSYCHOMOTOR: 'edustream_traits_psy',
  STUDENT_REPORTS: 'edustream_reports',
  CURRENT_USER: 'edustream_auth_session',
  SETTINGS: 'edustream_school_settings'
};

const getFromStorage = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  try {
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveToStorage = <T>(key: string, data: T[] | object): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const dataService = {
  init: () => {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (isInitialized === 'true') return;

    const defaultSettings: SchoolSettings = {
      name: 'Lincoln High School',
      logo: '',
      address: '123 Education Way, Scholastic City',
      email: 'admin@lincoln.edu',
      phone: '+1 (555) 000-1234',
      primaryColor: '#4f46e5',
      enableAI: true,
      permissions: {
        teacher: {
          canManageStudents: true,
          canEnterResults: true,
          canViewAllStudents: true,
          canEditProfiles: false,
          canViewBroadsheet: true
        },
        parent: {
          canViewResults: true,
          canViewAttendance: true,
          canViewRemarks: true
        }
      }
    };
    saveToStorage(STORAGE_KEYS.SETTINGS, defaultSettings);

    const initialParents: Parent[] = [
      { id: 'P001', name: 'Sarah Johnson', phone: '+1 555-0101', email: 'sarah.j@example.com', occupation: 'Engineer', username: 'parent1', password: 'password' },
      { id: 'P002', name: 'Luis Garcia', phone: '+1 555-0102', email: 'luis.g@example.com', occupation: 'Doctor', username: 'parent2', password: 'password' }
    ];
    saveToStorage(STORAGE_KEYS.PARENTS, initialParents);

    const teachersWithAuth: Teacher[] = MOCK_TEACHERS.map((t, i) => ({
      ...t,
      username: `teacher${i + 1}`,
      password: 'password',
      classes: i === 0 ? ['C1', 'C2'] : i === 1 ? ['C2', 'C3'] : ['C1']
    }));
    saveToStorage(STORAGE_KEYS.TEACHERS, teachersWithAuth);

    const studentsWithClasses = MOCK_STUDENTS.map((s, idx) => ({
      ...s,
      classId: idx < 3 ? 'C1' : 'C2',
      parentId: idx === 0 ? 'P001' : idx === 1 ? 'P002' : undefined,
      dob: s.dob || '2008-05-15',
      age: s.age || 16,
      gender: s.gender || (idx % 2 === 0 ? 'Male' : 'Female'),
      parentPhone: s.parentPhone || '+234 812 345 6789'
    }));
    saveToStorage(STORAGE_KEYS.STUDENTS, studentsWithClasses);

    const initialClasses: SchoolClass[] = [
      { id: 'C1', name: 'Grade 10', arm: 'A', classTeacherId: 'T001' },
      { id: 'C2', name: 'Grade 10', arm: 'B', classTeacherId: 'T002' },
      { id: 'C3', name: 'Grade 11', arm: 'A', classTeacherId: 'T003' }
    ];
    saveToStorage(STORAGE_KEYS.CLASSES, initialClasses);

    const initialSubjects: Subject[] = [
      { id: 'SUB1', name: 'Mathematics', classIds: ['C1', 'C2'], teacherId: 'T001', isElective: false },
      { id: 'SUB2', name: 'English Language', classIds: ['C1'], teacherId: 'T002', isElective: false },
      { id: 'SUB4', name: 'Physics', classIds: ['C2'], teacherId: 'T002', isElective: true, studentIds: ['S001', 'S002'] }
    ];
    saveToStorage(STORAGE_KEYS.SUBJECTS, initialSubjects);

    saveToStorage(STORAGE_KEYS.TRAITS_AFFECTIVE, [
      { id: 'A1', name: 'Honesty' },
      { id: 'A2', name: 'Neatness' },
      { id: 'A3', name: 'Punctuality' }
    ]);
    saveToStorage(STORAGE_KEYS.TRAITS_PSYCHOMOTOR, [
      { id: 'PS1', name: 'Handwriting' },
      { id: 'PS2', name: 'Handling Tools' }
    ]);

    saveToStorage(STORAGE_KEYS.SESSIONS, [
      { id: 'SES2024-1', year: '2024/2025', term: '1st Term', isActive: true }
    ]);

    saveToStorage(STORAGE_KEYS.RESULTS, []);
    saveToStorage(STORAGE_KEYS.STUDENT_REPORTS, []);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },

  getSettings: (): SchoolSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const parsed = data ? JSON.parse(data) : null;
    if (parsed && !parsed.permissions) {
      parsed.permissions = {
        teacher: { canManageStudents: true, canEnterResults: true, canViewAllStudents: true, canEditProfiles: false, canViewBroadsheet: true },
        parent: { canViewResults: true, canViewAttendance: true, canViewRemarks: true }
      };
    }
    return parsed || {
      name: 'Lincoln High School',
      logo: '',
      address: '',
      email: '',
      phone: '',
      primaryColor: '#4f46e5',
      enableAI: true,
      permissions: {
        teacher: { canManageStudents: true, canEnterResults: true, canViewAllStudents: true, canEditProfiles: false, canViewBroadsheet: true },
        parent: { canViewResults: true, canViewAttendance: true, canViewRemarks: true }
      }
    };
  },

  saveSettings: (settings: SchoolSettings) => {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
    window.dispatchEvent(new Event('schoolSettingsUpdated'));
  },

  login: (username: string, password: string): AuthUser | null => {
    if (username === 'Admin' && password === 'admin123') {
      const user: AuthUser = { id: 'admin', name: 'System Admin', role: 'admin', avatar: 'https://picsum.photos/seed/admin/100' };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    const teachers = dataService.getTeachers();
    const teacher = teachers.find(t => t.username === username && t.password === password);
    if (teacher) {
      const user: AuthUser = { id: teacher.id, name: teacher.name, role: 'teacher', avatar: teacher.avatar };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    const parents = dataService.getParents();
    const parent = parents.find(p => p.username === username && p.password === password);
    if (parent) {
      const user: AuthUser = { id: parent.id, name: parent.name, role: 'parent', avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(parent.name)}&background=random` };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser: (): AuthUser | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  getAffectiveTraits: (): AffectiveTrait[] => getFromStorage<AffectiveTrait>(STORAGE_KEYS.TRAITS_AFFECTIVE),
  addAffectiveTrait: (name: string) => {
    const traits = dataService.getAffectiveTraits();
    const newTrait = { id: `A${Date.now()}`, name };
    saveToStorage(STORAGE_KEYS.TRAITS_AFFECTIVE, [...traits, newTrait]);
    return newTrait;
  },
  deleteAffectiveTrait: (id: string) => {
    const traits = dataService.getAffectiveTraits();
    saveToStorage(STORAGE_KEYS.TRAITS_AFFECTIVE, traits.filter(t => t.id !== id));
  },
  getPsychomotorTraits: (): PsychomotorTrait[] => getFromStorage<PsychomotorTrait>(STORAGE_KEYS.TRAITS_PSYCHOMOTOR),
  addPsychomotorTrait: (name: string) => {
    const traits = dataService.getPsychomotorTraits();
    const newTrait = { id: `PS${Date.now()}`, name };
    saveToStorage(STORAGE_KEYS.TRAITS_PSYCHOMOTOR, [...traits, newTrait]);
    return newTrait;
  },
  deletePsychomotorTrait: (id: string) => {
    const traits = dataService.getPsychomotorTraits();
    saveToStorage(STORAGE_KEYS.TRAITS_PSYCHOMOTOR, traits.filter(t => t.id !== id));
  },
  getStudentReports: (): StudentReport[] => getFromStorage<StudentReport>(STORAGE_KEYS.STUDENT_REPORTS),
  saveStudentReport: (report: StudentReport) => {
    const reports = dataService.getStudentReports();
    const idx = reports.findIndex(r => r.studentId === report.studentId && r.term === report.term && r.session === report.session);
    if (idx >= 0) {
      reports[idx] = report;
      saveToStorage(STORAGE_KEYS.STUDENT_REPORTS, reports);
    } else {
      saveToStorage(STORAGE_KEYS.STUDENT_REPORTS, [...reports, report]);
    }
  },
  getSessions: (): AcademicSession[] => getFromStorage<AcademicSession>(STORAGE_KEYS.SESSIONS),
  addSession: (s: Omit<AcademicSession, 'id' | 'isActive'>) => {
    const sessions = dataService.getSessions();
    const newSession: AcademicSession = { ...s, id: `SES${Date.now()}`, isActive: false };
    saveToStorage(STORAGE_KEYS.SESSIONS, [...sessions, newSession]);
    return newSession;
  },
  updateSession: (updated: AcademicSession) => {
    const sessions = dataService.getSessions();
    saveToStorage(STORAGE_KEYS.SESSIONS, sessions.map(s => s.id === updated.id ? updated : s));
  },
  deleteSession: (id: string) => {
    const sessions = dataService.getSessions();
    saveToStorage(STORAGE_KEYS.SESSIONS, sessions.filter(s => s.id !== id));
  },
  getActiveSession: (): AcademicSession => {
    const sessions = dataService.getSessions();
    return sessions.find(s => s.isActive) || { id: 'SES-DEFAULT', year: '2024/2025', term: '1st Term', isActive: true };
  },
  setActiveSession: (id: string) => {
    const sessions = dataService.getSessions();
    saveToStorage(STORAGE_KEYS.SESSIONS, sessions.map(s => ({ ...s, isActive: s.id === id })));
  },
  getParents: (): Parent[] => getFromStorage<Parent>(STORAGE_KEYS.PARENTS),
  addParent: (p: Omit<Parent, 'id'>) => {
    const parents = dataService.getParents();
    const newParent = { ...p, id: `P${Date.now().toString().slice(-4)}` };
    saveToStorage(STORAGE_KEYS.PARENTS, [newParent, ...parents]);
    return newParent;
  },
  updateParent: (updated: Parent) => {
    const parents = dataService.getParents();
    saveToStorage(STORAGE_KEYS.PARENTS, parents.map(p => p.id === updated.id ? updated : p));
  },
  getClasses: (): SchoolClass[] => getFromStorage<SchoolClass>(STORAGE_KEYS.CLASSES),
  addClass: (cls: Partial<SchoolClass>) => {
    const classes = dataService.getClasses();
    const newCls = { ...cls, id: cls.id || `CLS${Date.now()}` };
    saveToStorage(STORAGE_KEYS.CLASSES, [...classes, newCls]);
    return newCls;
  },
  updateClass: (updated: SchoolClass) => {
    const classes = dataService.getClasses();
    saveToStorage(STORAGE_KEYS.CLASSES, classes.map(c => c.id === updated.id ? updated : c));
  },
  deleteClass: (id: string) => {
    const classes = dataService.getClasses();
    saveToStorage(STORAGE_KEYS.CLASSES, classes.filter(c => c.id !== id));
  },
  getSubjects: (): Subject[] => getFromStorage<Subject>(STORAGE_KEYS.SUBJECTS),
  addSubject: (sub: Omit<Subject, 'id'>) => {
    const subjects = dataService.getSubjects();
    const newSub = { ...sub, id: `SUB${Date.now()}` };
    saveToStorage(STORAGE_KEYS.SUBJECTS, [...subjects, newSub]);
    return newSub;
  },
  updateSubject: (updated: Subject) => {
    const subjects = dataService.getSubjects();
    saveToStorage(STORAGE_KEYS.SUBJECTS, subjects.map(s => s.id === updated.id ? updated : s));
  },
  deleteSubject: (id: string) => {
    const subjects = dataService.getSubjects();
    saveToStorage(STORAGE_KEYS.SUBJECTS, subjects.filter(s => s.id !== id));
  },
  getResults: (): Result[] => getFromStorage<Result>(STORAGE_KEYS.RESULTS),
  saveResult: (result: Result) => {
    const results = dataService.getResults();
    const existingIdx = results.findIndex(r => 
      r.studentId === result.studentId && 
      r.subjectId === result.subjectId && 
      r.classId === result.classId && 
      r.term === result.term && 
      r.session === result.session
    );
    if (existingIdx >= 0) {
      results[existingIdx] = result;
      saveToStorage(STORAGE_KEYS.RESULTS, results);
    } else {
      saveToStorage(STORAGE_KEYS.RESULTS, [...results, result]);
    }
  },
  getStudents: (): Student[] => {
    return getFromStorage<Student>(STORAGE_KEYS.STUDENTS);
  },
  addStudent: (s: Partial<Student>) => {
     const items = dataService.getStudents();
     const newItem: Student = { 
       ...s, 
       id: `S${Date.now().toString().slice(-4)}`, 
       attendance: s.attendance || 100, 
       performance: s.performance || 0, 
       status: s.status || 'Active',
       name: s.name || 'Unknown Student',
       grade: s.grade || 'N/A',
       parentName: s.parentName || 'N/A',
       parentPhone: s.parentPhone || 'N/A',
       dob: s.dob || '2000-01-01',
       age: s.age || 0,
       gender: s.gender || 'Other',
       email: s.email || '',
       avatar: s.avatar || `https://picsum.photos/seed/${s.name?.replace(/\s/g, '') || Date.now()}/200`
     };
     saveToStorage(STORAGE_KEYS.STUDENTS, [newItem, ...items]);
     return newItem;
  },
  updateStudent: (updated: Student) => {
    const items = dataService.getStudents();
    saveToStorage(STORAGE_KEYS.STUDENTS, items.map(i => i.id === updated.id ? updated : i));
  },
  deleteStudent: (id: string) => {
    const items = dataService.getStudents();
    saveToStorage(STORAGE_KEYS.STUDENTS, items.filter(i => i.id !== id));
  },
  getTeachers: (): Teacher[] => getFromStorage<Teacher>(STORAGE_KEYS.TEACHERS),
  addTeacher: (t: Partial<Teacher>) => {
    const items = dataService.getTeachers();
    const newItem: Teacher = { 
      ...t, 
      id: `T${Date.now()}`, 
      avatar: t.avatar || `https://picsum.photos/seed/${Math.random()}/200`, 
      status: 'Active', 
      username: t.username || `user${Date.now()}`, 
      password: t.password || 'password',
      name: t.name || 'Unknown',
      subject: t.subject || 'N/A',
      email: t.email || '',
      experience: t.experience || 0,
      classes: t.classes || []
    };
    saveToStorage(STORAGE_KEYS.TEACHERS, [newItem, ...items]);
    return newItem;
  },
  updateTeacher: (updated: Teacher) => {
    const items = dataService.getTeachers();
    saveToStorage(STORAGE_KEYS.TEACHERS, items.map(i => i.id === updated.id ? updated : i));
  },
  deleteTeacher: (id: string) => {
    const items = dataService.getTeachers();
    saveToStorage(STORAGE_KEYS.TEACHERS, items.filter(i => i.id !== id));
  },
  getLiveDashboardData: () => {
    const students = dataService.getStudents();
    const teachers = dataService.getTeachers();
    const results = dataService.getResults();
    const activeSession = dataService.getActiveSession();
    
    const totalStudents = students.length;
    const totalTeachers = teachers.length;
    const avgAttendance = totalStudents > 0 
      ? Math.round(students.reduce((acc, s) => acc + (s.attendance || 0), 0) / totalStudents)
      : 0;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const trendData = months.map((month, idx) => {
      const basePerformance = students.length > 0 
        ? Math.round(students.reduce((acc, s) => acc + (s.performance || 0), 0) / students.length)
        : 75;
      return { 
        month, 
        average: Math.min(100, Math.max(0, basePerformance - 5 + (idx * 2) + (Math.random() * 4))) 
      };
    });

    const urgentActions = [];
    
    const lowAttendanceCount = students.filter(s => s.attendance < 75).length;
    if (lowAttendanceCount > 0) {
      urgentActions.push({
        title: 'Attendance Warning',
        desc: `${lowAttendanceCount} students below 75%`,
        time: '1h ago',
        type: 'error'
      });
    }

    const currentResults = results.filter(r => r.term === activeSession.term && r.session === activeSession.year);
    if (currentResults.length === 0 && students.length > 0) {
      urgentActions.push({
        title: 'Grade Review',
        desc: 'Terminal marks pending synchronization',
        time: '5h ago',
        type: 'warning'
      });
    }

    const recentStudents = students.filter(s => s.id.startsWith('S' + new Date().getFullYear().toString().slice(-2)));
    if (recentStudents.length > 0) {
      urgentActions.push({
        title: 'New Registrations',
        desc: `${recentStudents.length} new enrollments pending review`,
        time: 'Today',
        type: 'info'
      });
    }

    return {
      stats: {
        totalStudents,
        totalTeachers,
        avgAttendance,
        upcomingEvents: 4
      },
      performanceTrend: trendData,
      urgentActions: urgentActions.length > 0 ? urgentActions : [
        { title: 'System Healthy', desc: 'All records up to date', time: 'Just now', type: 'info' }
      ]
    };
  }
};
