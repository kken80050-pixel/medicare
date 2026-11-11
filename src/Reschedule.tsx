import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { ApiError } from './api';
import { createAppointment, formatDay, toDateKey } from './AppointmentsStore';
import type { Appointment } from './AppointmentsStore';
import { fetchSlots } from './ScheduleStore';
import type { Slot } from './ScheduleStore';

interface RescheduleProp {
  appointment: Appointment;
  onClose: () => void;
  onDone: () => void;
}

function buildMonthCells(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leadingBlanks = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (Date | null)[] = Array(leadingBlanks).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, monthIndex, day));
  return cells;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function Reschedule({ appointment, onClose, onDone }: RescheduleProp) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() + 6, 1);

  const [viewMonth, setViewMonth] = useState(thisMonth);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelectedSlot('');
    fetchSlots(appointment.branchId, toDateKey(selectedDate))
      .then(list => {
        if (active) setSlots(list);
      })
      .catch(() => {
        if (active) setSlots([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appointment.branchId, selectedDate]);

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const cells = buildMonthCells(viewMonth);
  const changeMonth = (offset: number) => setViewMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  const submit = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    setError('');
    try {
      await createAppointment({
        branchId: appointment.branchId,
        dateKey: toDateKey(selectedDate),
        slot: selectedSlot,
        fullName: appointment.fullName,
        email: appointment.email,
        phone: appointment.phone,
        reason: appointment.reason,
        rescheduleReference: appointment.reference
      });
      onDone();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Could not reschedule. Please try again.');
      setSaving(false);
    }
  };

  return <div className="reschedule-overlay" onClick={onClose}>
      <div className="reschedule-modal" role="dialog" aria-modal="true" aria-labelledby="reschedule-title" onClick={event => event.stopPropagation()}>
        <h2 id="reschedule-title">Reschedule Appointment</h2>
        <p className="reschedule-current">
          Current: <strong>{formatDay(appointment.dateKey, 'long')} at {appointment.slot}</strong><br />
          {appointment.branchName}
        </p>

        <div className="reschedule-calendar">
          <div className="reschedule-month">
            <button type="button" aria-label="Previous month" disabled={viewMonth <= thisMonth} onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></button>
            <strong>{monthLabel}</strong>
            <button type="button" aria-label="Next month" disabled={viewMonth >= lastMonth} onClick={() => changeMonth(1)}><ChevronRight size={16} /></button>
          </div>
          <div className="reschedule-week">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <span key={day}>{day}</span>)}</div>
          <div className="reschedule-days">
            {cells.map((date, index) => date === null
              ? <span key={`blank-${index}`} />
              : <button type="button" key={date.toISOString()} disabled={date < today} className={isSameDay(date, selectedDate) ? 'reschedule-day selected' : 'reschedule-day'} onClick={() => setSelectedDate(date)}>{date.getDate()}</button>)}
          </div>
        </div>

        <div>
          <strong>Available times for {formatDay(toDateKey(selectedDate), 'short')}</strong>
          <div className = "reschedule-slots">
            {loading ? <p className = "reschedule-note">Loading times…</p> : slots.length === 0 ? <p className = "reschedule-note">No times available on this day.</p> : slots.map(slot => <button
                type="button"
                key = {slot.label}
                disabled = {slot.state === 'unavailable'}
                className = {selectedSlot === slot.label ? 'reschedule-slot selected' : 'reschedule-slot'}
                onClick = {() => setSelectedSlot(current => (current === slot.label ? '' : slot.label))}
              >{selectedSlot === slot.label && <Check size={12} />} {slot.label}</button>)}
          </div>
        </div>

        <p className = "reschedule-note">New request goes directly to the clinic for approval and your current appointment will be automcatically cancelled.</p>
        {error && <p className = "reschedule-error" role="alert">{error}</p>}
        <div className = "reschedule-actions">
          <button type = "button" className = "dash-outline" onClick = {onClose}>Close</button>
          <button type = "button" className = "dash-primary" disabled = {!selectedSlot || saving} onClick={submit}>{saving ? 'Saving…' : 'Confirm Reschedule'}</button>
        </div>
      </div>
    </div>;
}