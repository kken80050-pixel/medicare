import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface ClosedDate {
  dateKey: string;
  reason: string;
}

export interface Schedule {
  open: string;
  close: string;
  duration: 30 | 60;
  blockedSlots: string[];
  closedDates: ClosedDate[];
}

export interface Slot {
  label: string;
  state: 'available' | 'unavailable';
}

const defaultSchedule: Schedule = { open: '08:00', close: '18:00', duration: 60, blockedSlots: [], closedDates: [] };

export function labelToMinutes(label: string) {
  const [time, period] = label.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  return ((hours % 12) + (period === 'PM' ? 12 : 0)) * 60 + minutes;
}

function minutesToLabel(total: number) {
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function slotKeyOf(label: string) {
  const total = labelToMinutes(label);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}${String(total % 60).padStart(2, '0')}`;
}

export function slotLabels(schedule: Schedule) {
  if (!schedule.open || !schedule.close) return [];
  const [openHour, openMinute] = schedule.open.split(':').map(Number);
  const [closeHour, closeMinute] = schedule.close.split(':').map(Number);
  const closeAt = closeHour * 60 + closeMinute;
  const labels: string[] = [];
  for (let time = openHour * 60 + openMinute; time + schedule.duration <= closeAt; time += schedule.duration) {
    labels.push(minutesToLabel(time));
  }
  return labels;
}

export async function fetchSchedule(branchId: string): Promise<Schedule> {
  const snapshot = await getDoc(doc(db, 'schedules', branchId));
  if (!snapshot.exists()) return { ...defaultSchedule };
  return { ...defaultSchedule, ...(snapshot.data() as Partial<Schedule>) };
}

export async function fetchSlots(branchId: string, dateKey: string): Promise<Slot[]> {
  const [schedule, taken] = await Promise.all([
    fetchSchedule(branchId),
    getDocs(query(collection(db, 'slots'), where('branchId', '==', branchId), where('dateKey', '==', dateKey)))
  ]);
  const takenKeys = new Set(taken.docs.map(item => item.data().slotKey as string));
  const closed = schedule.closedDates.some(item => item.dateKey === dateKey);
  return slotLabels(schedule).map(label => ({
    label,
    state: !closed && !takenKeys.has(slotKeyOf(label)) && !schedule.blockedSlots.includes(`${dateKey}|${label}`) ? 'available' : 'unavailable'
  }));
}