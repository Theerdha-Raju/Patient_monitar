/**
 * =======================================================================
 * Quarantine Patient Health Monitoring System - Dashboard Logic
 * MCA Major Project: IoT-Based Covid Patient Health Monitor in Quarantine
 * =======================================================================
 */

// Configuration Constants
const API_BASE_URL = window.location.origin;
const PATIENT_ID = "P001";
const POLLING_INTERVAL_MS = 3000;

// State Management
let currentFilterRange = "15m";
let lastSeenReadingId = null;
let autoDemoInterval = null;
let activeAlertsFilter = "all";
let rawHistoryData = [];

// Chart.js Instances
let tempChart = null;
let hrChart = null;
let spo2Chart = null;

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    initCharts();
    setupEventListeners();
    fetchPatientProfile();
    fetchInitialTelemetry();

    // Start Real-Time Polling Loop (Every 3 seconds)
    setInterval(pollTelemetryUpdates, POLLING_INTERVAL_MS);
});

/* =======================================================================
   1. Setup Chart.js Line Visualizations
   ======================================================================= */
function initCharts() {
    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleFont: { family: 'Inter', size: 12, weight: '600' },
                bodyFont: { family: 'Inter', size: 12 },
                padding: 10,
                cornerRadius: 8,
                displayColors: false
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#94a3b8',
                    font: { family: 'Inter', size: 10 },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 7
                }
            },
            y: {
                grid: { color: '#f1f5f9' },
                ticks: {
                    color: '#64748b',
                    font: { family: 'Inter', size: 11 }
                }
            }
        }
    };

    // 1. Body Temperature Chart (°C)
    const ctxTemp = document.getElementById('temperatureChart').getContext('2d');
    const gradTemp = ctxTemp.createLinearGradient(0, 0, 0, 200);
    gradTemp.addColorStop(0, 'rgba(220, 38, 38, 0.18)');
    gradTemp.addColorStop(1, 'rgba(220, 38, 38, 0.0)');

    tempChart = new Chart(ctxTemp, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature (°C)',
                data: [],
                borderColor: '#dc2626',
                backgroundColor: gradTemp,
                borderWidth: 2.2,
                pointRadius: 2,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            ...commonChartOptions,
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    suggestedMin: 35.5,
                    suggestedMax: 39.5,
                    ticks: {
                        ...commonChartOptions.scales.y.ticks,
                        callback: val => `${val}°C`
                    }
                }
            }
        }
    });

    // 2. Heart Rate Chart (BPM)
    const ctxHR = document.getElementById('heartRateChart').getContext('2d');
    const gradHR = ctxHR.createLinearGradient(0, 0, 0, 200);
    gradHR.addColorStop(0, 'rgba(124, 58, 237, 0.18)');
    gradHR.addColorStop(1, 'rgba(124, 58, 237, 0.0)');

    hrChart = new Chart(ctxHR, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Heart Rate (BPM)',
                data: [],
                borderColor: '#7c3aed',
                backgroundColor: gradHR,
                borderWidth: 2.2,
                pointRadius: 2,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            ...commonChartOptions,
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    suggestedMin: 55,
                    suggestedMax: 130,
                    ticks: {
                        ...commonChartOptions.scales.y.ticks,
                        callback: val => `${val} bpm`
                    }
                }
            }
        }
    });

    // 3. SpO2 Oxygen Saturation Chart (%)
    const ctxSpO2 = document.getElementById('spo2Chart').getContext('2d');
    const gradSpO2 = ctxSpO2.createLinearGradient(0, 0, 0, 200);
    gradSpO2.addColorStop(0, 'rgba(2, 132, 199, 0.20)');
    gradSpO2.addColorStop(1, 'rgba(2, 132, 199, 0.0)');

    spo2Chart = new Chart(ctxSpO2, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'SpO2 (%)',
                data: [],
                borderColor: '#0284c7',
                backgroundColor: gradSpO2,
                borderWidth: 2.5,
                pointRadius: 2.5,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            ...commonChartOptions,
            scales: {
                ...commonChartOptions.scales,
                y: {
                    ...commonChartOptions.scales.y,
                    suggestedMin: 85,
                    suggestedMax: 100,
                    ticks: {
                        ...commonChartOptions.scales.y.ticks,
                        callback: val => `${val}%`
                    }
                }
            }
        }
    });
}

