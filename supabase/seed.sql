-- Entirely synthetic demo data. Run AFTER 0001_init.sql. Marks the ward demoData=true.
insert into public.hospitals (id, name) values ('11111111-1111-1111-1111-111111111111', 'Demo General Hospital');
insert into public.wards (id, hospital_id, name, configuration) values (
  '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Ward 4B — Medical',
  '{
    "version": 1, "demoData": true,
    "workload": {"admissionWeight": 3, "dischargeWeight": 3, "preOpWeight": 2, "transferWeight": 2},
    "capacity": {"junior": 32, "staff": 42, "senior": 48},
    "maxPatients": {"junior": 5, "staff": 6, "senior": 6},
    "fatigue": {"consecutiveShiftThreshold": 3, "fatigueMultiplier": 0.85},
    "utilization": {"greenThreshold": 0.75, "amberThreshold": 1.0},
    "safety": {"requireIsolationCompetency": true, "isolationCompetencyCode": "ISO", "juniorHighAcuityRequiresAuth": true},
    "descriptors": {
      "s": {"1": "Stable, routine observation (institution-defined)", "2": "Mostly stable, periodic reassessment", "3": "Unstable risk, frequent reassessment", "4": "Unstable, continuous close observation"},
      "m": {"1": "Oral/simple meds", "2": "Multiple scheduled meds", "3": "Complex schedules or titration", "4": "High-risk IV/infusion regimen"},
      "v": {"1": "Routine vitals", "2": "4-hourly vitals", "3": "1–2 hourly vitals", "4": "Continuous monitoring"},
      "d": {"1": "Independent", "2": "Partial assist", "3": "Full assist, two-person tasks", "4": "Total care, immobile"}
    }
  }');

insert into public.nurses (id, ward_id, name, tier, base_cap, max_patients, consecutive_shifts, availability_status) values
  ('33333333-3333-3333-3333-333333333301','22222222-2222-2222-2222-222222222222','Aisha Bello','junior',32,5,1,'available'),
  ('33333333-3333-3333-3333-333333333302','22222222-2222-2222-2222-222222222222','Tomasz Nowak','junior',32,5,4,'available'),
  ('33333333-3333-3333-3333-333333333303','22222222-2222-2222-2222-222222222222','Grace Okafor','staff',42,6,3,'available'),
  ('33333333-3333-3333-3333-333333333304','22222222-2222-2222-2222-222222222222','Daniel Reyes','staff',42,6,1,'available'),
  ('33333333-3333-3333-3333-333333333305','22222222-2222-2222-2222-222222222222','Mei Lin','senior',48,6,2,'available'),
  ('33333333-3333-3333-3333-333333333306','22222222-2222-2222-2222-222222222222','Sara Haddad','senior',48,6,0,'on_leave');

insert into public.nurse_competencies (nurse_id, competency_code, proficiency_level, verification_status, verified_at, expires_at) values
  ('33333333-3333-3333-3333-333333333301','MED','intermediate','verified',now(),null),
  ('33333333-3333-3333-3333-333333333301','IV','basic','verified',now(),null),
  ('33333333-3333-3333-3333-333333333302','MED','basic','verified',now(),null),
  ('33333333-3333-3333-3333-333333333302','IV','basic','verified',now(),'2026-01-01T00:00:00Z'),
  ('33333333-3333-3333-3333-333333333303','MED','advanced','verified',now(),null),
  ('33333333-3333-3333-3333-333333333303','IV','advanced','verified',now(),null),
  ('33333333-3333-3333-3333-333333333303','POSTOP','intermediate','verified',now(),null),
  ('33333333-3333-3333-3333-333333333303','ISO','intermediate','verified',now(),null),
  ('33333333-3333-3333-3333-333333333304','MED','advanced','verified',now(),null),
  ('33333333-3333-3333-3333-333333333304','IV','intermediate','verified',now(),null),
  ('33333333-3333-3333-3333-333333333304','MON','intermediate','verified',now(),null),
  ('33333333-3333-3333-3333-333333333305','MED','advanced','verified',now(),null),
  ('33333333-3333-3333-3333-333333333305','IV','advanced','verified',now(),null),
  ('33333333-3333-3333-3333-333333333305','CRIT','advanced','verified',now(),null),
  ('33333333-3333-3333-3333-333333333305','MON','advanced','verified',now(),null),
  ('33333333-3333-3333-3333-333333333305','POSTOP','advanced','verified',now(),null),
  ('33333333-3333-3333-3333-333333333305','ISO','advanced','verified',now(),null),
  ('33333333-3333-3333-3333-333333333306','MED','advanced','verified',now(),null),
  ('33333333-3333-3333-3333-333333333306','CRIT','advanced','verified',now(),null);

