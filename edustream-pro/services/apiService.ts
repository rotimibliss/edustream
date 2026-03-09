// API Service Layer for EduStream Pro Frontend
import { Student, Teacher, SchoolClass, Subject, Result, AcademicSession, Parent, AffectiveTrait, PsychomotorTrait, StudentReport, AuthUser, SchoolSettings } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'edustream_auth_token';

const getAuthHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
};

const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...getAuthHeaders(), ...options.headers },
    });
    return handleResponse(response);
  },
  get: (endpoint: string) => api.fetch(endpoint),
  post: (endpoint: string, data: any) => api.fetch(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint: string, data: any) => api.fetch(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint: string) => api.fetch(endpoint, { method: 'DELETE' }),
};

export const apiService = {
  init: () => {
    console.log('API Service initialized');
  },

  // ========================================
  // AUTHENTICATION
  // ========================================
  login: async (username: string, password: string): Promise<AuthUser | null> => {
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem('edustream_current_user', JSON.stringify(response.user));
      return response.user;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('edustream_current_user');
    api.post('/auth/logout', {}).catch(() => {});
  },

  getCurrentUser: (): AuthUser | null => {
    const userStr = localStorage.getItem('edustream_current_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      return true;
    } catch (error) {
      return false;
    }
  },

  // ========================================
  // STUDENTS
  // NOTE: Backend toFrontend() already returns camelCase - NO remapping needed!
  // ========================================
  getStudents: async (sessionYear?: string): Promise<Student[]> => {
  try {
    const endpoint = sessionYear 
      ? `/students?session=${encodeURIComponent(sessionYear)}`
      : '/students';
    const data = await api.get(endpoint);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Get students error:', error);
    return [];
  }
},

  addStudent: async (student: Partial<Student>): Promise<Student> => {
    // Send camelCase - backend POST handler converts to snake_case for DB
    return await api.post('/students', {
      name: student.name,
      grade: student.grade,
      classId: student.classId,
      parentId: student.parentId,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      dob: student.dob,
      age: student.age,
      gender: student.gender,
      email: student.email,
      attendance: student.attendance || 100,
      performance: student.performance || 0,
      status: student.status || 'Active',
      avatar: student.avatar
    });
  },

  updateStudent: async (student: Student): Promise<void> => {
    // Send camelCase - backend PUT handler converts to snake_case for DB
    await api.put(`/students/${student.id}`, {
      name: student.name,
      grade: student.grade,
      classId: student.classId,
      parentId: student.parentId,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      dob: student.dob,
      age: student.age,
      gender: student.gender,
      email: student.email,
      attendance: student.attendance,
      performance: student.performance,
      status: student.status,
      avatar: student.avatar
    });
  },

  deleteStudent: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}`);
  },

  // ── PROMOTION ──────────────────────────────────────────────────────────────
promoteStudents: async (payload: {
  studentIds: string[];
  fromClassId: string;
  toClassId?: string;
  fromSession: string;
  toSession?: string;
  graduate?: boolean;
}): Promise<{ message: string; promoted: number; graduated: number; errors: any[] }> => {
  const res = await api.post('/students/promote', payload);
  return res.data;
},

getStudentClassHistory: async (studentId: string): Promise<{ id: string; student_id: string; class_id: string; session_year: string }[]> => {
  const res = await api.get(`/students/${studentId}/class-history`);
  return res.data;
},

  // ========================================
  // TEACHERS
  // ========================================
  getTeachers: async (): Promise<Teacher[]> => {
    try {
      const data = await api.get('/teachers');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Get teachers error:', error);
      return [];
    }
  },

  addTeacher: async (teacher: Partial<Teacher>): Promise<Teacher> => {
    return await api.post('/teachers', teacher);
  },

  updateTeacher: async (teacher: Teacher): Promise<void> => {
    await api.put(`/teachers/${teacher.id}`, teacher);
  },

  deleteTeacher: async (id: string): Promise<void> => {
    await api.delete(`/teachers/${id}`);
  },

  // ========================================
  // CLASSES
  // NOTE: Backend toFrontend() already returns camelCase - NO remapping needed!
  // ========================================
  getClasses: async (): Promise<SchoolClass[]> => {
    try {
      const data = await api.get('/classes');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Get classes error:', error);
      return [];
    }
  },

  addClass: async (cls: Partial<SchoolClass>): Promise<SchoolClass> => {
    // Send camelCase - backend converts to snake_case
    return await api.post('/classes', {
      name: cls.name,
      arm: cls.arm,
      classTeacherId: cls.classTeacherId
    });
  },

  updateClass: async (cls: SchoolClass): Promise<void> => {
    await api.put(`/classes/${cls.id}`, {
      name: cls.name,
      arm: cls.arm,
      classTeacherId: cls.classTeacherId
    });
  },

  deleteClass: async (id: string): Promise<void> => {
    await api.delete(`/classes/${id}`);
  },

  // ========================================
  // SUBJECTS
  // ========================================
  getSubjects: async (): Promise<Subject[]> => {
    try {
      const data = await api.get('/subjects');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Get subjects error:', error);
      return [];
    }
  },

  addSubject: async (subject: Omit<Subject, 'id'>): Promise<Subject> => {
    return await api.post('/subjects', {
      name: subject.name,
      isElective: subject.isElective,
      classIds: subject.classIds || [],
      teacherId: subject.teacherId || ''
    });
  },

  updateSubject: async (subject: Subject): Promise<void> => {
    await api.put(`/subjects/${subject.id}`, {
      name: subject.name,
      isElective: subject.isElective,
      classIds: subject.classIds || [],
      teacherId: subject.teacherId || ''
    });
  },

  deleteSubject: async (id: string): Promise<void> => {
    await api.delete(`/subjects/${id}`);
  },

  // ========================================
  // RESULTS
  // ========================================
  getResults: async (): Promise<Result[]> => {
    try {
      const data = await api.get('/results');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Get results error:', error);
      return [];
    }
  },

  saveResult: async (result: Result): Promise<void> => {
    const payload = {
      studentId: result.studentId,
      subjectId: result.subjectId,
      classId: result.classId,
      session: result.session,
      term: result.term,
      ca1: result.ca1,
      ca2: result.ca2,
      exam: result.exam
    };
    if (result.id) {
      await api.put(`/results/${result.id}`, payload);
      return;
    }
    await api.post('/results', payload);
  },

  getBroadsheetData: async (classId: string, session: string, term: string) => {
    return await api.get(`/results/broadsheet?classId=${classId}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}`);
  },

  getPerformanceData: async (classId: string, session: string, term: string) => {
    return await api.get(`/results/performance?classId=${classId}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}`);
  },

  // ========================================
  // PARENTS
  // NOTE: Backend toFrontend() already returns camelCase - NO remapping needed!
  // ========================================
  getParents: async (): Promise<Parent[]> => {
    try {
      const data = await api.get('/parents');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Get parents error:', error);
      return [];
    }
  },

  addParent: async (parent: Omit<Parent, 'id'>): Promise<Parent> => {
    // Send camelCase - backend converts to snake_case
    return await api.post('/parents', {
      title: parent.title,
      name: parent.name,
      phone: parent.phone,
      email: parent.email,
      address: parent.address,
      religion: parent.religion,
      occupation: parent.occupation,
      stateOfOrigin: parent.stateOfOrigin,
      maritalStatus: parent.maritalStatus,
      username: parent.username,
      password: (parent as any).password
    });
  },

  updateParent: async (parent: Parent): Promise<void> => {
    await api.put(`/parents/${parent.id}`, {
      title: parent.title,
      name: parent.name,
      phone: parent.phone,
      email: parent.email,
      address: parent.address,
      religion: parent.religion,
      occupation: parent.occupation,
      stateOfOrigin: parent.stateOfOrigin,
      maritalStatus: parent.maritalStatus,
      username: parent.username,
      password: (parent as any).password
    });
  },

  deleteParent: async (id: string): Promise<void> => {
    await api.delete(`/parents/${id}`);
  },

  // ========================================
  // SESSIONS
  // ========================================
 getSessions: async (): Promise<AcademicSession[]> => {
  try {
    const res = await api.get(`/sessions?_t=${Date.now()}`);
    const arr = Array.isArray(res) ? res : [];
    return arr.map((s: any) => ({
      id:       s.id,
      year:     s.year,
      term:     s.term,
      isActive: Boolean(s.isActive ?? s.is_active ?? false),
    }));
  } catch (err) {
    console.error('fetchSessions FAILED:', err);
    return [];
  }
},

getActiveSession: async (): Promise<AcademicSession> => {
  try {
    const sessions = await apiService.getSessions();
    console.log('All sessions:', sessions);
    const active = sessions.find(s => s.isActive === true);
    console.log('Active session found:', active);
    if (active) return active;
    return sessions[0] ?? { id: 'SES-DEFAULT', year: '2024/2025', term: '1st Term', isActive: false };
  } catch (err) {
    console.error('getActiveSession FAILED:', err);
    return { id: 'SES-DEFAULT', year: '2024/2025', term: '1st Term', isActive: false };
  }
},

  setActiveSession: async (id: string): Promise<void> => {
    await api.put(`/sessions/${id}/activate`, {});
  },

  // ========================================
  // STUDENT REPORTS
  // ========================================
  getStudentReports: async (): Promise<StudentReport[]> => {
    try {
      return await api.get('/reports');
    } catch {
      return [];
    }
  },

  saveStudentReport: async (report: StudentReport): Promise<void> => {
    try {
      await api.post('/reports', report);
    } catch (error) {
      console.error('Save report error:', error);
    }
  },

  // ── REPORTS (new methods) ─────────────────────────────────────────────────
saveHeadComment: async (reportId: string, headComment: string): Promise<void> => {
  await api.put(`/reports/${reportId}/head-comment`, { headComment });
},

approveReport: async (reportId: string): Promise<void> => {
  await api.put(`/reports/${reportId}/approve`, {});
},

unapproveReport: async (reportId: string): Promise<void> => {
  await api.put(`/reports/${reportId}/unapprove`, {});
},

// ── TEACHERS (new methods) ────────────────────────────────────────────────
updateSignature: async (teacherId: string, signatureUrl: string): Promise<void> => {
  await api.put(`/teachers/${teacherId}/signature`, { signatureUrl });
},

  // ========================================
  // TRAITS
  // ========================================
  getAffectiveTraits: async (): Promise<AffectiveTrait[]> => {
    try {
      return await api.get('/traits/affective');
    } catch {
      return [];
    }
  },

  addAffectiveTrait: async (name: string): Promise<AffectiveTrait> => {
    return await api.post('/traits/affective', { name });
  },

  deleteAffectiveTrait: async (id: string): Promise<void> => {
    await api.delete(`/traits/affective/${id}`);
  },

  getPsychomotorTraits: async (): Promise<PsychomotorTrait[]> => {
    try {
      return await api.get('/traits/psychomotor');
    } catch {
      return [];
    }
  },

  addPsychomotorTrait: async (name: string): Promise<PsychomotorTrait> => {
    return await api.post('/traits/psychomotor', { name });
  },

  deletePsychomotorTrait: async (id: string): Promise<void> => {
    await api.delete(`/traits/psychomotor/${id}`);
  },

  // ========================================
  // SETTINGS
  // ========================================
  getSettings: async (): Promise<SchoolSettings> => {
    try {
      const data = await api.get('/settings');
      return data[0] || getDefaultSettings();
    } catch {
      return getDefaultSettings();
    }
  },

  saveSettings: async (settings: SchoolSettings): Promise<void> => {
    await api.put('/settings', settings);
    window.dispatchEvent(new Event('schoolSettingsUpdated'));
  },

  // ========================================
  // DASHBOARD
  // ========================================
  getLiveDashboardData: async () => {
    const [students, teachers] = await Promise.all([
      apiService.getStudents(),
      apiService.getTeachers()
    ]);
    const totalStudents = students.length;
    const totalTeachers = teachers.length;
    const avgAttendance = totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + (s.attendance || 0), 0) / totalStudents)
      : 0;
    return {
      stats: { totalStudents, totalTeachers, avgAttendance, upcomingEvents: 4 },
      performanceTrend: [],
      urgentActions: []
    };
  }
};

const getDefaultSettings = (): SchoolSettings => ({
  name: 'EduStream School',
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
});

export default apiService;
