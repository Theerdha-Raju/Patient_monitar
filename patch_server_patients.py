with open(r'C:\covid_patient\backend\server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update GET /api/patients
old_get_patients = """    const { rows } = await db.query(query);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});"""

new_get_patients = """    const { rows } = await db.query(query);
    const formatted = rows.map(r => {
      const hasReading = r.heart_rate !== null && r.heart_rate !== undefined;
      return {
        ...r,
        latest_reading: hasReading ? {
          temperature: r.temperature,
          heart_rate: r.heart_rate,
          pulse_rate: r.heart_rate,
          spo2: r.spo2,
          respiration_rate: r.respiration_rate,
          battery_level: r.battery_level,
          timestamp: r.last_telemetry_at
        } : null
      };
    });
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});"""

if old_get_patients in content:
    content = content.replace(old_get_patients, new_get_patients)
    print("PATCHED GET /api/patients")
else:
    print("FAILED to find old_get_patients")

# 2. Update GET /api/patients/:id
old_get_patient_id = """    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});"""

new_get_patient_id = """    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    const patientData = { ...rows[0] };
    const hasReading = patientData.heart_rate !== null && patientData.heart_rate !== undefined;
    patientData.latest_reading = hasReading ? {
      temperature: patientData.temperature,
      heart_rate: patientData.heart_rate,
      pulse_rate: patientData.heart_rate,
      spo2: patientData.spo2,
      respiration_rate: patientData.respiration_rate,
      battery_level: patientData.battery_level,
      timestamp: patientData.last_telemetry_at
    } : null;

    let recent = await db.query(`
      SELECT id, patient_id, heart_rate, spo2, temperature, respiration_rate, battery_level, device_id, timestamp
      FROM telemetry
      WHERE patient_id = $1
      ORDER BY timestamp DESC
      LIMIT 10;
    `, [patient_id]);
    if (recent.rows.length === 0) {
      recent = await db.query(`
        SELECT id, patient_id, heart_rate, spo2, temperature, 18.0 AS respiration_rate, 95.0 AS battery_level, 'ESP32-SIM' AS device_id, timestamp
        FROM health_readings
        WHERE patient_id = $1
        ORDER BY timestamp DESC
        LIMIT 10;
      `, [patient_id]);
    }
    patientData.recent_readings = recent.rows.map(r => ({
      ...r,
      pulse_rate: r.heart_rate
    }));

    res.json({ success: true, data: patientData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});"""

if old_get_patient_id in content:
    content = content.replace(old_get_patient_id, new_get_patient_id)
    print("PATCHED GET /api/patients/:id")
else:
    print("FAILED to find old_get_patient_id")

with open(r'C:\covid_patient\backend\server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Saved backend/server.js")
