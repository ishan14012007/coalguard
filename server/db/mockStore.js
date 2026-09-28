import bcrypt from 'bcryptjs';
import { calculateAuditHash } from '../utils/hashChain.js';

// Pre-hashed passwords for demo accounts
const defaultPasswordHash = bcrypt.hashSync('miner123', 10);
const authPasswordHash = bcrypt.hashSync('auth123', 10);
const superPasswordHash = bcrypt.hashSync('super123', 10);
const corpPasswordHash = bcrypt.hashSync('corp123', 10);
const dgmsPasswordHash = bcrypt.hashSync('dgms123', 10);

export const mockStore = {
  subsidiaries: [
    {
      id: 'sub-bccl-01',
      code: 'BCCL',
      name: 'Bharat Coking Coal Limited',
      headquarters: 'Koyla Bhawan, Central Mining Zone',
      state: 'Jharkhand',
      totalMines: 36,
      activeContractors: 42,
      complianceRate: 91.4
    },
    {
      id: 'sub-ecl-02',
      code: 'ECL',
      name: 'Eastern Coalfields Limited',
      headquarters: 'Sanctoria, Asansol',
      state: 'West Bengal',
      totalMines: 48,
      activeContractors: 56,
      complianceRate: 88.2
    },
    {
      id: 'sub-ccl-03',
      code: 'CCL',
      name: 'Central Coalfields Limited',
      headquarters: 'Darbhanga House, Ranchi',
      state: 'Jharkhand',
      totalMines: 40,
      activeContractors: 38,
      complianceRate: 94.1
    },
    {
      id: 'sub-secl-04',
      code: 'SECL',
      name: 'South Eastern Coalfields Limited',
      headquarters: 'Seepat Road, Bilaspur',
      state: 'Chhattisgarh',
      totalMines: 64,
      activeContractors: 85,
      complianceRate: 86.5
    },
    {
      id: 'sub-wcl-05',
      code: 'WCL',
      name: 'Western Coalfields Limited',
      headquarters: 'Coal Estate, Nagpur',
      state: 'Maharashtra',
      totalMines: 32,
      activeContractors: 30,
      complianceRate: 92.0
    }
  ],

  mines: [
    {
      id: 'mine-demo-01',
      subsidiary_id: 'sub-bccl-01',
      name: 'Demo Mine A (Zone 1 - Zone 5)',
      code: 'DEMO-MINE-A',
      mine_type: 'opencast_underground',
      area_name: 'Zone 4 Operations',
      state: 'Jharkhand',
      latitude: 23.7508,
      longitude: 86.4192,
      monthly_target_tonnes: 120000,
      actual_production_tonnes: 104500,
      current_risk_score: 58.5,
      status: 'active',
      absenteeismRate: 14.2,
      sensors: [
        { type: 'CH4 (Methane)', value: 0.92, unit: '%', limit: 1.25, status: 'normal' },
        { type: 'CO (Carbon Monoxide)', value: 42, unit: 'ppm', limit: 50, status: 'normal' },
        { type: 'SPM Dust Level', value: 285, unit: 'µg/m³', limit: 300, status: 'normal' },
        { type: 'Pit Slope Stability', value: 1.45, unit: 'FoSS', limit: 1.2, status: 'normal' }
      ],
      geojson_boundary: [
        [23.7550, 86.4150],
        [23.7560, 86.4250],
        [23.7460, 86.4240],
        [23.7450, 86.4140]
      ]
    },
    {
      id: 'mine-kusmunda-02',
      subsidiary_id: 'sub-secl-04',
      name: 'Demo Mine B (Underground Colliery)',
      code: 'DEMO-MINE-B',
      mine_type: 'underground',
      area_name: 'Zone 2 Sector',
      state: 'Chhattisgarh',
      latitude: 22.3524,
      longitude: 82.6841,
      monthly_target_tonnes: 450000,
      actual_production_tonnes: 432000,
      current_risk_score: 32.0,
      status: 'active',
      absenteeismRate: 6.8,
      sensors: [
        { type: 'CH4 (Methane)', value: 0.22, unit: '%', limit: 1.25, status: 'normal' },
        { type: 'CO (Carbon Monoxide)', value: 15, unit: 'ppm', limit: 50, status: 'normal' },
        { type: 'SPM Dust Level', value: 195, unit: 'µg/m³', limit: 300, status: 'normal' },
        { type: 'Pit Slope Stability', value: 1.82, unit: 'FoSS', limit: 1.2, status: 'normal' }
      ],
      geojson_boundary: [
        [22.3580, 82.6780],
        [22.3590, 82.6910],
        [22.3460, 82.6900],
        [22.3450, 82.6770]
      ]
    },
    {
      id: 'mine-raniganj-03',
      subsidiary_id: 'sub-ecl-02',
      name: 'Demo Mine C (Open Cast Pit)',
      code: 'DEMO-MINE-C',
      mine_type: 'opencast',
      area_name: 'Zone 3 Incline',
      state: 'West Bengal',
      latitude: 23.6186,
      longitude: 87.1264,
      monthly_target_tonnes: 75000,
      actual_production_tonnes: 48000,
      current_risk_score: 76.5,
      status: 'under_inspection',
      absenteeismRate: 22.5,
      sensors: [
        { type: 'CH4 (Methane)', value: 1.34, unit: '%', limit: 1.25, status: 'breached' },
        { type: 'CO (Carbon Monoxide)', value: 54, unit: 'ppm', limit: 50, status: 'breached' },
        { type: 'SPM Dust Level', value: 310, unit: 'µg/m³', limit: 300, status: 'breached' },
        { type: 'Air Velocity', value: 0.85, unit: 'm/s', limit: 1.5, status: 'breached' }
      ],
      geojson_boundary: [
        [23.6230, 87.1200],
        [23.6240, 87.1320],
        [23.6120, 87.1310],
        [23.6110, 87.1190]
      ]
    },
    {
      id: 'mine-piparwar-04',
      subsidiary_id: 'sub-ccl-03',
      name: 'Demo Mine D (Surface Operations)',
      code: 'DEMO-MINE-D',
      mine_type: 'opencast',
      area_name: 'Zone 5 Haulage',
      state: 'Jharkhand',
      latitude: 23.6708,
      longitude: 85.0412,
      monthly_target_tonnes: 210000,
      actual_production_tonnes: 205000,
      current_risk_score: 21.0,
      status: 'active',
      absenteeismRate: 5.1,
      sensors: [
        { type: 'CH4 (Methane)', value: 0.15, unit: '%', limit: 1.25, status: 'normal' },
        { type: 'CO (Carbon Monoxide)', value: 12, unit: 'ppm', limit: 50, status: 'normal' },
        { type: 'SPM Dust Level', value: 180, unit: 'µg/m³', limit: 300, status: 'normal' },
        { type: 'Pit Slope Stability', value: 1.95, unit: 'FoSS', limit: 1.2, status: 'normal' }
      ],
      geojson_boundary: [
        [23.6750, 85.0350],
        [23.6760, 85.0480],
        [23.6640, 85.0470],
        [23.6630, 85.0340]
      ]
    }
  ],

  // Communication & Escalation Store
  communication_requests: [
    {
      id: 'comm-req-001',
      topic: 'Highwall Strata Fracture Analysis in Zone 4',
      description: 'Geotechnical cracks widening along Bench 4. Requesting technical guidance from DGMS inspector on continuous mining safety clearance.',
      urgency: 'HIGH',
      status: 'approved',
      requested_by: 'usr-super-01',
      supervisor_name: 'Er. Rajeshwar Verma (Shift Sirdar)',
      mine_id: 'mine-demo-01',
      zone: 'Zone 4',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      reviewed_by: 'Dr. Rajeshwar Murthy',
      reviewed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      review_notes: 'Approved. Direct investigation thread initiated for Case #COMM-REQ-001.'
    },
    {
      id: 'comm-req-002',
      topic: 'Secondary Ventilation Fan Replacement (Zone 2)',
      description: 'Subordinate fan unit vibration exceeding nominal threshold. Clarification requested on permitted operational tolerance.',
      urgency: 'MEDIUM',
      status: 'pending',
      requested_by: 'usr-super-01',
      supervisor_name: 'Er. Rajeshwar Verma (Shift Sirdar)',
      mine_id: 'mine-demo-01',
      zone: 'Zone 2',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null
    }
  ],

  communication_messages: [
    {
      id: 'msg-001',
      request_id: 'comm-req-001',
      sender_id: 'usr-super-01',
      sender_name: 'Er. Rajeshwar Verma',
      sender_role: 'supervisor',
      message: 'Crack width measured at 4.2mm along Haulage Section 3. Strata extensometer attached.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'msg-002',
      request_id: 'comm-req-001',
      sender_id: 'usr-auth-01',
      sender_name: 'Dr. Rajeshwar Murthy (Authority)',
      sender_role: 'authority',
      message: 'Noted. Please maintain 20m perimeter exclusion and deploy secondary wireline extensometer.',
      timestamp: new Date(Date.now() - 3600000 * 1).toISOString()
    }
  ],

  miner_queries: [
    {
      id: 'query-101',
      miner_id: 'usr-miner-01',
      miner_name: 'Ramesh Kumar Mahato',
      zone: 'Zone 4',
      subject: 'Replacement of chin-strap for helmet #HL-849',
      message: 'Chin-strap retention buckle broken during shift handover at Face 3. Requesting replacement from safety store.',
      urgency: 'MEDIUM',
      status: 'answered',
      response: 'Safety store voucher issued. Collect from Lamp Room Counter #2.',
      responded_by: 'Er. Rajeshwar Verma (Supervisor)',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      responded_at: new Date(Date.now() - 3600000).toISOString()
    }
  ],

  cctv_counters: {
    'CAM-Z3-01': {
      base_cumulative: 28,
      today_total: 28,
      last_segment_count: 6
    }
  },

  users: [
    {
      id: 'usr-miner-01',
      full_name: 'Ramesh Kumar Mahato',
      email: 'miner@coalguard.gov.in',
      phone: '+91 98351 23456',
      employee_id: 'MIN-84729',
      password_hash: defaultPasswordHash,
      role: 'miner',
      subsidiary_id: 'sub-bccl-01',
      mine_id: 'mine-demo-01',
      designation: 'Underground Dumper & Shovel Operator',
      language_preference: 'hi',
      is_active: true
    },
    {
      id: 'usr-auth-01',
      full_name: 'Dr. Rajeshwar Murthy, Chief Compliance & Safety Authority',
      email: 'authority@coalguard.gov.in',
      phone: '+91 94311 78901',
      employee_id: 'AUTH-DGMS-01',
      password_hash: authPasswordHash,
      role: 'authority',
      subsidiary_id: 'sub-bccl-01',
      mine_id: null,
      designation: 'Statutory Safety & Mine Compliance Authority',
      language_preference: 'en',
      is_active: true
    },
    {
      id: 'usr-super-01',
      full_name: 'Er. Rajeshwar Verma',
      email: 'supervisor@coalguard.gov.in',
      phone: '+91 94311 78901',
      employee_id: 'SUP-41029',
      password_hash: superPasswordHash,
      role: 'supervisor',
      subsidiary_id: 'sub-bccl-01',
      mine_id: 'mine-demo-01',
      designation: 'Safety Officer & Colliery Sirdar (DGMS Certified)',
      language_preference: 'en',
      is_active: true
    },
    {
      id: 'usr-corp-01',
      full_name: 'Dr. Amitabh Sen, GM (Safety & Operations)',
      email: 'corporate@coalguard.gov.in',
      phone: '+91 97714 55667',
      employee_id: 'CIL-HQ-0918',
      password_hash: corpPasswordHash,
      role: 'authority',
      subsidiary_id: 'sub-bccl-01',
      mine_id: null,
      designation: 'General Manager - Safety & Corporate Governance',
      language_preference: 'en',
      is_active: true
    },
    {
      id: 'usr-reg-01',
      full_name: 'Dr. K. S. Murthy, Dy. Director General',
      email: 'regulator@coalguard.gov.in',
      phone: '+91 94340 11223',
      employee_id: 'DGMS-NZ-0042',
      password_hash: dgmsPasswordHash,
      role: 'authority',
      subsidiary_id: null,
      mine_id: null,
      designation: 'Directorate General of Mines Safety (DGMS Inspector)',
      language_preference: 'en',
      is_active: true
    }
  ],

  compliance_items: [
    {
      id: 'comp-01',
      mine_id: 'mine-demo-01',
      title: 'Quarterly Dust & Air Sampling Test as per CMR 2017 Reg 124',
      category: 'safety',
      act_reference: 'Coal Mines Regulations 2017, Reg 124',
      description: 'Mandatory gravimetric dust sampler analysis at transfer points and haul road intersections.',
      due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      responsible_officer_id: 'usr-super-01',
      responsible_officer_name: 'Er. Rajeshwar Verma',
      status: 'pending',
      escalation_level: 0,
      target_production_tonnes: 120000,
      actual_production_tonnes: 104500
    },
    {
      id: 'comp-02',
      mine_id: 'mine-demo-01',
      title: 'Water Discharge pH and Heavy Metal Effluent Monitoring',
      category: 'environment',
      act_reference: 'Environment (Protection) Act 1986, SPCB Sch VI',
      description: 'Zero liquid discharge verification report submission to Jharkhand State Pollution Control Board.',
      due_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
      responsible_officer_id: 'usr-super-01',
      responsible_officer_name: 'Er. Rajeshwar Verma',
      status: 'overdue',
      escalation_level: 1,
      target_production_tonnes: null,
      actual_production_tonnes: null
    },
    {
      id: 'comp-03',
      mine_id: 'mine-demo-01',
      title: 'Periodic Medical Examination (PME) for Underground Workers',
      category: 'labour',
      act_reference: 'Mines Rules 1955, Rule 29B',
      description: 'Pneumoconiosis and audiometric health screening for 120 high-exposure shovel & blast crew.',
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      responsible_officer_id: 'usr-super-01',
      responsible_officer_name: 'Er. Rajeshwar Verma',
      status: 'in_progress',
      escalation_level: 0
    },
    {
      id: 'comp-04',
      mine_id: 'mine-raniganj-03',
      title: 'Continuous Methane Telemonitoring Calibration Audit',
      category: 'dgms',
      act_reference: 'DGMS Tech Circular No 03 of 2022',
      description: 'Verification of optical flame safety lamps and catalytic sensors in return airway #3.',
      due_date: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
      responsible_officer_id: 'usr-super-01',
      responsible_officer_name: 'Er. Rajeshwar Verma',
      status: 'escalated',
      escalation_level: 2
    },
    {
      id: 'comp-05',
      mine_id: 'mine-kusmunda-02',
      title: 'Haul Road Dust Suppression & Water Sprinkler Log Certification',
      category: 'safety',
      act_reference: 'Mines Act 1952 Sec 22A',
      description: 'Automated mist cannon operation audit along primary haulage artery 2B.',
      due_date: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
      responsible_officer_id: 'usr-super-01',
      responsible_officer_name: 'Er. Rajeshwar Verma',
      status: 'closed',
      escalation_level: 0
    }
  ],

  inspections: [
    {
      id: 'insp-01',
      mine_id: 'mine-demo-01',
      inspector_id: 'usr-reg-01',
      inspector_name: 'Dr. K. S. Murthy (DGMS)',
      scheduled_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      completed_date: new Date(Date.now() - 2 * 86400000).toISOString(),
      inspection_type: 'statutory_dgms',
      status: 'completed',
      score: 84.5,
      checklist_data: {
        ventilationCheck: true,
        ppeCompliance: false,
        explosiveMagazineSafety: true,
        slopeStabilitySensors: true,
        firstAidStationStaffed: true
      },
      notes: 'Overall slope stability good. Secondary bench berm height was non-compliant near Face 3.'
    },
    {
      id: 'insp-02',
      mine_id: 'mine-demo-01',
      inspector_id: 'usr-super-01',
      inspector_name: 'Er. Rajeshwar Verma',
      scheduled_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      completed_date: null,
      inspection_type: 'routine_internal',
      status: 'scheduled',
      score: null,
      checklist_data: {},
      notes: 'Weekly internal safety audit of conveyor belt 4 emergency pull-wire cords.'
    }
  ],

  violations: [
    {
      id: 'viol-01',
      mine_id: 'mine-demo-01',
      inspection_id: 'insp-01',
      reported_by: 'usr-reg-01',
      reported_by_name: 'Dr. K. S. Murthy (DGMS)',
      title: 'Inadequate Haul Road Safety Berm Height (Below 1.5x Tyre Diameter)',
      category: 'safety_hazard',
      severity: 'high',
      location_description: 'East Flank Haul Road, Bench Level 140m RL',
      latitude: 23.7512,
      longitude: 86.4210,
      photo_url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
      status: 'action_assigned',
      corrective_action_required: 'Construct compacted earthen safety berm to minimum 2.4 meters height and install retroreflective hazard markers.',
      assigned_to: 'usr-super-01',
      assigned_to_name: 'Er. Rajeshwar Verma',
      deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      rectification_proof_photo_url: null,
      rectification_submitted_at: null,
      rectification_latitude: null,
      rectification_longitude: null,
      verified_by_supervisor_id: null,
      verified_at: null,
      closure_remarks: null,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'viol-02',
      mine_id: 'mine-demo-01',
      inspection_id: null,
      reported_by: 'usr-miner-01',
      reported_by_name: 'Ramesh Kumar Mahato',
      title: 'Methane Ingress Sensor Alarm Failure at Return Airway #2',
      category: 'gas_threshold',
      severity: 'critical',
      location_description: 'Ventilation Shaft 2B, Intake Split 4',
      latitude: 23.7525,
      longitude: 86.4180,
      photo_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      status: 'rectification_submitted',
      corrective_action_required: 'Replace catalytic CH4 sensor head and test audible hooter with certified test gas cylinder.',
      assigned_to: 'usr-super-01',
      assigned_to_name: 'Er. Rajeshwar Verma',
      deadline: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
      // Rectification submitted by field tech, waiting for supervisor verification
      rectification_proof_photo_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      rectification_submitted_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      rectification_latitude: 23.7524,
      rectification_longitude: 86.4181,
      verified_by_supervisor_id: null,
      verified_at: null,
      closure_remarks: null,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: 'viol-03',
      mine_id: 'mine-demo-01',
      inspection_id: 'insp-01',
      reported_by: 'usr-super-01',
      reported_by_name: 'Er. Rajeshwar Verma',
      title: 'Contractor Tipper Trucks Operating Without Functional Reverse Audio Alarms',
      category: 'ppe_breach',
      severity: 'medium',
      location_description: 'Coal Washery Dump Yard #1',
      latitude: 23.7490,
      longitude: 86.4225,
      photo_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
      status: 'verified_closed',
      corrective_action_required: 'Ground all 6 tippers until DGMS-compliant audio-visual reverse alarms (AVAs) are installed and certified.',
      assigned_to: 'usr-super-01',
      assigned_to_name: 'Er. Rajeshwar Verma',
      deadline: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
      rectification_proof_photo_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      rectification_submitted_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      rectification_latitude: 23.7491,
      rectification_longitude: 86.4224,
      verified_by_supervisor_id: 'usr-super-01',
      verified_at: new Date(Date.now() - 6 * 3600000).toISOString(),
      closure_remarks: 'All 6 tipper trucks inspected on site. AVAs and proximity warning buzzers tested 100% operational.',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    }
  ],

  contractors: [
    {
      id: 'cont-01',
      name: 'Shree Balaji Heavy Mining & Earthmovers Pvt Ltd',
      company_reg_no: 'U10100JH2014PTC002891',
      subsidiary_id: 'sub-bccl-01',
      mine_id: 'mine-demo-01',
      service_type: 'Overburden Excavation & Heavy Haulage',
      active_workers_count: 68,
      safety_rating: 4.6,
      training_compliance_pct: 96.5,
      license_number: 'DGMS/HQ/CONT/2021/8412',
      license_expiry_date: new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0],
      insurance_expiry_date: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
      portable_compliance_score: 94.2,
      status: 'compliant',
      violationsCount: 1
    },
    {
      id: 'cont-02',
      name: 'Singhania Blast & Drilling Logistics',
      company_reg_no: 'U14290WB2018PTC099432',
      subsidiary_id: 'sub-bccl-01',
      mine_id: 'mine-demo-01',
      service_type: 'Deep-Hole Blasting & Explosive Transport',
      active_workers_count: 24,
      safety_rating: 3.4,
      training_compliance_pct: 78.0,
      license_number: 'PESO/EXP/JH/2023/1029',
      license_expiry_date: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0], // Expiring soon!
      insurance_expiry_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      portable_compliance_score: 72.5,
      status: 'warning',
      violationsCount: 3
    },
    {
      id: 'cont-03',
      name: 'Ranchi Coal Conveyor Spares & Maintenance',
      company_reg_no: 'U29300JH2016PTC001289',
      subsidiary_id: 'sub-bccl-01',
      mine_id: 'mine-demo-01',
      service_type: 'Belt Conveyor Splicing & Maintenance',
      active_workers_count: 18,
      safety_rating: 4.8,
      training_compliance_pct: 100.0,
      license_number: 'DGMS/EZ/MECH/2022/411',
      license_expiry_date: new Date(Date.now() + 280 * 86400000).toISOString().split('T')[0],
      insurance_expiry_date: new Date(Date.now() + 190 * 86400000).toISOString().split('T')[0],
      portable_compliance_score: 98.0,
      status: 'compliant',
      violationsCount: 0
    }
  ],

  field_reports: [
    {
      id: 'rep-01',
      mine_id: 'mine-demo-01',
      worker_id: 'usr-miner-01',
      worker_name: 'Ramesh Kumar Mahato',
      report_type: 'hazard_observation',
      suggested_category: 'Pit Slope Cracks',
      description: 'Tension crack observed along Highwall Face 3 after heavy blasting session.',
      audio_transcript: 'ब्लास्टिंग के बाद फेस 3 के ऊपर लगभग 2 इंच की दरार देखी गई है। पत्थर गिरने का खतरा है। (2-inch tension crack seen on Face 3 after blasting.)',
      photo_url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
      latitude: 23.7530,
      longitude: 86.4175,
      is_offline_synced: true,
      severity: 'high',
      supervisor_ack: true,
      created_at: new Date(Date.now() - 4 * 3600000).toISOString()
    },
    {
      id: 'rep-02',
      mine_id: 'mine-demo-01',
      worker_id: 'usr-miner-01',
      worker_name: 'Ramesh Kumar Mahato',
      report_type: 'equipment_defect',
      suggested_category: 'Water Mist Cannon Defect',
      description: 'Haul road dust suppression sprinkler nozzle choked with coal slurry.',
      audio_transcript: 'रोड पर धूल बहुत उड़ रही है, स्प्रिंकलर नोजल चोक हो गया है। (Sprinkler nozzle is choked, heavy dust on haul road.)',
      photo_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
      latitude: 23.7505,
      longitude: 86.4200,
      is_offline_synced: false,
      severity: 'medium',
      supervisor_ack: false,
      created_at: new Date(Date.now() - 1 * 3600000).toISOString()
    }
  ],

  worker_attendance: [
    {
      id: 'att-01',
      worker_id: 'usr-miner-01',
      worker_name: 'Ramesh Kumar Mahato',
      date: new Date().toISOString().split('T')[0],
      shift: 'morning',
      status: 'present',
      biometric_timestamp: new Date().toISOString()
    },
    {
      id: 'att-02',
      worker_id: 'usr-miner-01',
      worker_name: 'Ramesh Kumar Mahato',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      shift: 'morning',
      status: 'present',
      biometric_timestamp: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'att-03',
      worker_id: 'usr-miner-01',
      worker_name: 'Ramesh Kumar Mahato',
      date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      shift: 'morning',
      status: 'present',
      biometric_timestamp: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ],

  grievances: [
    {
      id: 'griev-01',
      ticket_number: 'GRV-2026-081',
      worker_id: 'usr-miner-01',
      worker_name: 'Ramesh Kumar Mahato',
      mine_id: 'mine-demo-01',
      category: 'safety_equipment',
      subject: 'Replacement of damaged Mining Safety Helmet & Luminescent Strap',
      description: 'Helmet strap snapped during underground shovel operation. Requires DGMS-standard BIS Type IV helmet.',
      priority: 'high',
      status: 'in_progress',
      sla_hours: 48,
      created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
      resolution_notes: 'Safety store voucher issued. Collect from Safety Incharge Store Room #3.'
    },
    {
      id: 'griev-02',
      ticket_number: 'GRV-2026-064',
      worker_id: 'usr-miner-01',
      worker_name: 'Ramesh Kumar Mahato',
      mine_id: 'mine-demo-01',
      category: 'medical_welfare',
      subject: 'Drinking Water Cooler Filter Cleaning at Rest Shelter #2',
      description: 'Rest shelter water cooler filtration membrane needs replacement.',
      priority: 'medium',
      status: 'resolved',
      sla_hours: 72,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      resolved_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      resolution_notes: 'Filter candle replaced and RO TDS calibrated to 120 ppm.'
    }
  ],

  audit_log: [],

  ai_assessments: [
    {
      id: 'RSA-1042',
      model_id: 'model_4_risk',
      model_name: 'Mine Risk Scoring',
      model_engine: 'RandomForest ML Engine (MSHA Dataset)',
      mine_id: 'mine-demo-01',
      mine_name: 'Demo Mine A',
      sector: 'Zone 4 (Underground Seam Block)',
      supervisor_id: 'usr-super-01',
      supervisor_name: 'Rajesh Kumar (Colliery Supervisor)',
      created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      status: 'NEW',
      inputs: {
        'Mining Activity': 'Continuous miner',
        'Mining Equipment Used': 'Continuous miner',
        'Underground Work Location': 'FACE',
        'Miner Experience Level': '<1 Year',
        'Shift Timing': 'Night Shift (2200-0600)',
        'Mining Method': 'Continuous Mining'
      },
      output: {
        predicted_risk_pct: 48.35,
        risk_level: 'WATCH',
        global_baseline: 48.4,
        delta_pct: -0.05,
        explanation: 'Workforce inexperience (<1 Year) combined with Night Shift circadian fatigue increases face incident risk probability.',
        risk_drivers: [
          { driver: 'Workforce Experience Factor', value: '<1 Year', severity: 'HIGH' },
          { driver: 'Shift Fatigue & Circadian Index', value: 'Night Shift', severity: 'HIGH' }
        ]
      }
    }
  ],

  incidents: [
    {
      id: 'INC-FIRE-Z4-001',
      incident_type: 'FIRE',
      title: 'Fire Detected — Zone 4',
      description: 'Potential fire & thermal anomaly detected near Zone 4 Haulage Ramp. Immediate supervisor inspection and verification required.',
      mine_id: 'mine-demo-01',
      mine_name: 'Demo Mine A (Zone 1 - Zone 5)',
      zone: 'Zone 4',
      latitude: 23.7508,
      longitude: 86.4192,
      severity: 'HIGH',
      status: 'ACTIVE',
      source: '3-Camera AI Thermal Vision (CAM-Z4-01)',
      created_at: new Date(Date.now() - 12 * 60000).toISOString(),
      acknowledged_at: null,
      acknowledged_by: null,
      resolved_at: null,
      resolved_by: null,
      notification_id: 'notif-inc-fire-01'
    },
    {
      id: 'INC-GAS-Z2-002',
      incident_type: 'GAS_LEAK',
      title: 'Gas Leak Detected — Zone 2',
      description: 'Atmospheric CH4 reading exceeded 1.35% threshold at Seam 2 ventilation return incline.',
      mine_id: 'mine-demo-01',
      mine_name: 'Demo Mine A (Zone 1 - Zone 5)',
      zone: 'Zone 2',
      latitude: 23.7485,
      longitude: 86.4170,
      severity: 'CRITICAL',
      status: 'ACTIVE',
      source: 'Underground Methanometer Sensor Node #04',
      created_at: new Date(Date.now() - 25 * 60000).toISOString(),
      acknowledged_at: null,
      acknowledged_by: null,
      resolved_at: null,
      resolved_by: null,
      notification_id: 'notif-inc-gas-02'
    },
    {
      id: 'INC-COLLAPSE-Z5-003',
      incident_type: 'MINE_COLLAPSE',
      title: 'Highwall Slope Instability — Zone 5',
      description: 'Highwall bench slope displacement detected. Geotechnical stability warning issued.',
      mine_id: 'mine-demo-01',
      mine_name: 'Demo Mine A (Zone 1 - Zone 5)',
      zone: 'Zone 5',
      latitude: 23.7465,
      longitude: 86.4230,
      severity: 'CRITICAL',
      status: 'ACTIVE',
      source: 'Slope Stability Radar & Geophone Telemetry',
      created_at: new Date(Date.now() - 40 * 60000).toISOString(),
      acknowledged_at: null,
      acknowledged_by: null,
      resolved_at: null,
      resolved_by: null,
      notification_id: 'notif-inc-collapse-03'
    },
    {
      id: 'INC-FLOOD-Z1-004',
      incident_type: 'FLOODING',
      title: 'Inundation / Flooding Alert — Sump East',
      description: 'Water ingress level rose rapidly in drainage sump pit following heavy precipitation.',
      mine_id: 'mine-demo-01',
      mine_name: 'Demo Mine A (Zone 1 - Zone 5)',
      zone: 'Zone 1',
      latitude: 23.7455,
      longitude: 86.4155,
      severity: 'HIGH',
      status: 'ACTIVE',
      source: 'Sump Level Sensor & Field Patrol',
      created_at: new Date(Date.now() - 55 * 60000).toISOString(),
      acknowledged_at: null,
      acknowledged_by: null,
      resolved_at: null,
      resolved_by: null,
      notification_id: 'notif-inc-flood-04'
    },
    {
      id: 'INC-SMOKE-Z3-005',
      incident_type: 'SMOKE_TOXIC',
      title: 'Smoke & CO Ingress — Zone 3 Shaft',
      description: 'Carbon monoxide elevated to 48 ppm with visible haze near Zone 3 airlock gate.',
      mine_id: 'mine-demo-01',
      mine_name: 'Demo Mine A (Zone 1 - Zone 5)',
      zone: 'Zone 3',
      latitude: 23.7540,
      longitude: 86.4225,
      severity: 'HIGH',
      status: 'ACKNOWLEDGED',
      source: 'CCTV Smoke Detection Algorithm (HSV-MOG2)',
      created_at: new Date(Date.now() - 85 * 60000).toISOString(),
      acknowledged_at: new Date(Date.now() - 60 * 60000).toISOString(),
      acknowledged_by: 'Manoj Kumar (Shift Supervisor)',
      resolved_at: null,
      resolved_by: null,
      notification_id: 'notif-inc-smoke-05'
    },
    {
      id: 'INC-ELEC-Z4-006',
      incident_type: 'ELECTRICAL',
      title: 'Electrical Earth Fault — Substation 2',
      description: 'Automatic breaker trip on 3.3kV feeder cable supplying continuous miner.',
      mine_id: 'mine-demo-01',
      mine_name: 'Demo Mine A (Zone 1 - Zone 5)',
      zone: 'Zone 4',
      latitude: 23.7520,
      longitude: 86.4150,
      severity: 'MEDIUM',
      status: 'ACKNOWLEDGED',
      source: 'Substation Telemetry & Electrical In-Charge',
      created_at: new Date(Date.now() - 110 * 60000).toISOString(),
      acknowledged_at: new Date(Date.now() - 90 * 60000).toISOString(),
      acknowledged_by: 'Manoj Kumar (Shift Supervisor)',
      resolved_at: null,
      resolved_by: null,
      notification_id: 'notif-inc-elec-06'
    }
  ],

  notifications: [
    {
      id: 'notif-inc-fire-01',
      user_id: 'usr-super-01',
      mine_id: 'mine-demo-01',
      title: 'Fire Detected — Zone 4',
      message: 'Potential fire incident detected in Zone 4. Immediate supervisor verification required.',
      type: 'incident',
      severity: 'HIGH',
      is_read: false,
      has_location: true,
      location: {
        incident_id: 'INC-FIRE-Z4-001',
        incident_type: 'FIRE',
        title: 'Fire Detected — Zone 4',
        zone: 'Zone 4',
        latitude: 23.7508,
        longitude: 86.4192,
        severity: 'HIGH'
      },
      created_at: new Date(Date.now() - 12 * 60000).toISOString()
    },
    {
      id: 'notif-inc-gas-02',
      user_id: 'usr-super-01',
      mine_id: 'mine-demo-01',
      title: 'Gas Leak Detected — Zone 2',
      message: 'Atmospheric CH4 elevated to 1.35% at Seam 2 ventilation incline. Verification required.',
      type: 'incident',
      severity: 'CRITICAL',
      is_read: false,
      has_location: true,
      location: {
        incident_id: 'INC-GAS-Z2-002',
        incident_type: 'GAS_LEAK',
        title: 'Gas Leak Detected — Zone 2',
        zone: 'Zone 2',
        latitude: 23.7485,
        longitude: 86.4170,
        severity: 'CRITICAL'
      },
      created_at: new Date(Date.now() - 25 * 60000).toISOString()
    },
    {
      id: 'notif-inc-collapse-03',
      user_id: 'usr-super-01',
      mine_id: 'mine-demo-01',
      title: 'Highwall Slope Instability — Zone 5',
      message: 'Geotechnical displacement alert on Highwall Bench 3. Immediate site inspection required.',
      type: 'incident',
      severity: 'CRITICAL',
      is_read: false,
      has_location: true,
      location: {
        incident_id: 'INC-COLLAPSE-Z5-003',
        incident_type: 'MINE_COLLAPSE',
        title: 'Highwall Slope Instability — Zone 5',
        zone: 'Zone 5',
        latitude: 23.7465,
        longitude: 86.4230,
        severity: 'CRITICAL'
      },
      created_at: new Date(Date.now() - 40 * 60000).toISOString()
    },
    {
      id: 'notif-inc-flood-04',
      user_id: 'usr-super-01',
      mine_id: 'mine-demo-01',
      title: 'Inundation / Flooding Alert — Sump East',
      message: 'Water ingress level exceeded 80% capacity in East Sump Drainage. Pump activation check required.',
      type: 'incident',
      severity: 'HIGH',
      is_read: false,
      has_location: true,
      location: {
        incident_id: 'INC-FLOOD-Z1-004',
        incident_type: 'FLOODING',
        title: 'Inundation / Flooding Alert — Sump East',
        zone: 'Zone 1',
        latitude: 23.7455,
        longitude: 86.4155,
        severity: 'HIGH'
      },
      created_at: new Date(Date.now() - 55 * 60000).toISOString()
    },
    {
      id: 'notif-01',
      user_id: 'usr-super-01',
      mine_id: 'mine-demo-01',
      title: 'Statutory Escalation Level 1',
      message: 'SPCB Water Discharge Test for Demo Mine A Seam 4 is overdue by 3 days. Escalated to Colliery Agent.',
      type: 'escalation',
      is_read: false,
      created_at: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: 'notif-02',
      user_id: 'usr-super-01',
      mine_id: 'mine-demo-01',
      title: 'Contractor License Expiry Warning',
      message: 'Singhania Blast & Drilling license expires in 8 days. Renewal required under Mines Act.',
      type: 'alert',
      is_read: false,
      created_at: new Date(Date.now() - 5 * 3600000).toISOString()
    },
    {
      id: 'notif-03',
      user_id: 'usr-miner-01',
      mine_id: 'mine-demo-01',
      title: 'Grievance Update',
      message: 'Your helmet replacement ticket GRV-2026-081 is ready for store pickup.',
      type: 'grievance_update',
      is_read: false,
      created_at: new Date(Date.now() - 8 * 3600000).toISOString()
    }
  ]
};

