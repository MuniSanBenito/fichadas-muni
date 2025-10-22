'use client';

import { useState, useEffect } from 'react';
import Camera from './Camera';
import { supabase, type FichadaInsert, type Dependencia, type TipoFichada } from '@/lib/supabase';
import { MapPin, CheckCircle, AlertCircle, Building2, LogIn, LogOut } from 'lucide-react';

export default function FichadasForm() {
  const [documento, setDocumento] = useState('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dependencia, setDependencia] = useState<Dependencia | null>(null);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [tipoFichada, setTipoFichada] = useState<TipoFichada>('entrada');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Cargar todas las dependencias
    loadDependencias();

    // Obtener ubicación
    if (navigator.geolocation) {
      console.log('Solicitando ubicación GPS...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Ubicación obtenida:', position.coords);
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error('Error obteniendo ubicación:', err.message);
          // Intentar con timeout y maximumAge
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('Ubicación obtenida (segundo intento):', position.coords);
              setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            (err2) => {
              console.error('Error final obteniendo ubicación:', err2.message);
              setError('No se pudo obtener la ubicación. Continuá igual, es opcional.');
              setTimeout(() => setError(''), 3000);
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 0
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      console.error('Geolocalización no disponible');
      setError('Tu navegador no soporta geolocalización.');
      setTimeout(() => setError(''), 3000);
    }
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
          { id: '00000000-0000-0000-0000-000000000001', nombre: 'CIC', codigo: 'INT-001', direccion: 'Calle Principal 123', created_at: new Date().toISOString() },
          { id: '00000000-0000-0000-0000-000000000002', nombre: 'NIDO', codigo: 'OBR-001', direccion: 'Av. Trabajo 456', created_at: new Date().toISOString() },
          { id: '00000000-0000-0000-0000-000000000003', nombre: 'Pañol', codigo: 'TRA-001', direccion: 'Ruta 9 km 2', created_at: new Date().toISOString() },
        ]);
      } else {
        setDependencias(data);
      }
    } catch (err) {
      console.error('Error cargando dependencias:', err);
      // Si hay error, usar datos de prueba
      setDependencias([
        { id: '00000000-0000-0000-0000-000000000001', nombre: 'CIC', codigo: 'INT-001', direccion: 'Calle Principal 123', created_at: new Date().toISOString() },
        { id: '00000000-0000-0000-0000-000000000002', nombre: 'NIDO', codigo: 'OBR-001', direccion: 'Av. Trabajo 456', created_at: new Date().toISOString() },
        { id: '00000000-0000-0000-0000-000000000003', nombre: 'Pañol', codigo: 'TRA-001', direccion: 'Ruta 9 km 2', created_at: new Date().toISOString() },
      ]);
    }
  };

  const handlePhotoCapture = (blob: Blob) => {
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
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

    if (!photoBlob) {
      setError('Por favor tomá una foto');
      return;
    }

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

      // Guardar fichada con ubicación (opcional)
      const fichadaData: FichadaInsert = {
        dependencia_id: dependencia.id,
        documento,
        tipo: tipoFichada,
        foto_url: urlData.publicUrl,
        latitud: location?.lat,
        longitud: location?.lng,
      };

      console.log('Enviando fichada:', fichadaData);

      const { error: insertError } = await supabase
        .from('fichadas')
        .insert([fichadaData]);

      if (insertError) throw insertError;

      setSuccess(true);
      setDocumento('');
      setPhotoBlob(null);
      setPhotoPreview('');
      setDependencia(null);
      setTipoFichada('entrada');
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError('Error al registrar fichada. Intenta nuevamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="bg-[#b6c544] p-3 rounded-full">
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

            {/* Selector de Tipo de Fichada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Tipo de Fichada
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoFichada('entrada')}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition ${
                    tipoFichada === 'entrada'
                      ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-500 dark:text-green-400'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  <LogIn className="w-5 h-5" />
                  <span className="font-semibold">Entrada</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoFichada('salida')}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition ${
                    tipoFichada === 'salida'
                      ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-400'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Salida</span>
                </button>
              </div>
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

            {/* Cámara */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Foto (obligatorio)
              </label>
              {!photoPreview ? (
                <Camera onCapture={handlePhotoCapture} disabled={loading} />
              ) : (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Foto capturada"
                    className="w-full rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoBlob(null);
                      setPhotoPreview('');
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
                    disabled={loading}
                  >
                    Tomar otra foto
                  </button>
                </div>
              )}
            </div>

            {/* Location Status */}
            <div className="flex items-center gap-2 text-sm">
              {location ? (
                <>
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">✓ Ubicación capturada</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-yellow-600" />
                  <span className="text-yellow-600">⚠ Ubicación no disponible (opcional)</span>
                </>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !dependencia || !documento || !photoBlob}
              className="w-full bg-[#b6c544] hover:bg-[#9fb338] disabled:bg-gray-400 text-white font-medium py-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Registrando fichada...
                </>
              ) : (
                'Registrar Fichada'
              )}
            </button>
            
            {/* Indicador de qué falta */}
            {(!documento || !dependencia || !photoBlob) && (
              <div className="text-sm text-gray-500 text-center">
                {!documento && '⚠ Falta: DNI • '}
                {!dependencia && '⚠ Falta: Dependencia • '}
                {!photoBlob && '⚠ Falta: Foto'}
              </div>
            )}
          </form>

          {dependencias.length === 0 && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-5 h-5 mx-auto mb-2" />
              Cargando dependencias...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Municipalidad de San Benito
          </p>
          <a
            href="/admin"
            className="inline-block text-sm text-[#076633] hover:text-[#054d26] dark:text-[#b6c544] hover:underline font-medium"
          >
            Acceso Recursos Humanos →
          </a>
        </div>
      </div>
    </div>
  );
}
