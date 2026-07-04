'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload } from 'lucide-react';
import { signupOrg } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    try {
      const data = new FormData();
      data.append('company_name', formData.companyName);
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('password', formData.password);
      if (logoFile) {
        data.append('logo', logoFile);
      }

      const res = await signupOrg(data);
      if (res.data && res.data.success) {
        alert(`Company Registered successfully!\nYour generated Admin ID is: ${res.data.data.employee.employee_id}\n\nPlease check your email for the verification link before logging in.`);
        router.push('/login');
      } else {
        alert(res.data?.error || 'Registration failed.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] text-gray-800 font-['Outfit'] py-12">
      <div className="w-full max-w-3xl p-10 bg-white rounded-2xl border border-gray-100 shadow-xl flex flex-col md:flex-row gap-12">
        
        {/* Left Side - Form */}
        <div className="flex-1 space-y-8">
          <div className="flex flex-col space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Register Company</h2>
            <p className="text-sm text-gray-500">Create a new admin account to manage your HRMS.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center">
              <label className="text-sm font-medium text-gray-700 w-36 shrink-0 mb-1 md:mb-0">Company Name -</label>
              <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all" required />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center">
              <label className="text-sm font-medium text-gray-700 w-36 shrink-0 mb-1 md:mb-0">Name -</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all" required />
            </div>

            <div className="flex flex-col md:flex-row md:items-center">
              <label className="text-sm font-medium text-gray-700 w-36 shrink-0 mb-1 md:mb-0">Email -</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all" required />
            </div>

            <div className="flex flex-col md:flex-row md:items-center">
              <label className="text-sm font-medium text-gray-700 w-36 shrink-0 mb-1 md:mb-0">Phone -</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all" required />
            </div>

            <div className="flex flex-col md:flex-row md:items-center">
              <label className="text-sm font-medium text-gray-700 w-36 shrink-0 mb-1 md:mb-0">Password -</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all" required />
            </div>

            <div className="flex flex-col md:flex-row md:items-center">
              <label className="text-sm font-medium text-gray-700 w-36 shrink-0 mb-1 md:mb-0">Confirm Password -</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all" required />
            </div>

            <div className="pt-6 md:ml-36">
              <button
                type="submit"
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 rounded-lg transition-all shadow-sm font-semibold"
              >
                Sign Up
              </button>
            </div>
            
            <div className="text-center pt-4 md:ml-36">
              <p className="text-sm text-gray-500">
                Already have an account? <Link href="/login" className="text-pink-600 hover:text-pink-700 font-medium ml-1">Sign In</Link>
              </p>
            </div>
          </form>
        </div>

        {/* Right Side - Logo Upload */}
        <div className="w-48 shrink-0 flex flex-col items-center justify-start pt-2 md:pt-16 mx-auto md:mx-0">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          <div 
            onClick={handleLogoClick}
            className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-pink-500 hover:text-pink-600 transition-colors cursor-pointer bg-gray-50 overflow-hidden"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <Upload className="w-8 h-8 mb-2" />
                <span className="text-xs font-medium">Upload Logo</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
