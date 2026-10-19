CREATE TABLE IF NOT EXISTS doctors (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  clinic VARCHAR(160) NOT NULL,
  consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0)
);
CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  patient_name VARCHAR(120) NOT NULL,
  patient_email VARCHAR(254) NOT NULL,
  doctor_id BIGINT NOT NULL REFERENCES doctors(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, appointment_date, appointment_time)
);
INSERT INTO doctors (name, specialty, clinic, consultation_fee)
SELECT * FROM (VALUES
 ('Dr. Ananya Rao','Cardiology','City Care Clinic',700.00::numeric),
 ('Dr. Rahul Mehta','Dermatology','Green Cross Clinic',500.00::numeric),
 ('Dr. Priya Nair','General Medicine','Wellness Health Centre',400.00::numeric)
) AS seed(name,specialty,clinic,consultation_fee)
WHERE NOT EXISTS (SELECT 1 FROM doctors);
