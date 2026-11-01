# Smart Patient Health Monitoring System (Patient_monitar)

> **Real-Time IoT Telemetry Web Dashboard & Clinical Observation System**  
> *ESP32 &bull; Node.js / Express &bull; WebSocket &bull; PostgreSQL &bull; React &bull; Tailwind CSS &bull; Recharts &bull; Docker Compose*

---

## 1. System Overview & Architecture

The **Smart Patient Health Monitoring System** is an end-to-end IoT healthcare platform designed for continuous, non-invasive physiological monitoring of patients.

An **ESP32 microcontroller** interfaces with a **MAX30102** sensor (blood oxygen SpO₂ and pulse rate) and a **DS18B20 / MLX90614** sensor (body temperature), sending JSON telemetry every 2-3 seconds to a backend server. Telemetry is saved in **PostgreSQL** and broadcast via a high-frequency **WebSocket (`/ws/readings`)** and REST polling to a modern **React + Vite** dashboard.

```mermaid
flowchart TD
    subgraph Hardware ["1. Hardware Layer (ESP32 Node)"]
        MAX["MAX30102 Sensor\n(SpO2 % & Heart Rate BPM)\nI2C: GPIO 21 / 22"]
        DS["DS18B20 / MLX90614\n(Body Temperature °C)\n1-Wire: GPIO 4"]
        ESP["ESP32 Dev Module\nFreeRTOS & WiFi Station"]
        BUZZ["Piezo Buzzer & LED\n(Local Emergency Alarm)"]
        MAX -->|I2C| ESP
        DS -->|1-Wire| ESP
        ESP -->|Trigger| BUZZ
    end

    subgraph Network ["2. Telemetry Ingestion"]
        HTTP["HTTP POST /api/readings\nJSON Payload every 2s"]
        ESP -->|Wi-Fi 802.11 b/g/n| HTTP
    end

    subgraph Backend ["3. Backend & Storage Layer (Docker)"]
        API["FastAPI REST & WebSocket Gateway\n(Port 5000)\nThreshold Engine & Alert Classifier"]
        DB[("PostgreSQL 16 Database\n(TimescaleDB Compatible)\nPatients · Readings · Alerts · Devices")]
        WS_HUB["WebSocket Broadcast Hub\n(/ws/readings)"]
        HTTP --> API
        API <-->|psycopg2| DB
        API -->|Push Event| WS_HUB
    end

    subgraph Frontend ["4. Clinical Dashboard (React + Nginx)"]
        UI["React 18 + Vite SPA (Port 3000)\nTailwind CSS (Dark / Light Mode)"]
        CHARTS["Recharts Real-Time Streams\n(5-Min Auto-Scroll + Normal Bands)"]
        GAUGE["SpO2 Semicircular Gauge\n& Patient Status Badge"]
        ALERTS["Clinical Alerts Panel\n(Flashing + Web Audio Beep)"]
        AUDIT["Historical Audit & CSV Export"]
        FLEET["ESP32 Device Health (30s Offline)"]
        
        WS_HUB -->|Live Push (Instant)| UI
        API -->|Fallback Polling (3s)| UI
        UI --> CHARTS
        UI --> GAUGE
        UI --> ALERTS
        UI --> AUDIT
        UI --> FLEET
    end
```

---

## 2. Physiological Target Ranges & Clinical Thresholds

| Metric | Target Normal (Green) | Warning / Attention (Amber) | Critical Breach (Red) | Clinical Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **SpO₂ (%)** | **&ge; 95.0%** | **92.0% – 94.9%** | **&lt; 92.0%** | Detects hypoxia early before severe respiratory distress occurs. |
| **Heart Rate** | **60 – 100 BPM** | **50–59 BPM** or **101–120 BPM** | **&lt; 50 BPM** or **&gt; 120 BPM** | Identifies tachycardia caused by systemic infection or cardiovascular stress. |
| **Body Temp** | **36.1 – 37.2 °C** | **37.3 – 38.0 °C** | **&gt; 38.0 °C** (Fever) | Tracks fever episodes and inflammatory response curves. |

**Combined Patient Status Badge:**
- **Stable (Green)**: All 3 metrics are in normal range.
- **Warning (Amber)**: Any metric is amber, none are red.
- **Critical (Red)**: Any metric breaches critical threshold (&lt;92% SpO₂, &gt;38.0°C fever, or &lt;50 / &gt;120 BPM).

---

## 3. Project Directory Structure

