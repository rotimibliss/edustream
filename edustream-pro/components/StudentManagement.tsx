import React, { useState, useEffect, useRef } from 'react';
import { Student, Parent, SchoolClass, SchoolSettings, AuthUser, Teacher } from '../types';
import { apiService as dataService } from '../services/apiService';

interface ParsedStudentRow {
  student: Partial<Student>;
  isValid: boolean;
  errors: string[];
}

const StudentManagement: React.FC = () => {
  // State declarations
  const [currentUser] = useState<AuthUser | null>(dataService.getCurrentUser());
  const [settings, setSettings] = useState<SchoolSettings>({
    name: 'Loading...',
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
  
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    classId: '',
    parentId: '',
    parentName: '',
    parentPhone: '',
    dob: '',
    age: 0,
    gender: '',
    email: '',
    avatar: ''
  });

  // Navigation States
  const [viewMode, setViewMode] = useState<'list' | 'batch-register' | 'by-class'>('list');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Batch Registration States
  const [csvInput, setCsvInput] = useState('');
  const [parsedStudentsPreview, setParsedStudentsPreview] = useState<ParsedStudentRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [isConfirmBatchModalOpen, setIsConfirmBatchModalOpen] = useState(false);
  const [studentsPendingRegistration, setStudentsPendingRegistration] = useState<ParsedStudentRow[]>([]);
  const [isRegisteringBatch, setIsRegisteringBatch] = useState(false);

  // Load all data
  const refreshData = async () => {
    try {
      setLoading(true);
      const [studentsData, parentsData, classesData, teachersData, settingsData] = await Promise.all([
        dataService.getStudents(),
        dataService.getParents(),
        dataService.getClasses(),
        dataService.getTeachers(),
        dataService.getSettings()
      ]);
      
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setParents(Array.isArray(parentsData) ? parentsData : []);
      setClasses(Array.isArray(classesData) ? classesData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setStudents([]);
      setParents([]);
      setClasses([]);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const calculateAge = (dobString: string) => {
    if (!dobString) return 0;
    let birthDate = new Date(dobString);
    const today = new Date();
    if (isNaN(birthDate.getTime())) return 0;
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const canWrite = currentUser?.role === 'admin' || (currentUser?.role === 'teacher' && settings.permissions.teacher.canManageStudents);

  const handleOpenModal = (student?: Student) => {
    if (!canWrite && !settings.permissions.teacher.canEditProfiles) {
      alert("Permission denied: Faculty cannot modify student records.");
      return;
    }
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        grade: student.grade,
        classId: student.classId || '',
        parentId: student.parentId || '',
        parentName: student.parentName,
        parentPhone: student.parentPhone || '',
        dob: student.dob || '',
        age: student.age || 0,
        gender: student.gender || '',
        email: student.email,
        avatar: student.avatar
      });
    } else {
      setEditingStudent(null);
      setFormData({ 
        name: '', 
        grade: classes.length > 0 ? classes[0].name : '', 
        classId: classes.length > 0 ? classes[0].id : '',
        parentId: '',
        parentName: '', 
        parentPhone: '',
        dob: '', 
        age: 0, 
        gender: '',
        email: '', 
        avatar: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleClassSelect = (cId: string) => {
    const selectedClass = classes.find(c => c.id === cId);
    if (selectedClass) {
      setFormData({
        ...formData,
        classId: selectedClass.id,
        grade: `${selectedClass.name} ${selectedClass.arm}`
      });
    }
  };

  const handleParentSelect = (pId: string) => {
    const parent = parents.find(p => p.id === pId);
    if (parent) {
      setFormData({ ...formData, parentId: parent.id, parentName: parent.name, parentPhone: parent.phone });
    } else {
      setFormData({ ...formData, parentId: '', parentName: '', parentPhone: '' });
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.classId || !formData.gender) {
      alert("Please provide the student's name, class, and gender.");
      return;
    }

    const studentPayload: Partial<Student> = {
      ...formData,
      avatar: formData.avatar || `https://picsum.photos/seed/${formData.name.replace(/\s/g, '')}/200`
    };

    try {
      if (editingStudent) {
        await dataService.updateStudent({ ...editingStudent, ...studentPayload } as Student);
      } else {
        await dataService.addStudent(studentPayload);
      }
      await refreshData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save student:', error);
      alert('Failed to save student');
    }
  };

  const executeDelete = async () => {
    if (studentToDelete) {
      try {
        await dataService.deleteStudent(studentToDelete);
        await refreshData();
        setIsDeleteModalOpen(false);
        setStudentToDelete(null);
      } catch (error) {
        console.error('Failed to delete student:', error);
        alert('Failed to delete student');
      }
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = viewMode === 'by-class' && selectedClassId ? s.classId === selectedClassId : true;
    return matchesSearch && matchesClass;
  });

  // CSV Parsing
  const parseCSV = (csvString: string): ParsedStudentRow[] => {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) return [];
    const rawCsvHeaders = lines[0].split(',').map(h => h.trim());
    const headerIndexMap: Record<string, number> = {};

    rawCsvHeaders.forEach((rawHeader, index) => {
      const normalizedHeader = rawHeader.toLowerCase().replace(/\s*\(.*\)/, '').trim();
      if (normalizedHeader === 'name') headerIndexMap['name'] = index;
      else if (normalizedHeader === 'grade') headerIndexMap['grade'] = index;
      else if (normalizedHeader === 'classid') headerIndexMap['classid'] = index;
      else if (normalizedHeader === 'gender') headerIndexMap['gender'] = index;
      else if (normalizedHeader === 'parent name') headerIndexMap['parentName'] = index;
      else if (normalizedHeader === 'parent phone') headerIndexMap['parentPhone'] = index;
      else if (normalizedHeader === 'date of birth') headerIndexMap['dob'] = index;
      else if (normalizedHeader === 'email') headerIndexMap['email'] = index;
      else if (normalizedHeader === 'avatar url') headerIndexMap['avatar'] = index;
    });

    const getVal = (values: string[], key: string): string => {
      const idx = headerIndexMap[key];
      return idx !== undefined && values[idx] !== undefined ? values[idx].trim() : '';
    };

    return lines.slice(1).map(line => {
      const values = line.split(',');
      const student: Partial<Student> = {
        name: getVal(values, 'name'),
        grade: getVal(values, 'grade'),
        classId: getVal(values, 'classid'),
        gender: getVal(values, 'gender') as Student['gender'],
        parentName: getVal(values, 'parentName'),
        parentPhone: getVal(values, 'parentPhone'),
        dob: getVal(values, 'dob'),
        email: getVal(values, 'email'),
        avatar: getVal(values, 'avatar'),
        attendance: 100,
        performance: 0,
        status: 'Active'
      };
      
      const errors: string[] = [];
      let isValid = true;

      if (!student.name) { errors.push('Name is required.'); isValid = false; }
      if (!student.gender) { errors.push('Gender is required.'); isValid = false; }
      if (!student.dob) { errors.push('Date of Birth is required.'); isValid = false; }
      else {
        const age = calculateAge(student.dob);
        if (isNaN(age) || age < 5) { errors.push('Invalid Age (Min 5).'); isValid = false; }
        student.age = age;
      }
      if (!student.email || !/\S+@\S+\.\S+/.test(student.email)) { errors.push('Valid Email required.'); isValid = false; }

      return { student: student as Student, isValid, errors };
    });
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvInput(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const downloadCsvTemplate = () => {
    const headers = "Name,Grade,ClassID,Gender,Parent Name,Parent Phone,Date of Birth,Email,Avatar URL\n";
    const example = "John Doe,10th Grade,C1,Male,Jane Doe,+1 555-0000,2008-01-01,john.doe@school.com,";
    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "student_registration_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleParseCsv = () => {
    setIsParsing(true);
    setTimeout(() => {
      setParsedStudentsPreview(parseCSV(csvInput));
      setIsParsing(false);
    }, 300);
  };

  const handleBatchRegisterStudents = () => {
    const validStudents = parsedStudentsPreview.filter(row => row.isValid);
    if (validStudents.length === 0) {
      alert("No valid student records found to register.");
      return;
    }
    setStudentsPendingRegistration(validStudents);
    setIsConfirmBatchModalOpen(true);
  };

  const executeBatchRegistration = async () => {
    setIsConfirmBatchModalOpen(false);
    setIsRegisteringBatch(true);
    try {
      for (const row of studentsPendingRegistration) {
        await dataService.addStudent(row.student);
      }
      await refreshData();
      setCsvInput('');
      setParsedStudentsPreview([]);
      setViewMode('list');
      alert(`${studentsPendingRegistration.length} students registered!`);
    } catch (error) {
      console.error('Batch registration error:', error);
      alert('Some students failed to register');
    } finally {
      setIsRegisteringBatch(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-bold text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Student Body</h1>
          <p className="text-sm text-gray-500 font-medium">
            {viewMode === 'by-class' && selectedClassId 
              ? `Viewing roster for ${classes.find(c => c.id === selectedClassId)?.name} ${classes.find(c => c.id === selectedClassId)?.arm}`
              : 'Institutional student registry & enrollment management.'}
          </p>
        </div>
        <div className="flex space-x-3">
          <div className="bg-white p-1.5 rounded-[24px] shadow-sm border border-gray-100 flex overflow-x-auto no-scrollbar">
             <button 
               onClick={() => { setViewMode('list'); setSelectedClassId(null); }} 
               className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 shrink-0 ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 6h16M4 12h16M4 18h16" /></svg>
               <span>Full Directory</span>
             </button>
             <button 
               onClick={() => { setViewMode('by-class'); setSelectedClassId(null); }} 
               className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 shrink-0 ${viewMode === 'by-class' ? 'bg-purple-600 text-white shadow-xl shadow-purple-100' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 7v10a2 2 0 002-2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
               <span>Class Explorer</span>
             </button>
             <button 
               onClick={() => setViewMode('batch-register')} 
               className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 shrink-0 ${viewMode === 'batch-register' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'text-gray-400 hover:text-gray-600'}`}
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
               <span>Batch Load</span>
             </button>
          </div>
        </div>
      </div>

      {viewMode === 'by-class' && !selectedClassId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn">
          {classes.map(cls => {
            const count = students.filter(s => s.classId === cls.id).length;
            const teacher = teachers.find(t => t.id === cls.classTeacherId);
            return (
              <button 
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 text-left hover:shadow-2xl hover:border-purple-200 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-[60px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                  <div className="bg-purple-100 text-purple-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit mb-6">
                    {count} Students
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 leading-tight">{cls.name}</h3>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Arm {cls.arm}</p>
                  
                  <div className="mt-8 pt-6 border-t border-gray-50 flex items-center space-x-3">
                    <img src={teacher?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher?.name || 'U')}`} className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100" />
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Faculty Head</p>
                      <p className="text-xs font-bold text-gray-700 truncate">{teacher?.name || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {classes.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center">
               <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
               <p className="text-xl font-black uppercase tracking-[0.3em]">No Classes Defined</p>
            </div>
          )}
        </div>
      )}

      {(viewMode === 'list' || (viewMode === 'by-class' && selectedClassId)) && (
        <>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              {viewMode === 'by-class' && (
                <button onClick={() => setSelectedClassId(null)} className="p-3 bg-white border border-gray-200 rounded-2xl text-purple-600 hover:bg-purple-50 transition-colors shadow-sm">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              <div className="relative group flex-1 sm:flex-none">
                <input 
                  type="text"
                  placeholder="Search current view..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none w-full sm:w-72 transition-all shadow-sm font-bold"
                />
                <svg className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            {canWrite && (
              <button 
                onClick={() => handleOpenModal()}
                className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2.5 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 shadow-xl shadow-indigo-100 font-bold active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                <span>Register Student</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identity</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Class Assignment</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Attendance</th>
                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Perf. Score</th>
                    {(canWrite || settings.permissions.teacher.canEditProfiles) && <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-indigo-50/5 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center space-x-4">
                          <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-2xl border border-gray-100 bg-gray-50 object-cover shadow-sm" />
                          <div className="min-w-0">
                            <div className="text-sm font-black text-gray-800 truncate">{student.name}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{student.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="text-sm font-bold text-gray-700">{student.grade}</div>
                        <span className="text-[9px] text-indigo-500 font-black uppercase tracking-widest">{student.age} Yrs • {student.gender}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center">
                           <div className="w-24 bg-gray-100 rounded-full h-1.5 mb-1.5">
                              <div className={`h-1.5 rounded-full ${student.attendance > 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${student.attendance}%` }}></div>
                           </div>
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{student.attendance}% Coverage</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-block px-4 py-1.5 rounded-xl font-black text-sm shadow-sm ${student.performance >= 75 ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                          {student.performance}%
                        </span>
                      </td>
                      {(canWrite || settings.permissions.teacher.canEditProfiles) && (
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleOpenModal(student)} className="p-2.5 text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-gray-100">
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            {currentUser?.role === 'admin' && (
                              <button onClick={() => { setStudentToDelete(student.id); setIsDeleteModalOpen(true); }} className="p-2.5 text-rose-500 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-gray-100">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                       <td colSpan={5} className="py-32 text-center opacity-30 italic font-medium">No student records match your query.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewMode === 'batch-register' && (
        <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
          <header>
            <h2 className="text-3xl font-black text-gray-800 tracking-tighter">Bulk Registry Upload</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Efficiently register multiple students via CSV data mapping.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100 space-y-6">
              <div className="flex flex-col items-center justify-center p-12 bg-gray-50/50 border-4 border-dashed border-gray-100 rounded-[40px] cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/10 transition-all group"
                onClick={() => csvFileInputRef.current?.click()}>
                <input type="file" accept=".csv" ref={csvFileInputRef} className="hidden" onChange={handleCsvFileUpload} />
                <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                   <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12"></path></svg>
                </div>
                <p className="text-sm font-black text-gray-800">Drop CSV or Click to Browse</p>
                <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">UTF-8 Encoded files only</p>
              </div>

              <div className="space-y-4">
                <button onClick={downloadCsvTemplate} className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-colors">
                  Download Standard Template
                </button>
                <textarea 
                  rows={6}
                  className="w-full p-6 bg-gray-50 border-2 border-transparent rounded-[32px] focus:border-emerald-500 focus:bg-white outline-none resize-none font-bold text-sm transition-all"
                  placeholder="Paste raw CSV data here..."
                  value={csvInput}
                  onChange={e => setCsvInput(e.target.value)}
                />
              </div>

              <button 
                onClick={handleParseCsv}
                disabled={isParsing || !csvInput.trim()}
                className="w-full py-5 bg-emerald-600 text-white rounded-[28px] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                {isParsing ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>Preview & Validate Registry</span>}
              </button>
            </div>

            <div className="lg:col-span-1 bg-white p-10 rounded-[48px] shadow-sm border border-gray-100 flex flex-col min-h-[500px]">
              <h3 className="text-xl font-black text-gray-800 mb-8">Data Validation Preview ({parsedStudentsPreview.length} items)</h3>
              
              {parsedStudentsPreview.length > 0 ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {parsedStudentsPreview.map((row, i) => (
                        <tr key={i} className={`text-xs ${!row.isValid ? 'bg-rose-50/50' : 'hover:bg-gray-50'}`}>
                          <td className="px-4 py-4">
                             <p className="font-black text-gray-700 truncate max-w-[120px]">{row.student.name || 'N/A'}</p>
                             <p className="text-[9px] text-gray-400 font-bold uppercase">{row.student.gender || 'Unknown'}</p>
                          </td>
                          <td className="px-4 py-4 text-gray-500 font-medium truncate max-w-[150px]">{row.student.email || 'N/A'}</td>
                          <td className="px-4 py-4 text-center">
                            {row.isValid ? (
                              <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-emerald-50 text-emerald-600">Clear</span>
                            ) : (
                              <div className="group relative inline-block">
                                <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-rose-50 text-rose-600 cursor-help">Error</span>
                                <div className="absolute right-0 bottom-full mb-2 w-48 p-3 bg-rose-700 text-white text-[10px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-20 pointer-events-none">
                                  {row.errors.map((err, idx) => <p key={idx} className="mb-1 last:mb-0">• {err}</p>)}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                  <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="text-sm font-black uppercase tracking-[0.4em]">No Data Mapped</p>
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-gray-50 flex space-x-4">
                <button 
                  onClick={() => { setCsvInput(''); setParsedStudentsPreview([]); }}
                  className="flex-1 px-8 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase text-[10px] hover:bg-gray-100 transition-colors"
                >
                  Reset
                </button>
                <button 
                  onClick={handleBatchRegisterStudents}
                  disabled={parsedStudentsPreview.filter(row => row.isValid).length === 0 || isRegisteringBatch}
                  className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-2xl disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  {isRegisteringBatch ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>Register Valid ({parsedStudentsPreview.filter(row => row.isValid).length})</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl animate-fadeIn overflow-hidden">
            <div className="p-10 border-b border-gray-100 flex items-center justify-between bg-indigo-50/20">
              <h2 className="text-3xl font-black text-gray-800 tracking-tight">{editingStudent ? 'Edit Profile' : 'New Enrollment'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="bg-white p-3 rounded-2xl text-gray-400 shadow-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="md:col-span-2 flex flex-col items-center justify-center py-8 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200 mb-2 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="relative">
                  <img src={formData.avatar || `https://ui-avatars.com/api/?name=${formData.name || 'Student'}&background=6366f1&color=fff`} className="w-32 h-32 rounded-[36px] object-cover border-4 border-white shadow-2xl bg-white transition-transform group-hover:scale-105" alt="avatar" />
                  <div className="absolute inset-0 bg-indigo-600/60 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData({ ...formData, avatar: reader.result as string });
                      reader.readAsDataURL(file);
                    }
                  }} />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6">Update Profile Image</p>
              </div>

              {canWrite ? (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Legal Name</label>
                    <input required type="text" className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Institutional Email</label>
                    <input required type="email" placeholder="student@school.com" className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Date of Birth</label>
                    <input required type="date" className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" value={formData.dob} onChange={e => {
                      const val = e.target.value;
                      const age = calculateAge(val);
                      setFormData({ ...formData, dob: val, age });
                    }} />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Unit / Class Arm</label>
                    <select required className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none" value={formData.classId} onChange={e => handleClassSelect(e.target.value)}>
                      <option value="">-- Assign Class --</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.arm})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sex</label>
                    <select required className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as 'Male' | 'Female' | 'Other'})}>
                      <option value="">-- Choose Sex --</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Legal Guardian</label>
                    <select className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none" value={formData.parentId} onChange={e => handleParentSelect(e.target.value)}>
                      <option value="">-- Linked Parent --</option>
                      {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 p-8 bg-amber-50 text-amber-800 rounded-[32px] text-sm font-bold border border-amber-100 flex items-center space-x-4">
                  <svg className="w-8 h-8 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>Administrative Privilege Required: You can only modify the profile photo. Academic fields are locked for verified staff.</span>
                </div>
              )}

              <div className="md:col-span-2 flex space-x-4 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-5 bg-gray-100 text-gray-500 rounded-3xl font-black uppercase text-[11px] tracking-widest hover:bg-gray-200 transition-colors">Discard</button>
                <button type="submit" className="flex-1 px-8 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Finalize Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConfirmBatchModalOpen && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden p-10 text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-6">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Sync Batch Registry?</h2>
            <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed">
              Confirm registration of <span className="text-emerald-600 font-black">{studentsPendingRegistration.length}</span> verified students into the database. 
            </p>
            <div className="flex space-x-3 mt-10">
              <button onClick={() => setIsConfirmBatchModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={executeBatchRegistration} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95">Commit Records</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm animate-fadeIn overflow-hidden p-10 text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[32px] flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">Purge Record?</h2>
            <p className="text-sm text-gray-500 mb-8 font-medium">This will permanently delete the ward's entire terminal history. This action is final.</p>
            <div className="flex space-x-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</button>
              <button onClick={executeDelete} className="flex-1 px-4 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-100">Confirm Purge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
