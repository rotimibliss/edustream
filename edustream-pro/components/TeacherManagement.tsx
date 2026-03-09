import React, { useState, useEffect } from 'react';
import { Teacher } from '../types';
import { apiService as dataService } from '../services/apiService';

const ROLE_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  teacher:     { label: 'Teacher',      bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-100' },
  headteacher: { label: 'Head Teacher', bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100' },
  principal:   { label: 'Principal',    bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100'  },
};

const TeacherManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    email: '',
    experience: 0,
    classes: '',
    username: '',
    password: '',
    role: 'teacher' as 'teacher' | 'headteacher' | 'principal',
  });

  const refreshData = async () => {
    try {
      setLoading(true);
      const data = await dataService.getTeachers();
      setTeachers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const handleOpenModal = (teacher?: Teacher) => {
    setShowPassword(false);
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        name:       teacher.name,
        subject:    teacher.subject,
        email:      teacher.email,
        experience: teacher.experience,
        classes:    teacher.classes.join(', '),
        username:   teacher.username || '',
        password:   '',
        role:       (teacher.role as any) || 'teacher',
      });
    } else {
      setEditingTeacher(null);
      setFormData({ name: '', subject: '', email: '', experience: 0, classes: '', username: '', password: 'password', role: 'teacher' });
    }
    setIsModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    const teacherData = {
      name:       formData.name,
      subject:    formData.subject,
      email:      formData.email,
      experience: Number(formData.experience),
      classes:    formData.classes.split(',').map(c => c.trim()).filter(c => c !== ''),
      username:   formData.username,
      password:   formData.password,
      role:       formData.role,
    };

    try {
      if (editingTeacher) {
        await dataService.updateTeacher({ ...editingTeacher, ...teacherData });
      } else {
        await dataService.addTeacher(teacherData);
      }
      await refreshData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save teacher:', error);
      alert('Failed to save teacher. Please try again.');
    }
  };

  const confirmDelete = (id: string) => { setTeacherToDelete(id); setIsDeleteModalOpen(true); };

  const executeDelete = async () => {
    if (teacherToDelete) {
      try {
        await dataService.deleteTeacher(teacherToDelete);
        await refreshData();
        setIsDeleteModalOpen(false);
        setTeacherToDelete(null);
      } catch (error) {
        console.error('Failed to delete teacher:', error);
        alert('Failed to delete teacher. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-bold text-gray-600">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Teachers Dashboard</h1>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Teaching Staff & Portal Access Management</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-8 py-4 rounded-[28px] hover:bg-indigo-700 transition-all flex items-center space-x-3 shadow-xl shadow-indigo-100 font-black uppercase tracking-widest text-[10px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
          <span>Recruit Faculty</span>
        </button>
      </div>

      {teachers.length === 0 ? (
        <div className="py-20 text-center opacity-30 flex flex-col items-center">
          <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-xl font-black uppercase tracking-[0.3em]">No Teachers Yet</p>
          <p className="text-sm mt-2">Click "Recruit Faculty" to add your first teacher</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {teachers.map((teacher) => {
            const roleStyle = ROLE_STYLES[(teacher.role as string) || 'teacher'] || ROLE_STYLES.teacher;
            return (
              <div key={teacher.id} className="bg-white p-4 rounded-[32px] shadow-sm border border-gray-100 hover:border-indigo-100 transition-all hover:shadow-2xl hover:shadow-indigo-50 group relative">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img src={teacher.avatar} alt={teacher.name} className="w-16 h-16 rounded-[28px] object-cover border-4 border-white shadow-lg bg-gray-100" />
                      {/* Signature indicator dot */}
                      {(teacher as any).signature && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center" title="Signature uploaded">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-gray-800 leading-tight">{teacher.name}</h3>
                      <p className="text-indigo-600 text-[8px] font-black uppercase tracking-widest mt-0.5">{teacher.subject}</p>
                      {/* Role badge */}
                      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-xl text-[7px] font-black uppercase tracking-widest border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                        {roleStyle.label}
                      </span>
                    </div>
                  </div>
                    <div className="flex flex-col items-end space-y-0.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${
                      teacher.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {teacher.status}
                    </span>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                      <button onClick={() => handleOpenModal(teacher)} className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={() => confirmDelete(teacher.id)} className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl transition-all shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between p-1.5 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Portal Access</span>
                      <span className="text-[10px] font-bold text-gray-700">{teacher.username}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Exp.</span>
                      <span className="text-[10px] font-bold text-gray-700">{teacher.experience} Yrs</span>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Assigned Classes</span>
                    <div className="flex flex-wrap gap-1">
                      {teacher.classes.length > 0 ? teacher.classes.map(cls => (
                        <span key={cls} className="bg-indigo-50 px-3 py-1.5 rounded-xl text-[10px] font-black text-indigo-600 uppercase border border-indigo-100">{cls}</span>
                      )) : (
                        <span className="text-[10px] text-gray-300 italic font-medium">None assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex items-center space-x-2.5">
                    <div className="bg-gray-100 p-2 rounded-xl text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-gray-500 truncate">{teacher.email}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl animate-fadeIn overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-gray-100 flex items-center justify-between bg-indigo-50/20 shrink-0">
              <div>
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">{editingTeacher ? 'Update Faculty' : 'New Faculty Hire'}</h2>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Institutional Personnel Console</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white p-3 rounded-2xl text-gray-400 hover:text-gray-600 shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="p-10 space-y-8 overflow-y-auto">
              {/* Professional Identity */}
              <div className="space-y-6">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Professional Identity</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name & Title</label>
                    <input required type="text" placeholder="e.g. Dr. Robert Miller"
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-500 font-bold text-gray-700 transition-all"
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary Subject / Dept</label>
                    <input required type="text" placeholder="e.g. Mathematics"
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-500 font-bold text-gray-700 transition-all"
                      value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Experience (Years)</label>
                    <input required type="number"
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-500 font-bold text-gray-700 transition-all"
                      value={formData.experience} onChange={e => setFormData({...formData, experience: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Institutional Email</label>
                    <input required type="email" placeholder="email@school.com"
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-500 font-bold text-gray-700 transition-all"
                      value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>

                  {/* ── Role selector ── */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Staff Role & Privileges</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(Object.entries(ROLE_STYLES) as [string, typeof ROLE_STYLES[string]][]).map(([roleKey, style]) => (
                        <button
                          key={roleKey}
                          type="button"
                          onClick={() => setFormData({...formData, role: roleKey as any})}
                          className={`p-4 rounded-2xl border-2 text-center transition-all ${
                            formData.role === roleKey
                              ? `${style.bg} ${style.border} ${style.text} border-current shadow-sm`
                              : 'bg-gray-50 border-transparent text-gray-400 hover:border-gray-200'
                          }`}
                        >
                          <div className="text-[10px] font-black uppercase tracking-widest">{style.label}</div>
                          <div className="text-[8px] mt-1 opacity-70">
                            {roleKey === 'teacher' && 'Enter results, view reports'}
                            {roleKey === 'headteacher' && 'Approve & comment on reports'}
                            {roleKey === 'principal' && 'Full school oversight'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Portal Access */}
              <div className="space-y-6">
                <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-2">Portal Access (Login Details)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-indigo-50/30 rounded-[32px] border border-indigo-100">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Access Username</label>
                    <input required type="text" placeholder="e.g. teacher_rob"
                      className="w-full px-6 py-4 bg-white border-2 border-indigo-100 rounded-2xl outline-none focus:border-indigo-600 font-bold text-gray-700 transition-all shadow-sm"
                      value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                      Portal Password {editingTeacher && <span className="normal-case font-medium text-gray-400">(leave blank to keep current)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        required={!editingTeacher}
                        className="w-full px-6 py-4 bg-white border-2 border-indigo-100 rounded-2xl outline-none focus:border-indigo-600 font-bold text-gray-700 transition-all shadow-sm pr-14"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-2">
                        {showPassword
                          ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                          : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Classes */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Assigned Classes (Comma separated)</label>
                <input type="text" placeholder="e.g. 10A, 11B, 12C"
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-indigo-500 font-bold text-gray-700 transition-all"
                  value={formData.classes} onChange={e => setFormData({...formData, classes: e.target.value})} />
              </div>

              <div className="pt-6 flex space-x-4">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-5 bg-gray-100 text-gray-500 rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-200 transition-all">
                  Discard
                </button>
                <button type="submit"
                  className="flex-1 px-8 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                  Finalize Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden">
            <div className="p-10 text-center">
              <div className="w-24 h-24 bg-rose-100 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-rose-600 shadow-inner">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">Terminate Faculty?</h2>
              <p className="text-sm text-gray-500 mb-8 font-medium">This will remove the faculty member and revoke their portal access.</p>
              <div className="flex space-x-4">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all">No, Keep</button>
                <button onClick={executeDelete} className="flex-1 px-6 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all">Yes, Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
