'use client';

import { useAuthStore } from '@/store/useAuthStore';
import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, FileText, Calendar, Plus } from 'lucide-react';
import { getLeaves, getLeaveAllocations, applyLeave, reviewLeaveRequest } from '@/lib/api';
import dayjs from 'dayjs';

export default function TimeOffPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'HR';
  
  const [activeTab, setActiveTab] = useState<'Paid Time off' | 'Sick time off'>('Paid Time off');
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [leaveType, setLeaveType] = useState('Paid Time Off');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const reqRes = await getLeaves();
      if (reqRes.data && reqRes.data.success) {
        setRequests(reqRes.data.data || []);
      }

      if (!isAdmin) {
        const allocRes = await getLeaveAllocations();
        if (allocRes.data && allocRes.data.success) {
          const allocationData = allocRes.data.data;
          setAllocations([
            {
              time_off_type: 'Paid Time Off',
              allocated_days: 24,
              used_days: 24 - (allocationData?.paid_time_off_available ?? 24)
            },
            {
              time_off_type: 'Sick Leave',
              allocated_days: 7,
              used_days: 7 - (allocationData?.sick_time_off_available ?? 7)
            }
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to load leave requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert('Please select start and end dates.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('time_off_type', leaveType);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('remarks', remarks);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const res = await applyLeave(formData);
      if (res.data && res.data.success) {
        alert('Leave request submitted successfully!');
        setShowModal(false);
        // Clear form
        setStartDate('');
        setEndDate('');
        setRemarks('');
        setAttachment(null);
        // Reload
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to submit leave request.');
    }
  };

  const handleReview = async (id: string, status: 'Approved' | 'Rejected') => {
    const comments = prompt(`Enter comments/reason for ${status.toLowerCase()} (optional):`) || '';
    try {
      const res = await reviewLeaveRequest(id, { status, comments });
      if (res.data && res.data.success) {
        alert(`Leave request has been ${status.toLowerCase()}!`);
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to review request.');
    }
  };

  const getBalance = (type: string) => {
    const alloc = allocations.find(a => a.time_off_type === type);
    if (!alloc) return { annual: type === 'Paid Time Off' ? 30 : 10, used: 0, available: type === 'Paid Time Off' ? 30 : 10 };
    return {
      annual: alloc.allocated_days,
      used: alloc.used_days,
      available: Math.max(0, alloc.allocated_days - alloc.used_days)
    };
  };

  const filteredRequests = requests.filter(req => {
    if (searchQuery) {
      const name = req.employee_id?.name || req.employee_id?.employee_id || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-green-200">Approved</span>;
      case 'Rejected':
        return <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-red-200">Rejected</span>;
      case 'Pending':
      default:
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-yellow-200">Pending</span>;
    }
  };

  if (!user) return null;

  const currentBalance = getBalance(activeTab === 'Paid Time off' ? 'Paid Time Off' : 'Sick Leave');

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Time Off</h1>
        {isAdmin ? (
          <div className="relative w-full md:w-64">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-4 w-4 text-gray-400" />
             </div>
             <input 
               type="text" 
               placeholder="Search requests..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none w-full shadow-sm" 
             />
          </div>
        ) : (
          <button onClick={() => setShowModal(true)} className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            <span>NEW REQUEST</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm min-h-[500px]">
        {isAdmin ? (
          // Admin View - Leave Requests Table
          <div>
            <div className="flex space-x-2 border-b border-gray-100 bg-gray-50/50 px-2 pt-2">
              <button className="px-6 py-3 text-sm font-semibold text-pink-600 border-b-2 border-pink-600">Pending Requests Queue</button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-3xl">
                 <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="text-pink-600 font-semibold mb-1 flex items-center space-x-2">
                       <Calendar className="w-4 h-4" />
                       <span>Pending Requests</span>
                    </div>
                    <div className="text-gray-900 text-3xl font-bold mt-2">
                      {requests.filter(r => r.status === 'Pending').length}
                    </div>
                 </div>
                 <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="text-green-600 font-semibold mb-1 flex items-center space-x-2">
                       <CheckCircle className="w-4 h-4" />
                       <span>Approved Overall</span>
                    </div>
                    <div className="text-gray-900 text-3xl font-bold mt-2">
                      {requests.filter(r => r.status === 'Approved').length}
                    </div>
                 </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading requests queue...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No leave requests found.</div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold tracking-wider">Employee</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Duration</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Type</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Remarks</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Attachment</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRequests.map((req) => {
                        const name = req.employee_id?.name || 'Onboarded Employee';
                        return (
                          <tr key={req._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                               <div className="font-semibold text-gray-900">{name}</div>
                               <div className="text-xs text-gray-500">ID: {req.employee_code}</div>
                            </td>
                            <td className="px-6 py-4">
                               <div className="text-gray-900 font-medium">{dayjs(req.start_date).format('DD/MM/YYYY')}</div>
                               <div className="text-gray-500 text-xs">to {dayjs(req.end_date).format('DD/MM/YYYY')}</div>
                               <div className="text-[10px] text-gray-400 font-bold mt-1">({req.duration_days} days)</div>
                            </td>
                            <td className="px-6 py-4 font-medium text-pink-600">{req.time_off_type}</td>
                            <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={req.remarks}>{req.remarks || '-'}</td>
                            <td className="px-6 py-4">
                              {req.attachment_url ? (
                                <a 
                                  href={`http://localhost:5000${req.attachment_url}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-pink-600 hover:text-pink-700 font-medium inline-flex items-center space-x-1 underline"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>View File</span>
                                </a>
                              ) : (
                                <span className="text-gray-400">None</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                               {getStatusBadge(req.status)}
                            </td>
                            <td className="px-6 py-4">
                              {req.status === 'Pending' ? (
                                <div className="flex space-x-2">
                                  <button 
                                    onClick={() => handleReview(req._id, 'Approved')}
                                    className="p-1.5 rounded-md bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 transition-colors" 
                                    title="Approve"
                                  >
                                     <CheckCircle className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => handleReview(req._id, 'Rejected')}
                                    className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors" 
                                    title="Reject"
                                  >
                                     <XCircle className="w-5 h-5" />
                                  </button>
                                </div>
                              ) : (
                                 <span className="text-gray-400 text-xs">Resolved</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Employee View - Allocations & Requests List
          <div>
            <div className="flex space-x-2 border-b border-gray-100 bg-gray-50/50 px-2 pt-2">
              <button 
                onClick={() => setActiveTab('Paid Time off')}
                className={`px-6 py-3 text-sm font-semibold transition-colors ${activeTab === 'Paid Time off' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Paid Time off
              </button>
              <button 
                onClick={() => setActiveTab('Sick time off')}
                className={`px-6 py-3 text-sm font-semibold transition-colors ${activeTab === 'Sick time off' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Sick time off
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8 mb-12 border-b border-gray-100 pb-8">
                 <div className="text-center bg-gray-50 border border-gray-200 rounded-2xl p-6 min-w-[200px]">
                    <div className="text-5xl font-extrabold text-gray-900">{currentBalance.available}</div>
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-2">Days Available</div>
                 </div>
                 <div className="space-y-2 text-sm text-gray-600">
                    <p className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Total Annual Allowance: {currentBalance.annual} days</p>
                    <p className="flex items-center"><FileText className="w-4 h-4 mr-2 text-blue-500" /> Used this year: {currentBalance.used} days</p>
                 </div>
              </div>
              
              <h3 className="font-bold text-gray-900 mb-4">My Requests History</h3>
              {loading ? (
                <div className="text-center py-6 text-gray-500">Loading history...</div>
              ) : requests.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-400">
                   <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                   <span className="font-medium">No leave requests submitted yet.</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm text-left bg-white">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase font-semibold">
                      <tr>
                        <th className="px-6 py-3">Dates</th>
                        <th className="px-6 py-3">Duration</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {requests.map(req => (
                        <tr key={req._id} className="text-gray-700">
                          <td className="px-6 py-4 font-medium">
                            {dayjs(req.start_date).format('DD/MM/YYYY')} - {dayjs(req.end_date).format('DD/MM/YYYY')}
                          </td>
                          <td className="px-6 py-4 font-semibold">{req.duration_days} days</td>
                          <td className="px-6 py-4 text-pink-600 font-medium">{req.time_off_type}</td>
                          <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                          <td className="px-6 py-4 text-gray-500 italic text-xs">{req.comments || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl max-w-3xl">
         <div className="flex items-center space-x-2 text-blue-800 font-bold mb-2">
            <span className="bg-blue-200 text-blue-900 text-xs px-2 py-0.5 rounded-full">INFO</span>
            <span>Policy Note</span>
         </div>
         <p className="text-sm text-blue-700 leading-relaxed">
           Employees can view only their own time off records and balances. Administrators and HR personnel have access to the global request queue where they can review, approve, or reject pending applications from all staff members.
         </p>
      </div>

      {/* New Time Off Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
               <h3 className="text-xl font-bold text-gray-900">New Leave Request</h3>
               <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 transition-colors bg-white rounded-full p-1 border border-gray-200">
                 <XCircle className="w-5 h-5" />
               </button>
            </div>
            
            <form onSubmit={handleSubmitRequest}>
              <div className="p-6 space-y-5 text-sm">
                 
                 <div>
                   <label className="block text-gray-700 font-medium mb-1.5">Employee Name</label>
                   <input type="text" value={user.name} disabled className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-500 cursor-not-allowed" />
                 </div>

                 <div>
                   <label className="block text-gray-700 font-medium mb-1.5">Leave Type <span className="text-red-500">*</span></label>
                   <select 
                     value={leaveType}
                     onChange={(e) => setLeaveType(e.target.value)}
                     className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                   >
                     <option value="Paid Time Off">Paid Time Off</option>
                     <option value="Sick Leave">Sick Leave</option>
                     <option value="Unpaid Leave">Unpaid Leave</option>
                   </select>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-gray-700 font-medium mb-1.5">Start Date <span className="text-red-500">*</span></label>
                     <input 
                       type="date" 
                       value={startDate}
                       onChange={(e) => setStartDate(e.target.value)}
                       required
                       className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500" 
                     />
                   </div>
                   <div>
                     <label className="block text-gray-700 font-medium mb-1.5">End Date <span className="text-red-500">*</span></label>
                     <input 
                       type="date" 
                       value={endDate}
                       onChange={(e) => setEndDate(e.target.value)}
                       required
                       className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500" 
                     />
                   </div>
                 </div>

                 <div>
                   <label className="block text-gray-700 font-medium mb-1.5">Reason / Comments</label>
                   <textarea 
                     rows={3} 
                     value={remarks}
                     onChange={(e) => setRemarks(e.target.value)}
                     className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 resize-none" 
                     placeholder="Provide a brief reason for your leave request..."
                   ></textarea>
                 </div>

                 <div>
                   <label className="block text-gray-700 font-medium mb-1.5">Attachments (Optional)</label>
                   <div className="flex items-center">
                      <input 
                        type="file" 
                        onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 transition-colors" 
                      />
                   </div>
                   <p className="text-xs text-gray-500 mt-1">Medical certificates are required for sick leaves exceeding 2 days.</p>
                 </div>

              </div>
              
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                 <button type="button" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm" onClick={() => setShowModal(false)}>Cancel</button>
                 <button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
