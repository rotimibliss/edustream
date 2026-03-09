import React, { useState, useEffect, useRef } from 'react';
import { SchoolSettings, RolePermissions } from '../types';
import { apiService as dataService } from '../services/apiService';

const DEFAULT_SETTINGS: SchoolSettings = {
  name: 'EduStream School',
  logo: '',
  address: '',
  email: '',
  phone: '',
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

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'identity' | 'privileges' | 'appearance'>('identity');
  const [isSaving, setIsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await dataService.getSettings();
        setSettings(data || DEFAULT_SETTINGS);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSaving(true);
      await dataService.saveSettings(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePermission = (role: 'teacher' | 'parent', key: string) => {
    const newPermissions = { ...settings.permissions };
    // @ts-ignore
    newPermissions[role][key] = !newPermissions[role][key];
    setSettings({ ...settings, permissions: newPermissions });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Loading Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Admin Settings</h1>
          <p className="text-gray-500 font-medium mt-1 uppercase tracking-widest text-[10px]">Secure System Control Panel</p>
        </div>
        <div className="bg-white p-1.5 rounded-[24px] shadow-sm border border-gray-100 flex overflow-x-auto">
          <button onClick={() => setActiveTab('identity')} className={`px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'identity' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Identity</button>
          <button onClick={() => setActiveTab('privileges')} className={`px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'privileges' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Role Privileges</button>
          <button onClick={() => setActiveTab('appearance')} className={`px-6 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'appearance' ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-400 hover:text-gray-600'}`}>Styling</button>
        </div>
      </header>

      {activeTab === 'identity' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-[48px] shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8">Institutional Logo</h3>
            <div className="w-40 h-40 rounded-[48px] bg-gray-50 border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden relative group cursor-pointer mb-6" onClick={() => logoInputRef.current?.click()}>
              {settings.logo ? (
                <img src={settings.logo} className="w-full h-full object-cover" alt="logo" />
              ) : (
                <div className="text-gray-300 flex flex-col items-center">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest">No Logo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <p className="text-[9px] text-gray-400 font-medium">Click to upload school logo</p>
          </div>

          <div className="lg:col-span-2 bg-white p-10 rounded-[48px] shadow-sm border border-gray-100">
            <form onSubmit={handleSaveSettings} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">School Official Name</label>
                  <input required className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Support Phone</label>
                  <input className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Official Email</label>
                  <input type="email" className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Physical Address</label>
                  <input className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Update Identity'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'privileges' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100 space-y-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <h3 className="text-xl font-black text-gray-800">Faculty Privileges</h3>
            </div>
            <div className="space-y-4">
              {[
                { key: 'canManageStudents', label: 'Modify Student Records', desc: 'Register or delete student profiles' },
                { key: 'canEnterResults', label: 'Access Gradebook', desc: 'Input CA scores and exam marks' },
                { key: 'canViewBroadsheet', label: 'View Broadsheet', desc: 'See class-wide terminal scorecards' },
                { key: 'canViewAllStudents', label: 'View All Students', desc: 'See students outside their classes' },
                { key: 'canEditProfiles', label: 'Edit Student Avatars', desc: 'Upload profile pictures' }
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-6 bg-gray-50/50 rounded-[32px] border border-transparent hover:border-indigo-100 transition-all">
                  <div className="max-w-[70%]">
                    <h4 className="text-sm font-black text-gray-800">{item.label}</h4>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                  <button onClick={() => togglePermission('teacher', item.key)} className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${settings.permissions.teacher[item.key as keyof RolePermissions['teacher']] ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.permissions.teacher[item.key as keyof RolePermissions['teacher']] ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100 space-y-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="text-xl font-black text-gray-800">Guardian Access</h3>
            </div>
            <div className="space-y-4">
              {[
                { key: 'canViewResults', label: 'View Academic Results', desc: 'See subject score tables' },
                { key: 'canViewAttendance', label: 'View Attendance', desc: 'See term-wide present/absent counts' },
                { key: 'canViewRemarks', label: 'View Teacher Comments', desc: 'Read behavioral summaries' }
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-6 bg-gray-50/50 rounded-[32px] border border-transparent hover:border-emerald-100 transition-all">
                  <div className="max-w-[70%]">
                    <h4 className="text-sm font-black text-gray-800">{item.label}</h4>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                  <button onClick={() => togglePermission('parent', item.key)} className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${settings.permissions.parent[item.key as keyof RolePermissions['parent']] ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.permissions.parent[item.key as keyof RolePermissions['parent']] ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 pt-6">
            <button onClick={() => handleSaveSettings()} disabled={isSaving} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-[0.3em] text-xs shadow-2xl active:scale-95 transition-all hover:bg-indigo-700 disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save All Privileges'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
          <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100 space-y-8">
            <h3 className="text-xl font-black text-gray-800">Visual Styling</h3>
            <div>
               <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Primary Brand Color</label>
               <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl shadow-inner border-2 border-white" style={{ backgroundColor: settings.primaryColor }}></div>
                  <input type="text" className="flex-1 px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl font-black uppercase focus:border-indigo-500 focus:bg-white outline-none transition-all" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} />
               </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100 space-y-8">
            <h3 className="text-xl font-black text-gray-800">Global Features</h3>
            <div className="flex items-center justify-between p-6 bg-gray-50 rounded-[32px]">
               <div>
                 <h4 className="text-sm font-black text-gray-800">AI Assistant Engine</h4>
                 <p className="text-[10px] text-gray-400 font-medium">Enable/Disable Gemini Copilot</p>
               </div>
               <button onClick={() => setSettings({...settings, enableAI: !settings.enableAI})} className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${settings.enableAI ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                 <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.enableAI ? 'translate-x-7' : 'translate-x-1'}`}></div>
               </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <button onClick={() => handleSaveSettings()} disabled={isSaving} className="w-full py-5 bg-gray-800 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-gray-700 transition-all disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save Styling Preferences'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
