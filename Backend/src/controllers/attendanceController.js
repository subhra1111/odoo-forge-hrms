const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const SalarySettings = require('../models/SalarySettings');

/**
 * Helper to get local date string YYYY-MM-DD
 */
const getLocalDateString = (dateObj = new Date()) => {
  const offset = dateObj.getTimezoneOffset();
  const localDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

/**
 * @desc    Check In for daily work
 * @route   POST /api/v1/attendance/check-in
 * @access  Private
 */
const checkIn = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const todayStr = getLocalDateString();

    // Check if employee already checked in today
    const existingAttendance = await Attendance.findOne({
      employee_id: employeeId,
      date: todayStr
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: `Already checked in for today (${todayStr})`
      });
    }

    // Create attendance record
    const attendance = await Attendance.create({
      employee_id: employeeId,
      date: todayStr,
      check_in: new Date()
    });

    // Update Employee status to Present
    const { updateEmployeeDatabaseStatus } = require('./timeOffController');
    await updateEmployeeDatabaseStatus(employeeId);

    return res.status(201).json({
      success: true,
      message: 'Checked in successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Check In Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Check Out for daily work
 * @route   POST /api/v1/attendance/check-out
 * @access  Private
 */
const checkOut = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const todayStr = getLocalDateString();

    // Find today's active check-in record
    const attendance = await Attendance.findOne({
      employee_id: employeeId,
      date: todayStr
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        error: 'No active check-in record found for today. Please check-in first.'
      });
    }

    if (attendance.check_out) {
      return res.status(400).json({
        success: false,
        error: 'You have already checked out for today.'
      });
    }

    // Set checkout time
    const checkoutTime = new Date();
    attendance.check_out = checkoutTime;

    // Retrieve salary settings for break duration (default to 1 hour if not found)
    const salarySettings = await SalarySettings.findOne({ employee_id: employeeId });
    const breakHours = salarySettings ? salarySettings.break_time_hours : 1;

    // Calculate work hours
    const checkInTime = new Date(attendance.check_in);
    const diffMs = checkoutTime - checkInTime;
    const grossHours = diffMs / (1000 * 60 * 60); // convert ms to hours
    
    let netWorkHours = grossHours - breakHours;
    if (netWorkHours < 0) netWorkHours = 0;
    attendance.work_hours = Math.round(netWorkHours * 100) / 100;

    // Calculate extra/overtime hours (Standard: 8 hours work day)
    let extraHours = 0;
    if (attendance.work_hours > 8) {
      extraHours = attendance.work_hours - 8;
    }
    attendance.extra_hours = Math.round(extraHours * 100) / 100;

    await attendance.save();

    // Update Employee status back to Absent or On Leave
    const { updateEmployeeDatabaseStatus } = require('./timeOffController');
    await updateEmployeeDatabaseStatus(employeeId);

    return res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Check Out Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get current employee's attendance logs
 * @route   GET /api/v1/attendance/my-attendance
 * @access  Private
 */
const getMyAttendance = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { month } = req.query; // format: YYYY-MM

    const query = { employee_id: employeeId };
    
    if (month) {
      // Regex match: date starts with 'YYYY-MM'
      query.date = new RegExp(`^${month}`);
    }

    const logs = await Attendance.find(query).sort({ date: -1 });

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Get My Attendance Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get all employees' attendance records (Admin/HR only)
 * @route   GET /api/v1/attendance/all
 * @access  Private (Admin/HR)
 */
const getAllAttendance = async (req, res) => {
  try {
    const { date, employee_id, month } = req.query;
    
    // Base filter: scope to employees within the admin/HR's company
    const employeeQuery = { company_id: req.user.company_id };
    if (employee_id) {
      employeeQuery._id = employee_id;
    }

    const employees = await Employee.find(employeeQuery).select('_id name employee_id department');
    const employeeIds = employees.map(emp => emp._id);

    // Build attendance query
    const query = { employee_id: { $in: employeeIds } };

    if (date) {
      query.date = date; // Format: YYYY-MM-DD
    } else if (month) {
      query.date = new RegExp(`^${month}`); // Format: YYYY-MM
    } else {
      // Default to today if no filter
      query.date = getLocalDateString();
    }

    const records = await Attendance.find(query)
      .populate('employee_id', 'name employee_id department status')
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Get All Attendance Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance
};
