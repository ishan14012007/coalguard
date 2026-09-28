-- =========================================================
-- COALGUARD DATABASE SCHEMA (PostgreSQL / Supabase)
-- Smart Governance & Statutory Compliance System for Coal Mines
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SUBSIDIARIES
CREATE TABLE IF NOT EXISTS subsidiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    headquarters VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. MINES
CREATE TABLE IF NOT EXISTS mines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsidiary_id UUID REFERENCES subsidiaries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    mine_type VARCHAR(50) NOT NULL CHECK (mine_type IN ('opencast', 'underground', 'mixed')),
    area_name VARCHAR(150) NOT NULL,
    state VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    geojson_boundary JSONB,
    monthly_target_tonnes NUMERIC(12, 2) DEFAULT 0.00,
    current_risk_score NUMERIC(5, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'under_inspection')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('miner', 'supervisor', 'corporate', 'regulator')),
    subsidiary_id UUID REFERENCES subsidiaries(id),
    mine_id UUID REFERENCES mines(id),
    designation VARCHAR(150),
    avatar_url TEXT,
    language_preference VARCHAR(10) DEFAULT 'en' CHECK (language_preference IN ('en', 'hi')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. STATUTORY COMPLIANCE ITEMS
CREATE TABLE IF NOT EXISTS compliance_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mine_id UUID REFERENCES mines(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('safety', 'environment', 'labour', 'production', 'dgms')),
    act_reference VARCHAR(255),
    description TEXT,
    due_date DATE NOT NULL,
    responsible_officer_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'overdue', 'closed', 'escalated')),
    escalation_level INT DEFAULT 0,
    last_escalated_at TIMESTAMP WITH TIME ZONE,
    target_production_tonnes NUMERIC(12,2),
    actual_production_tonnes NUMERIC(12,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. INSPECTIONS
CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mine_id UUID REFERENCES mines(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES users(id),
    scheduled_date DATE NOT NULL,
    completed_date TIMESTAMP WITH TIME ZONE,
    inspection_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    checklist_data JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. VIOLATIONS (With 2-step closure workflow)
CREATE TABLE IF NOT EXISTS violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
    mine_id UUID REFERENCES mines(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('safety_hazard', 'gas_threshold', 'ventilation', 'ppe_breach', 'illegal_entry', 'environmental_dump')),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    location_description VARCHAR(255),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    photo_url TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'action_assigned', 'rectification_submitted', 'verified_closed')),
    corrective_action_required TEXT,
    assigned_to UUID REFERENCES users(id),
    deadline DATE NOT NULL,
    rectification_proof_photo_url TEXT,
    rectification_submitted_at TIMESTAMP WITH TIME ZONE,
    rectification_latitude DECIMAL(10, 7),
    rectification_longitude DECIMAL(10, 7),
    verified_by_supervisor_id UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    closure_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. CORRECTIVE ACTIONS
CREATE TABLE IF NOT EXISTS corrective_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    violation_id UUID REFERENCES violations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    action_taken TEXT NOT NULL,
    proof_attachment_url TEXT,
    geo_lat DECIMAL(10, 7),
    geo_lng DECIMAL(10, 7),
    status VARCHAR(50) DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. CONTRACTORS
CREATE TABLE IF NOT EXISTS contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_reg_no VARCHAR(100) UNIQUE NOT NULL,
    subsidiary_id UUID REFERENCES subsidiaries(id),
    mine_id UUID REFERENCES mines(id),
    service_type VARCHAR(100),
    active_workers_count INT DEFAULT 0,
    safety_rating NUMERIC(3, 2) DEFAULT 5.00,
    training_compliance_pct NUMERIC(5, 2) DEFAULT 100.00,
    license_number VARCHAR(100),
    license_expiry_date DATE NOT NULL,
    insurance_expiry_date DATE NOT NULL,
    portable_compliance_score NUMERIC(5, 2) DEFAULT 95.00,
    status VARCHAR(50) DEFAULT 'compliant' CHECK (status IN ('compliant', 'warning', 'blacklisted', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. CONTRACTOR CERTIFICATIONS
CREATE TABLE IF NOT EXISTS contractor_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
    cert_title VARCHAR(255) NOT NULL,
    issuing_authority VARCHAR(255),
    valid_until DATE NOT NULL,
    file_url TEXT,
    ocr_extracted_text TEXT,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. FIELD REPORTS
CREATE TABLE IF NOT EXISTS field_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mine_id UUID REFERENCES mines(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES users(id),
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('hazard_observation', 'near_miss', 'incident', 'equipment_defect')),
    suggested_category VARCHAR(100),
    description TEXT NOT NULL,
    audio_transcript TEXT,
    photo_url TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    is_offline_synced BOOLEAN DEFAULT FALSE,
    severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    supervisor_ack BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. WORKER ATTENDANCE
CREATE TABLE IF NOT EXISTS worker_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mine_id UUID REFERENCES mines(id),
    date DATE NOT NULL,
    shift VARCHAR(20) CHECK (shift IN ('morning', 'evening', 'night')),
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'on_leave', 'overtime')),
    biometric_timestamp TIMESTAMP WITH TIME ZONE,
    UNIQUE(worker_id, date, shift)
);

-- 12. GRIEVANCES
CREATE TABLE IF NOT EXISTS grievances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mine_id UUID REFERENCES mines(id),
    category VARCHAR(100) NOT NULL CHECK (category IN ('safety_equipment', 'working_conditions', 'wages_overtime', 'medical_welfare', 'harassment', 'other')),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    sla_hours INT DEFAULT 72,
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. BLOCKCHAIN-LITE AUDIT TRAIL
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(150),
    actor_role VARCHAR(50),
    mine_id UUID REFERENCES mines(id),
    payload JSONB NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL
);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mine_id UUID REFERENCES mines(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'alert' CHECK (type IN ('alert', 'escalation', 'inspection_reminder', 'violation_assigned', 'grievance_update')),
    is_read BOOLEAN DEFAULT FALSE,
    link_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
