/**
 * COVID-19 Patient Health Monitor - Dashboard Client
 * Real-time WebSockets, Chart.js Visualizations, Web Audio Clinical Alarms
 */

// Application State
const state = {
  activePatientId: 'PAT-101',
  patients: [],
  currentVitals: {},
  tempUnit: 'C', // 'C' or 'F'
  audioEnabled: true,
  historyLimit: 30,
  ws: null,
  wsReconnectTimer: null,
  activeAlerts: [],
  ppgAnimFrameId: null
};

// Charts References
let vitalsChartInstance = null;
let tempChartInstance = null;

// Web Audio API Synthesizer Context
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
}

/**
 * Plays a realistic hospital monitor alert chime using Web Audio API synthesis
 */
function playEmergencyChime(isCritical = true) {
  if (!state.audioEnabled) return;
  try {
    initAudioContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    if (isCritical) {
      // Urgent high-frequency medical emergency tone pair (960Hz & 1440Hz)
      osc1.frequency.setValueAtTime(960, now);
      osc2.frequency.setValueAtTime(1440, now);

      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);

      // Repeat second blip for urgent double-tone
      setTimeout(() => {
        if (!state.audioEnabled || !audioCtx) return;
        const now2 = audioCtx.currentTime;
        const o3 = audioCtx.createOscillator();
        const g2 = audioCtx.createGain();
        o3.type = 'sine';
        o3.frequency.setValueAtTime(1440, now2);
        g2.gain.setValueAtTime(0.18, now2);
        g2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.35);
        o3.connect(g2);
        g2.connect(audioCtx.destination);
        o3.start(now2);
        o3.stop(now2 + 0.35);
      }, 180);

    } else {
      // Softer warning tone (720Hz)
      osc1.frequency.setValueAtTime(720, now);
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);
    }
  } catch (err) {
    console.warn('[Audio Alert Notice]:', err.message);
  }
}

// ======================== DOM Elements ======================== //
const elements = {
  connectionStatusPill: document.getElementById('connectionStatusPill'),
  connectionStatusText: document.getElementById('connectionStatusText'),
  audioToggleBtn: document.getElementById('audioToggleBtn'),
  audioIconOn: document.getElementById('audioIconOn'),
  audioIconOff: document.getElementById('audioIconOff'),
  audioStatusText: document.getElementById('audioStatusText'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),

  // Emergency banner
  criticalEmergencyBanner: document.getElementById('criticalEmergencyBanner'),
  emergencyBannerTitle: document.getElementById('emergencyBannerTitle'),
  emergencyBannerDesc: document.getElementById('emergencyBannerDesc'),
  resolveEmergencyBtn: document.getElementById('resolveEmergencyBtn'),

  // Patient Card
  patientTabsContainer: document.getElementById('patientTabsContainer'),
  patientInitials: document.getElementById('patientInitials'),
  patientName: document.getElementById('patientName'),
  patientStatusBadge: document.getElementById('patientStatusBadge'),
  patientRiskBadge: document.getElementById('patientRiskBadge'),
  patientId: document.getElementById('patientId'),
  patientRoom: document.getElementById('patientRoom'),
  patientDemographics: document.getElementById('patientDemographics'),
  patientMonitoringDay: document.getElementById('patientMonitoringDay'),
  patientNotes: document.getElementById('patientNotes'),
  deviceBattery: document.getElementById('deviceBattery'),
  deviceId: document.getElementById('deviceId'),
  deviceLastSeen: document.getElementById('deviceLastSeen'),

  // Vitals Values
  valSpO2: document.getElementById('valSpO2'),
  spo2Condition: document.getElementById('spo2Condition'),
  spo2Bar: document.getElementById('spo2Bar'),

  valHeartRate: document.getElementById('valHeartRate'),
  hrCondition: document.getElementById('hrCondition'),

  valTemp: document.getElementById('valTemp'),
  unitTemp: document.getElementById('unitTemp'),
  tempCondition: document.getElementById('tempCondition'),
  tempPin: document.getElementById('tempPin'),
  btnCelsius: document.getElementById('btnCelsius'),
  btnFahrenheit: document.getElementById('btnFahrenheit'),

  valResp: document.getElementById('valResp'),
  respCondition: document.getElementById('respCondition'),

  // Alerts
  activeAlertCount: document.getElementById('activeAlertCount'),
  alertsListContainer: document.getElementById('alertsListContainer')
};