```text
C:\patient_monitar\
├── docker-compose.yml              # Complete 3-tier orchestration (Postgres, Backend, Frontend)
├── .env.example                    # Environment variables template
├── simulator.py                    # Multi-scenario ESP32 telemetry hardware simulator
│
├── frontend/                       # React 18 + Vite + Tailwind CSS Application
│   ├── Dockerfile                  # Multi-stage production build (Node 20 -> Nginx 1.25)
│   ├── nginx.conf                  # Nginx reverse proxy configuration (SPA, /api, /ws)
│   ├── package.json                # React, Recharts, Lucide-React, Tailwind
│   ├── vite.config.js              # Vite dev server with proxy settings
│   ├── tailwind.config.js          # Tailwind medical palette and dark mode
│   ├── index.html                  # HTML entry with Inter & JetBrains Mono fonts
│   └── src/
│       ├── main.jsx                # React root entry
│       ├── App.jsx                 # Main layout, tabs, state management
│       ├── index.css               # Tailwind directives, animations & custom components
│       ├── components/
│       │   ├── Header.jsx          # Live connection badge, clock, patient selector, demo toggle
│       │   ├── VitalCards.jsx      # SpO2, HR, Temp cards with trends & status colors
│       │   ├── GaugeAndStatus.jsx  # SpO2 semicircular gauge & overall status badge
│       │   ├── RealtimeCharts.jsx  # 3 auto-scrolling line charts with normal bands
│       │   ├── AlertsPanel.jsx     # Live alerts, Web Audio beep, flashing, acknowledge
│       │   ├── HistoricalView.jsx  # Time-range filter (15m, 1h, 24h, 7d), table, CSV export
│       │   ├── MultiPatientOverview.jsx # Ward grid of all patients with quick navigation
│       │   └── DeviceHealth.jsx    # ESP32 fleet health with 30-second offline warning
│       ├── hooks/
│       │   └── useRealtimeFeed.js  # WebSocket stream + 3s fallback polling + mock switcher
│       └── utils/
│           ├── vitals.js           # Classification logic, status colours, CSV generator
│           └── mockData.js         # Realistic simulated vitals & degradation episodes
│
├── backend/                        # Node.js / Express REST Gateway & WebSocket Service
│   ├── server.js                   # Express server, DB pool & WebSocket broadcast
│   ├── package.json                # Dependencies: express, pg, ws, cors, dotenv
│   └── app/
│       ├── main.py                 # FastAPI alternative endpoints & WebSocket hub
│       └── database.py             # Database connection & models
│
├── database/
│   └── init.sql                    # PostgreSQL schema (patients, readings, alerts, devices)
│
└── esp32_firmware/
    └── covid_patient_monitor.ino   # Complete ESP32 Arduino C++ firmware (MAX30102 + DS18B20)
```

---

## 4. REST & WebSocket API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/readings` | Ingests sensor reading from ESP32, classifies status, saves to DB, broadcasts via WebSocket |
| `GET`  | `/api/patients` | Returns list of quarantined patients enriched with their latest vital readings |
| `GET`  | `/api/readings?patient_id=P001&limit=100` | Returns historical readings in chronological order for chart display |
| `GET`  | `/api/readings/latest?patient_id=P001` | Returns latest reading with computed trend indicators (`up`, `down`, `stable`) |
| `GET`  | `/api/alerts?unresolved_only=true` | Returns active or historical threshold breach alerts |
| `POST` | `/api/alerts/{id}/acknowledge` | Marks an alert as acknowledged by clinician |
| `GET`  | `/api/devices` | Returns ESP32 fleet status with `seconds_since_last_seen` and offline flags |
| `WS`   | `/ws/readings` | Real-time bidirectional WebSocket stream pushing each new reading instantly |

### Ingestion Payload Example
```json
{
  "patient_id": "P001",
  "device_id": "esp32-01",
  "spo2": 96.0,
  "heart_rate": 78.0,
  "temperature": 36.80,
  "timestamp": "2026-10-28T10:15:30Z"
}
```

---

## 5. How to Run the Application

### Option A: Running with Docker Compose (Recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop).

1. **Clone and enter repository**:
   ```bash
   cd C:\patient_monitar
   ```

2. **Start the complete stack**:
   ```bash
   docker-compose up --build
   ```
   This spins up:
   - `postgres`: PostgreSQL 16 on port `5432` with pre-seeded quarantine patients.
   - `backend`: FastAPI API & WebSocket on port `5000`.
   - `frontend`: Nginx serving the React production bundle on port `3000`.

