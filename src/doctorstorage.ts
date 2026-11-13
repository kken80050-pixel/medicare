import {addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc} from 'firebase/firestore';
import { db } from './firebase';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  branchId: string;
  days: string;
  active: boolean;
}

export type doctorinput = Omit<Doctor, 'id'>;

export async function fetchDoctors(): Promise<Doctor[]> {
    const snapshot = await getDocs(query(collection(db, 'doctors'), orderBy('name')));
    return snapshot.docs.map(item => ({
        id: item.id,
        name: item.data().name as string,
        specialty: item.data().specialty as string,
        branchId: item.data().branchId as string,
        days: item.data().days as string,
        active: item.data().active !== false
    }));
}

export async function addDoctor(input: doctorinput) {
    await addDoc(collection(db, 'doctors'), input);
}

export async function updateDoctor(id: string, changes: Partial<doctorinput>){
    await updateDoc(doc(db, 'doctors', id), changes);
}

export async function deleteDoctor (id: string) {
    await deleteDoc (doc(db, 'doctors', id));
}