// ======================== WebSocket Connection ======================== //
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:5000';
  const wsUrl = `${protocol}//${host}/ws`;

  console.log(`[WebSocket] Connecting to ${wsUrl}...`);
  elements.connectionStatusText.textContent = 'Connecting...';
  elements.connectionStatusPill.className = 'status-pill';

  try {
    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      console.log('[WebSocket] Connection open!');
      elements.connectionStatusText.textContent = 'Gateway Live (WebSockets)';
      elements.connectionStatusPill.className = 'status-pill';
      if (state.wsReconnectTimer) {
        clearInterval(state.wsReconnectTimer);
        state.wsReconnectTimer = null;
      }
    };

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleIncomingMessage(msg);
      } catch (e) {
        console.error('[WebSocket] Failed to parse message:', e);
      }
    };

    state.ws.onclose = () => {
      console.warn('[WebSocket] Connection closed. Retrying in 3s...');
      elements.connectionStatusText.textContent = 'Reconnecting...';
      elements.connectionStatusPill.className = 'status-pill warning';
      scheduleReconnect();
    };

    state.ws.onerror = (err) => {
      console.error('[WebSocket] Socket error occurred:', err);
    };
  } catch (err) {
    console.error('[WebSocket Init Error]:', err);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (!state.wsReconnectTimer) {
    state.wsReconnectTimer = setTimeout(() => {
      connectWebSocket();
    }, 3000);
  }
}

// Handle WebSocket updates
function handleIncomingMessage(msg) {
  if (msg.type === 'TELEMETRY_UPDATE') {
    const reading = msg.data;
    // If incoming reading belongs to active patient, update UI & charts
    if (reading.patient_id === state.activePatientId) {
      updateVitalCards(reading);
      appendReadingToCharts(reading);
    }
    // Also update patient tabs vitals preview
    updatePatientTabsPreview(reading);

  } else if (msg.type === 'NEW_ALERT') {
    const alert = msg.data;
    console.log('[Clinical Alert Received]:', alert);
    handleNewAlert(alert);

  } else if (msg.type === 'ALERT_RESOLVED') {
    fetchAlerts();
  } else if (msg.type === 'PATIENT_UPDATED') {
    fetchPatients();
  }
}

// ======================== Rest API Fetchers ======================== //

async function fetchPatients() {
  try {
    const res = await fetch('/api/patients');
    const json = await res.json();
    if (json.success && json.data.length > 0) {
      state.patients = json.data;
      renderPatientTabs();
      // Ensure active patient exists
      const current = state.patients.find(p => p.id === state.activePatientId) || state.patients[0];
      selectPatient(current.id, false);
    }
  } catch (err) {
    console.error('[Fetch Patients Error]:', err);
  }
}

async function fetchPatientVitals(patientId) {
  try {
    const [latestRes, historyRes] = await Promise.all([
      fetch(`/api/telemetry/latest?patient_id=${patientId}`),
      fetch(`/api/telemetry/history?patient_id=${patientId}&limit=${state.historyLimit}`)
    ]);

    const latestJson = await latestRes.json();
    const historyJson = await historyRes.json();

    if (latestJson.success && latestJson.data) {
      updateVitalCards(latestJson.data);
    }

    if (historyJson.success && historyJson.data) {
      populateCharts(historyJson.data);
    }
  } catch (err) {
    console.error('[Fetch Vitals Error]:', err);
  }
}

async function fetchAlerts() {
  try {
    const res = await fetch(`/api/alerts?resolved=false`);
    const json = await res.json();
    if (json.success) {
      state.activeAlerts = json.data;
      renderAlertsList();
      checkEmergencyBanner();
    }
  } catch (err) {
    console.error('[Fetch Alerts Error]:', err);
  }
}

// ======================== Render UI Elements ======================== //

function renderPatientTabs() {
  elements.patientTabsContainer.innerHTML = '';
  state.patients.forEach(patient => {
    const tab = document.createElement('div');
    tab.className = `patient-tab ${patient.id === state.activePatientId ? 'active' : ''}`;
    tab.dataset.id = patient.id;

    const hasAlert = parseInt(patient.active_alerts_count || 0, 10) > 0;
    const roomShort = patient.room_number.replace('Isolation Ward ', 'W-').replace('Room ', 'R-');

    tab.innerHTML = `
      <div class="tab-room-badge">${roomShort}</div>
      <div class="tab-info">
        <span class="tab-name">${patient.name}</span>
        <span class="tab-vitals-preview" id="tabPreview_${patient.id}">
          SpO2: ${patient.spo2 || '--'}% • ${patient.heart_rate || '--'} bpm
        </span>
      </div>
      <div class="tab-alert-indicator ${hasAlert ? 'has-alert' : ''}" title="${hasAlert ? 'Active Alert' : 'Normal'}"></div>
    `;

    tab.onclick = () => selectPatient(patient.id);
    elements.patientTabsContainer.appendChild(tab);
  });
}

