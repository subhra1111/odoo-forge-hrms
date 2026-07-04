const TimeOffRequest = require('../models/TimeOffRequest');
const TimeOffAllocation = require('../models/TimeOffAllocation');
const Employee = require('../models/Employee');

/**
 * Calculates number of working days between two dates, excluding weekends
 */
const calculateWorkingDays = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  // Normalize times to midnight
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  if (endDate < startDate) return 0;

  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sunday (0) and Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const getLocalDateString = (dateObj = new Date()) => {
  const offset = dateObj.getTimezoneOffset();
  const localDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

/**
 * Helper to update database status of an employee based on today's check-ins and approved leaves
 */
const updateEmployeeDatabaseStatus = async (employeeId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Check if on approved leave today
    const approvedLeave = await TimeOffRequest.findOne({
      employee_id: employeeId,
      status: 'Approved',
      start_date: { $lte: today },
      end_date: { $gte: today }
    });

    if (approvedLeave) {
      await Employee.findByIdAndUpdate(employeeId, { status: 'On Leave' });
      return;
    }

    // 2. Check if checked in today
    const Attendance = require('../models/Attendance');
    const todayStr = getLocalDateString();
    const attendance = await Attendance.findOne({
      employee_id: employeeId,
      date: todayStr
    });

    if (attendance) {
      if (attendance.check_in && !attendance.check_out) {
        await Employee.findByIdAndUpdate(employeeId, { status: 'Present' });
      } else {
        await Employee.findByIdAndUpdate(employeeId, { status: 'Absent' });
      }
    } else {
      await Employee.findByIdAndUpdate(employeeId, { status: 'Absent' });
    }
  } catch (err) {
    console.error('Error syncing status for employee:', employeeId, err);
  }
};

/**
 * @desc    Get current employee's remaining leave allocations
 * @route   GET /api/v1/time-off/allocations
 * @access  Private
 */
