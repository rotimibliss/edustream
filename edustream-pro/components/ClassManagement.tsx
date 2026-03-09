import React, { useState, useEffect } from 'react';
import { SchoolClass, Teacher, AuthUser } from '../types';
import { apiService as dataService } from '../services/apiService';

interface ClassManagementProps {
  currentUser: AuthUser;
}

const ClassManagement: React.FC<ClassManagementProps> = ({ currentUser }) => {
  // All state declarations
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    arm: '',
    classTeacherId: ''
  });

  // Load data function
  const refreshData = async () => {
    try {
      setLoading(true);
      const [classesData, teachersData] = await Promise.all([
        dataService.getClasses(),
        dataService.getTeachers()
      ]);
      setClasses(Array.isArray(classesData) ? classesData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
      setClasses([]);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenModal = (cls?: SchoolClass) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        id: cls.id,
        name: cls.name,
        arm: cls.arm,
        classTeacherId: cls.classTeacherId || ''
      });
    } else {
      setEditingClass(null);
      setFormData({ id: '', name: '', arm: '', classTeacherId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.arm) {
      alert("Class Name and Arm are required.");
      return;
    }

    try {
      if (editingClass) {
        // If ID is being changed, validate uniqueness
        if (currentUser.role === 'admin' && formData.id !== editingClass.id) {
          const isIdTaken = classes.some(c => c.id === formData.id && c.id !== editingClass.id);
          if (isIdTaken) {
            alert(`Class ID "${formData.id}" is already taken by another class. Please choose a unique ID.`);
            return;
          }
        }
        await dataService.updateClass({ ...editingClass, ...formData });
      } else {
        await dataService.addClass(formData);
      }
      await refreshData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save class:', error);
      alert('Failed to save class');
    }
  };

  const confirmDelete = (id: string) => {
    setClassToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (classToDelete) {
      try {
        await dataService.deleteClass(classToDelete);
        await refreshData();
        setIsDeleteModalOpen(false);
        setClassToDelete(null);
      } catch (error) {
        console.error('Failed to delete class:', error);
        alert('Failed to delete class');
      }
    }
  };

  const isIdEditable = editingClass && currentUser.role === 'admin';

  // Loading check
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-bold text-gray-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Classes & Arms</h1>
          <p className="text-sm text-gray-500">Define school grade levels and specific class arms.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors flex items-center space-x-2 shadow-lg shadow-indigo-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>Add New Class</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => {
          const teacher = teachers.find(t => t.id === cls.classTeacherId);
          return (
            <div key={cls.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-200 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{cls.name}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 uppercase">
                    Arm {cls.arm}
                  </span>
                  <div className="text-[10px] text-gray-400 font-bold uppercase mt-2">ID: {cls.id}</div>
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenModal(cls)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                  <button onClick={() => confirmDelete(cls.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-50 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden">
                  <img src={teacher?.avatar || 'https://picsum.photos/seed/none/40'} alt="" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Class Teacher</p>
                  <p className="text-sm font-semibold text-gray-700 truncate">{teacher?.name || 'Unassigned'}</p>
                </div>
              </div>
            </div>
          );
        })}
        {classes.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-20">
            <p className="text-lg font-bold">No classes defined yet</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fadeIn overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
              <h2 className="text-xl font-bold text-gray-800">{editingClass ? 'Edit Class' : 'New Class'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <form onSubmit={handleSaveClass} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Class Name / Grade Level</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Grade 10, JSS 1, Nursery"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Class Arm (Identifier)</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. A, B, Green, Blue"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={formData.arm}
                  onChange={e => setFormData({...formData, arm: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Class ID</label>
                <input 
                  type="text"
                  placeholder={editingClass ? 'e.g. C1' : 'Auto-generated'}
                  className={`w-full px-4 py-2 border border-gray-200 rounded-xl outline-none transition-all ${isIdEditable ? 'bg-white focus:ring-2 focus:ring-indigo-500' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                  value={formData.id}
                  onChange={e => setFormData({...formData, id: e.target.value})}
                  readOnly={!isIdEditable}
                  disabled={!editingClass}
                />
                {!isIdEditable && editingClass && currentUser.role !== 'admin' && (
                   <p className="text-[10px] text-gray-500 mt-1 italic">Only administrators can edit the Class ID.</p>
                )}
                {!editingClass && (
                  <p className="text-[10px] text-gray-500 mt-1 italic">Class ID will be auto-generated upon creation.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Class Teacher</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={formData.classTeacherId}
                  onChange={e => setFormData({...formData, classTeacherId: e.target.value})}
                >
                  <option value="">Select a Teacher</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">Save Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-fadeIn overflow-hidden p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Delete Class?</h2>
            <p className="text-sm text-gray-500 mb-6">Removing this class will affect student enrollments and subject allocations.</p>
            <div className="flex space-x-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
              <button onClick={executeDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
