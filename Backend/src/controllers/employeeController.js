const crypto = require('crypto');
const Employee = require('../models/Employee');
const Organization = require('../models/Organization');
const TimeOffAllocation = require('../models/TimeOffAllocation');
const SalarySettings = require('../models/SalarySettings');
const { generateEmployeeId } = require('../utils/idGenerator');
const { sendActivationEmail } = require('../utils/mailer');

const resolveEmployeeHelper = async (idParam, companyId) => {
  const isObjectId = idParam.match(/^[0-9a-fA-F]{24}$/);
  const query = isObjectId
    ? { _id: idParam, company_id: companyId }
    : { employee_id: idParam.toUpperCase(), company_id: companyId };
  return await Employee.findOne(query);
};

/**
 * @desc    Onboard a new employee (Admin/HR only)
 * @route   POST /api/v1/employees
 * @access  Private (Admin/HR)
 */
const onboardEmployee = async (req, res) => {
  try {
    const { name, email, mobile, department, manager_id, location, role } = req.body;

    // Check if email already exists
    const existingEmp = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmp) {
      return res.status(400).json({ success: false, error: 'Email is already registered' });
    }

    // Retrieve organization name for ID generation
    const org = await Organization.findById(req.user.company_id);
    if (!org) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    // Generate unique employee ID
    const employee_id = await generateEmployeeId(org.name, name, org._id);

    // Generate a temporary password matching the complexity rules
    // Rule: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const randPart = crypto.randomBytes(3).toString('hex'); // 6 chars
    const tempPassword = `Tmp${randPart}!`; // e.g. Tmp3a4b5c! -> starts with T (upper), contains mp (lower), numbers, special char !

    // Create Employee as active and verified by default
    const newEmployee = await Employee.create({
      employee_id,
      name,
      email,
      mobile,
      company_id: org._id,
      department,
      manager_id: manager_id || null,
      location,
      role: role || 'Employee',
      password_hash: tempPassword, // Mongoose pre-save hook will encrypt this hash
      isActivated: true,
      isVerified: true,
      status: 'Absent'
    });

    // Initialize Time Off Allocations
    await TimeOffAllocation.create({
      employee_id: newEmployee._id,
      paid_time_off_available: 24,
      sick_time_off_available: 7
    });

    // Initialize default Salary settings (Monthly wage: 30000)
    await SalarySettings.create({
      employee_id: newEmployee._id,
      monthly_wage: 30000,
      working_days_per_week: 5,
      break_time_hours: 1
    });

    // Trigger activation email
    await sendActivationEmail(email, name, employee_id, tempPassword);

    newEmployee.password_hash = undefined;

    return res.status(201).json({
      success: true,
      message: `Employee ${employee_id} onboarded successfully. Credentials sent to email.`,
      data: newEmployee
    });
  } catch (error) {
    console.error('Onboard Employee Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get all employees in the organization (searchable, filtered)
 * @route   GET /api/v1/employees
 * @access  Private
 */
const getEmployees = async (req, res) => {
  try {
    const { search, status, department, role } = req.query;
    
    // Construct query scoped to the user's company
    const query = { company_id: req.user.company_id };

    // Apply filters if provided
    if (status) {
      query.status = status;
    }
    if (department) {
      query.department = new RegExp(department, 'i');
    }
    if (role) {
      query.role = role;
    }

    // Apply search filter (name, email, or employee_id)
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { employee_id: new RegExp(search, 'i') }
      ];
    }

    const employees = await Employee.find(query)
      .select('-password_hash -verificationToken -verificationTokenExpires')
      .populate('manager_id', 'name employee_id email');

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    console.error('Get Employees Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get single employee details by ID
 * @route   GET /api/v1/employees/:id
 * @access  Private
 */
const getEmployeeById = async (req, res) => {
  try {
    const isObjectId = req.params.id.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId
      ? { _id: req.params.id, company_id: req.user.company_id }
      : { employee_id: req.params.id.toUpperCase(), company_id: req.user.company_id };

    const employee = await Employee.findOne(query)
      .select('-password_hash -verificationToken -verificationTokenExpires')
      .populate('manager_id', 'name employee_id email');

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    return res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Get Employee ID Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update employee profile (Admins can update everything, employees update limited fields)
 * @route   PUT /api/v1/employees/:id
 * @access  Private
 */
const updateEmployeeProfile = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const currentUserId = req.user._id.toString();
    const currentUserRole = req.user.role;

    // Check authorization: Employee can only update self, Admin/HR can update anyone in their company
    const employee = await resolveEmployeeHelper(employeeId, req.user.company_id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee profile not found' });
    }

    const isSelfUpdate = (currentUserId === employee._id.toString());
    const isAdminOrHR = ['Admin', 'HR'].includes(currentUserRole);

    if (!isSelfUpdate && !isAdminOrHR) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this profile' });
    }

    // Handle profile picture upload
    if (req.file) {
      employee.profilePicture = `/uploads/${req.file.filename}`;
    }

    // Extract fields
    const {
      name,
      mobile,
      location,
      department,
      manager_id,
      role,
      status,
      about,
      what_i_love_about_my_job,
      interests_and_hobbies
    } = req.body;

    // 1. Apply Employee Self-Editable fields
    if (isSelfUpdate) {
      if (mobile) employee.mobile = mobile;
      if (location) employee.location = location;
      
      // Update Resume Info subdocument
      if (about !== undefined) employee.resume.about = about;
      if (what_i_love_about_my_job !== undefined) employee.resume.what_i_love_about_my_job = what_i_love_about_my_job;
      if (interests_and_hobbies !== undefined) employee.resume.interests_and_hobbies = interests_and_hobbies;
    }

    // 2. Apply Admin/HR only fields
    if (isAdminOrHR) {
      if (name) employee.name = name;
      if (mobile && !isSelfUpdate) employee.mobile = mobile;
      if (location && !isSelfUpdate) employee.location = location;
      if (department) employee.department = department;
      if (role && currentUserRole === 'Admin') employee.role = role; // Only superadmin edits role
      if (status) employee.status = status;

      if (manager_id !== undefined) {
        employee.manager_id = manager_id === '' || manager_id === 'null' ? null : manager_id;
      }

      if (about !== undefined && !isSelfUpdate) employee.resume.about = about;
      if (what_i_love_about_my_job !== undefined && !isSelfUpdate) employee.resume.what_i_love_about_my_job = what_i_love_about_my_job;
      if (interests_and_hobbies !== undefined && !isSelfUpdate) employee.resume.interests_and_hobbies = interests_and_hobbies;
    }

    await employee.save();

    employee.password_hash = undefined;

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: employee
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Add a skill to profile
 * @route   POST /api/v1/employees/:id/skills
 * @access  Private
 */
const addSkill = async (req, res) => {
  try {
    const { skill_name, name, proficiency } = req.body;
    const inputSkill = skill_name || (name ? JSON.stringify({ name, proficiency }) : null);
    if (!inputSkill || !inputSkill.trim()) {
      return res.status(400).json({ success: false, error: 'Skill name is required' });
    }

    const employee = await resolveEmployeeHelper(req.params.id, req.user.company_id);

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // Check if skill already exists to avoid duplicates
    const normalizedSkill = inputSkill.trim();
    const isDuplicate = employee.skills.some(s => {
      try {
        const parsedExisting = JSON.parse(s);
        const parsedNew = JSON.parse(normalizedSkill);
        return parsedExisting.name.toLowerCase() === parsedNew.name.toLowerCase();
      } catch (e) {}
      return s.toLowerCase() === normalizedSkill.toLowerCase();
    });

    if (isDuplicate) {
      return res.status(400).json({ success: false, error: 'Skill already exists on profile' });
    }

    employee.skills.push(normalizedSkill);
    await employee.save();

    return res.status(200).json({
      success: true,
      message: 'Skill added successfully',
      data: employee.skills
    });
  } catch (error) {
    console.error('Add Skill Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete a skill from profile
 * @route   DELETE /api/v1/employees/:id/skills/:skillName
 * @access  Private
 */
const deleteSkill = async (req, res) => {
  try {
    const { skillName } = req.params;
    const employee = await resolveEmployeeHelper(req.params.id, req.user.company_id);

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    employee.skills = employee.skills.filter(skill => {
      try {
        const parsed = JSON.parse(skill);
        if (parsed.name.toLowerCase() === decodeURIComponent(skillName).toLowerCase()) {
          return false;
        }
      } catch (e) {}
      return skill.toLowerCase() !== decodeURIComponent(skillName).toLowerCase();
    });
    await employee.save();

    return res.status(200).json({
      success: true,
      message: 'Skill deleted successfully',
      data: employee.skills
    });
  } catch (error) {
    console.error('Delete Skill Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Add a certification to profile
 * @route   POST /api/v1/employees/:id/certifications
 * @access  Private
 */
const addCertification = async (req, res) => {
  try {
    const { certification_name, name, issuedBy, issueDate } = req.body;
    const inputCert = certification_name || (name ? JSON.stringify({ name, issuedBy, issueDate }) : null);
    if (!inputCert || !inputCert.trim()) {
      return res.status(400).json({ success: false, error: 'Certification name is required' });
    }

    const employee = await resolveEmployeeHelper(req.params.id, req.user.company_id);

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const normalizedCert = inputCert.trim();
    const isDuplicate = employee.certifications.some(c => {
      try {
        const parsedExisting = JSON.parse(c);
        const parsedNew = JSON.parse(normalizedCert);
        return parsedExisting.name.toLowerCase() === parsedNew.name.toLowerCase();
      } catch (e) {}
      return c.toLowerCase() === normalizedCert.toLowerCase();
    });

    if (isDuplicate) {
      return res.status(400).json({ success: false, error: 'Certification already exists on profile' });
    }

    employee.certifications.push(normalizedCert);
    await employee.save();

    return res.status(200).json({
      success: true,
      message: 'Certification added successfully',
      data: employee.certifications
    });
  } catch (error) {
    console.error('Add Certification Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete a certification from profile
 * @route   DELETE /api/v1/employees/:id/certifications/:certName
 * @access  Private
 */
const deleteCertification = async (req, res) => {
  try {
    const { certName } = req.params;
    const employee = await resolveEmployeeHelper(req.params.id, req.user.company_id);

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    employee.certifications = employee.certifications.filter(cert => {
      try {
        const parsed = JSON.parse(cert);
        if (parsed.name.toLowerCase() === decodeURIComponent(certName).toLowerCase()) {
          return false;
        }
      } catch (e) {}
      return cert.toLowerCase() !== decodeURIComponent(certName).toLowerCase();
    });
    await employee.save();

    return res.status(200).json({
      success: true,
      message: 'Certification deleted successfully',
      data: employee.certifications
    });
  } catch (error) {
    console.error('Delete Certification Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  onboardEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployeeProfile,
  addSkill,
  deleteSkill,
  addCertification,
  deleteCertification
};
