import apiClient from './apiClient';

// Auth & Org
export const signupOrg = async (formData: FormData) => {
  return apiClient.post('/auth/signup-org', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const signupEmployee = async (data: any) => {
  return apiClient.post('/auth/signup-employee', data);
};

export const loginAPI = async (email: string, password: string) => {
  return apiClient.post('/auth/signin', {
    login_id_or_email: email,
    password: password,
  });
};

export const verifyEmailAPI = async (token: string) => {
  return apiClient.get(`/auth/verify/${token}`);
};

export const changePassword = async (data: any) => {
  return apiClient.put('/auth/change-password', data);
};

// Employees
export const onboardEmployee = async (data: any) => {
  return apiClient.post('/employees', data);
};

export const getEmployees = async (params?: { search?: string; department?: string; role?: string }) => {
  return apiClient.get('/employees', { params });
};

export const getProfile = async (id: string) => {
  return apiClient.get(`/employees/${id}`);
};

export const updateProfile = async (id: string, formData: FormData) => {
  return apiClient.put(`/employees/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const addSkill = async (id: string, data: { name: string; proficiency: string }) => {
  return apiClient.post(`/employees/${id}/skills`, data);
};

export const deleteSkill = async (id: string, skillName: string) => {
  return apiClient.delete(`/employees/${id}/skills/${encodeURIComponent(skillName)}`);
};

export const addCertification = async (id: string, data: { name: string; issuedBy: string; issueDate: string }) => {
  return apiClient.post(`/employees/${id}/certifications`, data);
};

export const deleteCertification = async (id: string, certName: string) => {
  return apiClient.delete(`/employees/${id}/certifications/${encodeURIComponent(certName)}`);
};

// Attendance
export const checkIn = async () => {
  return apiClient.post('/attendance/check-in', {});
};

export const checkOut = async () => {
  return apiClient.post('/attendance/check-out', {});
};

export const getMyAttendance = async (month?: string) => {
  return apiClient.get('/attendance/my-attendance', { params: { month } });
};

export const getAllAttendance = async (params?: { date?: string; month?: string; employee_id?: string }) => {
  return apiClient.get('/attendance/all', { params });
};

// Time Off / Leaves
export const getLeaveAllocations = async () => {
  return apiClient.get('/time-off/allocations');
};

export const applyLeave = async (formData: FormData) => {
  return apiClient.post('/time-off/requests', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getLeaves = async (params?: { status?: string; employee_id?: string }) => {
  return apiClient.get('/time-off/requests', { params });
};

export const reviewLeaveRequest = async (id: string, data: { status: string; comments?: string }) => {
  return apiClient.put(`/time-off/requests/${id}/status`, data);
};

// Salary / Payroll
export const getSalary = async (employeeId: string) => {
  return apiClient.get(`/salary/${employeeId}`);
};

export const updateSalary = async (employeeId: string, data: { monthly_wage: number; working_days_per_week: number; break_time_hours: number }) => {
  return apiClient.put(`/salary/${employeeId}`, data);
};

export const getLeaveBalance = async (employeeId: string) => {
  try {
    const res = await apiClient.get('/time-off/allocations');
    if (res.data && res.data.success) {
      const list = res.data.allocations;
      const casual = list.find((a: any) => a.time_off_type === 'Paid Time Off');
      const sick = list.find((a: any) => a.time_off_type === 'Sick Leave');
      return {
        data: {
          casual: casual ? Math.max(0, casual.allocated_days - casual.used_days) : 30,
          earned: 15,
          halfPay: sick ? Math.max(0, sick.allocated_days - sick.used_days) : 10,
          restricted: 2
        }
      };
    }
  } catch (e) {
    console.error(e);
  }
  return { data: { casual: 30, earned: 15, halfPay: 10, restricted: 2 } };
};

export default apiClient;
