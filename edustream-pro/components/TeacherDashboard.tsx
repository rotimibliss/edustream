
import React, { useState, useEffect } from 'react';
import { Teacher, SchoolClass, Subject, Student, AuthUser } from '../types';
import { apiService as dataService } from '../services/apiService';

interface TeacherDashboardProps {
  currentUser: AuthUser;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentUser }) => {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);

 useEffect(() => {
  const loadData = async () => {
    const teachersData = await dataService.getTeachers();
    const allTeachers = Array.isArray(teachersData) ? teachersData : [];
    const myInfo = allTeachers.find(t => t.id === currentUser?.id);
    
    if (myInfo) {
      setTeacher(myInfo);

      const allSubjectsData = await dataService.getSubjects();
      const allSubjects = Array.isArray(allSubjectsData) ? allSubjectsData : [];
      const teacherSubjects = allSubjects.filter(s => s.teacherId === myInfo.id);
      setSubjects(teacherSubjects);

      const allClassesData = await dataService.getClasses();
      const allClasses = Array.isArray(allClassesData) ? allClassesData : [];
      const teacherClassIds = teacherSubjects.flatMap(s => s.classIds);
      const uniqueClassIds = Array.from(new Set(teacherClassIds));
      const relevantClasses = allClasses.filter(c => uniqueClassIds.includes(c.id));
      setClasses(relevantClasses);

      const allStudentsData = await dataService.getStudents();
      const allStudents = Array.isArray(allStudentsData) ? allStudentsData : [];
      const assignedStudents = allStudents.filter(s => s.classId && uniqueClassIds.includes(s.classId));
      setTotalStudents(assignedStudents.length);
    }
  };

  loadData();
}, [currentUser]);

  if (!teacher) return <div className="p-20 text-center font-bold text-gray-400">Loading Teacher Profile...</div>;

  return (
    <div className="p-8 space-y-8 animate-fadeIn max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Hello, {teacher.name.split(' ')[1]}!</h1>
          <p className="text-gray-500 font-medium mt-1 uppercase tracking-widest text-[10px]">
            Faculty Dashboard • {teacher.subject} Department
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
           {/* Total Students Card */}
           <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
              <div className="flex items-center justify-between mb-4">
                 <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" />
                    </svg>
                 </div>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Students</p>
              <p className="text-3xl font-black text-blue-600 mt-2">{totalStudents}</p>
           </div>

           {/* Total Subjects Card */}
           <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 hover:border-purple-200 transition-colors">
              <div className="flex items-center justify-between mb-4">
                 <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17.25m20-11.002c5.5 0 10 4.747 10 10.996M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 014.01 5.26 2.25 2.25 0 11-3 3.105M12 6.253H9.75m3 0H15m-3 0V3m0 3.253v10m0 0l-3.75-3.75m3.75 3.75l3.75-3.75" />
                    </svg>
                 </div>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Subjects</p>
              <p className="text-3xl font-black text-purple-600 mt-2">{subjects.length}</p>
           </div>

           {/* Total Classes Card */}
           <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors">
              <div className="flex items-center justify-between mb-4">
                 <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.5m0 0H9m0 0h-.5m.5 0v-3m0-6h5m0 0h2m-2 0h-2m0-5h2m0 0v2m0-2V7" />
                    </svg>
                 </div>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Classes</p>
              <p className="text-3xl font-black text-indigo-600 mt-2">{classes.length}</p>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Subjects & Schedule */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-800 mb-6">Current Assignments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map(sub => (
                <div key={sub.id} className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-start justify-between group hover:bg-indigo-50 transition-colors">
                  <div>
                    <h4 className="text-lg font-black text-gray-800">{sub.name}</h4>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {sub.classIds.map(cid => {
                        const cls = classes.find(c => c.id === cid);
                        return (
                          <span key={cid} className="bg-white px-3 py-1 rounded-xl text-[9px] font-black text-indigo-600 uppercase border border-indigo-100">
                            {cls?.name} ({cls?.arm})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-gray-800">Quick Result Entry</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Class</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {classes.map(cls => (
                <button 
                  key={cls.id}
                  className="p-6 bg-gray-50 rounded-[32px] border border-transparent hover:border-indigo-500 hover:bg-white transition-all text-center group"
                >
                  <p className="text-2xl font-black text-gray-800">{cls.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Arm {cls.arm}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Faculty News & Profile */}
        <div className="space-y-8">
          <div className="bg-indigo-600 p-10 rounded-[48px] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <h3 className="text-2xl font-black tracking-tight mb-2">Faculty Briefing</h3>
            <p className="text-indigo-100 text-xs font-medium leading-relaxed mb-8">
              Mid-term assessments are due by Friday. Please ensure all CA1/CA2 scores are synced before the weekend.
            </p>
            <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 transition-colors">
              Read Announcements
            </button>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
            <h3 className="text-lg font-black text-gray-800 mb-6">Upcoming Events</h3>
            <div className="space-y-4">
              {[
                { title: 'Faculty Meeting', time: 'Tomorrow, 9:00 AM', type: 'meeting' },
                { title: 'Inter-House Sports', time: 'Saturday, 10:00 AM', type: 'sports' }
              ].map((event, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 hover:bg-gray-50 rounded-3xl transition-colors border border-transparent">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${event.type === 'meeting' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-800">{event.title}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