insert into public.patients (id, ward_id, bed_no, clinical_context, s, m, v, d, admission, discharge, pre_op, transfer, is_isolated) values
  ('44444444-4444-4444-4444-444444444401','22222222-2222-2222-2222-222222222222','101','Synthetic: post-admission, complex IV regimen',3,4,3,2,true,false,true,true,false),
  ('44444444-4444-4444-4444-444444444402','22222222-2222-2222-2222-222222222222','102','Synthetic: unstable, continuous monitoring',4,3,4,3,false,false,false,false,false),
  ('44444444-4444-4444-4444-444444444403','22222222-2222-2222-2222-222222222222','103','Synthetic: routine recovery',2,2,2,2,false,false,false,false,false),
  ('44444444-4444-4444-4444-444444444404','22222222-2222-2222-2222-222222222222','104','Synthetic: independent, oral meds',1,1,1,1,false,false,false,false,false),
  ('44444444-4444-4444-4444-444444444405','22222222-2222-2222-2222-222222222222','105','Synthetic: discharge planning',3,3,3,3,false,true,false,false,false),
  ('44444444-4444-4444-4444-444444444406','22222222-2222-2222-2222-222222222222','106','Synthetic: pre-op preparation',2,3,2,2,false,false,true,false,false),
  ('44444444-4444-4444-4444-444444444407','22222222-2222-2222-2222-222222222222','107','Synthetic: high acuity transfer-in',4,4,4,4,false,false,false,true,false),
  ('44444444-4444-4444-4444-444444444408','22222222-2222-2222-2222-222222222222','108','Synthetic: isolation precautions',2,2,3,2,false,false,false,false,true),
  ('44444444-4444-4444-4444-444444444409','22222222-2222-2222-2222-222222222222','109','Synthetic: new admission, low acuity',1,2,1,1,true,false,false,false,false),
  ('44444444-4444-4444-4444-444444444410','22222222-2222-2222-2222-222222222222','110','Synthetic: mobility assist',3,2,2,3,false,false,false,false,false),
  ('44444444-4444-4444-4444-444444444411','22222222-2222-2222-2222-222222222222','111','Synthetic: discharge + transfer',2,1,2,1,false,true,false,true,false),
  ('44444444-4444-4444-4444-444444444412','22222222-2222-2222-2222-222222222222','112','Synthetic: routine observation',1,1,2,1,false,false,false,false,false);

insert into public.patient_requirements (patient_id, competency_code, required_level, is_mandatory) values
  ('44444444-4444-4444-4444-444444444401','MED','advanced',true),
  ('44444444-4444-4444-4444-444444444402','CRIT','advanced',true),
  ('44444444-4444-4444-4444-444444444407','CRIT','advanced',true),
  ('44444444-4444-4444-4444-444444444407','MED','advanced',true),
  ('44444444-4444-4444-4444-444444444408','ISO','basic',true),
  ('44444444-4444-4444-4444-444444444406','POSTOP','basic',false);