function updatePatientTabsPreview(reading) {
  const preview = document.getElementById(`tabPreview_${reading.patient_id}`);
  if (preview) {
    preview.textContent = `SpO2: ${reading.spo2}% • ${reading.heart_rate} bpm`;
  }
}

function selectPatient(patientId, fetchHistory = true) {
  state.activePatientId = patientId;

  // Update tabs highlight
  document.querySelectorAll('.patient-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.id === patientId);
  });

  const patient = state.patients.find(p => p.id === patientId);
  if (patient) {
    // Update Profile Card
    const nameParts = patient.name.split(' ');
    const initials = nameParts.length > 1 ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() : patient.name.substring(0, 2).toUpperCase();
    elements.patientInitials.textContent = initials;
    elements.patientName.textContent = patient.name;
    elements.patientId.textContent = patient.id;
    elements.patientRoom.textContent = patient.room_number;
    elements.patientDemographics.textContent = `${patient.age} yrs • ${patient.gender}`;
    if (elements.patientMonitoringDay) {
      elements.patientMonitoringDay.textContent = `Day ${patient.monitoring_day || patient.quarantine_day || 1}`;
    }
    elements.patientNotes.textContent = patient.comorbidities || 'Standard clinical isolation protocol.';

    // Risk badge
    elements.patientRiskBadge.className = 'risk-badge';
    if (patient.status === 'CRITICAL') {
      elements.patientRiskBadge.classList.add('risk-critical');
      elements.patientRiskBadge.textContent = 'HIGH RISK / CRITICAL';
    } else if (patient.status === 'OBSERVATION') {
      elements.patientRiskBadge.classList.add('risk-stable');
      elements.patientRiskBadge.textContent = 'RECOVERY OBSERVATION';
    } else {
      elements.patientRiskBadge.classList.add('risk-moderate');
      elements.patientRiskBadge.textContent = 'ACTIVE MONITORING';
    }

    elements.patientStatusBadge.textContent = (patient.status || 'ACTIVE_MONITORING').replace('_', ' ').replace('QUARANTINE', 'MONITORING');
  }

  if (fetchHistory) {
    fetchPatientVitals(patientId);
  }
  checkEmergencyBanner();
}

function updateVitalCards(reading) {
  state.currentVitals = reading;

  // 1. SpO2 Blood Oxygen
  const spo2 = parseFloat(reading.spo2);
  elements.valSpO2.textContent = spo2.toFixed(1);
  elements.spo2Bar.style.width = `${Math.min(Math.max(spo2, 0), 100)}%`;

  if (spo2 < 90.0) {
    elements.spo2Condition.className = 'vital-condition-badge critical';
    elements.spo2Condition.textContent = 'CRITICAL HYPOXIA';
  } else if (spo2 < 94.0) {
    elements.spo2Condition.className = 'vital-condition-badge warning';
    elements.spo2Condition.textContent = 'MILD HYPOXIA';
  } else {
    elements.spo2Condition.className = 'vital-condition-badge';
    elements.spo2Condition.textContent = 'NORMAL';
  }

  // 2. Pulse / Heart Rate
  const hr = parseFloat(reading.heart_rate);
  elements.valHeartRate.textContent = Math.round(hr);

  if (hr > 115) {
    elements.hrCondition.className = 'vital-condition-badge warning';
    elements.hrCondition.textContent = 'TACHYCARDIA';
  } else if (hr < 50 && hr > 0) {
    elements.hrCondition.className = 'vital-condition-badge warning';
    elements.hrCondition.textContent = 'BRADYCARDIA';
  } else {
    elements.hrCondition.className = 'vital-condition-badge';
    elements.hrCondition.textContent = 'NORMAL SINUS';
  }

  // 3. Temperature
  const tempC = parseFloat(reading.temperature);
  if (state.tempUnit === 'F') {
    const tempF = (tempC * 9 / 5) + 32;
    elements.valTemp.textContent = tempF.toFixed(1);
    elements.unitTemp.textContent = '°F';
  } else {
    elements.valTemp.textContent = tempC.toFixed(1);
    elements.unitTemp.textContent = '°C';
  }

  // Position temperature pin (36.0C to 40.0C range)
  const pinPercent = Math.min(Math.max(((tempC - 36.0) / 4.0) * 100, 5), 95);
  elements.tempPin.style.left = `${pinPercent}%`;

  if (tempC > 38.5) {
    elements.tempCondition.textContent = 'High Pyrexia / Severe Fever';
    elements.tempCondition.style.color = '#f87171';
  } else if (tempC > 37.8) {
    elements.tempCondition.textContent = 'Mild Fever Spike';
    elements.tempCondition.style.color = '#fbbf24';
  } else {
    elements.tempCondition.textContent = 'Normal / Afebrile';
    elements.tempCondition.style.color = '#34d399';
  }

  // 4. Respiration Rate
  const resp = parseFloat(reading.respiration_rate);
  elements.valResp.textContent = Math.round(resp);
  if (resp > 24) {
    elements.respCondition.className = 'vital-condition-badge warning';
    elements.respCondition.textContent = 'TACHYPNEA (DYSPNEA)';
  } else {
    elements.respCondition.className = 'vital-condition-badge';
    elements.respCondition.textContent = 'EUPNEA (STABLE)';
  }

  // Device stats
  if (reading.battery_level) {
    elements.deviceBattery.textContent = `${reading.battery_level}%`;
  }
  if (reading.device_id) {
    elements.deviceId.textContent = reading.device_id;
  }
  elements.deviceLastSeen.textContent = new Date(reading.timestamp).toLocaleTimeString();
}

