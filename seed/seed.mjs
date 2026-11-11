import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync(new URL('./serviceAccountKey.json', import.meta.url), 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const branches = [
  {
  id: 'calamba',  
  order: 1,
  name: 'MediCare Plus Medical & Diagnostic Center',
  address: '123 Rizal Avenue, Calamba, Laguna, 4027',
  phone: '0998 214 6731',
  hours: 'Opens: 8:00 AM – 5:00 PM, Monday–Friday',  
}, {
  id: 'santa-rosa',
  order: 2,  
  name: 'MediCare Plus Family Clinic',
  address: '45 National Road, Santa Rosa, Laguna, 4026',
  phone: '0917 583 2046',
  hours: 'Opens: 8:00 AM – 6:00 PM, Monday–Saturday'
}, {
  id: 'san-fernando',
  order: 3,  
  name: 'MediCare Plus Multi-Specialty Clinic',
  address: '78 MacArthur Highway, San Fernando, Pampanga, 2000',
  phone: '0927 641 8352',
  hours: 'Opens: 7:00 AM – 5:00 PM, Monday–Saturday'
},{
  id: 'cabanatuan',
  order: 4,  
  name: 'MediCare Plus Diagnostic Clinic',
  address: '216 Maharlika Highway, Cabanatuan City, Nueva Ecija, 3100',
  phone: '0995 372 4816',
  hours: 'Opens: 8:00 AM – 5:00 PM, Monday–Friday'
}, {
  id: 'tarlac-city',
  order: 5,
  name: 'MediCare Plus Animal Bite & Wound Care Center',
  address: '91 Gov. F. Halili Avenue, Tarlac City, Tarlac, 2300',
  phone: '0918 726 3495',
  hours: 'Opens: 8:00 AM – 6:00 PM, Monday–Saturday'
}, {
  id: 'san-jose',
  order: 6,
  name: 'MediCare Plus Primary Care Clinic',
  address: '34 Quirino Highway, San Jose del Monte, Bulacan, 3023',
  phone: '0920 458 7163',
  hours: 'Opens: 7:00 AM – 5:00 PM, Monday–Friday'
}];

const existing = await db.collection('branches').limit(1).get();

if (existing.empty) {
  const batch = db.batch();
  for (const { id, ...data } of branches) {
    batch.set(db.collection('branches').doc(id), { ...data, active: true });
    batch.set(db.collection('schedules').doc(id), {
      open: '08:00',
      close: '18:00',
      duration: 60,
      blockedSlots: [],
      closedDates: []
    });
  }
  await batch.commit();
  console.log(`Added ${branches.length} branches and their schedules.`);
} else {
  console.log('Branches already exist. Skipped.');
}

const adminEmail = process.argv[2];

if (adminEmail) {
  const user = await getAuth().getUserByEmail(adminEmail);
  await db.collection('users').doc(user.uid).set(
    {
      name: user.displayName ?? 'Admin',
      email: adminEmail.toLowerCase(),
      role: 'admin',
      createdAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  console.log(`${adminEmail} is now an admin.`);
}