const mongoose = require('mongoose');

const SalarySettingsSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true
  },
  monthly_wage: {
    type: Number,
    required: [true, 'Monthly wage is required']
  },
  yearly_wage: {
    type: Number
  },
  working_days_per_week: {
    type: Number,
    default: 5
  },
  break_time_hours: {
    type: Number,
    default: 1
  },
  basic_salary: {
    type: Number
  },
  hra: {
    type: Number
  },
  standard_allowance: {
    type: Number
  },
  performance_bonus: {
    type: Number
  },
  lta: {
    type: Number
  },
  fixed_allowance: {
    type: Number
  },
  employee_pf: {
    type: Number
  },
  employer_pf: {
    type: Number
  },
  professional_tax: {
    type: Number,
    default: 200
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

SalarySettingsSchema.pre('save', function() {
  if (this.isModified('monthly_wage')) {
    const basic = this.monthly_wage * 0.50; // 50% Basic
    this.basic_salary = basic;
    this.hra = basic * 0.50; // HRA: 50% of Basic
    this.standard_allowance = Math.floor(basic * 0.1667); // 16.67% of Basic (rounds to 4167 for 25k basic)
    this.performance_bonus = Math.round((basic * 0.0833) * 100) / 100; // 8.33% of Basic (2082.50)
    this.lta = Math.round((basic * 0.0833) * 100) / 100; // LTA: 8.33% of Basic (2082.50)
    
    // PF: 12% of Basic
    const pf = Math.round((basic * 0.12) * 100) / 100;
    this.employee_pf = pf;
    this.employer_pf = pf;
    
    // Professional Tax: fixed 200
    this.professional_tax = 200.00;
    
    // Yearly Wage
    this.yearly_wage = this.monthly_wage * 12;
    
    // Fixed Allowance: 11.67% of Basic (rounds to 2918 for 25k basic)
    this.fixed_allowance = Math.round((basic * 0.1167) * 100) / 100;
  }
  
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('SalarySettings', SalarySettingsSchema);