function handleNewAlert(alert) {
  // Add to active alerts array
  state.activeAlerts.unshift(alert);
  renderAlertsList();

  // If this alert belongs to the currently active patient or is CRITICAL
  if (alert.severity === 'CRITICAL' || alert.patient_id === state.activePatientId) {
    playEmergencyChime(alert.severity === 'CRITICAL');
    showEmergencyBanner(alert);
  }

  // Refresh patients tab count
  fetchPatients();
}

function renderAlertsList() {
  elements.alertsListContainer.innerHTML = '';
  elements.activeAlertCount.textContent = `${state.activeAlerts.length} Active`;

  if (state.activeAlerts.length === 0) {
    elements.alertsListContainer.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 0.82rem;">
        No active clinical alerts. All patient vital parameters within safe range.
      </div>
    `;
    return;
  }

  state.activeAlerts.forEach(alert => {
    const item = document.createElement('div');
    item.className = `alert-item severity-${alert.severity.toLowerCase()} ${alert.resolved ? 'resolved' : ''}`;
    const timeStr = new Date(alert.timestamp).toLocaleTimeString();

    item.innerHTML = `
      <div class="alert-icon">${alert.severity === 'CRITICAL' ? '🚨' : '⚠️'}</div>
      <div class="alert-info">
        <div class="alert-headline">
          <span class="alert-name">[${alert.patient_id}] ${alert.alert_type.replace('_', ' ')}</span>
          <span class="alert-time">${timeStr}</span>
        </div>
        <div class="alert-msg">${alert.message}</div>
        ${!alert.resolved ? `
          <button class="btn-resolve-sm" onclick="resolveAlert(${alert.id})">Acknowledge & Resolve</button>
        ` : ''}
      </div>
    `;

    elements.alertsListContainer.appendChild(item);
  });
}

function showEmergencyBanner(alert) {
  elements.emergencyBannerTitle.textContent = `${alert.severity}: ${alert.alert_type.replace('_', ' ')} (${alert.patient_id})`;
  elements.emergencyBannerDesc.textContent = alert.message;
  elements.criticalEmergencyBanner.classList.remove('hidden');

  elements.resolveEmergencyBtn.onclick = () => {
    resolveAlert(alert.id);
    elements.criticalEmergencyBanner.classList.add('hidden');
  };
}

function checkEmergencyBanner() {
  const patientCriticalAlert = state.activeAlerts.find(
    a => a.patient_id === state.activePatientId && a.severity === 'CRITICAL' && !a.resolved
  );

  if (patientCriticalAlert) {
    showEmergencyBanner(patientCriticalAlert);
  } else {
    elements.criticalEmergencyBanner.classList.add('hidden');
  }
}

async function resolveAlert(alertId) {
  try {
    const res = await fetch(`/api/alerts/${alertId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved_by: 'Doctor on Duty' })
    });
    const json = await res.json();
    if (json.success) {
      state.activeAlerts = state.activeAlerts.filter(a => a.id !== alertId);
      renderAlertsList();
      checkEmergencyBanner();
      fetchPatients();
    }
  } catch (err) {
    console.error('[Resolve Alert Error]:', err);
  }
}

