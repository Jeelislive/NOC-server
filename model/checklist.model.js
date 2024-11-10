import mongoose from 'mongoose';

const checklistSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  checklist: {
    GeneralCompliance: {
      type: Object, 
      default: {
        'Operating Licenses': false,
        'Required Permits': false,
        'Registration': false,
        'Local Regulations': false,
        'State Regulations': false,
        'National Regulations': false,
        'Municipal Bylaws': false,
      },
    },
    WorkforceAndLabor: {
      type: Object, 
      default: {
        'Valid Contracts': false,
        'Minimum Wage Compliance': false,
        'Work Hours Documentation': false,
        'Safety Training': false,
        'Protective Equipment': false,
        'Safety Drills Documentation': false,
      },
    },
    SafetyMeasures: {
      type: Object, 
      default: {
        'Structural Integrity': false,
        'Fire Safety Equipment': false,
        'Emergency Exits': false,
        'Sanitation Practices': false,
        'First Aid Kits': false,
        'Waste Management': false,
      },
    },
    OperationalProcedures: {
      type: Object, 
      default: {
        'Operational Guidelines': false,
        'Quality Control Measures': false,
        'Regular Maintenance': false,
        'Maintenance Logs': false,
      },
    },
    EnvironmentalCompliance: {
      type: Object, 
      default: {
        'Waste Disposal Practices': false,
        'Recycling Practices': false,
        'Waste Regulations': false,
        'Air Pollution Control': false,
        'Water Pollution Control': false,
        'Noise Pollution Control': false,
        'Hazardous Materials': false,
      },
    },
  },
}, {
  timestamps: true,
});

const Checklist = mongoose.model('Checklist', checklistSchema);
export default Checklist;
