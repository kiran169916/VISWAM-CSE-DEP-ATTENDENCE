import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Users, BookOpen, BarChart2, Calendar } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: BarChart2, roles: ['HOD', 'Faculty', 'Student'] },
    { name: 'Faculty', path: '/faculty', icon: Users, roles: ['HOD'] },
    { name: 'Students', path: '/students', icon: User, roles: ['HOD', 'Faculty'] },
    { name: 'Reports', path: '/reports', icon: BookOpen, roles: ['HOD'] },
    { name: 'Profile', path: '/profile', icon: User, roles: ['HOD'] },
    { name: 'Mark Attendance', path: '/attendance/mark', icon: Calendar, roles: ['Faculty'] },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
        <div className="p-6 bg-slate-950/50 border-b border-white/5">
          <h1 className="text-xl font-bold tracking-tight">Viswam CSE Dept</h1>
          <p className="text-blue-400 text-xs font-medium tracking-wider uppercase mt-1">Attendance System</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.filter(item => item.roles.includes(user?.role || '')).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-950/50 border-t border-white/5">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-inner">
              <span className="text-sm font-bold text-white">{user?.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-xs text-blue-400 font-medium truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-800 hover:text-white rounded-xl transition-colors border border-white/5"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>
        <div className="p-8 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
