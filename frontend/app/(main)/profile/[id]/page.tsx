'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Edit2, Upload, Lock, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import dayjs from 'dayjs';
import { 
  getProfile, 
  updateProfile, 
  addSkill, 
  deleteSkill, 
  addCertification, 
  deleteCertification, 
  changePassword, 
  getSalary, 
  updateSalary 
} from '@/lib/api';

export default function ProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const { user: currentUser, updateUser } = useAuthStore();
  
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Resume' | 'Private Info' | 'Security' | 'Salary Info'>('Resume');
  
  // Security Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Salary State
  const [monthlyWage, setMonthlyWage] = useState(0);
  const [salaryDetails, setSalaryDetails] = useState<any>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  // Profile Picture Upload State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const employeeId = (id === 'me' ? currentUser?.id : id) as string;
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'HR';
  const isSelf = currentUser?.id === employeeId;

  const loadProfile = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const res = await getProfile(employeeId);
      if (res.data && res.data.success) {
        setEmployee(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSalary = async () => {
    if (!employeeId || (!isAdmin && !isSelf)) return;
    try {
      setSalaryLoading(true);
      const res = await getSalary(employeeId);
      if (res.data && res.data.success) {
        setSalaryDetails(res.data.salary);
        setMonthlyWage(res.data.salary.monthly_wage);
      }
    } catch (err) {
      console.error('Failed to load salary:', err);
    } finally {
      setSalaryLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [employeeId]);

  useEffect(() => {
    if (activeTab === 'Salary Info') {
      loadSalary();
    }
  }, [activeTab]);

  const handleUpdateSalary = async (wage: number) => {
    if (!employeeId || !isAdmin) return;
    try {
      setSalaryLoading(true);
      const res = await updateSalary(employeeId, {
        monthly_wage: wage,
        working_days_per_week: 5,
        break_time_hours: 1
      });
      if (res.data && res.data.success) {
        setSalaryDetails(res.data.salary);
      }
    } catch (err) {
      console.error('Failed to update salary:', err);
    } finally {
      setSalaryLoading(false);
    }
  };

  // Edit Profile Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    mobile: '',
    location: '',
    department: '',
    role: '',
    about: '',
    what_i_love_about_my_job: '',
    interests_and_hobbies: '',
    date_of_birth: '',
    nationality: '',
    marital_status: '',
    gender: ''
  });

  const openEditModal = () => {
    setEditForm({
      name: employee?.name || '',
      mobile: employee?.mobile || '',
      location: employee?.location || '',
      department: employee?.department || '',
      role: employee?.role || '',
      about: employee?.resume?.about || '',
      what_i_love_about_my_job: employee?.resume?.what_i_love_about_my_job || '',
      interests_and_hobbies: employee?.resume?.interests_and_hobbies || '',
      date_of_birth: employee?.date_of_birth ? dayjs(employee?.date_of_birth).format('YYYY-MM-DD') : '',
      nationality: employee?.nationality || '',
      marital_status: employee?.marital_status || '',
      gender: employee?.gender || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('mobile', editForm.mobile);
      formData.append('location', editForm.location);
      formData.append('department', editForm.department);
      formData.append('role', editForm.role);
      formData.append('about', editForm.about);
      formData.append('what_i_love_about_my_job', editForm.what_i_love_about_my_job);
      formData.append('interests_and_hobbies', editForm.interests_and_hobbies);
      formData.append('date_of_birth', editForm.date_of_birth);
      formData.append('nationality', editForm.nationality);
      formData.append('marital_status', editForm.marital_status);
      formData.append('gender', editForm.gender);

      const res = await updateProfile(employeeId, formData);
      if (res.data && res.data.success) {
        alert('Profile updated successfully!');
        setIsEditModalOpen(false);
        loadProfile();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!employeeId || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('profilePicture', file);
      const res = await updateProfile(employeeId, formData);
      if (res.data && res.data.success) {
        alert('Profile picture updated successfully!');
        const newAvatarPath = res.data.data.profilePicture && res.data.data.profilePicture.startsWith('data:')
          ? res.data.data.profilePicture
          : undefined;
        if (isSelf && newAvatarPath) {
          updateUser({ avatar: newAvatarPath });
        }
        loadProfile();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to upload profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddSkill = async () => {
    const name = prompt('Enter Skill Name (e.g. Node.js):');
    if (!name) return;
    const proficiency = prompt('Enter Proficiency (Beginner, Intermediate, Advanced):') || 'Intermediate';
    
    try {
      const res = await addSkill(employeeId, { name, proficiency });
      if (res.data && res.data.success) {
        loadProfile();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add skill.');
    }
  };

  const handleDeleteSkill = async (skillName: string) => {
    if (!confirm(`Are you sure you want to delete ${skillName}?`)) return;
    try {
      const res = await deleteSkill(employeeId, skillName);
      if (res.data && res.data.success) {
        loadProfile();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete skill.');
    }
  };

  const handleAddCert = async () => {
    const name = prompt('Enter Certification Name:');
    if (!name) return;
    const issuedBy = prompt('Issued By:') || '';
    const issueDate = prompt('Issue Date (YYYY-MM-DD):') || '';
    
    try {
      const res = await addCertification(employeeId, { name, issuedBy, issueDate });
      if (res.data && res.data.success) {
        loadProfile();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add certification.');
    }
  };

  const handleDeleteCert = async (certName: string) => {
    if (!confirm(`Are you sure you want to delete ${certName}?`)) return;
    try {
      const res = await deleteCertification(employeeId, certName);
      if (res.data && res.data.success) {
        loadProfile();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete certification.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    try {
      setPasswordLoading(true);
      const res = await changePassword({ oldPassword, newPassword });
      if (res.data && res.data.success) {
        alert('Password updated successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500 p-8 text-center">Loading employee profile...</div>;
  }

  if (!employee) {
    return <div className="text-gray-500 p-8 text-center">Employee not found.</div>;
  }

  const parsedSkills = (employee.skills || []).map((s: string) => {
    try {
      if (s.startsWith('{') && s.endsWith('}')) {
        return JSON.parse(s);
      }
    } catch (e) {}
    return { name: s, proficiency: 'Intermediate' };
  });

  const parsedCertifications = (employee.certifications || []).map((c: string) => {
    try {
      if (c.startsWith('{') && c.endsWith('}')) {
        return JSON.parse(c);
      }
    } catch (e) {}
    return { name: c, issuedBy: '', issueDate: '' };
  });

  const tabs = ['Resume', 'Private Info'];
  if (isSelf) tabs.push('Security');
  if (isAdmin || isSelf) tabs.push('Salary Info');

  const avatarUrl = employee.profilePicture && employee.profilePicture.startsWith('data:')
    ? employee.profilePicture
    : `/default_avatar.png`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-8">
      
      {/* Profile Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 relative shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:space-x-8 space-y-6 md:space-y-0">
          <div className="relative group cursor-pointer shrink-0 mx-auto md:mx-0">
            <img 
              src={avatarUrl} 
              alt={employee.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-50 shadow-md"
            />
            {(isAdmin || isSelf) && (
              <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            )}
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <div>
               <div className="flex items-center space-x-4">
                 <h1 className="text-3xl font-bold text-gray-900">{employee.name}</h1>
                 {(isAdmin || isSelf) && (
                   <button 
                     onClick={openEditModal}
                     className="text-xs font-semibold text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-lg border border-pink-200 transition-colors shadow-sm font-['Outfit']"
                   >
                     Edit Profile
                   </button>
                 )}
               </div>
               <div className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
                 <div className="text-gray-500 font-medium">Login ID</div>
                 <div className="text-gray-800 font-semibold">{employee.employee_id}</div>
                 
                 <div className="text-gray-500 font-medium">Email</div>
                 <div className="text-gray-800 font-semibold truncate" title={employee.email}>{employee.email}</div>
                 
                 <div className="text-gray-500 font-medium">Phone</div>
                 <div className="text-gray-800 font-semibold">{employee.mobile || 'N/A'}</div>
               </div>
            </div>
            
            <div className="md:mt-14 grid grid-cols-2 gap-y-3 text-sm">
                 <div className="text-gray-500 font-medium">Company</div>
                 <div className="text-gray-800 font-semibold">Odoo Hackathon Org</div>
                 
                 <div className="text-gray-500 font-medium">Department</div>
                 <div className="text-gray-800 font-semibold">{employee.department || 'N/A'}</div>
                 
                 <div className="text-gray-500 font-medium">Role</div>
                 <div className="text-gray-800 font-semibold">{employee.role}</div>
                 
                 <div className="text-gray-500 font-medium">Location</div>
                 <div className="text-gray-800 font-semibold">{employee.location || 'HQ'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 font-['Outfit'] border-b pb-4">Edit Profile Info</h2>
            <form onSubmit={handleSaveProfile} className="space-y-6 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    disabled={!isAdmin}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                  />
                  {!isAdmin && <span className="text-[10px] text-gray-400">Can only be modified by HR/Admin</span>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone / Mobile</label>
                  <input
                    type="text"
                    name="mobile"
                    value={editForm.mobile}
                    onChange={handleEditFormChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address / Location</label>
                  <input
                    type="text"
                    name="location"
                    value={editForm.location}
                    onChange={handleEditFormChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={editForm.department}
                    onChange={handleEditFormChange}
                    disabled={!isAdmin}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                  />
                  {!isAdmin && <span className="text-[10px] text-gray-400">Can only be modified by HR/Admin</span>}
                </div>

                {isAdmin && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role Privilege</label>
                    <select
                      name="role"
                      value={editForm.role}
                      onChange={handleEditFormChange}
                      className="w-full border border-gray-300 bg-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                    >
                      <option value="Employee">Employee</option>
                      <option value="HR">HR</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={editForm.date_of_birth}
                    onChange={handleEditFormChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nationality</label>
                  <input
                    type="text"
                    name="nationality"
                    value={editForm.nationality}
                    onChange={handleEditFormChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gender</label>
                  <select
                    name="gender"
                    value={editForm.gender}
                    onChange={handleEditFormChange}
                    className="w-full border border-gray-300 bg-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Marital Status</label>
                  <select
                    name="marital_status"
                    value={editForm.marital_status}
                    onChange={handleEditFormChange}
                    className="w-full border border-gray-300 bg-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                  >
                    <option value="">Select Marital Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">About Me</label>
                <textarea
                  name="about"
                  value={editForm.about}
                  onChange={handleEditFormChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">What I Love About My Job</label>
                <textarea
                  name="what_i_love_about_my_job"
                  value={editForm.what_i_love_about_my_job}
                  onChange={handleEditFormChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Interests and Hobbies</label>
                <input
                  type="text"
                  name="interests_and_hobbies"
                  value={editForm.interests_and_hobbies}
                  onChange={handleEditFormChange}
                  placeholder="e.g. Photography, Coding, Reading"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all font-semibold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 active:scale-[0.98] text-gray-700 font-semibold px-5 py-2.5 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="bg-pink-600 hover:bg-pink-700 active:scale-[0.98] text-white font-semibold px-5 py-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saveLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto hide-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-4 text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === tab ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 min-h-[400px] shadow-sm">
        
        {/* Resume Tab */}
        {activeTab === 'Resume' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
             <div className="lg:col-span-2 space-y-8">
                <div>
                   <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 flex justify-between items-center">
                     About
                   </h3>
                   <p className="text-sm text-gray-600 leading-relaxed">{employee.resume?.about || 'No information provided.'}</p>
                </div>
                <div>
                   <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 flex justify-between items-center">
                     What I love about my job
                   </h3>
                   <p className="text-sm text-gray-600 leading-relaxed">{employee.resume?.what_i_love_about_my_job || 'No information provided.'}</p>
                </div>
                <div>
                   <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-4 flex justify-between items-center">
                     My interests and hobbies
                   </h3>
                   <p className="text-sm text-gray-600 leading-relaxed">{employee.resume?.interests_and_hobbies || 'No interests and hobbies added.'}</p>
                </div>
             </div>
             <div className="space-y-8">
                <div>
                   <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Skills</h3>
                      {(isAdmin || isSelf) && (
                        <button onClick={handleAddSkill} className="text-xs font-semibold text-pink-600 hover:text-pink-700 bg-pink-50 px-2 py-1 rounded">
                          + Add
                        </button>
                      )}
                   </div>
                   <ul className="space-y-3">
                     {parsedSkills.map((skill: any) => (
                       <li key={skill.name} className="flex justify-between items-center text-sm group">
                         <span className="text-gray-800 font-medium">{skill.name}</span>
                         <div className="flex items-center space-x-2">
                           <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded text-xs border border-gray-100">{skill.proficiency}</span>
                           {(isAdmin || isSelf) && (
                             <button onClick={() => handleDeleteSkill(skill.name)} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                           )}
                         </div>
                       </li>
                     ))}
                     {parsedSkills.length === 0 && <li className="text-sm text-gray-400">No skills added.</li>}
                   </ul>
                </div>
                <div>
                   <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Certifications</h3>
                      {(isAdmin || isSelf) && (
                        <button onClick={handleAddCert} className="text-xs font-semibold text-pink-600 hover:text-pink-700 bg-pink-50 px-2 py-1 rounded">
                          + Add
                        </button>
                      )}
                   </div>
                   <ul className="space-y-4">
                     {parsedCertifications.map((cert: any) => (
                       <li key={cert.name} className="text-sm border border-gray-100 p-3 rounded-lg bg-gray-50/50 relative group">
                         {(isAdmin || isSelf) && (
                           <button 
                             onClick={() => handleDeleteCert(cert.name)} 
                             className="absolute top-3 right-3 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                         <div className="text-gray-900 font-semibold">{cert.name}</div>
                         <div className="text-gray-500 text-xs mt-1">{cert.issuedBy} • {cert.issueDate ? dayjs(cert.issueDate).format('YYYY-MM-DD') : ''}</div>
                       </li>
                     ))}
                     {parsedCertifications.length === 0 && <li className="text-sm text-gray-400">No certifications added.</li>}
                   </ul>
                </div>
             </div>
           </div>
        )}

        {/* Private Info Tab */}
        {activeTab === 'Private Info' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-sm">
             <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-6">Personal Details</h3>
                <div className="grid grid-cols-2 items-center py-2 border-b border-gray-50"><span className="text-gray-500 font-medium">Date of Birth</span><span className="text-gray-900 font-semibold">{employee.date_of_birth ? dayjs(employee.date_of_birth).format('YYYY-MM-DD') : 'N/A'}</span></div>
                <div className="grid grid-cols-2 items-center py-2 border-b border-gray-50"><span className="text-gray-500 font-medium">Present Address</span><span className="text-gray-900 font-semibold">{employee.location || 'HQ'}</span></div>
                <div className="grid grid-cols-2 items-center py-2 border-b border-gray-50"><span className="text-gray-500 font-medium">Nationality</span><span className="text-gray-900 font-semibold">{employee.nationality || 'N/A'}</span></div>
                <div className="grid grid-cols-2 items-center py-2 border-b border-gray-50"><span className="text-gray-500 font-medium">Personal Email</span><span className="text-gray-900 font-semibold">{employee.email}</span></div>
                <div className="grid grid-cols-2 items-center py-2 border-b border-gray-50"><span className="text-gray-500 font-medium">Gender</span><span className="text-gray-900 font-semibold">{employee.gender || 'N/A'}</span></div>
                <div className="grid grid-cols-2 items-center py-2 border-b border-gray-50"><span className="text-gray-500 font-medium">Marital Status</span><span className="text-gray-900 font-semibold">{employee.marital_status || 'N/A'}</span></div>
                <div className="grid grid-cols-2 items-center py-2"><span className="text-gray-500 font-medium">Account Status</span><span className="text-gray-900 font-semibold">{employee.isVerified ? 'Verified' : 'Pending Verification'}</span></div>
             </div>
             <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 mb-6">Work Details</h3>
                <div className="grid grid-cols-2 items-center py-2 border-b border-gray-50"><span className="text-gray-500 font-medium">Department</span><span className="text-gray-900 font-semibold">{employee.department || 'N/A'}</span></div>
                <div className="grid grid-cols-2 items-center py-2 border-b border-gray-50"><span className="text-gray-500 font-medium">Role Privilege</span><span className="text-gray-900 font-semibold">{employee.role}</span></div>
                <div className="grid grid-cols-2 items-center py-2 border-b border-gray-50"><span className="text-gray-500 font-medium">Custom ID</span><span className="text-gray-900 font-semibold">{employee.employee_id}</span></div>
             </div>
           </div>
        )}

        {/* Security Tab (Self Only) */}
        {activeTab === 'Security' && isSelf && (
           <div className="max-w-md mx-auto py-8">
             <div className="text-center mb-8">
               <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-600">
                 <Lock className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
               <p className="text-sm text-gray-500 mt-2">Update your system-generated password to a secure one.</p>
             </div>
             <form onSubmit={handleChangePassword} className="space-y-4">
               <div className="space-y-1.5">
                 <label className="text-sm font-medium text-gray-700">Current Password</label>
                 <input 
                   type="password" 
                   value={oldPassword}
                   onChange={(e) => setOldPassword(e.target.value)}
                   required
                   placeholder="Enter current password" 
                   className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500" 
                 />
               </div>
               <div className="space-y-1.5">
                 <label className="text-sm font-medium text-gray-700">New Password</label>
                 <input 
                   type="password" 
                   value={newPassword}
                   onChange={(e) => setNewPassword(e.target.value)}
                   required
                   placeholder="Enter new password" 
                   className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500" 
                 />
               </div>
               <div className="space-y-1.5">
                 <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                 <input 
                   type="password" 
                   value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)}
                   required
                   placeholder="Confirm new password" 
                   className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500" 
                 />
               </div>
                <button 
                  type="submit" 
                  disabled={passwordLoading}
                  className="w-full bg-pink-600 hover:bg-pink-700 active:scale-[0.98] text-white font-semibold py-2.5 rounded-lg transition-all mt-4 flex items-center justify-center space-x-2 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {passwordLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
             </form>
           </div>
        )}

        {/* Salary Info Tab */}
        {activeTab === 'Salary Info' && (isAdmin || isSelf) && (
           <div>
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6 mb-8">
                <div>
                   <h2 className="text-2xl font-bold text-gray-900">Salary Info</h2>
                   <p className="text-sm text-gray-500 mt-1">Configure and view salary structure components.</p>
                </div>
                <div className="flex gap-4 mt-6 md:mt-0">
                   <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center min-w-[140px]">
                     <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Month Wage</div>
                     <div className="flex items-center justify-center font-bold text-gray-900 text-lg">
                       <span className="text-gray-500 font-normal mr-1">₹</span>
                       <input 
                         type="number" 
                         value={monthlyWage} 
                         disabled={!isAdmin}
                         onChange={(e) => {
                           const w = Number(e.target.value) || 0;
                           setMonthlyWage(w);
                           handleUpdateSalary(w);
                         }}
                         className="w-24 bg-transparent border-b border-gray-300 focus:border-pink-500 focus:outline-none text-center font-bold disabled:border-transparent disabled:text-gray-800"
                       />
                     </div>
                   </div>
                   <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center min-w-[140px]">
                     <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Yearly Wage</div>
                     <div className="font-bold text-gray-900 text-lg">
                       <span className="text-gray-500 font-normal mr-1">₹</span>
                       {(monthlyWage * 12).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                     </div>
                   </div>
                </div>
             </div>

             {salaryLoading || !salaryDetails ? (
               <div className="text-center py-6 text-gray-500">Calculating and synchronizing with backend...</div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in duration-200">
                 <div>
                    <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Salary Components</h3>
                    <div className="space-y-4 text-sm bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                         <div>
                           <span className="text-gray-600 font-medium block">Basic Salary</span>
                           <span className="text-[10px] text-gray-400">50.00% of monthly wage</span>
                         </div>
                         <span className="text-gray-900 font-semibold">₹{(salaryDetails.basic_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                         <div>
                           <span className="text-gray-600 font-medium block">House Rent Allowance (HRA)</span>
                           <span className="text-[10px] text-gray-400">50.00% of Basic Salary</span>
                         </div>
                         <span className="text-gray-900 font-semibold">₹{(salaryDetails.hra || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                         <div>
                           <span className="text-gray-600 font-medium block">Standard Allowance</span>
                           <span className="text-[10px] text-gray-400">16.67% of Basic Salary</span>
                         </div>
                         <span className="text-gray-900 font-semibold">₹{(salaryDetails.standard_allowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                         <div>
                           <span className="text-gray-600 font-medium block">Performance Bonus</span>
                           <span className="text-[10px] text-gray-400">8.33% of Basic Salary</span>
                         </div>
                         <span className="text-gray-900 font-semibold">₹{(salaryDetails.performance_bonus || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                         <div>
                           <span className="text-gray-600 font-medium block">Leave Travel Allowance (LTA)</span>
                           <span className="text-[10px] text-gray-400">8.33% of Basic Salary</span>
                         </div>
                         <span className="text-gray-900 font-semibold">₹{(salaryDetails.lta || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 font-bold text-pink-600">
                         <div>
                           <span className="block">Fixed Allowance</span>
                           <span className="text-[10px] text-pink-400 font-normal">11.67% of Basic Salary</span>
                         </div>
                         <span>₹{(salaryDetails.fixed_allowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                   <div>
                     <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Provident Fund (PF) Contribution</h3>
                     <div className="space-y-4 text-sm bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                       <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                          <div>
                            <span className="text-gray-600 font-medium block">Employee's PF</span>
                            <span className="text-[10px] text-gray-400">12.00% of Basic Salary</span>
                          </div>
                          <span className="text-red-500 font-semibold">-₹{(salaryDetails.employee_pf || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <div>
                            <span className="text-gray-600 font-medium block">Employer's PF</span>
                            <span className="text-[10px] text-gray-400">12.00% of Basic Salary</span>
                          </div>
                          <span className="text-gray-900 font-semibold">₹{(salaryDetails.employer_pf || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                       </div>
                     </div>
                   </div>
                   
                   <div>
                     <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Tax Deductions</h3>
                     <div className="space-y-4 text-sm bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                       <div className="flex justify-between items-center">
                          <div>
                            <span className="text-gray-600 font-medium block">Professional Tax</span>
                            <span className="text-[10px] text-gray-400">Fixed deduction per month</span>
                          </div>
                          <span className="text-red-500 font-semibold">-₹{(salaryDetails.professional_tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             )}
           </div>
        )}
      </div>

    </div>
  );
}
