'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  googleProvider,
  updateProfile,
  type FirebaseUser,
} from './firebase';
import { apiFetch } from './api';
import type { AppUser } from '@/types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: AppUser | null;
  loading: boolean;
  idToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const token = await fbUser.getIdToken();
        setIdToken(token);
        try {
          const data = await apiFetch('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(data.user);
        } catch {
          setUser(null);
        }
      } else {
        setIdToken(null);
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const syncUser = async (fbUser: FirebaseUser, displayName?: string) => {
    const token = await fbUser.getIdToken(true);
    setIdToken(token);
    const data = await apiFetch('/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ idToken: token, displayName }),
    });
    setUser(data.user);
  };

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await syncUser(cred.user);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    await syncUser(cred.user, displayName);
  };

  const googleLogin = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await syncUser(cred.user, cred.user.displayName || undefined);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIdToken(null);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, idToken, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
