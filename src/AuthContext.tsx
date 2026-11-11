import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { FirebaseError } from 'firebase/app';
import { EmailAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, reauthenticateWithCredential, signInWithEmailAndPassword, signOut, updatePassword, updateProfile, verifyBeforeUpdateEmail, GoogleAuthProvider, sendEmailVerification, signInWithPopup} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface User {
  name: string;
  email: string;
  phone: string;
}

interface ProfileChanges {
  name: string;
  phone: string;
  email: string;
  currentPassword: string;
  newPassword: string;
}

interface ProfileResult {
  error: string;
  notice: string;
}

interface AuthValue {
  user: User | null;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  updateAccount: (changes: ProfileChanges) => Promise<ProfileResult>;
  loginWithGoogle: () => Promise<string | null>;
  resendVerification: (email: string, password: string) => Promise<ProfileResult>;
  saveContact: (phone: string) => Promise<void>;
}

function authMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';

      case 'auth/invalid-credential':

      case 'auth/wrong-password':
        
      case 'auth/user-not-found':
        return 'Incorrect email or password. Please try again, or register if you are new.';

      case 'auth/invalid-email':
        return 'Please enter a valid email address.';

      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';

      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';

      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';

      case 'auth/requires-recent-login':
        return 'Please log out and log in again, then retry.';

      case 'permission-denied':
        return 'You do not have permission.';

      case 'auth/popup-blocked':
        return 'Your browser blocked the Google window. Allow pop-ups and try again.';

      case 'auth/account-exists-with-different-credential':
        return 'This email is already registered. Log in with your password instead.';
    }
  }
  return 'Please try again.';
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser || !firebaseUser.emailVerified) {
        setUser(null);
        setReady(true);
        return;
      }
      let phone = '';
      try {
        const snapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
        phone = (snapshot.data()?.phone as string | undefined) ?? '';
      } catch {
        phone = '';
      }
      setUser({ name: firebaseUser.displayName ?? '', email: firebaseUser.email ?? '', phone });
      setReady(true);
    });
  }, []);

  const register = async (name: string, email: string, password: string) => {
    const cleanName = name.trim();
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: cleanName });
      await setDoc(doc(db, 'users', credential.user.uid), {
        name: cleanName,
        email: email.trim().toLowerCase(),
        role: 'patient',
        createdAt: serverTimestamp()
      });
      await sendEmailVerification(credential.user);
      await signOut(auth);
      return null;
    } catch (error) {
      return authMessage(error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!credential.user.emailVerified) {
        await signOut(auth);
        return 'Please verify your email first.';
      }
      return null;
    } catch (error) {
      return authMessage(error);
    }
  };

  const resendVerification = async (email: string, password: string): Promise<ProfileResult> => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (credential.user.emailVerified) {
        await signOut(auth);
        return { error: '', notice: 'Your email already verified. You can log in now.' };
      }
      await sendEmailVerification(credential.user);
      await signOut(auth);
      return { error: '', notice: `A new verification link to ${email.trim()}.` };
    } catch (error) {
      return { error: authMessage(error), notice: '' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      const reference = doc(db, 'users', credential.user.uid);
      const snapshot = await getDoc(reference);
      if (!snapshot.exists()) {
        await setDoc(reference, {
          name: credential.user.displayName ?? '',
          email: (credential.user.email ?? '').toLowerCase(),
          role: 'patient',
          createdAt: serverTimestamp()
        });
      }
      return null;
    } catch (error) {
      if (error instanceof FirebaseError && (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request')) return null;
      return authMessage(error);
    }
  };

  const logout = () => {
    void signOut(auth);
  };

  const saveContact = async (phone: string) => {
  const current = auth.currentUser;
  if (!current) return;
  const clean = phone.replace(/\D/g, '');
  try {
    await setDoc(doc(db, 'users', current.uid), { phone: clean }, { merge: true });
    setUser(existing => (existing ? { ...existing, phone: clean } : existing));
  } catch {
    return;
  }
};

  const updateAccount = async (changes: ProfileChanges): Promise<ProfileResult> => {
    const current = auth.currentUser;
    if (!current || !current.email) return { error: 'Please log in again.', notice: '' };

    const name = changes.name.trim();
    const phone = changes.phone.replace(/\D/g, '');
    const email = changes.email.trim();
    if (!name) return { error: 'Name is required.', notice: '' };
    if (phone && (phone.length < 10 || phone.length > 11)) return { error: 'Contact number must be 10 to 11 digits.', notice: '' };

    const emailChanged = email.toLowerCase() !== current.email.toLowerCase();
    const passwordChanged = changes.newPassword.length > 0;
    const usesPassword = current.providerData.some(item => item.providerId === 'password');

    if (!usesPassword && (emailChanged || passwordChanged)) {
      return { error: 'Your account uses Google sign-in, so your email and password are managed by Google.', notice: '' };
    }

    try {
      if (emailChanged || passwordChanged) {
        if (!changes.currentPassword) return { error: 'Enter your current password to change your email or password.', notice: '' };
        await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, changes.currentPassword));
      }
      if (passwordChanged) await updatePassword(current, changes.newPassword);
      await updateProfile(current, { displayName: name });
      await setDoc(doc(db, 'users', current.uid), { name, phone }, { merge: true });

      let notice = 'Profile saved.';
      if (emailChanged) {
        await verifyBeforeUpdateEmail(current, email);
        notice = `Profile saved. We sent a verification link to ${email}. Your login email changes after you click it.`;
      }
      setUser({ name, email: current.email ?? '', phone });
      return { error: '', notice };
    } catch (error) {
      if (error instanceof FirebaseError && (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password')) {
        return { error: 'Current password is incorrect.', notice: '' };
      }
      return { error: authMessage(error), notice: '' };
    }
  };

  return <AuthContext.Provider value={{ user, register, login, loginWithGoogle, resendVerification, logout, updateAccount, saveContact }}>{ready ? children : null}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}