const getAllocations = async (req, res) => {
  try {
    let allocation = await TimeOffAllocation.findOne({ employee_id: req.user._id });
    if (!allocation) {
      // Lazy initialization if missing
      allocation = await TimeOffAllocation.create({
        employee_id: req.user._id,
        paid_time_off_available: 24,
        sick_time_off_available: 7
      });
    }

    return res.status(200).json({
      success: true,
      data: allocation
    });
  } catch (error) {
    console.error('Get Allocations Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Submit a time off / leave request
 * @route   POST /api/v1/time-off/requests
 * @access  Private
 */
const submitRequest = async (req, res) => {
  try {
    const { time_off_type, start_date, end_date, remarks } = req.body;

    if (!time_off_type || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: 'Please provide type, start date, and end date' });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    if (end < start) {
      return res.status(400).json({ success: false, error: 'End date cannot be before start date' });
    }

    // Calculate working days (excluding weekends)
    const allocationDays = calculateWorkingDays(start, end);
    if (allocationDays === 0) {
      return res.status(400).json({ success: false, error: 'Leave request must include at least one weekday' });
    }

    // Get allocations
    let allocation = await TimeOffAllocation.findOne({ employee_id: req.user._id });
    if (!allocation) {
      allocation = await TimeOffAllocation.create({
        employee_id: req.user._id
      });
    }

    // Check balances
    if (time_off_type === 'Paid Time off' && allocation.paid_time_off_available < allocationDays) {
      return res.status(400).json({
        success: false,
        error: `Insufficient paid leaves. Requested: ${allocationDays}, Available: ${allocation.paid_time_off_available}`
      });
    }

    if (time_off_type === 'Sick Leave') {
      if (allocation.sick_time_off_available < allocationDays) {
        return res.status(400).json({
          success: false,
          error: `Insufficient sick leaves. Requested: ${allocationDays}, Available: ${allocation.sick_time_off_available}`
        });
      }
      
      // Sick leaves require medical certificate attachments
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Medical/sick certificate attachment is required for Sick Leave requests.'
        });
      }
    }

    // Handle attachment file path
    let attachmentPath = '';
    if (req.file) {
      attachmentPath = `/uploads/${req.file.filename}`;
    }

    const request = await TimeOffRequest.create({
      employee_id: req.user._id,
      time_off_type,
      start_date: start,
      end_date: end,
      allocation_days: allocationDays,
      remarks,
      attachment_url: attachmentPath,
      status: 'Pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: request
    });
  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get leave requests (Employees view self list; Admin/HR views all in company)
 * @route   GET /api/v1/time-off/requests
 * @access  Private
 */
const getRequests = async (req, res) => {
  try {
    const { status, employee_id } = req.query;

    const isAdminOrHR = ['Admin', 'HR'].includes(req.user.role);

    if (!isAdminOrHR) {
      // Regular employees only see their own requests
      const query = { employee_id: req.user._id };
      if (status) query.status = status;

      const requests = await TimeOffRequest.find(query).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, count: requests.length, data: requests });
    }

    // Admins and HR view all employees in their company
    const employees = await Employee.find({ company_id: req.user.company_id }).select('_id');
    const employeeIds = employees.map(emp => emp._id);

    const query = { employee_id: { $in: employeeIds } };
    if (status) query.status = status;
    if (employee_id) query.employee_id = employee_id;

    const requests = await TimeOffRequest.find(query)
      .populate('employee_id', 'name employee_id email department')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Get Requests Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Approve or Reject a leave request (Admin/HR only)
 * @route   PUT /api/v1/time-off/requests/:id/status
 * @access  Private (Admin/HR)
 */
const reviewRequest = async (req, res) => {
  try {
    const { status, comments } = req.body;

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Please provide status: Approved or Rejected' });
    }

    // Find the request and verify employee belongs to the admin/HR's company
    const leaveRequest = await TimeOffRequest.findById(req.params.id).populate('employee_id');
    if (!leaveRequest) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    if (leaveRequest.employee_id.company_id.toString() !== req.user.company_id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied: Out of organization scope' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        error: `Request has already been processed. Current status: ${leaveRequest.status}`
      });
    }

    const employeeId = leaveRequest.employee_id._id;

    if (status === 'Approved') {
      // Find allocations
      const allocation = await TimeOffAllocation.findOne({ employee_id: employeeId });
      if (!allocation) {
        return res.status(404).json({ success: false, error: 'Leave allocation record not found for this employee' });
      }

      // Deduct leaves
      if (leaveRequest.time_off_type === 'Paid Time off') {
        if (allocation.paid_time_off_available < leaveRequest.allocation_days) {
          return res.status(400).json({ success: false, error: 'Insufficient Paid Time Off balance to approve this request' });
        }
        allocation.paid_time_off_available -= leaveRequest.allocation_days;
      } else if (leaveRequest.time_off_type === 'Sick Leave') {
        if (allocation.sick_time_off_available < leaveRequest.allocation_days) {
          return res.status(400).json({ success: false, error: 'Insufficient Sick Leave balance to approve this request' });
        }
        allocation.sick_time_off_available -= leaveRequest.allocation_days;
      }
      // Unpaid leaves don't deduct balances

      allocation.updatedAt = Date.now();
      await allocation.save();
    }

    // Update request status
    leaveRequest.status = status;
    leaveRequest.comments = comments || '';
    await leaveRequest.save();

    // Sync database status of the employee (e.g. if leave starts today, status switches to 'On Leave')
    await updateEmployeeDatabaseStatus(employeeId);

    return res.status(200).json({
      success: true,
      message: `Leave request has been ${status.toLowerCase()}`,
      data: leaveRequest
    });
  } catch (error) {
    console.error('Review Request Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllocations,
  submitRequest,
  getRequests,
  reviewRequest,
  updateEmployeeDatabaseStatus
};
