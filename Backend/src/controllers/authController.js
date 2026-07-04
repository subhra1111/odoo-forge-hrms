const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');
const Employee = require('../models/Employee');
const TimeOffAllocation = require('../models/TimeOffAllocation');
const SalarySettings = require('../models/SalarySettings');
const { generateEmployeeId } = require('../utils/idGenerator');
const { sendVerificationEmail } = require('../utils/mailer');
const { isValidPassword } = require('../middleware/validate');

// Helper to sign JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

/**
 * @desc    Sign up a new Organization and its primary Admin
 * @route   POST /api/v1/auth/signup-org
 * @access  Public
 */
const signupOrg = async (req, res) => {
  try {
    const { company_name, phone, name, email, password } = req.body;

    // Check if organization already exists
    const existingOrg = await Organization.findOne({ name: company_name });
    if (existingOrg) {
      return res.status(400).json({ success: false, error: 'Organization name is already registered' });
    }

    // Check if email already exists
    const existingEmp = await Employee.findOne({ email });
    if (existingEmp) {
      return res.status(400).json({ success: false, error: 'Email is already registered' });
    }

    // Handle company logo upload
    let logoPath = '';
    if (req.file) {
      logoPath = `/uploads/${req.file.filename}`;
    }

    // 1. Create Organization
    const org = await Organization.create({
      name: company_name,
      logo: logoPath,
      phone
    });

    // 2. Generate Employee ID for primary admin
    const employee_id = await generateEmployeeId(company_name, name, org._id);

    // 3. Create Verification Token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // 4. Create Employee (Admin Role)
    const adminUser = await Employee.create({
      employee_id,
      name,
      email,
      mobile: phone,
      company_id: org._id,
      password_hash: password, // Pre-save hooks will encrypt this
      role: 'Admin',
      isActivated: true,
      isVerified: false,
      verificationToken,
      verificationTokenExpires
    });

    // 5. Initialize Leave Allocations for Admin
    await TimeOffAllocation.create({
      employee_id: adminUser._id,
      paid_time_off_available: 24,
      sick_time_off_available: 7
    });

    // 6. Initialize default Salary Structure for Admin (e.g. default 80k)
    await SalarySettings.create({
      employee_id: adminUser._id,
      monthly_wage: 80000,
      working_days_per_week: 5,
      break_time_hours: 1
    });

    // Send verification email
    await sendVerificationEmail(email, name, verificationToken);

    // Generate token
    const token = signToken(adminUser._id);

    // Remove password hash from response
    adminUser.password_hash = undefined;

    return res.status(201).json({
      success: true,
      message: 'Organization registered. Verification email has been sent.',
      token,
      data: {
        organization: org,
        employee: adminUser
      }
    });
  } catch (error) {
    console.error('Signup Org Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Onboarded Employee completes registration (activation) and sets their password
 * @route   POST /api/v1/auth/signup-employee
 * @access  Public
 */
const signupEmployee = async (req, res) => {
  try {
    const { employee_id, email, password, role } = req.body;

    // Find the pending onboarding profile
    const employee = await Employee.findOne({
      employee_id: employee_id.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      role
    });
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Onboarding profile not found with matching ID, Email, and Role' });
    }

    if (employee.isActivated) {
      return res.status(400).json({ success: false, error: 'Employee account is already activated. Please Sign In.' });
    }

    // Update password (pre-save hashes it) and status
    employee.password_hash = password;
    employee.isActivated = true;
    employee.isVerified = false;

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    employee.verificationToken = verificationToken;
    employee.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    await employee.save();

    // Trigger verification email
    await sendVerificationEmail(email, employee.name, verificationToken);

    return res.status(200).json({
      success: true,
      message: 'Account activated successfully. A verification email has been sent to confirm your email.'
    });
  } catch (error) {
    console.error('Signup Employee Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Sign In
 * @route   POST /api/v1/auth/signin
 * @access  Public
 */
const signin = async (req, res) => {
  try {
    const { login_id_or_email, password } = req.body;

    if (!login_id_or_email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide credentials' });
    }

    // Find employee by email or employee_id
    const employee = await Employee.findOne({
      $or: [
        { email: login_id_or_email.toLowerCase() },
        { employee_id: login_id_or_email.toUpperCase() }
      ]
    }).populate('company_id', 'name logo');

    if (!employee) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (!employee.isActivated) {
      return res.status(403).json({ success: false, error: 'Account is not activated yet. Please complete registration.' });
    }

    if (!employee.isVerified) {
      return res.status(403).json({ success: false, error: 'Email is not verified yet. Please check your email for the verification link.' });
    }

    // Check password matches
    const isMatch = await employee.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate token
    const token = signToken(employee._id);

    employee.password_hash = undefined;

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      data: employee
    });
  } catch (error) {
    console.error('Signin Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Verify email address using verification token
 * @route   GET /api/v1/auth/verify/:token
 * @access  Public
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const employee = await Employee.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!employee) {
      return res.status(400).json({
        success: false,
        error: 'Email verification token is invalid or has expired.'
      });
    }

    employee.isVerified = true;
    employee.verificationToken = null;
    employee.verificationTokenExpires = null;

    await employee.save();

    // In a production app, we would redirect. In REST API, we return a success response
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (error) {
    console.error('Verify Email Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Change password
 * @route   POST /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ success: false, error: 'Please provide old and new password' });
    }

    if (!isValidPassword(new_password)) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    const employee = await Employee.findById(req.user._id);

    const isMatch = await employee.matchPassword(old_password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Old password is incorrect' });
    }

    employee.password_hash = new_password; // Pre-save hooks will encrypt this
    await employee.save();

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  signupOrg,
  signupEmployee,
  signin,
  verifyEmail,
  changePassword
};
