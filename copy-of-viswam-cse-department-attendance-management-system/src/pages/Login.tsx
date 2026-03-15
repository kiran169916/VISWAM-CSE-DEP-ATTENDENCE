import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Eye, EyeOff, Lock, Mail, User, Users, Shield } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

type Role = 'Student' | 'Faculty' | 'HOD';

export default function Login() {
  const [role, setRole] = useState<Role>('Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-fill credentials for quick testing based on selected role
    if (role === 'Student') {
      setEmail('student@viswam.edu');
      setPassword('student123');
    } else if (role === 'Faculty') {
      setEmail('faculty@viswam.edu');
      setPassword('faculty123');
    } else if (role === 'HOD') {
      setEmail('hod@viswam.edu');
      setPassword('admin123');
    }
    setError('');
    setIsSetup(false);
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Handle Firebase Auth
      if (isSetup) {
        // Create user in Firebase Auth
        await createUserWithEmailAndPassword(auth, email, password);
        // We are now signed in.
      } else {
        // Sign in with Firebase Auth
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
            // If user not found in Firebase, maybe they need to set up their password
            setIsSetup(true);
            setError('Please set up your password to continue.');
            setLoading(false);
            return;
          }
          throw authErr;
        }
      }

      // 2. Check Firestore for role (now authenticated)
      let isAuthorized = false;
      if (role === 'Faculty') {
        const q = query(collection(db, 'faculty'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          isAuthorized = true;
        } else {
          await auth.signOut();
          setError('Access Denied: Your email is not registered as faculty.');
          setLoading(false);
          return;
        }
      } else if (role === 'Student') {
        const q = query(collection(db, 'students'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          isAuthorized = true;
        } else {
          await auth.signOut();
          setError('Access Denied: Your email is not registered as a student.');
          setLoading(false);
          return;
        }
      } else if (role === 'HOD') {
        if (email === 'kiran731678@gmail.com' || email === 'hod@viswam.edu') {
          isAuthorized = true;
        } else {
          const q = query(collection(db, 'users'), where('email', '==', email), where('role', '==', 'HOD'));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            isAuthorized = true;
          } else {
            await auth.signOut();
            setError('Access Denied: Your email is not registered as HOD.');
            setLoading(false);
            return;
          }
        }
      }

      if (!isAuthorized) {
        setLoading(false);
        return;
      }

      // 3. Get backend JWT token
      const res = await api.post('/login-firebase', { email, role });
      login(res.data.token, res.data.user);
      
      if (isSetup) {
        setIsSetup(false);
      }
      navigate('/dashboard');
      
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
      await auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="mt-6 text-center text-4xl font-extrabold text-white tracking-tight">
          Viswam CSE Dept
        </h2>
        <p className="mt-2 text-center text-sm text-blue-200 font-medium tracking-wide uppercase">
          Attendance Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-sm py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20">
          
          {/* Role Selection Tabs */}
          <div className="flex justify-center space-x-2 mb-8 bg-slate-100 p-1.5 rounded-xl">
            {(['Student', 'Faculty', 'HOD'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 ${
                  role === r
                    ? 'bg-white text-blue-700 shadow-md transform scale-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                {r === 'Student' && <User size={18} />}
                {r === 'Faculty' && <Users size={18} />}
                {r === 'HOD' && <Shield size={18} />}
                <span>{r}</span>
              </button>
            ))}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className={`p-3 rounded-md text-sm ${isSetup && !error.includes('error') ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800'}`}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {isSetup ? 'Set Password' : 'Password'}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                  placeholder="********"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Processing...' : isSetup ? 'Set Password' : `Sign in as ${role}`}
              </button>
            </div>
          </form>

          {/* Reference Credentials Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Reference Credentials:</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li><strong>Student:</strong> student@viswam.edu / student123</li>
              <li><strong>Faculty:</strong> faculty@viswam.edu / faculty123</li>
              <li><strong>HOD:</strong> hod@viswam.edu / admin123</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
