/**
 * =========================================================================================
 * COVID-19 Quarantine Patient Health Monitor - ESP32 Telemetry Simulator
 * =========================================================================================
 * Simulates multiple ESP32 IoT Nodes in Quarantine Isolation Wards streaming physiological
 * telemetry to the containerized backend and PostgreSQL database.
 * 
 * Usage:
 *   node simulator.js
 *   node simulator.js --patient PAT-101 --interval 2000
 * =========================================================================================
 */

const http = require('http');

// Configuration
const GATEWAY_HOST = process.env.GATEWAY_HOST || 'localhost';
const GATEWAY_PORT = process.env.GATEWAY_PORT || 5000;
const INTERVAL_MS  = parseInt(process.argv.includes('--interval') ? process.argv[process.argv.indexOf('--interval') + 1] : '2500', 10);

console.log('======================================================================');
console.log('  COVID-19 ISOLATION WARD - ESP32 IoT TELEMETRY SIMULATOR             ');
console.log(`  Streaming to Gateway: http://${GATEWAY_HOST}:${GATEWAY_PORT}/api/telemetry `);
console.log(`  Interval: ${INTERVAL_MS} ms                                         `);
console.log('======================================================================\n');

// Simulated Quarantine Patients State
const patients = [
  {
    id: 'PAT-101',
    name: 'Elena Rostova (Ward 301)',
    baseHR: 76,
    baseSpO2: 96.8,
    baseTemp: 37.4,
    baseResp: 18,
    scenario: 'MILD_COVID', // Mild cough & slight fever
    step: 0
  },
  {
    id: 'PAT-102',
    name: 'Marcus Vance (Ward 302 - High Risk)',
    baseHR: 94,
    baseSpO2: 92.5,
    baseTemp: 38.4,
    baseResp: 23,
    scenario: 'HYPOXIA_DROP', // High risk of COVID silent hypoxia drops
    step: 0
  },
  {
    id: 'PAT-103',
    name: 'Aisha Sharma (Ward 303 - Day 11)',
    baseHR: 72,
    baseSpO2: 98.4,
    baseTemp: 36.7,
    baseResp: 16,
    scenario: 'RECOVERING', // Healthy recovery
    step: 0
  }
];

let cycle = 0;

/**
 * Generates realistic physiological data for a patient
 */
function generateVitals(p) {
  p.step++;
  let hr, spo2, temp, resp;

  // Add natural physiological sinus rhythm oscillation
  const osc = Math.sin(p.step * 0.25);
  const noise = (Math.random() - 0.5);

  if (p.scenario === 'HYPOXIA_DROP') {
    // Marcus Vance experiences periodic hypoxia dips (~88% - 93%)
    const hypoxiaDip = Math.sin(p.step * 0.1) * 3.5;
    spo2 = Math.min(94.5, Math.max(87.5, (p.baseSpO2 + hypoxiaDip + noise * 0.8)));
    hr = p.baseHR + (100 - spo2) * 1.5 + (osc * 4); // Heart compensates for low SpO2 with tachycardia
    temp = p.baseTemp + Math.cos(p.step * 0.15) * 0.4;
    resp = p.baseResp + Math.round((95 - spo2) * 0.6);

  } else if (p.scenario === 'MILD_COVID') {
    // Elena Rostova maintains steady vitals with low-grade fever
    spo2 = Math.min(98.5, Math.max(94.5, p.baseSpO2 + (osc * 1.2) + noise * 0.5));
    hr = p.baseHR + (osc * 3.5) + noise * 2;
    temp = p.baseTemp + (Math.sin(p.step * 0.1) * 0.3) + (noise * 0.1);
    resp = p.baseResp + Math.round(noise * 1.5);

  } else {
    // Aisha Sharma is stable in recovery
    spo2 = Math.min(99.5, Math.max(97.0, p.baseSpO2 + (osc * 0.8) + noise * 0.3));
    hr = p.baseHR + (osc * 2.5) + noise * 1.5;
    temp = p.baseTemp + (noise * 0.1);
    resp = p.baseResp;
  }

  return {
    patient_id: p.id,
    heart_rate: parseFloat(hr.toFixed(1)),
    spo2: parseFloat(spo2.toFixed(1)),
    temperature: parseFloat(temp.toFixed(2)),
    respiration_rate: parseFloat(resp.toFixed(1)),
    battery_level: parseFloat((96.0 - (p.step * 0.02)).toFixed(1)),
    motion_detected: Math.random() > 0.85,
    device_id: `ESP32_${p.id}_NODE`
  };
}

/**
 * Sends HTTP POST request containing JSON telemetry
 */
function transmitTelemetry(payload, patientName) {
  const data = JSON.stringify(payload);

  const options = {
    hostname: GATEWAY_HOST,
    port: GATEWAY_PORT,
    path: '/api/telemetry',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    },
    timeout: 3000
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        const alertIndicator = json.alertsTriggered > 0 ? `🚨 [${json.alertsTriggered} ALERT TRIGGERED]` : '✓ [NORMAL]';
        console.log(`[TX #${cycle}] ${payload.patient_id} (${patientName.padEnd(28)}) | SpO2: ${payload.spo2.toFixed(1).padStart(5)}% | HR: ${payload.heart_rate.toFixed(0).padStart(3)} bpm | Temp: ${payload.temperature.toFixed(2)}°C | Resp: ${payload.respiration_rate} rpm -> HTTP ${res.statusCode} ${alertIndicator}`);
      } catch (e) {
        console.log(`[TX #${cycle}] ${payload.patient_id} -> HTTP ${res.statusCode}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[TX Error] Failed to send to ${payload.patient_id}: ${err.message}`);
  });

  req.write(data);
  req.end();
}

// Telemetry Streaming Loop
setInterval(() => {
  cycle++;
  patients.forEach((patient) => {
    const telemetry = generateVitals(patient);
    transmitTelemetry(telemetry, patient.name);
  });
}, INTERVAL_MS);
