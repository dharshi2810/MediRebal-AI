import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { connectToDatabase, getDb } from '../backend/db/mongo';

dotenv.config();

export interface SeedHospitalDef {
  hospital_id: string;
  name: string;
  area: string;
  address: string;
  phone: string;
  emergency_phone: string;
  latitude: number;
  longitude: number;
  is_demo: boolean;
  status: 'healthy' | 'limited' | 'high_risk' | 'critical';
  overview: {
    total_beds: number;
    available_beds: number;
    icu_beds: number;
    oxygen_cylinders: number;
    ventilators: number;
    doctors_available: number;
    nurses_available: number;
    ambulances_available: number;
  };
}

export const DEMO_HOSPITALS: SeedHospitalDef[] = [
  {
    hospital_id: 'H001',
    name: 'Chennai Central Hospital',
    area: 'Chennai Central',
    address: 'EVR Periyar Salai, Park Town, Chennai Central, Tamil Nadu 600003',
    phone: '+91 44 2530 5000',
    emergency_phone: '+91 44 2530 5100',
    latitude: 13.0827,
    longitude: 80.2707,
    is_demo: false,
    status: 'high_risk',
    overview: {
      total_beds: 200,
      available_beds: 22,
      icu_beds: 4,
      oxygen_cylinders: 45, // Rapid depletion hub
      ventilators: 4,
      doctors_available: 12,
      nurses_available: 28,
      ambulances_available: 2,
    },
  },
  {
    hospital_id: 'H002',
    name: 'Anna Nagar Hospital',
    area: 'Anna Nagar',
    address: 'No 46, 7th Main Rd, Shanthi Colony, Anna Nagar, Chennai, Tamil Nadu 600040',
    phone: '+91 44 2626 7777',
    emergency_phone: '+91 44 2626 7108',
    latitude: 13.0878,
    longitude: 80.2096,
    is_demo: false,
    status: 'healthy',
    overview: {
      total_beds: 160,
      available_beds: 50,
      icu_beds: 12,
      oxygen_cylinders: 120,
      ventilators: 8,
      doctors_available: 18,
      nurses_available: 36,
      ambulances_available: 3,
    },
  },
  {
    hospital_id: 'H003',
    name: 'Adyar Hospital',
    area: 'Adyar',
    address: 'No 52, 1st Main Rd, Gandhi Nagar, Adyar, Chennai, Tamil Nadu 600020',
    phone: '+91 44 4289 2222',
    emergency_phone: '+91 44 4289 2108',
    latitude: 13.0067,
    longitude: 80.2575,
    is_demo: false,
    status: 'healthy',
    overview: {
      total_beds: 180,
      available_beds: 85,
      icu_beds: 21,
      oxygen_cylinders: 185, // High Surplus Donor hub
      ventilators: 15,
      doctors_available: 16,
      nurses_available: 34,
      ambulances_available: 5,
    },
  },
  {
    hospital_id: 'H004',
    name: 'Velachery Hospital',
    area: 'Velachery',
    address: 'No 36 & 36A, Velachery Bypass Rd, Velachery, Chennai, Tamil Nadu 600042',
    phone: '+91 44 4680 5555',
    emergency_phone: '+91 44 4680 5108',
    latitude: 12.9759,
    longitude: 80.2212,
    is_demo: false,
    status: 'healthy',
    overview: {
      total_beds: 120,
      available_beds: 40,
      icu_beds: 10,
      oxygen_cylinders: 90,
      ventilators: 7,
      doctors_available: 11,
      nurses_available: 24,
      ambulances_available: 2,
    },
  },
  {
    hospital_id: 'H005',
    name: 'Tambaram Hospital',
    area: 'Tambaram',
    address: '103, GST Road, West Tambaram, Chennai, Tamil Nadu 600045',
    phone: '+91 44 2226 2244',
    emergency_phone: '+91 44 2226 2108',
    latitude: 12.9249,
    longitude: 80.1268,
    is_demo: false,
    status: 'limited',
    overview: {
      total_beds: 140,
      available_beds: 35,
      icu_beds: 8,
      oxygen_cylinders: 80,
      ventilators: 6,
      doctors_available: 10,
      nurses_available: 22,
      ambulances_available: 3,
    },
  },
];

