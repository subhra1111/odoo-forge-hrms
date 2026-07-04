'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, Calendar, Clock, DollarSign, User, LogOut, Activity, Search } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { checkIn, checkOut, getMyAttendance } from '@/lib/api';
import { useEffect, useState, useRef } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isStatusPopupOpen, setIsStatusPopupOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const loadAttendanceStatus = async () => {
    try {
      const res = await getMyAttendance();
      if (res.data && res.data.success) {
        const logs = res.data.data || [];
        if (logs.length > 0) {
          const latest = logs[0];
          const todayStr = new Date().toLocaleDateString('en-CA');
          if (latest.date === todayStr && latest.check_in && !latest.check_out) {
            setIsCheckedIn(true);
          } else {
            setIsCheckedIn(false);
          }
        } else {
          setIsCheckedIn(false);
        }
      }
    } catch (err) {
      console.error('Failed to load check-in status:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAttendanceStatus();
    }
  }, [isAuthenticated]);

  const handleCheckInOut = async () => {
    try {
      if (isCheckedIn) {
        const res = await checkOut();
        if (res.data && res.data.success) {
          setIsCheckedIn(false);
          alert('Checked out successfully!');
          window.location.reload();
        }
      } else {
        const res = await checkIn();
        if (res.data && res.data.success) {
          setIsCheckedIn(true);
          alert('Checked in successfully!');
          window.location.reload();
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to update attendance status.');
    }
  };

  const statusPopupRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusPopupRef.current && !statusPopupRef.current.contains(event.target as Node)) {
        setIsStatusPopupOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isHydrated || !isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isTabActive = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true;
    if (path !== '/dashboard' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col text-slate-800 font-['Outfit']">
      {/* Top Header / Systray */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm relative z-50">
        <div className="flex items-center space-x-12">
          {/* Company Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <img src="/logo.png" alt="HRMS Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-gray-800">HRMS</span>
          </Link>
          
          {/* Navigation Tabs */}
          <nav className="flex space-x-8">
            <Link 
              href="/dashboard" 
              className={`text-sm font-medium transition-colors ${isTabActive('/dashboard') ? 'text-pink-600 border-b-2 border-pink-600 pb-1' : 'text-gray-500 hover:text-gray-900 pb-1'}`}
            >
              Employees
            </Link>
            <Link 
              href="/attendance" 
              className={`text-sm font-medium transition-colors ${isTabActive('/attendance') ? 'text-pink-600 border-b-2 border-pink-600 pb-1' : 'text-gray-500 hover:text-gray-900 pb-1'}`}
            >
              Attendance
            </Link>
            <Link 
              href="/timeoff" 
              className={`text-sm font-medium transition-colors ${isTabActive('/timeoff') ? 'text-pink-600 border-b-2 border-pink-600 pb-1' : 'text-gray-500 hover:text-gray-900 pb-1'}`}
            >
              Time Off
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center space-x-6">
          
          {/* Status Dot / Check In Out Popup */}
          <div className="relative" ref={statusPopupRef}>
            <button 
              onClick={() => setIsStatusPopupOpen(!isStatusPopupOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
            >
              <div className={`w-3 h-3 rounded-full ${isCheckedIn ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </button>
            
            {isStatusPopupOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl py-4 px-4 z-50">
                <div className="text-center mb-4">
                  <p className="text-sm font-medium text-gray-600">Current Status</p>
                  <p className={`text-lg font-bold ${isCheckedIn ? 'text-green-600' : 'text-red-600'}`}>
                    {isCheckedIn ? 'Checked In' : 'Checked Out'}
                  </p>
                  {isCheckedIn && <p className="text-xs text-gray-400 mt-1">Since 09:00 AM</p>}
                </div>
                <button 
                  onClick={handleCheckInOut}
                  className={`w-full py-2 rounded-md text-sm font-medium transition-colors ${isCheckedIn ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
                >
                  {isCheckedIn ? 'Check Out →' : 'Check In →'}
                </button>
              </div>
            )}
          </div>
          
          {/* Profile Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <div className="flex flex-col items-end hidden md:flex">
                <span className="text-sm font-medium text-gray-700">{user?.name || 'Loading...'}</span>
                <span className="text-xs text-gray-500 capitalize">{user?.role || 'Role'}</span>
              </div>
              <img src={user?.avatar || '/default_avatar.png'} alt="Profile" className="w-10 h-10 rounded-full border border-gray-200" />
            </div>
            
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50">
                <Link 
                  href={`/profile/${user?.id || 'me'}`} 
                  onClick={() => setIsDropdownOpen(false)} 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-pink-600"
                >
                  My Profile
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-red-600"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
          
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-[#F9FAFB]">
        {children}
      </main>
    </div>
  );
}