/* =======================================================================
   2. Event Listeners & UI Controls
   ======================================================================= */
function setupEventListeners() {
    // Mobile Drawer Toggle
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });
    }

    // Sidebar navigation active state
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", function () {
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            this.classList.add("active");
            if (window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove("open");
            }
        });
    });

    // Time Filter Range Buttons
    document.querySelectorAll(".btn-filter").forEach(btn => {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".btn-filter").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            currentFilterRange = this.getAttribute("data-range");
            renderChartsWithFilter();
        });
    });

    // Manual Refresh Sync Button
    const refreshBtn = document.getElementById("manualRefreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            refreshBtn.classList.add("fa-spin");
            pollTelemetryUpdates().finally(() => {
                setTimeout(() => refreshBtn.classList.remove("fa-spin"), 500);
            });
        });
    }

    // Auto-Demo Switch
    const demoToggle = document.getElementById("demoModeToggle");
    if (demoToggle) {
        demoToggle.addEventListener("change", function () {
            if (this.checked) {
                showToast("Auto-Demo Mode Enabled. Simulating physiological vitals every 3.5s.", "info");
                autoDemoInterval = setInterval(() => {
                    const scenarios = ['normal', 'normal', 'normal', 'hypoxia', 'fever', 'tachycardia'];
                    const picked = scenarios[Math.floor(Math.random() * scenarios.length)];
                    simulateScenario(picked, true);
                }, 3500);
            } else {
                showToast("Auto-Demo Mode Disabled.", "info");
                if (autoDemoInterval) clearInterval(autoDemoInterval);
                autoDemoInterval = null;
            }
        });
    }

    // Alerts Table Filter Pills
    document.querySelectorAll(".alerts-filter-pill").forEach(pill => {
        pill.addEventListener("click", function () {
            document.querySelectorAll(".alerts-filter-pill").forEach(p => p.classList.remove("active"));
            this.classList.add("active");
            activeAlertsFilter = this.getAttribute("data-filter");
            fetchAlerts();
        });
    });
}

/* =======================================================================
   3. Telemetry Fetching & Polling
   ======================================================================= */
async function fetchInitialTelemetry() {
    await fetchHistory();
    await pollTelemetryUpdates();
    await fetchAlerts();
    await fetchDeviceStatus();
}

async function pollTelemetryUpdates() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/readings/latest/?patient_id=${PATIENT_ID}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();

        // Hide Network Error Banner
        document.getElementById("networkErrorBanner").style.display = "none";

        if (result.success && result.data) {
            updateSummaryCards(result.data);
            
            // If new reading arrived, append to charts and refresh alerts
            if (!lastSeenReadingId || lastSeenReadingId !== result.data.id) {
                lastSeenReadingId = result.data.id;
                appendReadingToCharts(result.data);
                fetchAlerts();
            }
        }
        await fetchDeviceStatus();
    } catch (err) {
        console.warn("[Polling Notice] Could not reach backend:", err.message);
        document.getElementById("networkErrorBanner").style.display = "flex";
        markDeviceDisconnected();
    }
}

