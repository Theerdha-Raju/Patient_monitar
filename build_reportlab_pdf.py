import os
import sys
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

pdf_filename = r"C:\covid_patient\Smart_Patient_Health_Monitoring_Report.pdf"

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        if self._pageNumber > 1:
            self.saveState()
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(40, 40, 555, 40)
            self.drawString(40, 28, "Smart Patient Health Monitoring System — MCA Project Dossier")
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(555, 28, page_text)
            self.restoreState()

def build_pdf():
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0d9488")
    dark_color = colors.HexColor("#0f172a")
    text_color = colors.HexColor("#1e293b")
    light_bg = colors.HexColor("#f8fafc")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=dark_color,
        alignment=1, # Center
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=primary_color,
        alignment=1,
        spaceAfter=20
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0369a1"),
        alignment=1,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=dark_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=text_color,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#f8fafc")
    )

    th_style = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )

    td_style = ParagraphStyle(
        'TD',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=text_color
    )

    story = []

    # ================= COVER PAGE =================
    story.append(Spacer(1, 20))
    story.append(Paragraph("ACADEMIC PROJECT TECHNICAL DOSSIER", badge_style))
    story.append(Paragraph("SMART PATIENT HEALTH MONITORING SYSTEM", title_style))
    story.append(Paragraph("IoT-Based Real-Time In-Patient Vital Signs Telemetry & Central Hospital Dashboard", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=primary_color, spaceBefore=5, spaceAfter=20))

    story.append(Paragraph(
        "A Cyber-Physical Clinical Healthcare Telemetry Solution leveraging ESP32 IoT Edge Nodes, Optical Photoplethysmography "
        "(Heart Rate & SpO₂), Dallas 1-Wire Digital Thermometry, Node.js/FastAPI REST & WebSocket Gateways, "
        "PostgreSQL Relational Storage, and a React Live Hospital Dashboard.",
        ParagraphStyle('Intro', parent=body_style, alignment=1, fontSize=9.5, leading=14, textColor=colors.HexColor("#475569"))
    ))
    story.append(Spacer(1, 25))

    meta_data = [
        [Paragraph("<b>Course / Degree:</b>", td_style), Paragraph("Master of Computer Applications (MCA)", td_style)],
        [Paragraph("<b>Core Domains:</b>", td_style), Paragraph("Internet of Things (IoT), Full-Stack Engineering, Biomedical Informatics", td_style)],
        [Paragraph("<b>Application Area:</b>", td_style), Paragraph("General Inpatients, Intensive Care Units (ICU), Post-Operative Recovery", td_style)],
        [Paragraph("<b>Hardware IoT Node:</b>", td_style), Paragraph("ESP32 Dev Module (Node ID: ESP32-001)", td_style)],
        [Paragraph("<b>Primary Sensors:</b>", td_style), Paragraph("MAX30102 (Pulse Rate & SpO₂), DS18B20 (Body Temperature)", td_style)],
        [Paragraph("<b>Backend Server:</b>", td_style), Paragraph("Node.js Express / Python FastAPI REST & WebSocket Gateway (Port 5000)", td_style)],
        [Paragraph("<b>Database:</b>", td_style), Paragraph("PostgreSQL 16 Relational Engine (Health Monitoring Database)", td_style)],
        [Paragraph("<b>Frontend Dashboard:</b>", td_style), Paragraph("React 18 + Vite + TailwindCSS SPA (Port 3000)", td_style)],
        [Paragraph("<b>Containerization:</b>", td_style), Paragraph("Docker & Docker Compose (3-Tier Microservices Architecture)", td_style)],
        [Paragraph("<b>Documentation Date:</b>", td_style), Paragraph("October 2026", td_style)],
    ]
    meta_table = Table(meta_data, colWidths=[150, 365])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), light_bg),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(meta_table)
    story.append(PageBreak())

    # ================= SECTION 1: EXECUTIVE SUMMARY =================
    story.append(Paragraph("1. Executive Summary & Clinical Objectives", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=8))
    story.append(Paragraph(
        "The <b>Smart Patient Health Monitoring System</b> is an end-to-end cyber-physical IoT telemetry solution engineered "
        "for continuous, automated observation of vital physiological signs for hospitalized patients across general inpatient wards, "
        "recovery suites, and intensive care units. It is an open, universal vital signs monitoring platform, not a single-disease diagnostic tool.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Clinical Problem Solved:</b> In conventional hospital wards, vital signs are manually collected by nursing staff "
        "every 4 to 8 hours. Between these observation cycles, sudden physiological deterioration—such as silent hypoxia, cardiac arrhythmias, "
        "or sudden febrile spikes—can go unnoticed. This platform automates continuous vital collection, streaming data wirelessly every "
        "<b>3 seconds</b> directly from the patient's bedside to a central hospital dashboard, triggering immediate alarms if vitals cross safe clinical boundaries.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Key Innovation — Resilient Clinical Fault Tolerance:</b> Unlike naive IoT prototypes where sensor disconnection or wire faults "
        "cause firmware crashes, this system implements automated fault-tolerant sensing. If the physical I2C sensor disconnects or encounters bus failure, "
        "the ESP32 firmware dynamically engages its onboard clinical simulation algorithm to maintain unbroken telemetry streaming, "
        "while the dashboard clearly informs clinical staff of the hardware disconnection.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # ================= SECTION 2: 5-LAYER ARCHITECTURE =================
    story.append(Paragraph("2. System Architecture & 5-Layer Model", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=8))
    
    arch_data = [
        [Paragraph("Layer", th_style), Paragraph("Primary Technologies", th_style), Paragraph("Key Functions & Responsibilities", th_style)],
        [Paragraph("<b>1. Perception Layer</b>", td_style), Paragraph("ESP32, MAX30102, DS18B20, Active Buzzer, Status LED", td_style), Paragraph("50 Hz optical PPG wave sampling, temperature analog-to-digital conversion, local audio alarm triggering.", td_style)],
        [Paragraph("<b>2. Network Layer</b>", td_style), Paragraph("Wi-Fi 802.11 b/g/n, HTTP/1.1 REST, WebSockets", td_style), Paragraph("Secure JSON packaging, transmission every 3 seconds, non-blocking auto-reconnect on network dropouts.", td_style)],
        [Paragraph("<b>3. Processing Layer</b>", td_style), Paragraph("Node.js Express, Python FastAPI, Uvicorn", td_style), Paragraph("Telemetry ingestion, mathematical sanitization, clinical rule boundary evaluation, WebSocket broadcast.", td_style)],
        [Paragraph("<b>4. Database Layer</b>", td_style), Paragraph("PostgreSQL 16 Relational Engine", td_style), Paragraph("Time-series telemetry persistence, patient demographic registry, clinical alert tracking, IoT device registry.", td_style)],
        [Paragraph("<b>5. Presentation Layer</b>", td_style), Paragraph("React 18, Vite, TailwindCSS, Recharts", td_style), Paragraph("Live clinical gauges, real-time hardware status beacons, multi-bed ward registry, interactive trend curves.", td_style)]
    ]
    t_arch = Table(arch_data, colWidths=[95, 150, 270])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 10))

    # ================= SECTION 3: HARDWARE SPECIFICATIONS =================
    story.append(Paragraph("3. Hardware Specifications & Pin Configuration", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=8))
    
    hw_data = [
        [Paragraph("Component", th_style), Paragraph("Model / Spec", th_style), Paragraph("Operating Voltage", th_style), Paragraph("ESP32 Wiring / Protocol", th_style)],
        [Paragraph("<b>Microcontroller</b>", td_style), Paragraph("ESP-WROOM-32 (Dual-Core 240MHz, 520KB SRAM)", td_style), Paragraph("5V USB / 3.3V Logic", td_style), Paragraph("Main edge computing node & Wi-Fi station", td_style)],
        [Paragraph("<b>Pulse Oximeter</b>", td_style), Paragraph("MAX30102 (Red 660nm + IR 880nm Optical PPG)", td_style), Paragraph("3.3V - 5V", td_style), Paragraph("SDA → GPIO 21, SCL → GPIO 22 (I2C at 100 kHz)", td_style)],
        [Paragraph("<b>Temperature Sensor</b>", td_style), Paragraph("DS18B20 Digital Thermometer (±0.5°C accuracy)", td_style), Paragraph("3.0V - 5.5V", td_style), Paragraph("DATA → GPIO 4 (1-Wire with 4.7kΩ pull-up)", td_style)],
        [Paragraph("<b>Local Alarm Buzzer</b>", td_style), Paragraph("5V Active Piezoelectric Buzzer", td_style), Paragraph("3.3V - 5V", td_style), Paragraph("POS → GPIO 18, NEG → GND", td_style)],
        [Paragraph("<b>Status Indicator</b>", td_style), Paragraph("Onboard SMD Blue LED", td_style), Paragraph("3.3V", td_style), Paragraph("GPIO 2 (Blinks on telemetry transmission)", td_style)]
    ]
    t_hw = Table(hw_data, colWidths=[90, 160, 95, 170])
    t_hw.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_hw)
    story.append(PageBreak())

    # ================= SECTION 4: DATABASE SCHEMA =================
    story.append(Paragraph("4. PostgreSQL Relational Database Schema", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=8))
    story.append(Paragraph(
        "Database Engine: <b>PostgreSQL 16</b>. The relational schema enforces strict foreign key constraints, timestamp indexing, and ACID guarantees:",
        body_style
    ))

    db_data = [
        [Paragraph("Table Name", th_style), Paragraph("Primary / Foreign Keys", th_style), Paragraph("Stored Attributes & Data Types", th_style)],
        [Paragraph("<code>patients</code>", td_style), Paragraph("<code>patient_id</code> (VARCHAR, PK)", td_style), Paragraph("<code>name</code>, <code>age</code>, <code>gender</code>, <code>room_number</code>, <code>admission_date</code>, <code>status</code>, <code>comorbidities</code>, <code>contact_emergency</code>", td_style)],
        [Paragraph("<code>telemetry</code>", td_style), Paragraph("<code>id</code> (BIGSERIAL, PK)<br/><code>patient_id</code> (FK)", td_style), Paragraph("<code>heart_rate</code> (NUMERIC), <code>spo2</code> (NUMERIC), <code>temperature</code> (NUMERIC), <code>respiration_rate</code>, <code>battery_level</code>, <code>device_id</code>, <code>timestamp</code>", td_style)],
        [Paragraph("<code>alerts</code>", td_style), Paragraph("<code>id</code> (BIGSERIAL, PK)<br/><code>patient_id</code> (FK)", td_style), Paragraph("<code>alert_type</code>, <code>severity</code>, <code>value</code>, <code>threshold</code>, <code>message</code>, <code>resolved</code> (BOOLEAN), <code>timestamp</code>", td_style)],
        [Paragraph("<code>devices</code>", td_style), Paragraph("<code>device_id</code> (VARCHAR, PK)<br/><code>patient_id</code> (FK)", td_style), Paragraph("<code>status</code> ('ONLINE'/'OFFLINE'), <code>ip_address</code>, <code>last_seen</code> (TIMESTAMPTZ), <code>firmware_version</code>", td_style)],
        [Paragraph("<code>health_readings</code>", td_style), Paragraph("<code>id</code> (BIGSERIAL, PK)<br/><code>patient_id</code> (FK)", td_style), Paragraph("Historical time-series archive for multi-parameter clinical charting", td_style)]
    ]
    t_db = Table(db_data, colWidths=[95, 120, 300])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_db)
    story.append(Spacer(1, 10))

    # ================= SECTION 5: CLINICAL ALERTS =================
    story.append(Paragraph("5. Clinical Thresholds & Medical Alarm Rules", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=8))
    
    alert_data = [
        [Paragraph("Vital Sign", th_style), Paragraph("Normal Range", th_style), Paragraph("Warning Boundary", th_style), Paragraph("Critical Alarm", th_style), Paragraph("Automated System Action", th_style)],
        [Paragraph("<b>Blood Oxygen (SpO₂)</b>", td_style), Paragraph("95.0% - 100.0%", td_style), Paragraph("92.0% - 94.9% (Mild Hypoxia)", td_style), Paragraph("&lt; 92.0% (Severe Hypoxia)", td_style), Paragraph("Buzzer ON (GPIO 18), DB alert logged, UI flashes red", td_style)],
        [Paragraph("<b>Body Temperature</b>", td_style), Paragraph("36.10°C - 37.20°C", td_style), Paragraph("37.30°C - 38.00°C (Low Fever)", td_style), Paragraph("&gt; 38.00°C (Pyrexia)", td_style), Paragraph("Bedside alarm active, Temperature card warning state", td_style)],
        [Paragraph("<b>Heart Rate (Pulse)</b>", td_style), Paragraph("60 - 100 BPM", td_style), Paragraph("50 - 59 BPM (Bradycardia)", td_style), Paragraph("&gt; 100 BPM (Tachycardia)", td_style), Paragraph("Logged into Clinical Alerts registry with timestamp", td_style)]
    ]
    t_alert = Table(alert_data, colWidths=[90, 85, 95, 95, 150])
    t_alert.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_alert)
    story.append(Spacer(1, 10))

    # ================= SECTION 6: DOCKER DEPLOYMENT =================
    story.append(Paragraph("6. Containerized Deployment (Docker Microservices)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=8))
    story.append(Paragraph(
        "The platform is packaged into 3 isolated Docker microservices orchestrated via <code>docker-compose.yml</code>:",
        body_style
    ))

    docker_data = [
        [Paragraph("Container Service", th_style), Paragraph("Base Image", th_style), Paragraph("Port Mapping", th_style), Paragraph("Service Description", th_style)],
        [Paragraph("<code>postgres_db</code>", td_style), Paragraph("<code>postgres:16-alpine</code>", td_style), Paragraph("5432 : 5432", td_style), Paragraph("Persistent database with automated health checks and named data volume.", td_style)],
        [Paragraph("<code>health_monitor_api</code>", td_style), Paragraph("<code>python:3.12-slim</code> / <code>node:20</code>", td_style), Paragraph("5000 : 5000", td_style), Paragraph("Telemetry ingestion gateway, REST endpoints, and WebSocket push server.", td_style)],
        [Paragraph("<code>health_monitor_dashboard</code>", td_style), Paragraph("<code>nginx:1.25-alpine</code>", td_style), Paragraph("80 : 3000", td_style), Paragraph("Production build of React Single Page Application served via Nginx reverse proxy.", td_style)]
    ]
    t_docker = Table(docker_data, colWidths=[120, 105, 75, 215])
    t_docker.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_docker)
    story.append(PageBreak())

    # ================= SECTION 7: TESTING & DEMONSTRATION =================
    story.append(Paragraph("7. Testing & Demonstration Guide", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph("<b>Demonstration Procedure for Project Evaluation:</b>", h2_style))
    story.append(Paragraph("<b>Step 1: Physical Stream Verification:</b> Open Arduino Serial Monitor at 115200 baud. Observe live pulse rate, SpO₂, and body temperature printed every 1 second, and HTTP POST (Code 201) transmission every 3 seconds.", bullet_style))
    story.append(Paragraph("<b>Step 2: Database Audit:</b> Query PostgreSQL to verify real incoming telemetry rows with millisecond timestamps and increasing ID sequence.", bullet_style))
    story.append(Paragraph("<b>Step 3: Real-Time Dashboard:</b> Open <code>http://localhost:3000</code> to observe the <b>🟢 LIVE ESP32 HARDWARE STREAM ACTIVE</b> banner with dynamic gauges and trend charts.", bullet_style))
    story.append(Paragraph("<b>Step 4: Live Hardware Disconnect Test:</b> Unplug the ESP32 USB cable. Within 15 seconds, the dashboard turns <b>🔴 RED: [!] ESP32 HARDWARE NOT CONNECTED / OFFLINE</b>. Plug back in, and it recovers to <b>🟢 GREEN</b> in 3 seconds.", bullet_style))
    story.append(Spacer(1, 10))

    # ================= SECTION 8: VIVA QUESTIONS & ANSWERS =================
    story.append(Paragraph("8. Project Viva Examination Q&A Cheat Sheet", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=2, spaceAfter=8))

    viva_data = [
        [Paragraph("Examiner Question", th_style), Paragraph("Recommended Academic Response", th_style)],
        [
            Paragraph("<b>What is the clinical scope of this project?</b>", td_style),
            Paragraph("It is a general in-patient vital signs monitoring and telemetry system designed for continuous tracking of Heart Rate, SpO₂, and Temperature across hospital wards and recovery units. It is an open physiological monitoring platform, not a single-disease diagnostic tool.", td_style)
        ],
        [
            Paragraph("<b>Why ESP32 instead of Arduino Uno or Raspberry Pi?</b>", td_style),
            Paragraph("Arduino Uno lacks built-in networking. Raspberry Pi consumes high power and is expensive for edge nodes. The ESP32 offers dual-core 240MHz processing, hardware I2C/1-Wire controllers, built-in 2.4GHz Wi-Fi, and low power sleep modes at minimal cost.", td_style)
        ],
        [
            Paragraph("<b>How does the MAX30102 calculate SpO₂?</b>", td_style),
            Paragraph("It emits Red (660nm) and Infrared (880nm) light into fingertip capillaries. Deoxygenated hemoglobin absorbs more Red light, while oxygenated hemoglobin absorbs more Infrared light. The ratio of ratios R = (AC_red / DC_red) / (AC_ir / DC_ir) maps to calibration curves to calculate SpO₂ percentage.", td_style)
        ],
        [
            Paragraph("<b>How does the system ensure patient privacy?</b>", td_style),
            Paragraph("The system uses pseudonymized identifiers (P001, PAT-101) rather than transmitting Personally Identifiable Information (PII) like national identity numbers or names in the telemetry packets.", td_style)
        ],
        [
            Paragraph("<b>What happens if a sensor wire disconnects?</b>", td_style),
            Paragraph("The firmware implements <b>resilient fault tolerance</b>: if the I2C bus encounters a hardware fault, the onboard clinical model maintains vital sign continuity to prevent firmware crash, while the dashboard informs clinical staff of the hardware disconnection.", td_style)
        ],
        [
            Paragraph("<b>Why choose PostgreSQL over NoSQL (MongoDB)?</b>", td_style),
            Paragraph("Clinical health monitoring requires relational integrity (patients are strictly linked to devices, rooms, and alerts). PostgreSQL provides ACID transactional guarantees, strong data typing, and native support for time-series indexing.", td_style)
        ]
    ]
    t_viva = Table(viva_data, colWidths=[165, 350])
    t_viva.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_viva)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: Generated PDF at {pdf_filename}")

if __name__ == '__main__':
    build_pdf()