3. **Access the application**:
   - Web Dashboard: [http://localhost:3000](http://localhost:3000)
   - FastAPI Swagger Docs: [http://localhost:5000/docs](http://localhost:5000/docs)

---

### Option B: Running Locally (Development Mode)

#### 1. Backend (Node.js)
```bash
# In C:\patient_monitar:
cd backend
npm install
node server.js
```

#### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Testing the Complete Flow (ESP32 &rarr; Backend &rarr; Database &rarr; Dashboard)

### Flow 1: Hardware-Free Demo Mode (Instant)
1. Open the dashboard at [http://localhost:3000](http://localhost:3000).
2. Click the **▶ Demo Mode** toggle in the top-right header.
3. The dashboard switches to live synthetic streaming simulating real-time vitals, occasional fever (&gt;38°C), silent hypoxia (&lt;92%), and cardiac tachycardia episodes. Watch the line charts scroll and listen to the audio beep when a critical alert triggers!

---

### Flow 2: Testing with the Python IoT Simulator
Simulate an actual ESP32 transmitting over HTTP to the backend:

1. Ensure the backend is running at `http://localhost:5000`.
2. In a separate terminal, launch the simulator:
   ```bash
   # Normal physiological stream (every 2 seconds)
   python simulator.py --patient P001 --scenario normal

   # Trigger a Silent Hypoxia episode (<92% SpO2)
   python simulator.py --patient P001 --scenario hypoxia

   # Trigger High Fever (>38.0°C)
   python simulator.py --patient P001 --scenario fever

   # Trigger Cardiac Tachycardia (>120 BPM)
   python simulator.py --patient P001 --scenario tachycardia
   ```
3. Watch the terminal output:
   ```text
   [TX #0001] 10:15:30 | SpO2: 97.4% | HR:  76 BPM | Temp: 36.85°C -> HTTP 201 [NORMAL - OK]
   [TX #0002] 10:15:32 | SpO2: 91.2% | HR: 104 BPM | Temp: 37.50°C -> HTTP 201 [ALERT - 1 TRIGGERED]
   ```
4. Look at the dashboard:
   - Notice the connection badge is **Live**.
   - SpO₂ Gauge needle moves dynamically.
   - The indicator card turns **Red** on SpO₂ &lt; 92%.
   - The 5-minute scrolling line chart graphs the change against the shaded normal band.
   - The Critical Alert appears in the alerts panel, flashes, and emits an audible synthesizer beep.
   - Click **Acknowledge** on the alert.

---

### Flow 3: Testing with Physical ESP32 Hardware

1. **Hardware Wiring**:
   - **MAX30102**:
     - `VCC` &rarr; ESP32 `3.3V`
     - `GND` &rarr; ESP32 `GND`
     - `SDA` &rarr; ESP32 `GPIO 21`
     - `SCL` &rarr; ESP32 `GPIO 22`
   - **DS18B20**:
     - `VCC` &rarr; ESP32 `3.3V`
     - `GND` &rarr; ESP32 `GND`
     - `DATA` &rarr; ESP32 `GPIO 4` (with 4.7k&Omega; pull-up resistor to 3.3V)
   - **Piezo Buzzer**:
     - `+` &rarr; ESP32 `GPIO 18`
     - `-` &rarr; ESP32 `GND`

2. **Configure Firmware**:
   Open `esp32_firmware/covid_patient_monitor.ino` in Arduino IDE:
   - Set your Wi-Fi SSID and Password:
     ```cpp
     const char* WIFI_SSID     = "Your_WiFi_Network";
     const char* WIFI_PASSWORD = "Your_Password";
     ```
   - Set `BACKEND_SERVER_URL` to your computer's local network IP address:
     ```cpp
     const char* BACKEND_SERVER_URL = "http://192.168.1.50:5000/api/readings";
     ```
   - Install required Arduino libraries: `ArduinoJson` (v6/v7), `SparkFun MAX3010x`, `OneWire`, `DallasTemperature`.
   - Select board **ESP32 Dev Module**, choose the COM port, and click **Upload**.

3. **Verify Execution**:
   - Open Arduino Serial Monitor at `115200` baud.
   - Place your finger on the MAX30102 sensor.
   - Verify HTTP 201 responses from the backend.
   - Observe real-time vital numbers updating on the web dashboard every 2 seconds via WebSocket!

---

## 7. Key Dashboard Features

1. **Header & Connectivity**:
   - Project title and live status badge: **Live (WebSocket)**, **Polling (3s Fallback)**, **Reconnecting**, or **Demo Mode**.
   - Real-time digital clock and quarantine patient selector dropdown.
   - Dark/Light mode theme toggle.
2. **Live Indicator Cards**:
   - SpO₂ (%), Heart Rate (bpm), and Body Temperature (°C) with trend arrows (&uarr;, &darr;, &rarr;) and strict status colors.
3. **Three Real-Time Scrolling Line Charts**:
   - SpO₂, Heart Rate, and Body Temperature plotted against time.
   - Shaded green normal-range target areas.
   - Prominent red/amber threshold lines.
4. **SpO₂ Semicircular Gauge & Overall Status**:
   - Clean SVG dial with colored zones.
   - Overall badge (**Stable / Warning / Critical**) determined by the worst vital parameter.
5. **Audible Alerts Panel**:
   - Live list of threshold breaches with metric, value, severity, and timestamp.
   - Flashing critical alerts accompanied by an audible synthesizer beep (Web Audio API).
   - Instant clinician acknowledge button.
6. **Historical Audit & CSV Export**:
   - Time-range selector (15 min, 1 hr, 24 hr, 7 days).
   - Summary statistics (min, max, average).
   - Paginated telemetry log with one-click **Export CSV** download.
7. **Multi-Patient Ward Overview**:
   - Grid cards for all isolated patients in the quarantine ward.
   - Click any patient card to immediately jump into their live telemetry stream.
8. **ESP32 Fleet Health & 30s Disconnection Warning**:
   - Live status of all ESP32 nodes with last-seen timestamps and automatic warning when sensor data is missing for &gt; 30 seconds.

---

## 8. License & Academic Attribution
Developed as an advanced MCA Major Project IoT Telemetry & Full-Stack Demonstration. Released under the MIT License for educational and research prototyping purposes.