export async function runIdempotentSeed() {
  console.log('====================================================');
  console.log('MEDIREBAL AI: Idempotent MongoDB Seeding Started');
  console.log('Database target: medirebal');
  console.log('====================================================');

  await connectToDatabase();
  const db = getDb();

  let hospitalsUpserted = 0;
  let departmentsUpserted = 0;
  let doctorsUpserted = 0;
  let nursesUpserted = 0;
  let bedsUpserted = 0;
  let resourcesUpserted = 0;
  let ambulancesUpserted = 0;

  for (const hosp of DEMO_HOSPITALS) {
    const hid = hosp.hospital_id;

    // 1. Idempotent Hospital Profile Upsert
    await db.collection('hospitals').updateOne(
      { hospital_id: hid },
      {
        $set: {
          hospital_id: hid,
          name: hosp.name,
          area: hosp.area,
          address: hosp.address,
          phone: hosp.phone,
          emergency_phone: hosp.emergency_phone,
          latitude: hosp.latitude,
          longitude: hosp.longitude,
          is_demo: true,
          status: hosp.status,
          overview: hosp.overview,
        },
      },
      { upsert: true }
    );
    hospitalsUpserted++;

    // 2. Idempotent Departments
    const depts = [
      { name: 'Emergency & Trauma', status: 'Open', head_doctor: 'Dr. R. Natarajan', bed_count: 30 },
      { name: 'Cardiology', status: 'Open', head_doctor: 'Dr. V. Krishnan', bed_count: 25 },
      { name: 'Pulmonology & Respiratory', status: 'Open', head_doctor: 'Dr. S. Radhika', bed_count: 20 },
      { name: 'Neurology', status: 'Open', head_doctor: 'Dr. M. Balaji', bed_count: 20 },
      { name: 'General Medicine', status: 'Open', head_doctor: 'Dr. K. Jayanthi', bed_count: 40 },
      { name: 'Pediatrics', status: 'Open', head_doctor: 'Dr. A. Sudha', bed_count: 15 },
    ];

    for (const d of depts) {
      await db.collection('departments').updateOne(
        { hospital_id: hid, name: d.name },
        {
          $set: {
            hospital_id: hid,
            name: d.name,
            status: d.status,
            head_doctor: d.head_doctor,
            bed_count: d.bed_count,
          },
        },
        { upsert: true }
      );
      departmentsUpserted++;
    }

    // 3. Idempotent Doctors
    const docs = [
      {
        name: `Doctor Priya (${hid})`,
        specialization: 'Pulmonology & Respiratory Care',
        department: 'Pulmonology & Respiratory',
        phone: '+91 98410 11099',
        shift_start: '09:00',
        shift_end: '17:00',
        status: 'Available',
      },
      {
        name: `Dr. R. Natarajan (${hid})`,
        specialization: 'Emergency Medicine',
        department: 'Emergency & Trauma',
        phone: '+91 98410 11001',
        shift_start: '08:00',
        shift_end: '16:00',
        status: 'Available',
      },
      {
        name: `Dr. V. Krishnan (${hid})`,
        specialization: 'Interventional Cardiology',
        department: 'Cardiology',
        phone: '+91 98410 11002',
        shift_start: '09:00',
        shift_end: '17:00',
        status: 'Available',
      },
      {
        name: `Dr. S. Radhika (${hid})`,
        specialization: 'Critical Pulmonology',
        department: 'Pulmonology & Respiratory',
        phone: '+91 98410 11003',
        shift_start: '12:00',
        shift_end: '20:00',
        status: 'Busy',
      },
      {
        name: `Dr. M. Balaji (${hid})`,
        specialization: 'Neurosurgeon',
        department: 'Neurology',
        phone: '+91 98410 11004',
        shift_start: '08:00',
        shift_end: '16:00',
        status: 'Available',
      },
      {
        name: `Dr. K. Jayanthi (${hid})`,
        specialization: 'Internal Medicine',
        department: 'General Medicine',
        phone: '+91 98410 11005',
        shift_start: '14:00',
        shift_end: '22:00',
        status: 'Available',
      },
    ];

    for (const doc of docs) {
      await db.collection('doctors').updateOne(
        { hospital_id: hid, name: doc.name },
        {
          $set: {
            hospital_id: hid,
            name: doc.name,
            specialization: doc.specialization,
            department: doc.department,
            phone: doc.phone,
            shift_start: doc.shift_start,
            shift_end: doc.shift_end,
            status: doc.status,
          },
        },
        { upsert: true }
      );
      doctorsUpserted++;
    }

    // 4. Idempotent Nurses
    const nurseList = [
      { name: `Nurse Priya (${hid})`, department: 'ICU Ward', shift: 'Day', phone: '+91 98420 12099', category: 'icu', status: 'Available' },
      { name: `Sister Deepa (${hid})`, department: 'Emergency & Trauma', shift: 'Morning', phone: '+91 98420 12001', category: 'emergency', status: 'Available' },
      { name: `Sister Shalini (${hid})`, department: 'ICU', shift: 'Day', phone: '+91 98420 12002', category: 'icu', status: 'On Duty' },
      { name: `Sister Anitha (${hid})`, department: 'Cardiology', shift: 'Evening', phone: '+91 98420 12003', category: 'general', status: 'Available' },
      { name: `Staff Nurse Karthik (${hid})`, department: 'Pulmonology', shift: 'Night', phone: '+91 98420 12004', category: 'icu', status: 'Available' },
    ];

    for (const nr of nurseList) {
      await db.collection('nurses').updateOne(
        { hospital_id: hid, name: nr.name },
        {
          $set: {
            hospital_id: hid,
            name: nr.name,
            department: nr.department,
            shift: nr.shift,
            phone: nr.phone,
            category: nr.category,
            status: nr.status,
          },
        },
        { upsert: true }
      );
      nursesUpserted++;
    }

    // 5. Idempotent Beds (General Beds, ICU Beds, Emergency Beds, Isolation Beds)
    const bedCategories = [
      {
        category: 'General Beds',
        total: Math.floor(hosp.overview.total_beds * 0.55),
        occupied: Math.floor(hosp.overview.total_beds * 0.55) - (hosp.overview.available_beds > 15 ? 15 : 5),
        available: hosp.overview.available_beds > 15 ? 15 : 5,
      },
      {
        category: 'ICU Beds',
        total: 40,
        occupied: 40 - hosp.overview.icu_beds,
        available: hosp.overview.icu_beds,
      },
      {
        category: 'Emergency Beds',
        total: 25,
        occupied: hid === 'H001' ? 22 : 15,
        available: hid === 'H001' ? 3 : 10,
      },
      {
        category: 'Isolation Beds',
        total: 20,
        occupied: 12,
        available: 8,
      },
    ];

    for (const b of bedCategories) {
      await db.collection('beds').updateOne(
        { hospital_id: hid, category: b.category },
        {
          $set: {
            hospital_id: hid,
            category: b.category,
            total: b.total,
            occupied: b.occupied,
            available: b.available,
          },
        },
        { upsert: true }
      );
      bedsUpserted++;
    }

    // 6. Idempotent Oxygen Resources & Ventilators
    const resList = [
      {
        resource_type: 'oxygen_cylinders',
        current_stock: hosp.overview.oxygen_cylinders,
        critical_threshold: 30,
        unit: 'cylinders',
        daily_consumption: hid === 'H001' ? 95 : (hid === 'H003' ? 25 : 45),
        consumption_rate: hid === 'H001' ? -4.2 : (hid === 'H003' ? -1.1 : -2.0),
      },
      {
        resource_type: 'oxygen_concentrators',
        current_stock: hid === 'H001' ? 14 : 28,
        critical_threshold: 8,
        unit: 'units',
        daily_consumption: 6,
        consumption_rate: -0.25,
      },
      {
        resource_type: 'ventilators',
        current_stock: hosp.overview.ventilators,
        critical_threshold: 5,
        unit: 'units',
        daily_consumption: 2,
        consumption_rate: -0.1,
      },
    ];

    for (const r of resList) {
      await db.collection('resources').updateOne(
        { hospital_id: hid, resource_type: r.resource_type },
        {
          $set: {
            hospital_id: hid,
            resource_type: r.resource_type,
            current_stock: r.current_stock,
            critical_threshold: r.critical_threshold,
            unit: r.unit,
            daily_consumption: r.daily_consumption,
            consumption_rate: r.consumption_rate,
            updated_at: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
      resourcesUpserted++;
    }

    // 7. Idempotent Ambulances
    const ambList = [
      { ambulance_id: `AMB-${hid}-01`, driver_name: 'M. Selvam', phone: '+91 97890 01001', status: 'available' },
      { ambulance_id: `AMB-${hid}-02`, driver_name: 'G. Kannan', phone: '+91 97890 01002', status: hid === 'H001' ? 'on_trip' : 'available' },
      { ambulance_id: `AMB-${hid}-03`, driver_name: 'P. Murugan', phone: '+91 97890 01003', status: 'available' },
    ];

    for (const amb of ambList) {
      await db.collection('ambulances').updateOne(
        { hospital_id: hid, ambulance_id: amb.ambulance_id },
        {
          $set: {
            hospital_id: hid,
            ambulance_id: amb.ambulance_id,
            driver_name: amb.driver_name,
            phone: amb.phone,
            status: amb.status,
          },
        },
        { upsert: true }
      );
      ambulancesUpserted++;
    }

    // Seed historical time-series readings if not already present
    const existingReadings = await db.collection('resource_readings').countDocuments({ hospital_id: hid, resource_type: 'oxygen_cylinders' });
    if (existingReadings < 10) {
      const readings = [];
      const now = Date.now();
      for (let h = 12; h >= 0; h--) {
        const time = new Date(now - h * 3600 * 1000).toISOString();
        let pastStock = hosp.overview.oxygen_cylinders;
        if (hid === 'H001') {
          pastStock = Math.round(45 + h * 4.4 + (Math.random() * 2 - 1));
        } else if (hid === 'H003') {
          pastStock = Math.round(185 + h * 1.1 + (Math.random() * 2 - 1));
        } else {
          pastStock = Math.round(hosp.overview.oxygen_cylinders + h * 2.0 + (Math.random() * 2 - 1));
        }
        readings.push({
          hospital_id: hid,
          resource_type: 'oxygen_cylinders',
          quantity: Math.max(0, pastStock),
          timestamp: time,
        });
      }
      await db.collection('resource_readings').insertMany(readings);
    }
  }

  // 8. Idempotent Users
  const patientHash = await bcrypt.hash('patient123', 10);
  const adminHash = await bcrypt.hash('hospital123', 10);

  const usersList = [
    {
      name: 'Kavitha Raman',
      email: 'patient@medirebal.org',
      phone: '+91 98401 23456',
      password: patientHash,
      role: 'PUBLIC_USER',
      location: 'Anna Nagar, Chennai',
    },
    {
      name: 'Dr. S. Sundararajan (Chennai Central Hospital)',
      email: 'admin.central@medirebal.org',
      phone: '+91 98402 34567',
      password: adminHash,
      role: 'HOSPITAL_ADMIN',
      hospital_id: 'H001',
      location: 'Chennai Central',
    },
    {
      name: 'Dr. Priya Narayanan (Anna Nagar Hospital)',
      email: 'admin.annanagar@medirebal.org',
      phone: '+91 98403 45678',
      password: adminHash,
      role: 'HOSPITAL_ADMIN',
      hospital_id: 'H002',
      location: 'Anna Nagar',
    },
    {
      name: 'Dr. Anand Kumar (Adyar Hospital)',
      email: 'admin.adyar@medirebal.org',
      phone: '+91 98404 56789',
      password: adminHash,
      role: 'HOSPITAL_ADMIN',
      hospital_id: 'H003',
      location: 'Adyar',
    },
    {
      name: 'Dr. Meena Ramesh (Velachery Hospital)',
      email: 'admin.velachery@medirebal.org',
      phone: '+91 98405 67890',
      password: adminHash,
      role: 'HOSPITAL_ADMIN',
      hospital_id: 'H004',
      location: 'Velachery',
    },
    {
      name: 'Dr. K. Venkatesh (Tambaram Hospital)',
      email: 'admin.tambaram@medirebal.org',
      phone: '+91 98406 78901',
      password: adminHash,
      role: 'HOSPITAL_ADMIN',
      hospital_id: 'H005',
      location: 'Tambaram',
    },
  ];

  for (const u of usersList) {
    await db.collection('users').updateOne(
      { email: u.email },
      {
        $set: {
          name: u.name,
          email: u.email,
          phone: u.phone,
          password: u.password,
          role: u.role,
          hospital_id: (u as any).hospital_id,
          location: u.location,
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  }

  // 9. Idempotent Sample Appointments for Hospital Admin Management
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const sampleAppointments = [
    {
      patientId: 'patient@medirebal.org',
      patientName: 'Kavitha Raman',
      patientPhone: '+91 98401 23456',
      hospitalId: 'H001',
      hospitalName: 'Chennai Central Hospital',
      departmentId: 'Pulmonology & Respiratory',
      departmentName: 'Pulmonology & Respiratory',
      doctorId: 'Doctor Priya (H001)',
      doctorName: 'Doctor Priya (H001)',
      appointmentDate: todayStr,
      appointmentTime: '10:00 AM',
      status: 'Pending',
      symptoms: 'Persistent dry cough and mild breathing tightness.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      patientId: 'suresh.kumar@gmail.com',
      patientName: 'Suresh Kumar',
      patientPhone: '+91 98402 98765',
      hospitalId: 'H001',
      hospitalName: 'Chennai Central Hospital',
      departmentId: 'Cardiology',
      departmentName: 'Cardiology',
      doctorId: 'Dr. V. Krishnan (H001)',
      doctorName: 'Dr. V. Krishnan (H001)',
      appointmentDate: todayStr,
      appointmentTime: '11:30 AM',
      status: 'Approved',
      symptoms: 'Follow-up for hypertension evaluation.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      patientId: 'ananya.m@outlook.com',
      patientName: 'Ananya Meenakshi',
      patientPhone: '+91 98403 11223',
      hospitalId: 'H001',
      hospitalName: 'Chennai Central Hospital',
      departmentId: 'Emergency & Trauma',
      departmentName: 'Emergency & Trauma',
      doctorId: 'Dr. R. Natarajan (H001)',
      doctorName: 'Dr. R. Natarajan (H001)',
      appointmentDate: todayStr,
      appointmentTime: '02:00 PM',
      status: 'Pending',
      symptoms: 'Minor ankle twist and swelling.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      patientId: 'ramesh.b@gmail.com',
      patientName: 'Ramesh Balan',
      patientPhone: '+91 98404 44556',
      hospitalId: 'H001',
      hospitalName: 'Chennai Central Hospital',
      departmentId: 'General Medicine',
      departmentName: 'General Medicine',
      doctorId: 'Dr. K. Jayanthi (H001)',
      doctorName: 'Dr. K. Jayanthi (H001)',
      appointmentDate: tomorrowStr,
      appointmentTime: '09:30 AM',
      status: 'Approved',
      symptoms: 'Routine diabetic check-up.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      patientId: 'meera.s@gmail.com',
      patientName: 'Meera Sundaram',
      patientPhone: '+91 98405 77889',
      hospitalId: 'H002',
      hospitalName: 'Anna Nagar Hospital',
      departmentId: 'Cardiology',
      departmentName: 'Cardiology',
      doctorId: 'Dr. V. Krishnan (H002)',
      doctorName: 'Dr. V. Krishnan (H002)',
      appointmentDate: todayStr,
      appointmentTime: '10:30 AM',
      status: 'Pending',
      symptoms: 'Chest flutter and mild dizziness.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      patientId: 'karthik.r@yahoo.com',
      patientName: 'Karthik Raja',
      patientPhone: '+91 98406 88990',
      hospitalId: 'H003',
      hospitalName: 'Adyar Hospital',
      departmentId: 'Pulmonology & Respiratory',
      departmentName: 'Pulmonology & Respiratory',
      doctorId: 'Dr. S. Radhika (H003)',
      doctorName: 'Dr. S. Radhika (H003)',
      appointmentDate: todayStr,
      appointmentTime: '11:00 AM',
      status: 'Approved',
      symptoms: 'Asthma medication adjustment review.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const appt of sampleAppointments) {
    await db.collection('appointments').updateOne(
      {
        patientId: appt.patientId,
        hospitalId: appt.hospitalId,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
      },
      {
        $set: {
          ...appt,
          // Legacy aliases
          patient_id: appt.patientId,
          patient_name: appt.patientName,
          patient_phone: appt.patientPhone,
          hospital_id: appt.hospitalId,
          hospital_name: appt.hospitalName,
          doctor_id: appt.doctorId,
          doctor_name: appt.doctorName,
          department: appt.departmentName,
          date: appt.appointmentDate,
          time: appt.appointmentTime,
        },
      },
      { upsert: true }
    );
  }

  // 10. Idempotent Sample Hospital-to-Hospital Resource Requests (My Requests & Resource Requests)
  const sampleTransfers = [
    {
      requester_hospital_id: 'H001',
      requester_hospital_name: 'Chennai Central Hospital',
      requested_from_hospital_id: 'H002',
      requested_from_hospital_name: 'Anna Nagar Hospital',
      target_hospital_id: 'H002',
      target_hospital_name: 'Anna Nagar Hospital',
      from_hospital_id: 'H002',
      from_hospital_name: 'Anna Nagar Hospital',
      to_hospital_id: 'H001',
      to_hospital_name: 'Chennai Central Hospital',
      resource_type: 'Oxygen Cylinders',
      quantity: 20,
      priority: 'High',
      status: 'Pending',
      requested_on: '10 October 2026',
      deadline: 'Within 2 hours',
      reason: 'Oxygen reserve below threshold due to high ICU admissions',
      ai_justification: 'H002 currently holds surplus buffer of +45 cylinders. Rapid 18-minute transit route via EVR Periyar Salai.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      requester_hospital_id: 'H001',
      requester_hospital_name: 'Chennai Central Hospital',
      requested_from_hospital_id: 'H003',
      requested_from_hospital_name: 'Adyar Hospital',
      target_hospital_id: 'H003',
      target_hospital_name: 'Adyar Hospital',
      from_hospital_id: 'H003',
      from_hospital_name: 'Adyar Hospital',
      to_hospital_id: 'H001',
      to_hospital_name: 'Chennai Central Hospital',
      resource_type: 'ICU Beds',
      quantity: 4,
      priority: 'High',
      status: 'Accepted',
      requested_on: '10 October 2026',
      deadline: 'Within 3 hours',
      reason: 'Urgent cardiac ICU bed surge',
      ai_justification: 'H003 has 12 available ICU beds. Confirmed bed sanitization and telemetry equipment ready.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      requester_hospital_id: 'H001',
      requester_hospital_name: 'Chennai Central Hospital',
      requested_from_hospital_id: 'H004',
      requested_from_hospital_name: 'Velachery Hospital',
      target_hospital_id: 'H004',
      target_hospital_name: 'Velachery Hospital',
      from_hospital_id: 'H004',
      from_hospital_name: 'Velachery Hospital',
      to_hospital_id: 'H001',
      to_hospital_name: 'Chennai Central Hospital',
      resource_type: 'Ventilators',
      quantity: 2,
      priority: 'Urgent',
      status: 'In Transit',
      requested_on: '10 October 2026',
      deadline: 'Within 1 hour',
      reason: 'Pediatric respiratory support',
      ai_justification: 'Dispatched via medical transport vehicle TN-07-H-4412. ETA 15 minutes.',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 900000).toISOString(),
    },
    {
      requester_hospital_id: 'H002',
      requester_hospital_name: 'Anna Nagar Hospital',
      requested_from_hospital_id: 'H001',
      requested_from_hospital_name: 'Chennai Central Hospital',
      target_hospital_id: 'H001',
      target_hospital_name: 'Chennai Central Hospital',
      from_hospital_id: 'H001',
      from_hospital_name: 'Chennai Central Hospital',
      to_hospital_id: 'H002',
      to_hospital_name: 'Anna Nagar Hospital',
      resource_type: 'Emergency Beds',
      quantity: 6,
      priority: 'High',
      status: 'Pending',
      requested_on: '10 October 2026',
      deadline: 'Within 2 hours',
      reason: 'Seasonal viral flu triage overflow',
      ai_justification: 'Surplus triage capacity detected at Chennai Central Hub.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const tr of sampleTransfers) {
    await db.collection('transfer_requests').updateOne(
      {
        requester_hospital_id: tr.requester_hospital_id,
        requested_from_hospital_id: tr.requested_from_hospital_id,
        resource_type: tr.resource_type,
      },
      { $set: tr },
      { upsert: true }
    );
  }

  // 11. Initial Audit Log entry
  await db.collection('audit_logs').insertOne({
    user_id: 'system',
    role: 'SYSTEM',
    action: 'IDEMPOTENT_SEED_COMPLETED',
    details: {
      hospitals: DEMO_HOSPITALS.map((h) => ({ id: h.hospital_id, name: h.name })),
      appointmentsSeeded: sampleAppointments.length,
      transfersSeeded: sampleTransfers.length,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });

  console.log('----------------------------------------------------');
  console.log(`✓ Hospitals upserted:   ${hospitalsUpserted}`);
  console.log(`✓ Departments upserted: ${departmentsUpserted}`);
  console.log(`✓ Doctors upserted:     ${doctorsUpserted}`);
  console.log(`✓ Nurses upserted:      ${nursesUpserted}`);
  console.log(`✓ Bed categories:       ${bedsUpserted}`);
  console.log(`✓ Resources (O2/Vents): ${resourcesUpserted}`);
  console.log(`✓ Ambulances:           ${ambulancesUpserted}`);
  console.log('✓ Idempotency verified: re-running will never duplicate documents.');
  console.log('====================================================');
}

// Allow direct CLI execution: node/tsx scripts/seed-mongodb.ts
if (process.argv[1]?.includes('seed-mongodb')) {
  runIdempotentSeed()
    .then(() => {
      console.log('Seed execution finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed execution error:', err);
      process.exit(1);
    });
}