// ======================== Chart.js Setup ======================== //

function initCharts() {
  // Chart 1: Combined SpO2 & Heart Rate
  const ctxVitals = document.getElementById('vitalsCombinedChart').getContext('2d');
  vitalsChartInstance = new Chart(ctxVitals, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'SpO2 (%)',
          data: [],
          borderColor: '#00f2fe',
          backgroundColor: 'rgba(0, 242, 254, 0.08)',
          fill: true,
          tension: 0.35,
          yAxisID: 'ySpO2',
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 5
        },
        {
          label: 'Heart Rate (BPM)',
          data: [],
          borderColor: '#ff3b69',
          backgroundColor: 'rgba(255, 59, 105, 0.04)',
          fill: false,
          tension: 0.35,
          yAxisID: 'yHR',
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(14, 20, 36, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { family: 'Outfit', size: 10 }, maxTicksLimit: 8 }
        },
        ySpO2: {
          type: 'linear',
          position: 'left',
          min: 80,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#00f2fe', font: { family: 'JetBrains Mono', size: 11 }, callback: v => `${v}%` }
        },
        yHR: {
          type: 'linear',
          position: 'right',
          min: 40,
          max: 160,
          grid: { drawOnChartArea: false },
          ticks: { color: '#ff3b69', font: { family: 'JetBrains Mono', size: 11 }, callback: v => `${v} bpm` }
        }
      }
    }
  });

  // Chart 2: Body Temperature Curve
  const ctxTemp = document.getElementById('temperatureChart').getContext('2d');
  tempChartInstance = new Chart(ctxTemp, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Core Temperature (°C)',
          data: [],
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 2,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(14, 20, 36, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#cbd5e1',
          padding: 10
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { family: 'Outfit', size: 10 }, maxTicksLimit: 6 }
        },
        y: {
          min: 35.5,
          max: 40.5,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#f59e0b', font: { family: 'JetBrains Mono', size: 11 }, callback: v => `${v}°C` }
        }
      }
    }
  });
}

function populateCharts(records) {
  if (!vitalsChartInstance || !tempChartInstance) return;

  const labels = records.map(r => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const spo2Data = records.map(r => parseFloat(r.spo2));
  const hrData = records.map(r => parseFloat(r.heart_rate));
  const tempData = records.map(r => parseFloat(r.temperature));

  vitalsChartInstance.data.labels = labels;
  vitalsChartInstance.data.datasets[0].data = spo2Data;
  vitalsChartInstance.data.datasets[1].data = hrData;
  vitalsChartInstance.update('none');

  tempChartInstance.data.labels = labels;
  tempChartInstance.data.datasets[0].data = tempData;
  tempChartInstance.update('none');
}

function appendReadingToCharts(reading) {
  if (!vitalsChartInstance || !tempChartInstance) return;

  const timeLabel = new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Add new data point
  vitalsChartInstance.data.labels.push(timeLabel);
  vitalsChartInstance.data.datasets[0].data.push(parseFloat(reading.spo2));
  vitalsChartInstance.data.datasets[1].data.push(parseFloat(reading.heart_rate));

  tempChartInstance.data.labels.push(timeLabel);
  tempChartInstance.data.datasets[0].data.push(parseFloat(reading.temperature));

  // Shift if exceeding window
  if (vitalsChartInstance.data.labels.length > state.historyLimit) {
    vitalsChartInstance.data.labels.shift();
    vitalsChartInstance.data.datasets[0].data.shift();
    vitalsChartInstance.data.datasets[1].data.shift();
  }

  if (tempChartInstance.data.labels.length > state.historyLimit) {
    tempChartInstance.data.labels.shift();
    tempChartInstance.data.datasets[0].data.shift();
  }

  vitalsChartInstance.update('none');
  tempChartInstance.update('none');
}

// ======================== Live Photoplethysmogram (PPG) Waveform ======================== //
function initPPGWaveform() {
  const canvas = document.getElementById('ppgWaveformCanvas');
  const ctx = canvas.getContext('2d');
  let phase = 0;
  const points = [];
  const maxPoints = 200;

  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 48;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function generatePPGPoint(p) {
    // Physiological Photoplethysmogram wave equation (Systolic peak + Dicrotic Notch)
    const sin1 = Math.sin(p);
    const sin2 = Math.sin(2 * p);
    const peak = Math.pow(Math.max(0, sin1), 3);
    const notch = 0.25 * Math.pow(Math.max(0, Math.sin(p - 1.2)), 2);
    return (peak + notch);
  }

  function renderWave() {
    const hr = parseFloat(state.currentVitals.heart_rate || 75);
    const speed = (hr / 60) * 0.12;
    phase += speed;

    const val = generatePPGPoint(phase);
    points.push(val);
    if (points.length > maxPoints) {
      points.shift();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw trace
    ctx.beginPath();
    ctx.strokeStyle = '#ff3b69';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff3b69';
    ctx.shadowBlur = 8;

    const step = canvas.width / maxPoints;
    for (let i = 0; i < points.length; i++) {
      const x = i * step;
      // Invert Y because canvas 0 is top
      const y = canvas.height - (points[i] * (canvas.height * 0.75) + 6);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    requestAnimationFrame(renderWave);
  }

  renderWave();
}

// ======================== Demonstration & Simulator Actions ======================== //

window.injectScenario = async function(scenario) {
  try {
    initAudioContext();
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario,
        patient_id: state.activePatientId
      })
    });
    const json = await res.json();
    console.log(`[Simulator Scenario Triggered]: ${scenario}`, json);
  } catch (err) {
    console.error('[Inject Scenario Error]:', err);
  }
};

