
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import TeacherManagement from './components/TeacherManagement';
import ClassManagement from './components/ClassManagement';
import SubjectManagement from './components/SubjectManagement';
import ResultManagement from './components/ResultManagement';
import ReportManagement from './components/ReportManagement';
import Broadsheet from './components/Broadsheet';
import ClassPerformance from './components/ClassPerformance';
import ParentManagement from './components/ParentManagement';
import ParentDashboard from './components/ParentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import SessionManagement from './components/SessionManagement';
import TraitManagement from './components/TraitManagement';
import AIAssistant from './components/AIAssistant';
import ClassListView from './components/ClassListView';
import SystemMaintenance from './components/SystemMaintenance';
import Settings from './components/Settings';
import Login from './components/Login';
import ViewSubjectResults from './components/ViewSubjectResults';
import { View, AcademicSession, AuthUser, SchoolSettings } from './types';
import { apiService as dataService } from './services/apiService';
import PromotionManagement from './components/PromotionManagement';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeSession, setActiveSession] = useState<AcademicSession | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
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
  });

  useEffect(() => {
    const initializeApp = async () => {
      dataService.init();
      const user = dataService.getCurrentUser();
      
      if (user) {
        setCurrentUser(user);
        if (user.role === 'teacher') setCurrentView('teacher-dashboard');
        else if (user.role === 'headteacher' || user.role === 'principal') setCurrentView('dashboard');
        else if (user.role === 'parent') setCurrentView('parent-portal');
      }
      
      try {
        const [session, settings] = await Promise.all([
          dataService.getActiveSession(),
          dataService.getSettings()
        ]);
        
        setActiveSession(session);
        setSchoolSettings(settings);
      } catch (error) {
        console.error('Failed to load app data:', error);
      }
      
      setIsDataLoaded(true);
    };

    initializeApp();

    const handleSettingsUpdate = async () => {
      try {
        const settings = await dataService.getSettings();
        setSchoolSettings(settings);
      } catch (error) {
        console.error('Failed to update settings:', error);
      }
    };
    
    window.addEventListener('schoolSettingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('schoolSettingsUpdated', handleSettingsUpdate);
  }, []);

  const handleLoginSuccess = (user: AuthUser) => {
  setCurrentUser(user);
  if (user.role === 'admin') setCurrentView('dashboard');
  else if (user.role === 'teacher') setCurrentView('teacher-dashboard');
  else if (user.role === 'headteacher' || user.role === 'principal') setCurrentView('dashboard');
  else if (user.role === 'parent') setCurrentView('parent-portal');
};

  const handleLogout = () => {
    dataService.logout();
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const renderView = () => {
    if (!currentUser) return <Login onLoginSuccess={handleLoginSuccess} />;

    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'teacher-dashboard': return (['teacher', 'admin', 'headteacher', 'principal'].includes(currentUser.role)) ? <TeacherDashboard currentUser={currentUser} /> : <Dashboard />;
      case 'students': return <StudentManagement activeSession={activeSession} />;
      case 'teachers': return <TeacherManagement />;
      case 'parents': return <ParentManagement />;
      case 'parent-portal': return <ParentDashboard />;
      case 'classes': return <ClassManagement currentUser={currentUser} />;
      case 'class-list': return <ClassListView />;
      case 'subjects': return <SubjectManagement />;
      case 'results': return <ResultManagement activeSession={activeSession} />;
      case 'broadsheet': return <Broadsheet activeSession={activeSession} />;
      case 'class-performance': return <ClassPerformance activeSession={activeSession} />;
      case 'view-subject-results': return <ViewSubjectResults />;
      case 'reports': return <ReportManagement activeSession={activeSession} />;
      case 'promotions': return <PromotionManagement />;
      case 'sessions': return <SessionManagement />;
      case 'traits': return <TraitManagement />;
      case 'ai-assistant': return <AIAssistant />;
      case 'maintenance': return <SystemMaintenance />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
      
    }
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-bold text-gray-600">Loading EduStream Pro...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        activeSession={activeSession}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-y-auto">
        <div className="h-20 bg-white border-b border-gray-100 px-10 flex items-center justify-between sticky top-0 z-10 print:hidden">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-50 px-4 py-2 rounded-2xl">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">
                {activeSession ? `${activeSession.year} • ${activeSession.term}` : 'Loading...'}
              </span>
            </div>
            <div className="w-[1px] h-6 bg-gray-100"></div>
            <div className="flex items-center space-x-2 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
              <span>{schoolSettings.name}</span>
              <span className="text-gray-200">/</span>
              <span className="text-indigo-900 capitalize">{currentView.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-4">
              <button className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </div>

            <div className="h-10 w-[1px] bg-gray-100"></div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-gray-800">{currentUser.name}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentUser.role}</p>
              </div>
              <img src={currentUser.avatar} className="w-11 h-11 rounded-2xl border-2 border-indigo-100 shadow-sm" alt="User" />
            </div>
          </div>
        </div>

        <div className="relative min-h-[calc(100vh-80px)] print:min-h-0">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
