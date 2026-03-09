import React, { useState, useEffect } from 'react';
import { Subject, SchoolClass, Teacher, Student } from '../types';
import { apiService as dataService } from '../services/apiService';

const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [enrollmentSubject, setEnrollmentSubject] = useState<Subject | null>(null);
  const [enrollmentSearch, setEnrollmentSearch] = useState('');

  const [formData, setFormData] = useState<{
    name: string; classIds: string[]; teacherId: string; isElective: boolean;
  }>({ name: '', classIds: [], teacherId: '', isElective: false });

  const refreshData = async () => {
    try {
      setLoading(true);
      const [subjectsData, classesData, teachersData, studentsData] = await Promise.all([
        dataService.getSubjects(),
        dataService.getClasses(),
        dataService.getTeachers(),
        dataService.getStudents()
      ]);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setClasses(Array.isArray(classesData) ? classesData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
      setAllStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenModal = (sub?: Subject) => {
    if (sub) {
      setEditingSubject(sub);
      setFormData({ name: sub.name, classIds: sub.classIds || [], teacherId: sub.teacherId || '', isElective: !!sub.isElective });
    } else {
      setEditingSubject(null);
      setFormData({ name: '', classIds: [], teacherId: '', isElective: false });
    }
    setIsModalOpen(true);
  };

  const handleToggleClass = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(classId) ? prev.classIds.filter(id => id !== classId) : [...prev.classIds, classId]
    }));
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { alert("Subject name is required."); return; }
    try {
      if (editingSubject) {
        await dataService.updateSubject({ ...editingSubject, ...formData });
      } else {
        await dataService.addSubject({ ...formData, studentIds: [] });
      }
      await refreshData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save subject:', error);
      alert('Failed to save subject. Please try again.');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Delete this subject?')) return;
    try {
      await dataService.deleteSubject(id);
      await refreshData();
    } catch (error) {
      console.error('Failed to delete subject:', error);
    }
  };

  const handleOpenEnrollment = (sub: Subject) => {
    setEnrollmentSubject(sub);
    setIsEnrollmentModalOpen(true);
  };

  const toggleStudentEnrollment = async (studentId: string) => {
    if (!enrollmentSubject) return;
    const currentIds = enrollmentSubject.studentIds || [];
    const updatedIds = currentIds.includes(studentId) ? currentIds.filter(id => id !== studentId) : [...currentIds, studentId];
    const updatedSub = { ...enrollmentSubject, studentIds: updatedIds };
    try {
      await dataService.updateSubject(updatedSub);
      setEnrollmentSubject(updatedSub);
      setSubjects(prev => prev.map(s => s.id === updatedSub.id ? updatedSub : s));
    } catch (error) {
      console.error('Failed to update enrollment:', error);
    }
  };

  const filteredEnrollmentStudents = allStudents.filter(s =>
    s.name.toLowerCase().includes(enrollmentSearch.toLowerCase()) ||
    s.id.toLowerCase().includes(enrollmentSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-bold text-gray-600">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Academic Curriculum</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Subject Master List & Student Allocation</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-8 py-4 rounded-[28px] hover:bg-indigo-700 transition-all flex items-center space-x-3 shadow-xl shadow-indigo-100 font-black uppercase tracking-widest text-[10px]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
          <span>Create New Subject</span>
        </button>
      </header>

      <div className="bg-white rounded-[48px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject Info</th>
              <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
              <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Classes</th>
              <th className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Faculty Lead</th>
              <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {subjects.length === 0 ? (
              <tr><td colSpan={5} className="py-20 text-center opacity-30 italic font-medium">No subjects created yet.</td></tr>
            ) : subjects.map((sub) => {
              const teacher = teachers.find(t => t.id === sub.teacherId);
              const totalStudents = sub.isElective
                ? (sub.studentIds?.length || 0)
                : allStudents.filter(s => s.classId && (sub.classIds || []).includes(s.classId)).length;
              return (
                <tr key={sub.id} className="hover:bg-indigo-50/5 transition-colors group">
                  <td className="px-10 py-6">
                    <span className="font-black text-gray-800 text-lg">{sub.name}</span>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">ID: {sub.id}</div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${sub.isElective ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                      {sub.isElective ? 'Elective' : 'Core'}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <span className="text-sm font-bold text-gray-700">{totalStudents} Students</span>
                    <div className="text-[10px] text-gray-400">{sub.isElective ? 'Individual' : `${(sub.classIds || []).length} Classes`}</div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center space-x-3">
                      {teacher?.avatar && <img src={teacher.avatar} className="w-10 h-10 rounded-2xl bg-indigo-50 object-cover shadow-sm" />}
                      <div>
                        <p className="text-xs font-black text-gray-800">{teacher?.name || 'Unassigned'}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{teacher?.subject || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end items-center space-x-2">
                      {sub.isElective && (
                        <button onClick={() => handleOpenEnrollment(sub)} className="p-3 bg-white text-amber-600 hover:shadow-lg rounded-2xl border border-gray-100 transition-all flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          <span className="text-[10px] font-black uppercase">Enrollment</span>
                        </button>
                      )}
                      <button onClick={() => handleOpenModal(sub)} className="p-3 text-indigo-600 hover:bg-white hover:shadow-lg rounded-2xl transition-all border border-transparent hover:border-gray-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      <button onClick={() => handleDeleteSubject(sub.id)} className="p-3 text-red-400 hover:text-red-600 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl animate-fadeIn overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-gray-100 flex items-center justify-between bg-indigo-50/20 shrink-0">
              <div>
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">{editingSubject ? 'Update Subject' : 'New Subject'}</h2>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Curriculum Management</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white p-3 rounded-[20px] text-gray-400 shadow-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveSubject} className="p-10 space-y-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Subject Name</label>
                  <input required className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] outline-none focus:border-indigo-500 font-black text-lg text-gray-800" placeholder="e.g. Advanced Chemistry" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Subject Lead (Teacher)</label>
                  <select className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] outline-none focus:border-indigo-500 font-bold text-gray-700 appearance-none" value={formData.teacherId} onChange={e => setFormData({...formData, teacherId: e.target.value})}>
                    <option value="">-- Choose Faculty --</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-[32px] border border-gray-100">
                  <div>
                    <h4 className="text-sm font-black text-gray-800">Elective Subject?</h4>
                    <p className="text-[10px] text-gray-400 font-medium">Individual student enrollment</p>
                  </div>
                  <button type="button" onClick={() => setFormData({...formData, isElective: !formData.isElective})} className={`w-14 h-8 rounded-full relative transition-all duration-300 ${formData.isElective ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${formData.isElective ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              </div>
              {!formData.isElective && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Linked Classes</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {classes.map(cls => {
                      const isSelected = formData.classIds.includes(cls.id);
                      return (
                        <button key={cls.id} type="button" onClick={() => handleToggleClass(cls.id)} className={`flex items-center justify-center py-4 rounded-[20px] border-2 transition-all font-black text-[11px] uppercase tracking-widest ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'}`}>
                          {cls.name} ({cls.arm})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="pt-6 flex space-x-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-5 bg-gray-100 text-gray-500 rounded-[28px] font-black uppercase tracking-widest text-[11px]">Discard</button>
                <button type="submit" className="flex-1 px-8 py-5 bg-indigo-600 text-white rounded-[28px] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700">Save Subject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEnrollmentModalOpen && enrollmentSubject && (
        <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[56px] shadow-2xl w-full max-w-4xl animate-fadeIn overflow-hidden flex flex-col h-[90vh]">
            <div className="p-12 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <span className="bg-amber-50 text-amber-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-amber-100">Elective Enrollment</span>
                <h2 className="text-4xl font-black text-gray-800 tracking-tighter mt-4">{enrollmentSubject.name}</h2>
                <p className="text-sm font-medium text-gray-400 mt-1">{enrollmentSubject.studentIds?.length || 0} Students Enrolled</p>
              </div>
              <button onClick={() => setIsEnrollmentModalOpen(false)} className="bg-gray-50 p-4 rounded-3xl text-gray-400"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="px-12 py-6 bg-gray-50/50 shrink-0 border-b border-gray-100">
              <div className="relative">
                <input type="text" placeholder="Search students..." className="w-full pl-14 pr-6 py-5 bg-white border-2 border-transparent rounded-[28px] font-bold text-gray-700 focus:border-indigo-500 outline-none shadow-sm" value={enrollmentSearch} onChange={e => setEnrollmentSearch(e.target.value)} />
                <svg className="w-6 h-6 absolute left-6 top-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEnrollmentStudents.map(student => {
                const isEnrolled = enrollmentSubject.studentIds?.includes(student.id);
                return (
                  <button key={student.id} onClick={() => toggleStudentEnrollment(student.id)} className={`p-6 rounded-[36px] border-2 transition-all text-left flex items-center space-x-4 relative overflow-hidden ${isEnrolled ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-transparent hover:border-indigo-100 text-gray-600'}`}>
                    <img src={student.avatar} className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm object-cover" />
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate leading-tight mb-1">{student.name}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isEnrolled ? 'text-indigo-100' : 'text-gray-400'}`}>{student.grade}</p>
                    </div>
                    {isEnrolled && <div className="absolute top-0 right-0 bg-white/20 p-2 rounded-bl-2xl"><svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>}
                  </button>
                );
              })}
            </div>
            <div className="p-12 border-t border-gray-100 flex justify-end shrink-0">
              <button onClick={() => setIsEnrollmentModalOpen(false)} className="px-12 py-5 bg-indigo-950 text-white rounded-[28px] font-black uppercase tracking-widest text-[11px] shadow-2xl">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;
