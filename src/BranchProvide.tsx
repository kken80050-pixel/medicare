import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import type { Branch } from './BranchesData';

interface BranchContextValue {
  branches: Branch[];
  refresh: () => Promise<void>;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'branches'), orderBy('order')));
      setBranches(
        snapshot.docs
          .filter(item => item.data().active === true)
          .map(item => ({
            id: item.id,
            name: item.data().name as string,
            address: item.data().address as string,
            phone: item.data().phone as string,
            hours: item.data().hours as string
          }))
      );
      setError('');
    } catch {
      setError('Cannot load branches. Check your internet connection and the Firebase setup.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!branches) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
        {error ? <div>
            <p>{error}</p>
            <button type="button" onClick={() => void refresh()}>Try Again</button>
          </div> : <p>Loading MediCare…</p>}
      </div>;
  }

  return <BranchContext.Provider value={{ branches, refresh }}>{children}</BranchContext.Provider>;
}

export function useBranches() {
  const context = useContext(BranchContext);
  if (!context) throw new Error('useBranches must be used inside BranchProvider');
  return context;
}