async function fetchHistory() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/readings/history/?patient_id=${PATIENT_ID}&limit=60`);
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
            rawHistoryData = result.data;
            if (rawHistoryData.length > 0) {
                lastSeenReadingId = rawHistoryData[rawHistoryData.length - 1].id;
            }
            renderChartsWithFilter();
        }
    } catch (err) {
        console.warn("[History Error]:", err.message);
    }
}

/* =======================================================================
   4. Update Summary Cards with Clinical Thresholds
   ======================================================================= */
function updateSummaryCards(reading) {
    const temp = parseFloat(reading.temperature);
    const hr = parseFloat(reading.heart_rate);
    const spo2 = parseFloat(reading.spo2);

    // 1. Temperature Card
    document.getElementById("valTemperature").textContent = temp.toFixed(1);
    const tempF = (temp * 9 / 5 + 32).toFixed(1);
    document.getElementById("valTemperatureFahrenheit").textContent = `${tempF} °F`;

    const badgeTemp = document.getElementById("badgeTemp");
    const textTemp = document.getElementById("textTempStatus");
    if (temp >= 38.5) {
        setBadge(badgeTemp, textTemp, "badge-critical", "High Fever", "fa-solid fa-triangle-exclamation");
    } else if (temp >= 37.5) {
        setBadge(badgeTemp, textTemp, "badge-warning", "Low-Grade Fever", "fa-solid fa-circle-exclamation");
    } else if (temp < 35.0) {
        setBadge(badgeTemp, textTemp, "badge-critical", "Hypothermia Risk", "fa-solid fa-snowflake");
    } else {
        setBadge(badgeTemp, textTemp, "badge-normal", "Normal Range", "fa-solid fa-circle-check");
    }

    // 2. Heart Rate Card
    document.getElementById("valHeartRate").textContent = Math.round(hr);
    const badgeHR = document.getElementById("badgeHR");
    const textHR = document.getElementById("textHRStatus");
    const hrSub = document.getElementById("hrPulseRhythm");

    if (hr >= 120) {
        setBadge(badgeHR, textHR, "badge-critical", "Critical Tachycardia", "fa-solid fa-heart-crack");
        hrSub.textContent = "Significant Tachycardia Detected";
    } else if (hr >= 101) {
        setBadge(badgeHR, textHR, "badge-warning", "Mild Tachycardia", "fa-solid fa-circle-exclamation");
        hrSub.textContent = "Elevated Resting Pulse";
    } else if (hr <= 50) {
        setBadge(badgeHR, textHR, "badge-critical", "Bradycardia", "fa-solid fa-triangle-exclamation");
        hrSub.textContent = "Abnormally Low Heart Rate";
    } else {
        setBadge(badgeHR, textHR, "badge-normal", "Normal Range", "fa-solid fa-circle-check");
        hrSub.textContent = "Normal Sinus Rhythm";
    }

    // 3. SpO2 Oxygen Card
    document.getElementById("valSpO2").textContent = Math.round(spo2);
    const badgeSpO2 = document.getElementById("badgeSpO2");
    const textSpO2 = document.getElementById("textSpO2Status");
    const spo2Sub = document.getElementById("spo2HypoxiaRisk");

    if (spo2 < 90.0) {
        setBadge(badgeSpO2, textSpO2, "badge-critical", "Critical Hypoxia", "fa-solid fa-triangle-exclamation");
        spo2Sub.textContent = "High Risk: Oxygen Therapy Advised";
    } else if (spo2 <= 94.0) {
        setBadge(badgeSpO2, textSpO2, "badge-warning", "Mild Hypoxemia", "fa-solid fa-circle-exclamation");
        spo2Sub.textContent = "Attention: Mild Oxygen Dip";
    } else {
        setBadge(badgeSpO2, textSpO2, "badge-normal", "Optimal SpO₂", "fa-solid fa-circle-check");
        spo2Sub.textContent = "Optimal Cellular Oxygenation";
    }

    // 4. Overall Patient Quarantine Assessment
    const overallTitle = document.getElementById("overallStatusTitle");
    const overallDesc = document.getElementById("overallStatusDesc");
    const overallBadge = document.getElementById("overallBadge");

    if (reading.status_level === "critical") {
        overallTitle.textContent = "CRITICAL ALERT";
        overallTitle.style.color = "#dc2626";
        overallDesc.textContent = "One or more physiological vitals have crossed critical medical advisory safety limits.";
        overallBadge.className = "status-badge badge-critical";
        overallBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>Intervention Recommended</span>';
    } else if (reading.status_level === "attention") {
        overallTitle.textContent = "ATTENTION REQUIRED";
        overallTitle.style.color = "#d97706";
        overallDesc.textContent = "Low-grade fever or mild physiological deviation observed. Monitor patient trend.";
        overallBadge.className = "status-badge badge-warning";
        overallBadge.innerHTML = '<i class="fa-solid fa-eye"></i> <span>Close Observation</span>';
    } else {
        overallTitle.textContent = "STABLE";
        overallTitle.style.color = "#0d9488";
        overallDesc.textContent = "All quarantine vitals are currently within stable baseline clinical thresholds.";
        overallBadge.className = "status-badge badge-normal";
        overallBadge.innerHTML = '<i class="fa-solid fa-heart"></i> <span>Monitoring Stable</span>';
    }

    // Update timestamp
    const now = new Date();
    document.getElementById("lastUpdatedTimestamp").textContent = now.toLocaleTimeString();
    document.getElementById("patientLatestReadingTime").textContent = `${formatDateString(reading.timestamp || now.toISOString())}`;
}

function setBadge(el, textEl, className, text, iconClass) {
    el.className = `status-badge ${className}`;
    el.innerHTML = `<i class="${iconClass}"></i> <span id="${textEl.id}">${text}</span>`;
}

/* =======================================================================
   5. Chart Rendering & Filtering
   ======================================================================= */
function renderChartsWithFilter() {
    if (!tempChart || !hrChart || !spo2Chart) return;

    let filtered = [...rawHistoryData];

    // Filter by timestamp if requested
    const now = Date.now();
    if (currentFilterRange === "15m") {
        filtered = filtered.filter(r => (now - new Date(r.timestamp).getTime()) <= 15 * 60 * 1000);
    } else if (currentFilterRange === "1h") {
        filtered = filtered.filter(r => (now - new Date(r.timestamp).getTime()) <= 60 * 60 * 1000);
    } else if (currentFilterRange === "24h") {
        filtered = filtered.filter(r => (now - new Date(r.timestamp).getTime()) <= 24 * 60 * 60 * 1000);
    }

    const labels = filtered.map(r => formatChartTime(r.timestamp));
    const temps = filtered.map(r => parseFloat(r.temperature));
    const hrs = filtered.map(r => parseFloat(r.heart_rate));
    const spo2s = filtered.map(r => parseFloat(r.spo2));

    // Handle Empty States
    const isEmpty = filtered.length === 0;
    document.getElementById("tempEmptyState").style.display = isEmpty ? "flex" : "none";
    document.getElementById("hrEmptyState").style.display = isEmpty ? "flex" : "none";
    document.getElementById("spo2EmptyState").style.display = isEmpty ? "flex" : "none";

    // Update Temperature Chart
    tempChart.data.labels = labels;
    tempChart.data.datasets[0].data = temps;
    tempChart.update();

    // Update Heart Rate Chart
    hrChart.data.labels = labels;
    hrChart.data.datasets[0].data = hrs;
    hrChart.update();

    // Update SpO2 Chart
    spo2Chart.data.labels = labels;
    spo2Chart.data.datasets[0].data = spo2s;
    spo2Chart.update();
}

function appendReadingToCharts(reading) {
    rawHistoryData.push(reading);
    // Keep internal history bounded to latest 200 items in browser
    if (rawHistoryData.length > 200) rawHistoryData.shift();

    const timeLabel = formatChartTime(reading.timestamp);

    tempChart.data.labels.push(timeLabel);
    tempChart.data.datasets[0].data.push(parseFloat(reading.temperature));
    if (tempChart.data.labels.length > 40) {
        tempChart.data.labels.shift();
        tempChart.data.datasets[0].data.shift();
    }
    tempChart.update('none');

    hrChart.data.labels.push(timeLabel);
    hrChart.data.datasets[0].data.push(parseFloat(reading.heart_rate));
    if (hrChart.data.labels.length > 40) {
        hrChart.data.labels.shift();
        hrChart.data.datasets[0].data.shift();
    }
    hrChart.update('none');

    spo2Chart.data.labels.push(timeLabel);
    spo2Chart.data.datasets[0].data.push(parseFloat(reading.spo2));
    if (spo2Chart.data.labels.length > 40) {
        spo2Chart.data.labels.shift();
        spo2Chart.data.datasets[0].data.shift();
    }
    spo2Chart.update('none');
}

/* =======================================================================
   6. Patient Profile & Hardware Status
   ======================================================================= */
async function fetchPatientProfile() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/patient/?patient_id=${PATIENT_ID}`);
        const result = await res.json();
        if (result.success && result.data) {
            const p = result.data;
            document.getElementById("patientNameDisplay").textContent = p.name;
            document.getElementById("patientIdTag").textContent = `ID: ${p.patient_id}`;
            document.getElementById("patientWardTag").innerHTML = `<i class="fa-solid fa-door-closed"></i> ${p.room_number}`;
            document.getElementById("patientMonitoringStatus").textContent = p.status;
            document.getElementById("patientStartDate").textContent = `${p.quarantine_start_date} (Day ${p.quarantine_day} of 14)`;
            document.getElementById("patientDemographics").textContent = `${p.age} Years &bull; ${p.gender}`;
            document.getElementById("patientComorbidities").textContent = p.comorbidities;
            document.getElementById("patientEmergencyContact").textContent = p.contact_emergency;
            document.getElementById("sidePatientId").textContent = p.patient_id;
            document.getElementById("sidePatientRoom").textContent = p.room_number;
        }
    } catch (err) {
        console.warn("[Patient Profile Error]:", err.message);
    }
}

