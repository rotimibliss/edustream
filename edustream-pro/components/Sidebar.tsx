
import React, { useState, useEffect } from 'react';
import { View, AcademicSession, AuthUser, SchoolSettings } from '../types';
import { apiService as dataService } from '../services/apiService';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  activeSession: AcademicSession;
  currentUser: AuthUser;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, activeSession, currentUser, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [settings, setSettings] = useState<SchoolSettings>({
    name: 'Loading...',
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
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await dataService.getSettings();
        setSettings(data);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();

    const handleUpdate = () => loadSettings();
    window.addEventListener('schoolSettingsUpdated', handleUpdate);
    return () => window.removeEventListener('schoolSettingsUpdated', handleUpdate);
  }, []);

  const allItems: { id: View; label: string; icon: React.ReactNode; category?: string; roles?: string[]; permissionCheck?: () => boolean }[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
      // Dashboard — admin + heads see this
      roles: ['admin', 'principal', 'headteacher']
    },
    { 
      id: 'teacher-dashboard', 
      label: 'My Dashboard', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      roles: ['teacher']
    },
    { 
      id: 'students', 
      label: 'Student Records', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>, 
      category: 'Core',
      roles: ['admin', 'teacher', 'principal', 'headteacher'],
      permissionCheck: () => currentUser.role === 'admin' || 
  currentUser.role === 'principal' || 
  currentUser.role === 'headteacher' || 
  settings.permissions?.teacher?.canManageStudents
    },
    { 
      id: 'teachers', 
      label: 'Staff Management', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, 
      category: 'Core',
      roles: ['admin', 'principal', 'headteacher']
    },
    { 
      id: 'parents', 
      label: 'Parent Profiles', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, 
      category: 'Core',
      roles: ['admin', 'principal', 'headteacher']
    },
    { 
      id: 'classes', 
      label: 'Class Setup', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>, 
      category: 'Academic',
      roles: ['admin', 'principal', 'headteacher']
    },
    { 
      id: 'subjects', 
      label: 'Subject Config', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, 
      category: 'Academic',
      roles: ['admin', 'principal', 'headteacher']
    },
    { 
      id: 'results', 
      label: 'Result Entry', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, 
      category: 'Academic',
      roles: ['admin', 'teacher', 'principal', 'headteacher'],
      permissionCheck: () => currentUser.role === 'admin' || 
  currentUser.role === 'principal' || 
  currentUser.role === 'headteacher' || 
  settings.permissions?.teacher?.canEnterResults
    },
    { 
      id: 'broadsheet', 
      label: 'Master Sheet', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>, 
      category: 'Academic',
      roles: ['admin', 'teacher', 'principal', 'headteacher'],
      permissionCheck: () => currentUser.role === 'admin' || 
  currentUser.role === 'principal' || 
  currentUser.role === 'headteacher' || 
  settings.permissions?.teacher?.canViewBroadsheet
    },
    { 
      id: 'class-performance', 
      label: 'Performance Hub', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, 
      category: 'Academic',
      roles: ['admin', 'teacher', 'principal', 'headteacher']
    },
    { 
      id: 'view-subject-results', 
      label: 'Subject Results', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>, 
      category: 'Academic',
      roles: ['admin', 'teacher', 'principal', 'headteacher']
    },
    { 
      id: 'reports', 
      label: 'Terminal Reports', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, 
      category: 'Reporting',
      roles: ['admin', 'teacher', 'principal', 'headteacher']
    },

    {
  id: 'promotions',
  label: 'Promotions',
  icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>,
  category: 'Academic',
  roles: ['admin', 'principal', 'headteacher']
},
    { 
      id: 'sessions', 
      label: 'Session Control', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, 
      category: 'Reporting',
      roles: ['admin', 'principal', 'headteacher']
    },
    { 
      id: 'traits', 
      label: 'Trait Metrics', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>, 
      category: 'Reporting',
      roles: ['admin', 'principal', 'headteacher']
    },
    { 
      id: 'ai-assistant', 
      label: 'Admin AI Copilot', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>, 
      category: 'Tools',
      roles: ['admin']
    },
    { 
      id: 'settings', 
      label: 'Admin Settings', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, 
      category: 'Tools',
      roles: ['admin']
    },
    { 
      id: 'maintenance', 
      label: 'System Maintenance', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>, 
      category: 'Tools',
      roles: ['admin']
    },
    { 
      id: 'parent-portal', 
      label: 'My Children', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>, 
      roles: ['parent']
    }
  ];

  const filteredItems = allItems.filter(item => {
    if (!item.roles || item.roles.includes(currentUser.role)) {
      if (item.permissionCheck) {
        return item.permissionCheck();
      }
      return true;
    }
    return false;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'Main';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, typeof filteredItems>);

  return (
    <aside className={`bg-white border-r border-gray-100 flex flex-col transition-all duration-300 print:hidden ${isCollapsed ? 'w-20' : 'w-72'}`}>
      {/* Logo / Header */}
      <div className="h-20 px-6 flex items-center justify-between border-b border-gray-100">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <div className="leading-none">
              <h1 className="text-sm font-black text-gray-800">{settings.name}</h1>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Portal</p>
            </div>
          </div>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
          </svg>
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            {!isCollapsed && category !== 'Main' && (
              <div className="px-3 mb-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">{category}</p>
              </div>
            )}
            <div className="space-y-1">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all group ${
                    currentView === item.id
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className={currentView === item.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="text-sm font-bold truncate">{item.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-100">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} mb-3`}>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-gray-800 truncate">{currentUser.name}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{currentUser.role}</p>
            </div>
          )}
          <button
            onClick={onLogout}
            className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors flex-shrink-0"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
