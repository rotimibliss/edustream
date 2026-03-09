import React, { useState, useEffect } from 'react';
import { Parent, Student } from '../types';
import { apiService as dataService } from '../services/apiService';

const ParentManagement: React.FC = () => {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [selectedWardIds, setSelectedWardIds] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Parent>>({
    name: '', phone: '', title: '', email: '', address: '',
    religion: '', occupation: '', stateOfOrigin: '', maritalStatus: '',
    username: '', password: ''
  });

  const refreshData = async () => {
    try {
      setLoading(true);
      const [parentsData, studentsData] = await Promise.all([
        dataService.getParents(),
        dataService.getStudents()
      ]);
      setParents(Array.isArray(parentsData) ? parentsData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setParents([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenModal = (p?: Parent) => {
    setShowPassword(false);
    if (p) {
      setEditingParent(p);
      setFormData(p);
      setSelectedWardIds(students.filter(s => s.parentId === p.id).map(s => s.id));
    } else {
      setEditingParent(null);
      setFormData({ name: '', phone: '', title: '', email: '', address: '', religion: '', occupation: '', stateOfOrigin: '', maritalStatus: '', username: '', password: '' });
      setSelectedWardIds([]);
    }
    setIsModalOpen(true);
  };

  const toggleWardSelection = (sId: string) => {
    setSelectedWardIds(prev =>
      prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
    );
  };

  const handleDeleteParent = async (parentId: string, parentName: string) => {
    if (window.confirm(`Are you sure you want to delete ${parentName}? This action cannot be undone.`)) {
      try {
        await dataService.deleteParent(parentId);
        await refreshData();
      } catch (error) {
        console.error('Failed to delete parent:', error);
        alert('Failed to delete parent. Please try again.');
      }
    }
  };

  const handleSaveParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;
    try {
      let savedParent: Parent;
      if (editingParent) {
        savedParent = { ...editingParent, ...formData } as Parent;
        await dataService.updateParent(savedParent);
      } else {
        savedParent = await dataService.addParent(formData as Parent);
      }
      // Update student-parent links
      for (const s of students) {
        if (selectedWardIds.includes(s.id)) {
          await dataService.updateStudent({
            ...s, parentId: savedParent.id,
            parentName: savedParent.name, parentPhone: savedParent.phone
          });
        } else if (s.parentId === savedParent.id) {
          await dataService.updateStudent({ ...s, parentId: undefined } as Student);
        }
      }
      await refreshData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save parent:', error);
      alert('Failed to save parent. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-bold text-gray-600">Loading parents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Parent Records</h1>
          <p className="text-sm text-gray-500 font-medium">Manage guardian information and account credentials.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl hover:bg-emerald-700 transition-all flex items-center space-x-2 shadow-xl shadow-emerald-100 font-bold">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
          <span>Register New Parent</span>
        </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Parent</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone & Username</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Occupation</th>
              <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Linked Children</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {parents.length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center opacity-30 italic font-medium">No parents registered yet.</td></tr>
            ) : parents.map(p => {
              const children = students.filter(s => s.parentId === p.id);
              return (
                <tr key={p.id} className="hover:bg-indigo-50/5 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">{p.name.charAt(0)}</div>
                      <div>
                        <div className="text-sm font-black text-gray-800">{p.title} {p.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-xs font-bold text-gray-700">{p.phone}</div>
                    <div className="text-[10px] text-gray-400 font-medium">{p.username || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-xs font-bold text-gray-700">{p.address || 'Not specified'}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-xs font-bold text-gray-700">{p.occupation || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-2">
                      <div className="flex -space-x-2 overflow-hidden">
                        {children.map(c => <img key={c.id} className="inline-block h-8 w-8 rounded-xl ring-2 ring-white bg-gray-100 object-cover" src={c.avatar} title={c.name} />)}
                      </div>
                      {children.length > 0 && <span className="text-[10px] font-black text-indigo-600">{children.length} Wards</span>}
                      {children.length === 0 && <span className="text-[10px] text-gray-400 italic">No links</span>}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenModal(p)} className="p-2.5 text-indigo-600 hover:bg-white hover:shadow-md rounded-xl transition-all" title="Edit parent">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      <button onClick={() => handleDeleteParent(p.id, p.name)} className="p-2.5 text-rose-600 hover:bg-white hover:shadow-md rounded-xl transition-all" title="Delete parent">
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
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl animate-fadeIn overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">{editingParent ? 'Update Record' : 'Register Parent'}</h2>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Guardian Archive</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white p-2.5 rounded-2xl text-gray-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <form onSubmit={handleSaveParent} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Guardian Profile</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Title</label>
                        <select className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl font-bold appearance-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}>
                          <option value="">Select</option><option>Mr.</option><option>Mrs.</option><option>Dr.</option><option>Chief</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                        <input required className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                      <input required className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Occupation</label>
                      <input className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl font-bold" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Portal Credentials</p>
                    <div className="grid grid-cols-2 gap-4">
                      <input placeholder="Username" className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl font-bold" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                      <div className="relative">
                        <input placeholder="Password" type={showPassword ? 'text' : 'password'} className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl font-bold pr-12" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Assign Wards (Students)</p>
                    <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase">{selectedWardIds.length} Selected</span>
                  </div>
                  <div className="bg-gray-50 rounded-[32px] p-6 border border-gray-100 max-h-[400px] overflow-y-auto space-y-3">
                    {students.map(s => {
                      const isSelected = selectedWardIds.includes(s.id);
                      const isLinkedToOther = s.parentId && s.parentId !== editingParent?.id;
                      return (
                        <button key={s.id} type="button" onClick={() => toggleWardSelection(s.id)} disabled={!!(isLinkedToOther && !isSelected)}
                          className={`w-full flex items-center p-3 rounded-2xl border-2 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-transparent hover:border-indigo-100 text-gray-700'} ${isLinkedToOther && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}>
                          <img src={s.avatar} className="w-10 h-10 rounded-xl mr-3 border-2 border-white shadow-sm" />
                          <div className="text-left min-w-0">
                            <p className="text-sm font-black truncate leading-none mb-1">{s.name}</p>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>{s.grade}</p>
                          </div>
                          {isSelected && <svg className="ml-auto w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                        </button>
                      );
                    })}
                    {students.length === 0 && <p className="text-center py-10 text-[10px] font-black text-gray-400 uppercase tracking-widest">No students found</p>}
                  </div>
                </div>
                <div className="lg:col-span-2 pt-6 flex space-x-4 border-t border-gray-100 mt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-5 bg-gray-50 text-gray-500 rounded-3xl font-black uppercase tracking-widest text-[11px]">Discard</button>
                  <button type="submit" className="flex-1 px-8 py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-emerald-100">Save Parent</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentManagement;
