'use client';

import { Settings, Plus, XCircle, Search, Plane } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useState, useEffect } from 'react';
import { getEmployees, onboardEmployee } from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'HR';
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [onboardLoading, setOnboardLoading] = useState(false);

  // Form states for onboarding
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newRole, setNewRole] = useState('Employee');
  const [newMobile, setNewMobile] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDateOfBirth, setNewDateOfBirth] = useState('');
  const [newNationality, setNewNationality] = useState('');
  const [newMaritalStatus, setNewMaritalStatus] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newMonthlyWage, setNewMonthlyWage] = useState('30000');

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await getEmployees({ search: searchQuery, page } as any);
      if (res.data && res.data.success) {
        setEmployees(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to load employee directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchEmployees();
  }, [searchQuery, page]);

  const handleOnboard = async () => {
    if (!newName || !newEmail || !newDepartment || !newMobile || !newLocation || !newDateOfBirth || !newNationality || !newMaritalStatus || !newGender || !newMonthlyWage) {
      alert('Please fill in all fields (including Private Info and Initial Salary).');
      return;
    }

    try {
      setOnboardLoading(true);
      const res = await onboardEmployee({
        name: newName,
        email: newEmail,
        department: newDepartment,
        role: newRole,
        mobile: newMobile,
        location: newLocation,
        date_of_birth: newDateOfBirth,
        nationality: newNationality,
        marital_status: newMaritalStatus,
        gender: newGender,
        monthly_wage: Number(newMonthlyWage)
      });

      if (res.data && res.data.success) {
        alert(`Employee Onboarded successfully!\nGenerated ID: ${res.data.data.employee_id}\nCredentials and instructions have been emailed.`);
        setShowAddModal(false);
        // Clear Form
        setNewName('');
        setNewEmail('');
        setNewDepartment('');
        setNewRole('Employee');
        setNewMobile('');
        setNewLocation('');
        setNewDateOfBirth('');
        setNewNationality('');
        setNewMaritalStatus('');
        setNewGender('');
        setNewMonthlyWage('30000');
        // Refresh Directory
        fetchEmployees();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to onboard employee.');
    } finally {
      setOnboardLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Present': 
        return <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" title="Present"></div>;
      case 'On Leave': 
        return <Plane className="w-4 h-4 text-blue-500 rotate-45" />;
      case 'Absent': 
      default:
        return <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm" title="Absent"></div>;
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Subheader */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-gray-800 hidden md:block">Employees</h2>
          {isAdmin && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 active:scale-[0.98] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>NEW</span>
            </button>
          )}
        </div>
        
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 font-medium">Loading Directory...</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 text-gray-500 font-medium">No employees found.</div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Employee Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {employees.map((emp) => (
              <Link href={`/profile/${emp.employee_id}`} key={emp.employee_id} className="block group">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 transition-all hover:border-pink-300 hover:shadow-lg relative overflow-hidden">
                  
                  {/* Status Icon */}
                  <div className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 border border-gray-100 group-hover:bg-white transition-colors">
                    {getStatusIcon(emp.status || 'Absent')}
                  </div>
                  
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <img 
                        src={emp.profilePicture && emp.profilePicture.startsWith('data:') ? emp.profilePicture : `/default_avatar.png`} 
                        alt={emp.name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 group-hover:border-pink-50 transition-colors"
                      />
                    </div>
                    
                    <div className="text-center">
                      <h3 className="font-semibold text-gray-900 text-lg group-hover:text-pink-600 transition-colors">{emp.name}</h3>
                      <p className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full inline-block mt-1 mb-2">
                        {emp.role}
                      </p>
                      <p className="text-sm text-gray-600 font-medium">{emp.employee_id}</p>
                      <p className="text-xs text-gray-400 mt-1">{emp.department || 'No Department'}</p>
                    </div>
                  </div>
                  
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-sm font-['Outfit'] disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-gray-600 font-['Outfit']">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-sm font-['Outfit'] disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
               <h3 className="text-lg font-bold text-gray-900 font-['Outfit']">Add New Employee</h3>
               <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                 <XCircle className="w-5 h-5" />
               </button>
            </div>
            <div className="p-6 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                   <label className="text-gray-700 font-medium">Name</label>
                   <input 
                     type="text" 
                     value={newName}
                     onChange={(e) => setNewName(e.target.value)}
                     className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all font-semibold" 
                     placeholder="John Doe" 
                   />
                </div>
                <div className="flex flex-col space-y-1.5">
                   <label className="text-gray-700 font-medium">Email</label>
                   <input 
                     type="email" 
                     value={newEmail}
                     onChange={(e) => setNewEmail(e.target.value)}
                     className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all font-semibold" 
                     placeholder="john@example.com" 
                   />
                </div>
                <div className="flex flex-col space-y-1.5">
                   <label className="text-gray-700 font-medium">Department</label>
                   <input 
                     type="text" 
                     value={newDepartment}
                     onChange={(e) => setNewDepartment(e.target.value)}
                     className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all font-semibold" 
                     placeholder="Engineering" 
                   />
                </div>
                <div className="flex flex-col space-y-1.5">
                   <label className="text-gray-700 font-medium">Role</label>
                   <select 
                     value={newRole}
                     onChange={(e) => setNewRole(e.target.value)}
                     className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all font-semibold"
                   >
                     <option value="Employee">Employee</option>
                     {user?.role === 'Admin' && <option value="Admin">Admin</option>}
                     <option value="HR">HR</option>
                   </select>
                </div>
                <div className="flex flex-col space-y-1.5">
                   <label className="text-gray-700 font-medium">Phone / Mobile</label>
                   <input 
                     type="text" 
                     value={newMobile}
                     onChange={(e) => setNewMobile(e.target.value)}
                     className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all font-semibold" 
                     placeholder="+1234567890" 
                   />
                </div>
                <div className="flex flex-col space-y-1.5">
                   <label className="text-gray-700 font-medium">Present Address / Location</label>
                   <input 
                     type="text" 
                     value={newLocation}
                     onChange={(e) => setNewLocation(e.target.value)}
                     className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all font-semibold" 
                     placeholder="New York, USA" 
                   />
                </div>
                <div className="flex flex-col space-y-1.5">
                   <label className="text-gray-700 font-medium">Date of Birth</label>
                   <input 
                     type="date" 
                     value={newDateOfBirth}
                     onChange={(e) => setNewDateOfBirth(e.target.value)}
                     className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all font-semibold" 
                   />
                </div>
                <div className="flex flex-col space-y-1.5">
                   <label className="text-gray-700 font-medium">Nationality</label>
                   <input 
                     type="text" 
                     value={newNationality}
                     onChange={(e) => setNewNationality(e.target.value)}
                     className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all font-semibold" 
                     placeholder="Indian" 
                   />
                </div>
                <div className="flex flex-col space-y-1.5">
                   <label className="text-gray-700 font-medium">Gender</label>
                   <select 
                     value={newGender}
                     onChange={(e) => setNewGender(e.target.value)}
                     className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all font-semibold"
                   >
                     <option value="">Select Gender</option>
                     <option value="Male">Male</option>
                     <option value="Female">Female</option>
                     <option value="Other">Other</option>
                   </select>
                </div>
                <div className="flex flex-col space-y-1.5">
                   <label className="text-gray-700 font-medium">Marital Status</label>
                   <select 
                     value={newMaritalStatus}
                     onChange={(e) => setNewMaritalStatus(e.target.value)}
                     className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all font-semibold"
                   >
                     <option value="">Select Marital Status</option>
                     <option value="Single">Single</option>
                     <option value="Married">Married</option>
                     <option value="Divorced">Divorced</option>
                     <option value="Widowed">Widowed</option>
                   </select>
                </div>
                <div className="flex flex-col space-y-1.5 md:col-span-2">
                   <label className="text-gray-700 font-medium">Initial Monthly Wage (₹)</label>
                   <input 
                     type="number" 
                     value={newMonthlyWage}
                     onChange={(e) => setNewMonthlyWage(e.target.value)}
                     className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all font-semibold" 
                     placeholder="50000" 
                   />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-3">
               <button className="bg-white border border-gray-300 hover:bg-gray-50 active:scale-[0.98] text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all" onClick={() => setShowAddModal(false)}>Cancel</button>
               <button 
                 className="bg-pink-600 hover:bg-pink-700 active:scale-[0.98] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-75 disabled:cursor-not-allowed" 
                 disabled={onboardLoading} 
                 onClick={async () => {
                   setOnboardLoading(true);
                   try {
                     await handleOnboard();
                   } finally {
                     setOnboardLoading(false);
                   }
                 }}
               >
                 {onboardLoading ? (
                   <>
                     <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <span>Creating...</span>
                   </>
                 ) : (
                   <span>Create Employee</span>
                 )}
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
