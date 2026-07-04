const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EmployeeSchema = new mongoose.Schema({
  employee_id: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  mobile: {
    type: String,
    trim: true
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Company reference is required']
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  manager_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'On Leave'],
    default: 'Absent'
  },
  password_hash: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    enum: ['Admin', 'HR', 'Employee'],
    required: [true, 'Role is required']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActivated: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  },
  verificationTokenExpires: {
    type: Date,
    default: null
  },
  profilePicture: {
    type: String,
    default: ''
  },
  date_of_birth: {
    type: Date,
    default: null
  },
  nationality: {
    type: String,
    trim: true,
    default: ''
  },
  marital_status: {
    type: String,
    enum: ['Single', 'Married', 'Divorced', 'Widowed', ''],
    default: ''
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', ''],
    default: ''
  },
  resume: {
    about: { type: String, default: '' },
    what_i_love_about_my_job: { type: String, default: '' },
    interests_and_hobbies: { type: String, default: '' }
  },
  skills: [{
    type: String,
    trim: true
  }],
  certifications: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to encrypt password
EmployeeSchema.pre('save', async function() {
  if (!this.isModified('password_hash')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
});

// Method to compare passwords
EmployeeSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password_hash);
};

module.exports = mongoose.model('Employee', EmployeeSchema);
