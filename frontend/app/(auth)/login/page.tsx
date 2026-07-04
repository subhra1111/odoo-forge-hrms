'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { loginAPI } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const login = useAuthStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await loginAPI(email, password);
      if (response.data && response.data.success) {
        const token = response.data.token;
        const employee = response.data.data;
        login({
          id: employee.employee_id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          department: employee.department,
          avatar: employee.profilePicture ? `http://localhost:5000${employee.profilePicture}` : undefined,
        }, token);
        
        router.push('/dashboard');
      } else {
        setError(response.data?.error || 'Invalid credentials');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid credentials or server connection failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] text-gray-800 font-['Outfit']">
      <div className="w-full max-w-md p-10 space-y-8 bg-white rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex flex-col items-center justify-center mb-8 space-y-4">
            {/* Logo placeholder */}
            <img src="/logo.png" alt="HRMS Logo" className="w-14 h-14 object-contain mb-2" />
           <h2 className="text-2xl font-bold text-gray-900">Sign in to HRMS</h2>
           <p className="text-sm text-gray-500">Enter your details below to continue.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Login ID / Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. OITODO20220001"
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{error}</p>}

          <button
            type="submit"
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 rounded-lg transition-all mt-4 shadow-sm"
          >
            SIGN IN
          </button>
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Company Registration? <Link href="/signup" className="text-pink-600 hover:text-pink-700 font-medium ml-1">Sign Up</Link>
            </p>
          </div>
        </form>

        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-700 font-semibold mb-2">Login Guidelines</p>
          <ul className="text-[12px] text-gray-600 list-disc pl-4 space-y-1">
            <li>Employees cannot register themselves. HR officer/Admin creates new users.</li>
            <li>Your Login ID is auto-generated (e.g. OITODO20220001).</li>
            <li>First-time login requires changing the system-generated password in your Security tab.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
