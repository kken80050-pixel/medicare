import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cancelAppointment, fetchAppointment, formatDay, statusOf } from './AppointmentsStore';
import type { Appointment } from './AppointmentsStore';
import './Dashboard.css';
import { ConfirmDialog } from './ConfirmDialog';
import { Reschedule } from './Reschedule';

export function AppointmentDetails() {
  const { reference } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    if (!reference) return;
    fetchAppointment(reference)
      .then(setAppointment)
      .catch(() => navigate('/dashboard', { replace: true }));
  }, [reference, navigate]);

  if (!appointment) return null;

  const status = statusOf(appointment);

const cancel = async () => {
  setConfirmOpen(false);
  try {
    setAppointment(await cancelAppointment(appointment.reference));
  } catch {
    window.alert('Could not cancel the appointment. Please try again.');
  }
};

  return <div className="medicare-dashboard medicare-details">
      <div className="dash-details-wrap">
        <Link to="/dashboard" className="dash-back">← Back to Patient Dashboard</Link>
        <section className="dash-details-card">
          <div className="dash-details-head">
            <h1>Appointment Details Summary</h1>
            <span className={`dash-badge ${status.toLowerCase()}`}>{status}</span>
          </div>
          <div className="dash-details-grid">
            <div><small>Booking Reference</small><strong className="dash-ref-large">#{appointment.reference}</strong></div>
            <div><small>Date &amp; Time</small><strong>{formatDay(appointment.dateKey, 'full')} • {appointment.slot}</strong></div>
          </div>
          <div className="dash-details-block">
            <small>Clinic Branch &amp; Full Address</small>
            <strong>{appointment.branchName}</strong>
            <span>{appointment.branchAddress} • Phone: {appointment.branchPhone}</span>
          </div>
          <div className="dash-details-block">
            <small>Patient Information</small>
            <strong>{appointment.fullName}</strong>
            <span>Email: {appointment.email} | Phone: {appointment.phone}</span>
            <span>Visit Notes: {appointment.reason || 'No reason provided'}</span>
          {appointment.rescheduledFrom && <span>Rescheduled from #{appointment.rescheduledFrom}: {appointment.rescheduleReason}</span>}
          </div>
          {['Requested', 'Upcoming'].includes(status) && <div className="dash-actions dash-details-actions">
              <button type="button" className="dash-primary" onClick={() => setRescheduling(true)}>Reschedule Appointment</button>
              <button type="button" className="dash-danger" onClick={() => setConfirmOpen(true)}>Cancel Appointment</button>
            </div>}
        </section>
      </div>
      {rescheduling && <Reschedule appointment={appointment} onClose={() => setRescheduling(false)} onDone={() => navigate('/dashboard')}/>}

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel this appointment?"
        confirmLabel="Yes, cancel appointment"
        cancelLabel="Keep appointment"
        onConfirm={cancel}
        onCancel={() => setConfirmOpen(false)}>
        <div className="cancel-details">
          <p><span>Ref</span><strong>#{appointment.reference}</strong></p>
          <p><span>Date</span><strong>{formatDay(appointment.dateKey, 'long')}</strong></p>
          <p><span>Time</span><strong>{appointment.slot}</strong></p>
          <p className="cancel-warning">This can't be undone.</p>
        </div>
      </ConfirmDialog>
    </div>;
}