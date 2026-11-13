import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync(new URL('./serviceAccountKey.json', import.meta.url), 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const doctors =[
    { 
    id: 'd1', 
    name: 'Dr. Miguel Angelo Santos', 
    specialty: 'General Practitioner', 
    branchId: 'calamba', 
    days: 'Mon, Wed, Fri' 
  },
  
  { 
    id: 'd2', 
    name: 'Dr. Andrea Nicole Reyes', 
    specialty: 'Internal Medicine', 
    branchId: 'calamba', 
    days: 'Tue, Thu' 
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