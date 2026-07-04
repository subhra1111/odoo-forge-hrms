const SalarySettings = require('../models/SalarySettings');
const Employee = require('../models/Employee');

/**
 * @desc    Get salary structure for an employee
 * @route   GET /api/v1/salary/:employeeId
 * @access  Private (Self read-only, Admin/HR full access)
 */
const getSalary = async (req, res) => {
  try {
    const targetEmployeeId = req.params.employeeId;
    const currentUserId = req.user._id.toString();
    const currentUserRole = req.user.role;

    // Resolve employee by _id or employee_id
    const isObjectId = targetEmployeeId.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId
      ? { _id: targetEmployeeId }
      : { employee_id: targetEmployeeId.toUpperCase() };

    const employee = await Employee.findOne(query);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    if (employee.company_id.toString() !== req.user.company_id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied: Out of organization scope' });
    }

    // Check authorization: Employee can view self. Admin/HR can view anyone in company.
    const isSelf = (currentUserId === employee._id.toString());
    const isAdminOrHR = ['Admin', 'HR'].includes(currentUserRole);

    if (!isSelf && !isAdminOrHR) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permissions to view this salary structure'
      });
    }

    // Find salary settings using employee._id
    let salary = await SalarySettings.findOne({ employee_id: employee._id });
    if (!salary) {
      // Lazy initialize default salary settings if not found
      salary = await SalarySettings.create({
        employee_id: employee._id,
        monthly_wage: 30000,
        working_days_per_week: 5,
        break_time_hours: 1
      });
    }

    return res.status(200).json({
      success: true,
      salary
    });
  } catch (error) {
    console.error('Get Salary Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update salary settings for an employee (Admin/HR only)
 * @route   PUT /api/v1/salary/:employeeId
 * @access  Private (Admin/HR)
 */
const updateSalary = async (req, res) => {
  try {
    const targetEmployeeId = req.params.employeeId;

    // Resolve employee by _id or employee_id
    const isObjectId = targetEmployeeId.match(/^[0-9a-fA-F]{24}$/);
    const query = isObjectId
      ? { _id: targetEmployeeId }
      : { employee_id: targetEmployeeId.toUpperCase() };

    const employee = await Employee.findOne(query);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    if (employee.company_id.toString() !== req.user.company_id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied: Out of organization scope' });
    }

    const { monthly_wage, working_days_per_week, break_time_hours } = req.body;

    if (monthly_wage === undefined) {
      return res.status(400).json({ success: false, error: 'Please provide monthly_wage to update' });
    }

    if (monthly_wage < 0) {
      return res.status(400).json({ success: false, error: 'Monthly wage cannot be negative' });
    }

    // Find or create salary settings using employee._id
    let salary = await SalarySettings.findOne({ employee_id: employee._id });
    if (!salary) {
      salary = new SalarySettings({
        employee_id: employee._id
      });
    }

    // Update fields
    salary.monthly_wage = monthly_wage;
    if (working_days_per_week !== undefined) salary.working_days_per_week = working_days_per_week;
    if (break_time_hours !== undefined) salary.break_time_hours = break_time_hours;

    // Pre-save hook automatically computes all percentages and PF deductions
    await salary.save();

    return res.status(200).json({
      success: true,
      message: 'Salary structure updated and recalculated successfully',
      salary
    });
  } catch (error) {
    console.error('Update Salary Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getSalary,
  updateSalary
};