async function fetchDeviceStatus() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/device/?device_id=ESP32_NODE_01`);
        const result = await res.json();
        if (result.success && result.data) {
            updateDeviceUI(result.data);
        }
    } catch (err) {
        markDeviceDisconnected();
    }
}

function updateDeviceUI(d) {
    const headerPill = document.getElementById("headerDevicePill");
    const headerText = document.getElementById("headerDeviceStatusText");
    const deviceCard = document.getElementById("deviceCard");
    const statusHeadline = document.getElementById("deviceStatusText");
    const badgeText = document.getElementById("badgeDeviceText");
    const badgeDevice = document.getElementById("badgeDeviceOnline");
    const sideDot = document.getElementById("sideStatusDot");
    const secondsAgoSpan = document.getElementById("deviceSecondsAgo");
    const ipSpan = document.getElementById("deviceIpAddress");
    const dataTxHint = document.getElementById("deviceDataTransmission");

    ipSpan.textContent = d.ip_address || "192.168.1.150";

    if (d.seconds_since_last_reading !== null && d.seconds_since_last_reading !== undefined) {
        if (d.seconds_since_last_reading < 5) {
            secondsAgoSpan.textContent = "Just now (< 5s)";
        } else {
            secondsAgoSpan.textContent = `${d.seconds_since_last_reading}s ago`;
        }
    } else {
        secondsAgoSpan.textContent = "No packet received";
    }

    if (d.status_class === "online") {
        headerPill.className = "hardware-status-pill online";
        headerText.textContent = "ESP32 ONLINE";
        statusHeadline.textContent = "ONLINE";
        statusHeadline.style.color = "#10b981";
        badgeText.textContent = "Telemetry Streaming";
        badgeDevice.className = "status-badge badge-normal";
        sideDot.className = "status-indicator-dot online";
        dataTxHint.textContent = "Continuous HTTP POST";
    } else if (d.status_class === "attention") {
        headerPill.className = "hardware-status-pill attention";
        headerText.textContent = "DATA STALE (30s+)";
        statusHeadline.textContent = "ATTENTION (STALE)";
        statusHeadline.style.color = "#f59e0b";
        badgeText.textContent = "Delayed Telemetry";
        badgeDevice.className = "status-badge badge-warning";
        sideDot.className = "status-indicator-dot";
        dataTxHint.textContent = "Packet delay detected";
    } else {
        markDeviceDisconnected();
    }
}

function markDeviceDisconnected() {
    const headerPill = document.getElementById("headerDevicePill");
    const headerText = document.getElementById("headerDeviceStatusText");
    const statusHeadline = document.getElementById("deviceStatusText");
    const badgeText = document.getElementById("badgeDeviceText");
    const badgeDevice = document.getElementById("badgeDeviceOnline");
    const sideDot = document.getElementById("sideStatusDot");
    const dataTxHint = document.getElementById("deviceDataTransmission");

    headerPill.className = "hardware-status-pill disconnected";
    headerText.textContent = "ESP32 DISCONNECTED";
    statusHeadline.textContent = "DISCONNECTED";
    statusHeadline.style.color = "#64748b";
    badgeText.textContent = "No Recent Telemetry";
    badgeDevice.className = "status-badge badge-offline";
    sideDot.className = "status-indicator-dot offline";
    dataTxHint.textContent = "Awaiting device beacon";
}

/* =======================================================================
   7. Clinical Alerts & Notifications
   ======================================================================= */
async function fetchAlerts() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/alerts/?patient_id=${PATIENT_ID}`);
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
            renderAlertsTable(result.data);
        }
    } catch (err) {
        console.warn("[Alerts Fetch Error]:", err.message);
    }
}