// Initialize Genesis and subsequent Blockchain-Lite audit logs
function initAuditTrail() {
  const seedAuditEvents = [
    {
      id: 1,
      timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
      entity_type: 'violation',
      entity_id: 'viol-03',
      action: 'CREATED',
      actor_id: 'usr-super-01',
      actor_name: 'Er. Rajeshwar Verma',
      actor_role: 'supervisor',
      mine_id: 'mine-demo-01',
      payload: { title: 'Contractor Tipper Trucks Operating Without Functional Reverse Audio Alarms', severity: 'medium' }
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
      entity_type: 'inspection',
      entity_id: 'insp-01',
      action: 'COMPLETED',
      actor_id: 'usr-reg-01',
      actor_name: 'Dr. K. S. Murthy',
      actor_role: 'regulator',
      mine_id: 'mine-demo-01',
      payload: { score: 84.5, type: 'statutory_dgms' }
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
      entity_type: 'violation',
      entity_id: 'viol-01',
      action: 'CREATED',
      actor_id: 'usr-reg-01',
      actor_name: 'Dr. K. S. Murthy',
      actor_role: 'regulator',
      mine_id: 'mine-demo-01',
      payload: { title: 'Inadequate Haul Road Safety Berm Height', severity: 'high' }
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
      entity_type: 'violation',
      entity_id: 'viol-02',
      action: 'CREATED',
      actor_id: 'usr-miner-01',
      actor_name: 'Ramesh Kumar Mahato',
      actor_role: 'miner',
      mine_id: 'mine-demo-01',
      payload: { title: 'Methane Ingress Sensor Alarm Failure', severity: 'critical' }
    },
    {
      id: 5,
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
      entity_type: 'violation',
      entity_id: 'viol-03',
      action: 'RECTIFICATION_SUBMITTED',
      actor_id: 'usr-super-01',
      actor_name: 'Er. Rajeshwar Verma',
      actor_role: 'supervisor',
      mine_id: 'mine-demo-01',
      payload: { proof_attached: true, photo_lat: 23.7491, photo_lng: 86.4224 }
    },
    {
      id: 6,
      timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
      entity_type: 'violation',
      entity_id: 'viol-03',
      action: 'VERIFIED_CLOSED',
      actor_id: 'usr-super-01',
      actor_name: 'Er. Rajeshwar Verma',
      actor_role: 'supervisor',
      mine_id: 'mine-demo-01',
      payload: { verified_status: 'verified_closed', remarks: 'All 6 tipper trucks inspected on site.' }
    }
  ];

  let prevHash = 'GENESIS_BLOCK_COALGUARD_2026';
  mockStore.audit_log = seedAuditEvents.map(evt => {
    const currentHash = calculateAuditHash({
      previousHash: prevHash,
      timestamp: evt.timestamp,
      entityType: evt.entity_type,
      entityId: evt.entity_id,
      action: evt.action,
      payload: evt.payload
    });

    const block = {
      ...evt,
      previous_hash: prevHash,
      current_hash: currentHash
    };

    prevHash = currentHash;
    return block;
  });
}

initAuditTrail();

export function appendAuditLog({ entityType, entityId, action, actor, mineId, payload }) {
  const previousHash = mockStore.audit_log.length > 0 
    ? mockStore.audit_log[mockStore.audit_log.length - 1].current_hash 
    : 'GENESIS_BLOCK_COALGUARD_2026';
  
  const timestamp = new Date().toISOString();
  const currentHash = calculateAuditHash({
    previousHash,
    timestamp,
    entityType,
    entityId,
    action,
    payload
  });

  const entry = {
    id: mockStore.audit_log.length + 1,
    timestamp,
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: actor?.id || null,
    actor_name: actor?.full_name || 'System Auto-Trigger',
    actor_role: actor?.role || 'system',
    mine_id: mineId || null,
    payload,
    previous_hash: previousHash,
    current_hash: currentHash
  };

  mockStore.audit_log.push(entry);
  return entry;
}
