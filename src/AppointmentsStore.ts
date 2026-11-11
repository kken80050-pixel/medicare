import { FirebaseError } from 'firebase/app';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ApiError } from './api';
import { fetchSlots, slotKeyOf } from './ScheduleStore';

export type AppointmentStatus = 'Upcoming' | 'Completed' | 'Cancelled' | 'Requested';

export interface Appointment {
  reference: string;
  branchId: string;
  email: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  dateKey: string;
  slot: string;
  fullName: string;
  phone: string;
  reason: string;
  status: AppointmentStatus;
  createdAt: number;
}

export interface NewAppointment {
  branchId: string;
  dateKey: string;
  slot: string;
  fullName: string;
  email: string;
  phone: string;
  reason: string;
  rescheduleReference?: string;
}

function toAppointment(id: string, data: DocumentData): Appointment {
  return {
    reference: id,
    branchId: data.branchId,
    email: data.email,
    branchName: data.branchName,
    branchAddress: data.branchAddress,
    branchPhone: data.branchPhone,
    dateKey: data.dateKey,
    slot: data.slot,
    fullName: data.fullName,
    phone: data.phone,
    reason: data.reason ?? '',
    status: data.status,
    createdAt: typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : Date.now()
  };
}

function slotDocId(branchId: string, dateKey: string, slot: string) {
  return `${branchId}_${dateKey}_${slotKeyOf(slot)}`;
}

function makeReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 6; index++) code += chars[Math.floor(Math.random() * chars.length)];
  return `WC-${new Date().getFullYear()}-${code}`;
}

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new ApiError('Please log in first.', 401);
  return user;
}

export async function fetchMyAppointments() {
  const user = requireUser();
  const snapshot = await getDocs(query(collection(db, 'appointments'), where('uid', '==', user.uid)));
  return snapshot.docs
    .map(item => toAppointment(item.id, item.data()))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function fetchAppointment(reference: string) {
  const user = requireUser();
  const snapshot = await getDoc(doc(db, 'appointments', reference));
  if (!snapshot.exists() || snapshot.data().uid !== user.uid) throw new ApiError('Appointment not found.', 404);
  return toAppointment(snapshot.id, snapshot.data());
}

export async function createAppointment(request: NewAppointment) {
  const user = requireUser();

  const branchSnapshot = await getDoc(doc(db, 'branches', request.branchId));
  if (!branchSnapshot.exists() || branchSnapshot.data().active !== true) {
    throw new ApiError('This branch is not available for booking.', 400);
  }
  const branch = branchSnapshot.data();

  const phone = request.phone.replace(/\D/g, '');
  if (phone.length < 10 || phone.length > 11) throw new ApiError('Contact number must be 10 to 11 digits.', 400);

  const slots = await fetchSlots(request.branchId, request.dateKey);
  if (!slots.some(item => item.label === request.slot && item.state === 'available')) {
    throw new ApiError('That time slot is no longer available. Please choose another.', 409);
  }

  const slotId = slotDocId(request.branchId, request.dateKey, request.slot);
  let previous: Appointment | null = null;
  if (request.rescheduleReference) {
    const previousSnapshot = await getDoc(doc(db, 'appointments', request.rescheduleReference));
          if (previousSnapshot.exists() && previousSnapshot.data().uid === user.uid && ['Requested', 'Upcoming'].includes(previousSnapshot.data().status)) {
      previous = toAppointment(previousSnapshot.id, previousSnapshot.data());
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = makeReference();
    const batch = writeBatch(db);

    if (previous) {
      batch.update(doc(db, 'appointments', previous.reference), { status: 'Cancelled' });
      batch.delete(doc(db, 'slots', slotDocId(previous.branchId, previous.dateKey, previous.slot)));
    }

    batch.set(doc(db, 'appointments', reference), {
      reference,
      uid: user.uid,
      branchId: request.branchId,
      branchName: branch.name,
      branchAddress: branch.address,
      branchPhone: branch.phone,
      dateKey: request.dateKey,
      slot: request.slot,
      slotKey: slotKeyOf(request.slot),
      fullName: request.fullName.trim(),
      email: request.email.trim(),
      phone,
      reason: request.reason.trim(),
      status: 'Requested',
      createdAt: serverTimestamp()
    });

    batch.set(doc(db, 'slots', slotId), {
      branchId: request.branchId,
      dateKey: request.dateKey,
      slotKey: slotKeyOf(request.slot),
      slot: request.slot,
      uid: user.uid,
      reference
    });

    try {
      await batch.commit();
      return {
        reference,
        branchId: request.branchId,
        email: request.email.trim(),
        branchName: branch.name as string,
        branchAddress: branch.address as string,
        branchPhone: branch.phone as string,
        dateKey: request.dateKey,
        slot: request.slot,
        fullName: request.fullName.trim(),
        phone,
        reason: request.reason.trim(),
        status: 'Requested',
        createdAt: Date.now()
      } as Appointment;
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        const taken = await getDoc(doc(db, 'slots', slotId));
        if (taken.exists()) throw new ApiError('That time slot was just taken. Please choose another.', 409);
        continue;
      }
      throw new ApiError('Booking failed. Please check your connection and try again.', 500);
    }
  }

  throw new ApiError('Booking failed. Please try again.', 500);
}

export async function cancelAppointment(reference: string) {
  const current = await fetchAppointment(reference);
  const batch = writeBatch(db);
  batch.update(doc(db, 'appointments', reference), { status: 'Cancelled' });
  batch.delete(doc(db, 'slots', slotDocId(current.branchId, current.dateKey, current.slot)));
  await batch.commit();
  return { ...current, status: 'Cancelled' } as Appointment;
}

export function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDay(key: string, style: 'short' | 'long' | 'full') {
  const date = fromDateKey(key);
  if (style === 'short') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (style === 'long') return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function statusOf(appointment: Appointment): AppointmentStatus {
  if (appointment.status === 'Cancelled' || appointment.status === 'Completed') return appointment.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (fromDateKey(appointment.dateKey) >= today) return appointment.status;
  return appointment.status === 'Upcoming' ? 'Completed' : 'Cancelled';
}