window.sendCustomTelemetry = async function() {
  try {
    initAudioContext();
    const spo2 = parseFloat(document.getElementById('inputSpO2').value);
    const hr = parseFloat(document.getElementById('inputHR').value);
    const temp = parseFloat(document.getElementById('inputTemp').value);

    const payload = {
      patient_id: state.activePatientId,
      heart_rate: hr,
      spo2: spo2,
      temperature: temp,
      respiration_rate: 18.0,
      battery_level: 95.0,
      device_id: 'MANUAL_CALIBRATION_TEST'
    };

    const res = await fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    console.log('[Manual Telemetry Sent]:', json);
  } catch (err) {
    console.error('[Custom Telemetry Error]:', err);
  }
};

// ======================== Event Listeners ======================== //

function setupEventListeners() {
  // Audio toggle
  elements.audioToggleBtn.addEventListener('click', () => {
    initAudioContext();
    state.audioEnabled = !state.audioEnabled;
    elements.audioIconOn.classList.toggle('hidden', !state.audioEnabled);
    elements.audioIconOff.classList.toggle('hidden', state.audioEnabled);
    elements.audioStatusText.textContent = state.audioEnabled ? 'Alarm Audio: Active' : 'Alarm Audio: Muted';
    elements.audioToggleBtn.classList.toggle('muted', !state.audioEnabled);
  });

  // Temperature Unit Toggle
  elements.btnCelsius.addEventListener('click', () => {
    state.tempUnit = 'C';
    elements.btnCelsius.classList.add('active');
    elements.btnFahrenheit.classList.remove('active');
    if (state.currentVitals.temperature) {
      updateVitalCards(state.currentVitals);
    }
  });

  elements.btnFahrenheit.addEventListener('click', () => {
    state.tempUnit = 'F';
    elements.btnFahrenheit.classList.add('active');
    elements.btnCelsius.classList.remove('active');
    if (state.currentVitals.temperature) {
      updateVitalCards(state.currentVitals);
    }
  });

  // Export CSV
  elements.exportCsvBtn.addEventListener('click', () => {
    window.location.href = `/api/export?patient_id=${state.activePatientId}`;
  });

  // Time Range Filter Buttons
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.historyLimit = parseInt(btn.dataset.limit, 10);
      fetchPatientVitals(state.activePatientId);
    });
  });

  // First user interaction initializes audio
  document.addEventListener('click', () => {
    initAudioContext();
  }, { once: true });
}

// ======================== Application Initialization ======================== //
window.addEventListener('DOMContentLoaded', () => {
  initCharts();
  initPPGWaveform();
  setupEventListeners();
  fetchPatients();
  fetchAlerts();
  connectWebSocket();

  // Periodic fallback refresh every 10s for alerts & patients
  setInterval(() => {
    fetchAlerts();
  }, 10000);
});
