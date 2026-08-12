import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Seller } from '../types';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  sellerData: Seller | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  sellerData: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sellerData, setSellerData] = useState<Seller | null>(null);
  // "initializing" cuma true sampai pengecekan sesi PERTAMA kali selesai.
  // Ini satu-satunya yang dipakai untuk memutuskan kapan seluruh aplikasi (router) boleh dirender.
  const [initializing, setInitializing] = useState(true);
  // "loading" dipakai sebagai indikator saat auth state berubah (login/logout) SETELAH render pertama.
  // PENTING: tidak lagi dipakai untuk membongkar seluruh children, supaya proses navigate()
  // yang sedang berjalan di halaman login tidak ikut ke-unmount di tengah jalan.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Initial fetch
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await handleAuthChange(session?.user || null);
      if (isMounted) {
        setLoading(false);
        setInitializing(false);
      }
    };

    fetchSession();

    // Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        await handleAuthChange(session?.user || null);
        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthChange = async (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
          setSellerData(null);
        } else if (data) {
          const profile = data as UserProfile;
          setUserProfile(profile);
          
          if (profile.seller_id) {
            const { data: seller, error: sellerError } = await supabase
              .from('sellers')
              .select('*')
              .eq('id', profile.seller_id)
              .maybeSingle();
              
            if (!sellerError && seller) {
              setSellerData(seller as Seller);
            } else {
              setSellerData(null);
            }
          } else {
             setSellerData(null);
          }
        } else {
          setUserProfile(null);
          setSellerData(null);
        }
      } catch (error) {
        console.error("Error in handleAuthChange:", error);
        setUserProfile(null);
        setSellerData(null);
      }
    } else {
      setUserProfile(null);
      setSellerData(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, sellerData, loading, signOut }}>
      {!initializing && children}
    </AuthContext.Provider>
  );
};
