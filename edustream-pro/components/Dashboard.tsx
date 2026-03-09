
import React, { useState, useEffect } from 'react';
import { apiService as dataService } from '../services/apiService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  const loadDashboard = async () => {
    try {
      const data = await dataService.getLiveDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  loadDashboard();
}, []);

  if (isLoading || !dashboardData) {
    return (
      <div className="p-8 flex items-center justify-center h-full opacity-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Querying System Records...</p>
        </div>
      </div>
    );
  }

  const { stats, performanceTrend, urgentActions } = dashboardData;

  const cards = [
    { label: 'Total Students', value: stats.totalStudents, color: 'bg-indigo-600', icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    )},
    { label: 'Total Teachers', value: stats.totalTeachers, color: 'bg-purple-600', icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
    )},
    { label: 'Avg Attendance', value: `${stats.avgAttendance}%`, color: 'bg-emerald-600', icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
    )},
    { label: 'Upcoming Events', value: stats.upcomingEvents, color: 'bg-orange-500', icon: (
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
    )}
  ];

  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      <header>
        <h1 className="text-4xl font-black text-gray-800 tracking-tighter">School Overview</h1>
        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1 italic">Real-time Institutional Performance & Metrics</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 hover:shadow-2xl hover:border-indigo-100 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
                <h3 className="text-3xl font-black text-gray-800 tracking-tighter">{card.value}</h3>
              </div>
              <div className={`${card.color} w-14 h-14 rounded-[20px] flex items-center justify-center shadow-xl shadow-gray-100 transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                {card.icon}
              </div>
            </div>
            <div className="mt-6 flex items-center text-[10px] text-emerald-600 font-black uppercase tracking-widest">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
              </svg>
              <span>Verified Data Stream</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[48px] shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
               <h2 className="text-2xl font-black text-gray-800 tracking-tight">Academic Performance Trend</h2>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Global Terminal Average Distribution</p>
            </div>
            <select className="bg-gray-50 border-2 border-transparent focus:border-indigo-500 outline-none text-[10px] font-black uppercase tracking-widest rounded-2xl px-6 py-3 transition-all">
              <option>Session 2024/2025</option>
              <option>Session 2023/2024</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceTrend}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                  itemStyle={{ color: '#6366f1', fontWeight: 900, fontSize: '14px' }}
                  labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="average" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorAvg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Notices */}
        <div className="bg-white p-10 rounded-[48px] shadow-sm border border-gray-100 flex flex-col">
          <div className="mb-8">
             <h2 className="text-2xl font-black text-gray-800 tracking-tight">Urgent Actions</h2>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Pending System Interventions</p>
          </div>
          
          <div className="space-y-6 flex-1">
            {urgentActions.map((item: any, i: number) => (
              <div key={i} className="flex space-x-5 p-5 rounded-[32px] hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group relative overflow-hidden">
                <div className={`w-1.5 h-12 rounded-full shrink-0 ${
                  item.type === 'error' ? 'bg-rose-500' : 
                  item.type === 'warning' ? 'bg-orange-500' : 
                  'bg-indigo-500'
                }`}></div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-gray-800 truncate">{item.title}</h4>
                  <p className="text-[11px] text-gray-500 mt-1 font-medium leading-relaxed">{item.desc}</p>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-2">{item.time}</p>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-10 py-5 text-indigo-600 text-[11px] font-black uppercase tracking-[0.2em] border-2 border-indigo-50 rounded-[28px] hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-xl shadow-indigo-100/10 active:scale-95">
            Resolve All Notifications
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
