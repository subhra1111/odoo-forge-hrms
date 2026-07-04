'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Calendar as CalendarIcon, CheckCircle, Clock } from 'lucide-react';
import { getMyAttendance, getAllAttendance, checkIn, checkOut } from '@/lib/api';
import dayjs from 'dayjs';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'HR';
  
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(dayjs().format('DD/MMMM YYYY'));

  const loadAttendance = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const res = await getAllAttendance();
        if (res.data && res.data.success) {
          setRecords(res.data.data || []);
        }
      } else {
        const res = await getMyAttendance();
        if (res.data && res.data.success) {
          const logs = res.data.data || [];
          setRecords(logs);
          
          // Determine check-in state: check if there's any record for today that hasn't checked out
          const today = dayjs().format('YYYY-MM-DD');
          const todayLog = logs.find((r: any) => dayjs(r.date).format('YYYY-MM-DD') === today && !r.check_out);
          setIsCheckedIn(!!todayLog);
        }
      }
    } catch (err) {
      console.error('Failed to load attendance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAttendance();
    }
  }, [user]);

  const handleCheckIn = async () => {
    try {
      const res = await checkIn();
      if (res.data && res.data.success) {
        alert('Checked in successfully! Status updated to Present.');
        loadAttendance();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to check-in.');
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await checkOut();
      if (res.data && res.data.success) {
        alert('Checked out successfully! Shift hours and overtime calculated.');
        loadAttendance();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to check-out.');
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '-';
    return dayjs(isoString).format('hh:mm A');
  };

  const formatDate = (isoString: string) => {
    return dayjs(isoString).format('DD/MM/YYYY');
  };

  const filteredRecords = records.filter(rec => {
    if (isAdmin && searchQuery) {
      const empName = rec.employee_id?.name || rec.employee_id?.employee_id || '';
      return empName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  if (!user) return null;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500">Track and manage daily attendance, shift hours, and overtime.</p>
        </div>
        
        {/* Action button for employee check-in / check-out */}
        {!isAdmin && (
          <div className="flex items-center space-x-3">
            {isCheckedIn ? (
              <button 
                onClick={handleCheckOut}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-md flex items-center space-x-2"
              >
                <Clock className="w-4 h-4" />
                <span>Check Out</span>
              </button>
            ) : (
              <button 
                onClick={handleCheckIn}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-md flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Check In</span>
              </button>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="relative w-full md:w-64">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-4 w-4 text-gray-400" />
             </div>
             <input 
               type="text" 
               placeholder="Search by employee name..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none w-full shadow-sm" 
             />
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Header Controls */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-600">History Log</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-700 font-semibold">
            <CalendarIcon className="w-4 h-4 text-pink-600" />
            <span>{currentDate}</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading attendance records...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No attendance records found.</div>
        ) : isAdmin ? (
          // Admin View - List of all employees
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Employee</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Check In</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Check Out</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Work Hours</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Extra Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((rec) => {
                  const emp = rec.employee_id;
                  const name = emp?.name || 'Onboarded Employee';
                  const avatar = emp?.profilePicture ? `http://localhost:5000${emp.profilePicture}` : `/default_avatar.png`;
                  return (
                    <tr key={rec._id} className="hover:bg-gray-50/80 transition-colors text-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={avatar} 
                            alt={name}
                            className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                          />
                          <div>
                            <span className="font-medium text-gray-900 block">{name}</span>
                            <span className="text-[10px] text-gray-400">{rec.employee_code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{formatDate(rec.date)}</td>
                      <td className="px-6 py-4 font-medium">{formatTime(rec.check_in)}</td>
                      <td className="px-6 py-4 font-medium">{formatTime(rec.check_out)}</td>
                      <td className="px-6 py-4 font-semibold text-pink-600">{rec.work_hours ?? 0} hrs</td>
                      <td className="px-6 py-4 font-semibold text-green-600">{rec.overtime_hours ?? 0} hrs</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // Employee View - Self records
          <div className="overflow-x-auto">
            <div className="flex flex-wrap gap-4 p-5 border-b border-gray-100 text-sm bg-gray-50/50">
               <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                 <span className="text-gray-600 font-medium">Days Present</span>
                 <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full font-bold text-xs">
                   {records.filter(r => r.work_hours > 0).length}
                 </span>
               </div>
               <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                 <span className="text-gray-600 font-medium">Total Check-ins</span>
                 <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-bold text-xs">{records.length}</span>
               </div>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Check In</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Check Out</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Work Hours</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Extra Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredRecords.map(rec => (
                  <tr key={rec._id} className="hover:bg-gray-50/80 transition-colors text-gray-700">
                    <td className="px-6 py-4 font-medium text-gray-900">{formatDate(rec.date)}</td>
                    <td className="px-6 py-4">{formatTime(rec.check_in)}</td>
                    <td className="px-6 py-4">{formatTime(rec.check_out)}</td>
                    <td className="px-6 py-4 font-semibold text-pink-600">{rec.work_hours ?? 0} hrs</td>
                    <td className="px-6 py-4 font-semibold text-green-600">{rec.overtime_hours ?? 0} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
