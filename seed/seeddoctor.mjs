import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync(new URL('./serviceAccountKey.json', import.meta.url), 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const doctors =[
    { 
    id: 'd1', 
    name: 'Dr. Maria Santos', 
    specialty: 'General Practitioner', 
    branchId: 'calamba', 
    days: 'Mon, Wed, Fri' 
  },
  
  { 
    id: 'd2', 
    name: 'Dr. Jose Reyes', 
    specialty: 'Internal Medicine', 
    branchId: 'calamba', 
    days: 'Tue, Thu' 
  },

  { 
    id: 'd3', 
    name: 'Dr. Ana Cruz', 
    specialty: 'General Practitioner', 
    branchId: 'santa-rosa', 
    days: 'Mon to Sat' 
  },

  { 
    id: 'd4', 
    name: 'Dr. Paolo Garcia', 
    specialty: 'Family Medicine', 
    branchId: 'cabanatuan', 
    days: 'Mon, Thu, Fri' 
  },

  { 
    id: 'd5', 
    name: 'Dr. Liza Mendoza', 
    specialty: 'Pediatrics', 
    branchId: 'san-fernando', 
    days: 'Mon to Fri' 
  },

  { 
    id: 'd6', 
    name: 'Dr. Carlo Bautista', 
    specialty: 'General Practitioner', 
    branchId: 'san-jose', 
    days: 'Mon, Wed' 
  },

  { 
    id: 'd7', 
    name: 'Dr. Rina Flores', 
    specialty: 'Pediatrician', 
    branchId: 'tarlac-city', 
    days: 'Weekdays' 
  },

  { 
    id: 'd8', 
    name: 'Dr. Miguel Torres', 
    specialty: 'Vaccination and Wound Care', 
    branchId: 'san-jose',
    days: 'Tue to Sun' 
  }
];

const existing = await db.collection('doctors').limit(1).get();

if (existing.empty){
    const batch = db.batch();
    
    for (const {id, ...data} of doctors){
        batch.set (db.collection('doctors').doc(id), { ...data, active: true});
    }
    await batch.commit();
    console.log(`Added ${doctors.length} doctors.`);
} else {
    console.log('Existing Doctor found');
}