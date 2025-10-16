'use client';

import { useState, useEffect } from 'react';
import Camera from './Camera';
import { supabase, type FichadaInsert, type Dependencia } from '@/lib/supabase';
import { MapPin, CheckCircle, AlertCircle, Building2 } from 'lucide-react';

export default function FichadasForm() {
  const [documento, setDocumento] = useState('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dependencia, setDependencia] = useState<Dependencia | null>(null);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    // Obtener ubicación
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error('Error obteniendo ubicación:', err);
        }
      );
    }

    // Cargar todas las dependencias
    loadDependencias();
  }, []);

  const loadDependencias = async () => {
    try {
      const { data, error } = await supabase
        .from('dependencias')
        .select('*')
        .order('nombre');

      if (error) throw error;
      
      // Si no hay datos, usar dependencias de prueba
      if (!data || data.length === 0) {
        setDependencias([
          { id: 'CIC', nombre: 'Intendencia (Prueba)', codigo: 'INT-001', direccion: 'Calle Principal 123', created_at: new Date().toISOString() },
          { id: 'test-2', nombre: 'Obras Públicas (Prueba)', codigo: 'OBR-001', direccion: 'Av. Trabajo 456', created_at: new Date().toISOString() },
          { id: 'test-3', nombre: 'Tránsito (Prueba)', codigo: 'TRA-001', direccion: 'Ruta 9 km 2', created_at: new Date().toISOString() },
        ]);
      } else {
        setDependencias(data);
      }
    } catch (err) {
      console.error('Error cargando dependencias:', err);
      // Si hay error, usar datos de prueba
      setDependencias([
        { id: 'test-1', nombre: 'Intendencia (Prueba)', codigo: 'INT-001', direccion: 'Calle Principal 123', created_at: new Date().toISOString() },
        { id: 'test-2', nombre: 'Obras Públicas (Prueba)', codigo: 'OBR-001', direccion: 'Av. Trabajo 456', created_at: new Date().toISOString() },
        { id: 'test-3', nombre: 'Tránsito (Prueba)', codigo: 'TRA-001', direccion: 'Ruta 9 km 2', created_at: new Date().toISOString() },
      ]);
    }
  };

  const handlePhotoCapture = async (blob: Blob) => {
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
    setShowCamera(false);
    
    // Procesar el registro automáticamente
    await processRegistro(blob);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!documento) {
      setError('Por favor ingresá tu DNI');
      return;
    }

    if (!dependencia) {
      setError('Por favor seleccioná una dependencia');
      return;
    }

    // Abrir la cámara para tomar la foto
    setShowCamera(true);
  };

  const processRegistro = async (photoBlob: Blob) => {
    if (!dependencia) return;
    
    setLoading(true);
    setError('');

    try {
      // Subir foto a Supabase Storage
      const fileName = `${Date.now()}-${documento}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('fotos-fichadas')
        .upload(fileName, photoBlob);

      if (uploadError) throw uploadError;

      // Obtener URL pública de la foto
      const { data: urlData } = supabase.storage
        .from('fotos-fichadas')
        .getPublicUrl(fileName);

      // Guardar fichada
      const fichadaData: FichadaInsert = {
        dependencia_id: dependencia.id,
        documento,
        foto_url: urlData.publicUrl,
        latitud: location?.lat,
        longitud: location?.lng,
      };

      const { error: insertError } = await supabase
        .from('fichadas')
        .insert([fichadaData]);

      if (insertError) throw insertError;

      setSuccess(true);
      setDocumento('');
      setPhotoBlob(null);
      setPhotoPreview('');
      setDependencia(null);
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError('Error al registrar fichada. Intenta nuevamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="bg-blue-600 p-3 rounded-full">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Registro de Fichada
            </h1>
            {dependencia && (
              <p className="text-gray-600 dark:text-gray-400">
                {dependencia.nombre}
              </p>
            )}
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>¡Fichada registrada exitosamente!</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Documento */}
            <div>
              <label htmlFor="documento" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Documento (DNI)
              </label>
              <input
                type="text"
                id="documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
                placeholder="Ingrese su DNI"
                maxLength={8}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={loading}
                required
              />
            </div>

            {/* Selector de Dependencia */}
            <div>
              <label htmlFor="dependencia" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dependencia
              </label>
              <select
                id="dependencia"
                value={dependencia?.id || ''}
                onChange={(e) => {
                  const selected = dependencias.find(d => d.id === e.target.value);
                  setDependencia(selected || null);
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={loading}
                required
              >
                <option value="">Seleccione una dependencia</option>
                {dependencias.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview de foto si existe */}
            {photoPreview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Foto capturada
                </label>
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Foto capturada"
                    className="w-full rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Location Status */}
            {location && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4 text-green-600" />
                <span>Ubicación capturada</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !dependencia || !documento}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Registrando fichada...
                </>
              ) : photoPreview ? (
                '✅ Fichada Registrada'
              ) : (
                '📸 Tomar Foto y Registrar'
              )}
            </button>
          </form>

          {dependencias.length === 0 && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-5 h-5 mx-auto mb-2" />
              Cargando dependencias...
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          Municipalidad de San Benito
        </p>
      </div>

      {/* Modal de Cámara */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                Tomá tu foto
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
                La fichada se registrará automáticamente
              </p>
            </div>
            
            <Camera onCapture={handlePhotoCapture} disabled={loading} />
            
            <button
              type="button"
              onClick={() => setShowCamera(false)}
              className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition font-medium"
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
