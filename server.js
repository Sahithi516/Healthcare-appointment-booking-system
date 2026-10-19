import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'healthcare-appointment-api' }));

app.get('/api/doctors', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name, specialty, clinic, consultation_fee FROM doctors ORDER BY name');
    res.json(result.rows);
  } catch (e) { next(e); }
});

app.post('/api/appointments', async (req, res, next) => {
  const { patientName, patientEmail, doctorId, appointmentDate, appointmentTime } = req.body ?? {};
  if (![patientName, patientEmail, doctorId, appointmentDate, appointmentTime].every(v => String(v ?? '').trim()))
    return res.status(400).json({ error: 'All appointment fields are required.' });
  try {
    const result = await pool.query(
      `INSERT INTO appointments (patient_name, patient_email, doctor_id, appointment_date, appointment_time)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, patient_name, patient_email, doctor_id, appointment_date, appointment_time, status`,
      [patientName.trim(), patientEmail.trim(), Number(doctorId), appointmentDate, appointmentTime]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'That doctor slot is already booked.' });
    if (e.code === '23503') return res.status(400).json({ error: 'Choose a valid doctor.' });
    next(e);
  }
});

app.get('/api/appointments', async (req, res, next) => {
  const email = String(req.query.email ?? '').trim();
  if (!email) return res.status(400).json({ error: 'Provide an email query parameter.' });
  try {
    const result = await pool.query(
      `SELECT a.id,a.patient_name,a.patient_email,a.appointment_date,a.appointment_time,a.status,
              d.name AS doctor_name,d.specialty
       FROM appointments a JOIN doctors d ON d.id=a.doctor_id
       WHERE lower(a.patient_email)=lower($1)
       ORDER BY a.appointment_date,a.appointment_time`, [email]);
    res.json(result.rows);
  } catch (e) { next(e); }
});

app.patch('/api/appointments/:id/cancel', async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE appointments SET status='cancelled' WHERE id=$1 AND status='booked' RETURNING id,status`,
      [Number(req.params.id)]);
    if (!result.rowCount) return res.status(404).json({ error: 'Bookable appointment not found.' });
    res.json(result.rows[0]);
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Server error. Check backend logs and database setup.' });
});
app.listen(Number(process.env.PORT || 4000), () => console.log('Healthcare API listening on port ' + (process.env.PORT || 4000)));