function renderAlertsTable(alerts) {
    const tbody = document.getElementById("alertsTableBody");
    const navCount = document.getElementById("alertNavCount");
    const summaryCount = document.getElementById("activeAlertCountText");

    let displayed = alerts;
    if (activeAlertsFilter === "active") {
        displayed = alerts.filter(a => !a.acknowledged);
    }

    const unacked = alerts.filter(a => !a.acknowledged).length;
    navCount.textContent = unacked;
    summaryCount.textContent = `${unacked} Active Alert${unacked === 1 ? '' : 's'}`;

    if (displayed.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table-msg">
                    <i class="fa-solid fa-shield-heart"></i>
                    <span>No ${activeAlertsFilter === 'active' ? 'active ' : ''}clinical alerts found. All monitored vitals are within limits.</span>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = displayed.map(a => {
        const sevClass = a.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning';
        const sevIcon = a.severity === 'CRITICAL' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-exclamation';
        const ackStatus = a.acknowledged 
            ? `<span class="status-badge badge-normal"><i class="fa-solid fa-check"></i> Acked</span>`
            : `<button class="btn-ack" onclick="acknowledgeAlert(${a.id})"><i class="fa-regular fa-circle-check"></i> Acknowledge</button>`;

        return `
            <tr>
                <td><span class="status-badge ${sevClass}"><i class="${sevIcon}"></i> ${a.severity}</span></td>
                <td><strong>${formatAlertType(a.alert_type)}</strong></td>
                <td>${a.value !== null ? a.value : '--'}</td>
                <td>${a.threshold !== null ? a.threshold : '--'}</td>
                <td>${a.message}</td>
                <td>${formatAlertTimestamp(a.timestamp)}</td>
                <td>${ackStatus}</td>
            </tr>
        `;
    }).join("");
}

async function acknowledgeAlert(alertId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/acknowledge/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: "Physician On-Duty" })
        });
        const result = await res.json();
        if (result.success) {
            showToast(`Alert #${alertId} acknowledged.`, "success");
            fetchAlerts();
        }
    } catch (err) {
        showToast(`Failed to acknowledge alert: ${err.message}`, "error");
    }
}

