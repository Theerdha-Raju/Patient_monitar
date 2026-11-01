/**
 * Mock data generator — simulates realistic ESP32 telemetry including
 * occasional fever and low-SpO2 events.
 */

let step = 0;
const patients = [
  { patient_id: 'PATIENT-001', device_id: 'ESP32-001', base: { spo2: 97.5, hr: 76, temp: 36.8 } },
  { patient_id: 'P001', device_id: 'esp32-01', base: { spo2: 97.5, hr: 76, temp: 36.8 } },
  { patient_id: 'P002', device_id: 'esp32-02', base: { spo2: 98.2, hr: 72, temp: 36.6 } },
  { patient_id: 'P003', device_id: 'esp32-03', base: { spo2: 93.5, hr: 96, temp: 37.8 } },
  { patient_id: 'P004', device_id: 'esp32-04', base: { spo2: 98.8, hr: 68, temp: 36.7 } },
];

// Running event state for each patient (to model degradation episodes)
const events = {};
patients.forEach(p => { events[p.patient_id] = { type: 'normal', ttl: 0 }; });

function noisy(val, sigma) {
  // Box-Muller Gaussian
  const u1 = Math.random(), u2 = Math.random();
  const z  = Math.sqrt(-2 * Math.log(u1 + 1e-9)) * Math.cos(2 * Math.PI * u2);
  return Math.round((val + z * sigma) * 10) / 10;
}

function generateReading(patient) {
  step++;
  const { patient_id, device_id, base } = patient;
  const ev = events[patient_id];

  // Randomly trigger events with low probability
  if (ev.ttl <= 0) {
    const r = Math.random();
    if (r < 0.04)       ev.type = 'hypoxia',      ev.ttl = 8;
    else if (r < 0.07)  ev.type = 'fever',         ev.ttl = 10;
    else if (r < 0.09)  ev.type = 'tachycardia',   ev.ttl = 6;
    else                ev.type = 'normal',         ev.ttl = 15;
  }
  ev.ttl--;

  let spo2, hr, temp;
  switch (ev.type) {
    case 'hypoxia':
      spo2 = noisy(Math.max(87, 91 + Math.sin(step * 0.3) * 3), 0.4);
      hr   = Math.round(noisy(105 + (100 - spo2) * 1.5, 3));
      temp = noisy(37.5 + Math.cos(step * 0.2) * 0.2, 0.05);
      break;
    case 'fever':
      temp = noisy(38.8 + Math.sin(step * 0.2) * 0.3, 0.05);
      hr   = Math.round(noisy(108 + Math.cos(step * 0.3) * 5, 3));
      spo2 = noisy(94.2, 0.3);
      break;
    case 'tachycardia':
      hr   = Math.round(noisy(130 + Math.sin(step * 0.4) * 8, 4));
      temp = noisy(37.3, 0.1);
      spo2 = noisy(95.5, 0.4);
      break;
    default:
      spo2 = noisy(Math.min(100, base.spo2 + Math.cos(step * 0.25) * 1.2), 0.3);
      hr   = Math.round(noisy(base.hr + Math.sin(step * 0.3) * 5, 2));
      temp = noisy(base.temp + Math.sin(step * 0.2) * 0.3, 0.05);
  }

  // Clamp to realistic ranges
  spo2 = Math.min(100, Math.max(70,  Math.round(spo2 * 10) / 10));
  hr   = Math.min(220, Math.max(30,  hr));
  temp = Math.min(42,  Math.max(34,  Math.round(temp * 100) / 100));

  return {
    patient_id,
    device_id,
    spo2,
    heart_rate: hr,
    temperature: temp,
    timestamp:   new Date().toISOString(),
    _mock_scenario: ev.type,
  };
}

export function generateMockReadingsForAllPatients() {
  return patients.map(generateReading);
}

export function generateMockReading(patientId = 'P001') {
  const p = patients.find(p => p.patient_id === patientId) || patients[0];
  return generateReading(p);
}

export const MOCK_PATIENTS = patients.map(p => ({
  patient_id: p.patient_id,
  name: {
    'PATIENT-001': 'Demonstration Subject (Ward 101)',
    'P001': 'John Doe (Hospital Ward 101)',
    'P002': 'Elena Rostova',
    'P003': 'Marcus Vance',
    'P004': 'Aisha Sharma'
  }[p.patient_id] || p.patient_id,
  room_number: `Isolation Ward ${p.patient_id.replace(/\D/g, '') || '101'}`,
  age:    { 'PATIENT-001': 45, P001: 45, P002: 38, P003: 68, P004: 29 }[p.patient_id] || 45,
  gender: { 'PATIENT-001': 'Male', P001: 'Male', P002: 'Female', P003: 'Male', P004: 'Female' }[p.patient_id] || 'Unspecified',
  status: 'Active Monitoring',
  admission_date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
  quarantine_start_date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
  latest_reading: null,
  vitals_status: null,
}));
