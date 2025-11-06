import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para las tablas
export interface Dependencia {
  id: string;
  nombre: string;
  codigo: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  radio_metros?: number;
  created_at: string;
}

export type TipoFichada = 'entrada' | 'salida';

export interface Fichada {
  id: string;
  dependencia_id: string;
  documento: string;
  tipo: TipoFichada;
  foto_url?: string;
  latitud?: number;
  longitud?: number;
  fecha_hora: string;
  created_at: string;
}

export interface FichadaInsert {
  dependencia_id: string;
  documento: string;
  tipo: TipoFichada;
  foto_url?: string;
  latitud?: number;
  longitud?: number;
}
