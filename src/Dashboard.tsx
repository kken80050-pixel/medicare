import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Clock, Phone, Plus, Stethoscope, Pencil } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useBranches } from './BranchProvide';
import type { Branch } from './BranchesData';
import { fetchDoctors } from './doctorstorage';
import type { Doctor } from './doctorstorage';
import { ProfileModal } from './Profile';
import { cancelAppointment, fetchMyAppointments, fromDateKey, formatDay, statusOf, MAX_PENDING } from './AppointmentsStore';
import type { Appointment } from './AppointmentsStore';
import './Dashboard.css';
import { ConfirmDialog } from './ConfirmDialog';
import { Reschedule } from './Reschedule';


export function Dashboard() {
const navigate = useNavigate();
const { user } = useAuth();
const { branches } = useBranches();
const [appointments, setAppointments] = useState<Appointment[]>([]);
const [view, setView] = useState<'appointments' | 'branches' | 'doctors'>('appointments');
const [doctorBranch, setDoctorBranch] = useState('all');
const [editing, setEditing] = useState(false);
const [toCancel, setToCancel] = useState<Appointment | null>(null);
const [toReschedule, setToReschedule] = useState<Appointment | null>(null);
const [askLogout, setAskLogout] = useState(false);

useEffect(() => {
  fetchMyAppointments()
    .then(setAppointments)
    .catch(() => setAppointments([]));
}, []);

const [doctors, setDoctors] = useState<Doctor[]>([]);

useEffect(() => {
  fetchDoctors()
    .then(setDoctors)
    .catch(() => setDoctors([]));
}, []);

const pendingList = appointments
  .filter(item => ['Requested', 'Upcoming'].includes(statusOf(item)))
  .sort((a, b) => fromDateKey(a.dateKey).getTime() - fromDateKey(b.dateKey).getTime());

const nextAppointment = pendingList[0];
const otherUpcoming = pendingList;

const history = appointments
  .filter(item => !['Requested', 'Upcoming'].includes(statusOf(item)))
  .sort((a, b) => fromDateKey(b.dateKey).getTime() - fromDateKey(a.dateKey).getTime());
  
const waitingCount = appointments.filter(item => statusOf(item) === 'Requested').length;
const atLimit = waitingCount >= MAX_PENDING;

const confirmCancel = async () => {
  if (!toCancel) return;
  try {
    await cancelAppointment(toCancel.reference);
    setAppointments(await fetchMyAppointments());
  } catch {
    window.alert('Could not cancel the appointment');
  }
  setToCancel(null);
};

const visibleDoctors = doctors.filter(item => item.active && (doctorBranch === 'all' || item.branchId === doctorBranch));

const reschedule = (item: Appointment) => setToReschedule(item);

const bookAt = (branch: Branch) => navigate('/book', { state: { branch } });

const handleLogout = () => {
  navigate('/', { replace: true, state: { logout: true } });
};
return <div className="medicare-dashboard">
  <aside className="dash-sidebar">
    <a className="brand" href="#top" aria-label="MediCare Clinic home">
      <div className="dash-brand" aria-hidden="true"><Plus size={25} strokeWidth={2.7} /></div>
      <div>MediCare</div>
    </a>
    <nav className="dash-nav">
    <button type = "button" className = {view === 'appointments' ? 'active' : ''} onClick = {() => setView('appointments')}><CalendarDays size ={  15} /> My Appointments</button>
    <button type = "button" className = {view === 'branches' ? 'active' : ''} onClick = {() => setView('branches')}><MapPin size = {15} /> Clinic Branches</button>
    <button type="button" className={view === 'doctors' ? 'active' : ''} onClick={() => setView('doctors')}><Stethoscope size={15} /> Doctors</button>
    </nav>
    <div className="dash-profile">
      <div className="profile-head">
        <span className="profile-avatar" aria-hidden="true">{(user?.name ?? '?').charAt(0).toUpperCase()}</span>
        <div className="profile-id">
          <strong>{user?.name}</strong>
          <span title={user?.email}>{user?.email}</span>
        </div>
      </div>

      <button type="button" className="dash-outline" onClick={() => setEditing(true)}><Pencil size={13} /> Edit Profile</button>
      <button type = "button" className = "dash-logout" onClick = {() => setAskLogout(true)}>Log Out</button>
    </div>
  </aside>

  <main className = "dash-main">
    {view === 'appointments' ? <>
    <div className = "dash-top">
      <h1>Welcome back, {user?.name}</h1>
      <button type = "button" className = "dash-primary" disabled={atLimit} onClick={() => navigate('/book')}>Book an Appointment</button>
    </div>
  {atLimit && <p className="dash-limit">You have {waitingCount} appointment requests waiting for approval. You can book once again when the clinic approves your existing appointment.</p>}

{nextAppointment ? <section className="dash-upcoming">
    <div className="dash-upcoming-head">
      <h2>Next Appointment</h2>
            <span className={`dash-badge ${statusOf(nextAppointment).toLowerCase()}`}>{statusOf(nextAppointment)}</span>
    </div>
    <p className="dash-ref">Ref #{nextAppointment.reference} • {formatDay(nextAppointment.dateKey, 'long')} at {nextAppointment.slot}</p>
    <p className="dash-branch">Branch: {nextAppointment.branchName}</p>
    <div className="dash-actions">
      <button type="button" className="dash-primary" onClick={() => navigate(`/appointment/${nextAppointment.reference}`)}>View Details</button>
      <button type="button" className="dash-outline" onClick={() => reschedule(nextAppointment)}>Reschedule</button>
      <button type="button" className="dash-danger" onClick={() => setToCancel(nextAppointment)}>Cancel</button>
    </div>
  </section> : <section className="dash-upcoming dash-upcoming-empty">
    <h2>No upcoming appointment</h2>
    <p className="dash-branch">Book a visit at any MediCare branch to see it here.</p>
  </section>}

<div className="dash-columns">
  <section aria-labelledby="other-title">
    <h2 className="dash-history-title" id="other-title">Upcoming Appointments</h2>
    {otherUpcoming.length === 0 ? <div className="dash-upcoming-item dash-upcoming-none">
        <p className="dash-branch">No other upcoming appointments.</p>
      </div> : <div className="dash-upcoming-list">
        {otherUpcoming.map(item => <article className="dash-upcoming-item" key={item.reference}>
            <p className="dash-ref">Ref #{item.reference} • {formatDay(item.dateKey, 'short')} at {item.slot}</p>
            <p className="dash-branch">Branch: {item.branchName}</p>
            <div className="dash-actions">
              <button type="button" className="dash-primary" onClick={() => navigate(`/appointment/${item.reference}`)}>View Details</button>
              <button type="button" className="dash-outline" onClick={() => reschedule(item)}>Reschedule</button>
              <button type="button" className="dash-danger" onClick={() => setToCancel(item)}>Cancel</button>
            </div>
          </article>)}
      </div>}
  </section>

  <section aria-labelledby="history-title">
    <h2 className="dash-history-title" id="history-title">Appointment History</h2>
    <div className="dash-table-wrap">
      <table className="dash-table">
        <thead>
          <tr><th>Booking Ref</th><th>Clinic Branch</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          {history.length === 0 ? <tr><td colSpan={4} className="dash-empty">No completed or cancelled appointments yet.</td></tr> : history.map(item => {
            const status = statusOf(item);
            return <tr key={item.reference}>
                <td><strong>#{item.reference}</strong></td>
                <td className="dash-wrap">
                  {item.branchName}
                  <span className="dash-sub">{formatDay(item.dateKey, 'short')} • {item.slot}</span>
                </td>
                <td><span className={`dash-badge ${status.toLowerCase()}`}>{status}</span></td>
                <td><Link to={`/appointment/${item.reference}`} className="dash-link">View Details</Link></td>
              </tr>;
          })}
        </tbody>
      </table>
    </div>
  </section>
</div>
    </> : view === 'branches' ? <>
    <div className = "dash-top">
    <h1>Clinic Branches</h1>
    </div>
    <div className = "dash-branch-list">
      {branches.map(branch => <article className = "dash-branch-card" key = {branch.name}>
    <h3>{branch.name}</h3>
    <ul>
      <li><MapPin size = {14} /> {branch.address}</li>
      <li><Phone size = {14} /> {branch.phone}</li>
      <li><Clock size = {14} /> {branch.hours}</li>
      </ul>
      <button type = "button" className = "dash-primary" disabled={atLimit} onClick = {() => bookAt(branch)}>Book at This Branch</button>
        </article>)}
        </div>
      </> : <>
  <div className="dash-top">
    <h1>Our Doctors</h1>
    <select className="dash-select" value={doctorBranch} onChange={event => setDoctorBranch(event.target.value)}>
      <option value="all">All branches</option>
      {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
    </select>
  </div>
  <div className="dash-branch-list">
    {visibleDoctors.map(doctor => {
      const branch = branches.find(entry => entry.id === doctor.branchId);
      if (!branch) return null;
      return <article className="dash-branch-card" key={doctor.id}>
          <h3>{doctor.name}</h3>
          <ul>
            <li><Stethoscope size={14} /> {doctor.specialty}</li>
            <li><MapPin size={14} /> {branch.name}</li>
            <li><Clock size={14} /> {doctor.days}</li>
          </ul>
          <button type="button" className="dash-primary" disabled={atLimit} onClick={() => navigate('/book', { state: { branch, doctor } })}>Book with this Doctor</button>
        </article>;
    })}
  </div>
  </>}
  </main>
  {toReschedule && <Reschedule
    appointment={toReschedule}
    onClose={() => setToReschedule(null)}
    onDone={async () => {
      setToReschedule(null);
      setAppointments(await fetchMyAppointments());
    }}
  />}
  <ConfirmDialog
    open={toCancel !== null}
    title="Cancel this appointment?"
    confirmLabel="Cancel appointment"
    cancelLabel="Keep appointment"
    onConfirm={confirmCancel}
    onCancel={() => setToCancel(null)}>{toCancel && <div className="cancel-details">
      <p><span>Ref</span><strong>#{toCancel.reference}</strong></p>
      <p><span>Date</span><strong>{formatDay(toCancel.dateKey, 'long')}</strong></p>
      <p><span>Time</span><strong>{toCancel.slot}</strong></p>
      <p className="cancel-warning">This can't be undone.</p>
    </div>}</ConfirmDialog>
  <ConfirmDialog
    open={askLogout}
    title="Log out of MediCare?"
    confirmLabel="Log out"
    cancelLabel="Stay logged in"
    onConfirm={handleLogout}
    onCancel={() => setAskLogout(false)}>You will need to relogin once again to book or manage your appointments.</ConfirmDialog>
  {editing && <ProfileModal onClose={() => setEditing(false)} />}
</div>;
}