/* =======================================================================
   8. Scenario Simulation Endpoint (For Viva / Demonstrations)
   ======================================================================= */
async function simulateScenario(scenario, silent = false) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/demo/simulate/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: scenario, patient_id: PATIENT_ID })
        });
        const result = await res.json();

        if (result.success && !silent) {
            const reading = result.generated_reading;
            showToast(`Injected Scenario [${scenario.toUpperCase()}]: Temp ${reading.temperature}°C, HR ${reading.heart_rate} BPM, SpO2 ${reading.spo2}%`, "success");
            pollTelemetryUpdates();
        }
    } catch (err) {
        if (!silent) showToast(`Simulation failed: ${err.message}`, "error");
    }
}

/* =======================================================================
   9. Helper Utilities & Formatting
   ======================================================================= */
function formatChartTime(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDateString(isoString) {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString()}`;
}

function formatAlertTimestamp(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatAlertType(type) {
    if (!type) return "CLINICAL_ALERT";
    return type.replace(/_/g, " ");
}

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type === 'error' || type === 'critical' ? 'critical' : (type === 'warning' ? 'warning' : 'success')}`;

    let icon = "fa-solid fa-circle-info";
    if (type === "critical" || type === "error") icon = "fa-solid fa-triangle-exclamation";
    if (type === "warning") icon = "fa-solid fa-circle-exclamation";
    if (type === "success") icon = "fa-solid fa-circle-check";

    toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
