
import React, { useState } from 'react';
import { AuthUser } from '../types';
import { apiService as dataService } from '../services/apiService';

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<'staff' | 'parent'>('staff');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await dataService.login(username, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Invalid username or password. Please try again.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please check your credentials or try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md animate-fadeIn z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-white rounded-3xl shadow-2xl mb-6">
            <svg className="w-10 h-10 text-indigo-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">EduStream Pro</h1>
          <p className="text-indigo-300 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Unified School Management Portal</p>
        </div>

        <div className="bg-white rounded-[48px] shadow-2xl overflow-hidden border border-white/10 p-10">
          <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-8">
            <button 
              onClick={() => { setLoginType('staff'); setError(''); }}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${loginType === 'staff' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
            >
              Faculty / Admin
            </button>
            <button 
              onClick={() => { setLoginType('parent'); setError(''); }}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${loginType === 'parent' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
            >
              Parent Portal
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Username</label>
              <div className="relative">
                <input 
                  required
                  type="text"
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-bold text-gray-700"
                  placeholder={loginType === 'staff' ? "e.g. Admin or teacher1" : "e.g. parent1"}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <input 
                  required
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-bold text-gray-700 pr-14"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-2"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-600 animate-fadeIn">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs text-white transition-all shadow-xl active:scale-95 disabled:opacity-70 flex items-center justify-center space-x-3 ${loginType === 'staff' ? 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700' : 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700'}`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In To Account</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7-7 7M3 12h18" /></svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 text-center">
             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
               For technical assistance, please contact the <br/>School IT Department at support@lincoln.edu
             </p>
          </div>
        </div>

        <div className="mt-8 text-center text-indigo-300/40 text-[10px] font-black uppercase tracking-[0.5em]">
           EduStream Storage v1.2 • Secure Session Active
        </div>
      </div>
    </div>
  );
};

export default Login;
