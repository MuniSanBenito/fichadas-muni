'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AdminPanel from "@/components/AdminPanel";
import AdminLoginSupabase from "@/components/AdminLoginSupabase";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión activa al cargar
    checkUser();

    // Escuchar cambios en la autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Verificar si el usuario tiene permisos de admin
        const userRole = session.user.user_metadata?.role;
        if (userRole === 'admin') {
          setIsAuthenticated(true);
        } else {
          // O verificar por email si prefieres
          // const allowedEmails = ['email1@dominio.com', 'email2@dominio.com'];
          // if (allowedEmails.includes(session.user.email || '')) {
          //   setIsAuthenticated(true);
          // }
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Verificar permisos de admin
        const userRole = session.user.user_metadata?.role;
        if (userRole === 'admin') {
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Error al verificar sesión:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b6c544] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AdminPanel /> : <AdminLoginSupabase onLoginSuccess={handleLoginSuccess} />;
}