insert into public.shifts (id, ward_id, shift_name, start_time, end_time, status) values
  ('55555555-5555-5555-5555-555555555501','22222222-2222-2222-2222-222222222222','Day 07:00–15:00', now() - interval '2 hours', now() + interval '6 hours', 'active'),
  ('55555555-5555-5555-5555-555555555502','22222222-2222-2222-2222-222222222222','Day 07:00–15:00 (yesterday)', now() - interval '26 hours', now() - interval '18 hours', 'closed');

-- baseline approved assignments for the active shift (within all limits)
insert into public.assignments (patient_id, nurse_id, shift_id, assignment_status, approved_at) values
  ('44444444-4444-4444-4444-444444444401','33333333-3333-3333-3333-333333333303','55555555-5555-5555-5555-555555555501','approved',now()),
  ('44444444-4444-4444-4444-444444444404','33333333-3333-3333-3333-333333333301','55555555-5555-5555-5555-555555555501','approved',now()),
  ('44444444-4444-4444-4444-444444444409','33333333-3333-3333-3333-333333333301','55555555-5555-5555-5555-555555555501','approved',now());

-- historical (ended) assignments + shift log for analytics demo
insert into public.assignments (patient_id, nurse_id, shift_id, assignment_status, approved_at) values
  ('44444444-4444-4444-4444-444444444402','33333333-3333-3333-3333-333333333305','55555555-5555-5555-5555-555555555502','ended',now() - interval '25 hours'),
  ('44444444-4444-4444-4444-444444444405','33333333-3333-3333-3333-333333333304','55555555-5555-5555-5555-555555555502','ended',now() - interval '25 hours'),
  ('44444444-4444-4444-4444-444444444410','33333333-3333-3333-3333-333333333303','55555555-5555-5555-5555-555555555502','ended',now() - interval '25 hours');
insert into public.shift_logs (shift_id, snapshot, allocation_summary) values
  ('55555555-5555-5555-5555-555555555502',
   '[{"nurse_id":"33333333-3333-3333-3333-333333333301","name":"Aisha Bello","tier":"junior","is_active":true,"assigned_w":18,"patient_count":3,"adjusted_capacity":32,"utilization":0.5625},
     {"nurse_id":"33333333-3333-3333-3333-333333333302","name":"Tomasz Nowak","tier":"junior","is_active":true,"assigned_w":22,"patient_count":4,"adjusted_capacity":27.2,"utilization":0.8088},
     {"nurse_id":"33333333-3333-3333-3333-333333333303","name":"Grace Okafor","tier":"staff","is_active":true,"assigned_w":33,"patient_count":4,"adjusted_capacity":35.7,"utilization":0.9244},
     {"nurse_id":"33333333-3333-3333-3333-333333333304","name":"Daniel Reyes","tier":"staff","is_active":true,"assigned_w":28,"patient_count":4,"adjusted_capacity":42,"utilization":0.6667},
     {"nurse_id":"33333333-3333-3333-3333-333333333305","name":"Mei Lin","tier":"senior","is_active":true,"assigned_w":38,"patient_count":4,"adjusted_capacity":48,"utilization":0.7917},
     {"nurse_id":"33333333-3333-3333-3333-333333333306","name":"Sara Haddad","tier":"senior","is_active":true,"assigned_w":0,"patient_count":0,"adjusted_capacity":48,"utilization":0}]',
   '{"max_u":0.9244,"avg_u":0.6257,"patient_total":12,"assigned":12,"unassigned":0,"alerts_open":1}');

insert into public.safety_alerts (shift_id, patient_id, severity, rule_code, description) values
  ('55555555-5555-5555-5555-555555555501','44444444-4444-4444-4444-444444444408','WARNING','ISOLATION_POLICY',
   'Isolated patient in bed 108 awaits assignment to an ISO-verified nurse.');

-- Bootstrap: sign up your first user in the app, then promote it:
-- update public.profiles set role = 'admin' where id = '<your-auth-user-uuid>';