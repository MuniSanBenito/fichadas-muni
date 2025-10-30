"use client";

import { useState, useEffect } from "react";
import Camera from "./Camera";
import {
  supabase,
  type FichadaInsert,
  type Dependencia,
  type TipoFichada,
} from "@/lib/supabase";
import {
  validarUbicacionParaFichar,
  encontrarDependenciaCercana,
} from "@/lib/gpsConfig";
import {
  MapPin,
  CheckCircle,
  AlertCircle,
  Building2,
  LogIn,
  LogOut,
} from "lucide-react";

export default function FichadasForm() {
  const [documento, setDocumento] = useState("");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dependencia, setDependencia] = useState<Dependencia | null>(null);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [tipoFichada, setTipoFichada] = useState<TipoFichada>("entrada");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locationValidation, setLocationValidation] = useState<{
    permitido: boolean;
    mensaje: string;
  } | null>(null);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Función para solicitar ubicación GPS de forma insistente
  const solicitarUbicacion = () => {
    if (!navigator.geolocation) {
      console.error("Geolocalización no disponible");
      setError(
        "⚠️ Tu navegador no soporta geolocalización. Por favor usa Chrome, Firefox o Safari."
      );
      setGpsPermissionDenied(true);
      return;
    }

    console.log(`🔄 Solicitando ubicación GPS... (intento ${retryCount + 1})`);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("✅ Ubicación obtenida:", position.coords);
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(userLocation);
        setGpsPermissionDenied(false);
        setError("");

        // Validar ubicación
        const validation = validarUbicacionParaFichar(userLocation);
        setLocationValidation(validation);
        console.log("📍 Validación GPS:", validation);

        // Ya no bloqueamos, solo mostramos advertencia
        if (!validation.permitido) {
          console.log("⚠️ Usuario fuera del rango, pero puede fichar igual");
        }
      },
      (err) => {
        console.error(
          "❌ Error obteniendo ubicación:",
          err.message,
          "Código:",
          err.code
        );

        // err.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
        if (err.code === 1) {
          setGpsPermissionDenied(true);
          setError(
            "🚫 Necesitamos tu ubicación para verificar que estés en CIC o NIDO. " +
              "Por favor, habilita los permisos de ubicación en tu navegador y presiona 'Reintentar GPS'."
          );
        } else if (err.code === 3) {
          // Timeout - reintentar automáticamente
          console.log(
            "⏱️ Timeout - reintentando con configuración más flexible..."
          );
          setRetryCount((prev) => prev + 1);

          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log(
                "✅ Ubicación obtenida (reintento):",
                position.coords
              );
              const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              setLocation(userLocation);
              setGpsPermissionDenied(false);
              setError("");

              const validation = validarUbicacionParaFichar(userLocation);
              setLocationValidation(validation);

              if (!validation.permitido) {
                console.log(
                  "⚠️ Usuario fuera del rango, pero puede fichar igual"
                );
              }
            },
            (err2) => {
              console.error(
                "❌ Error final obteniendo ubicación:",
                err2.message
              );
              setGpsPermissionDenied(true);
              setError(
                "⚠️ No se pudo obtener tu ubicación. Verifica que tengas GPS activado y " +
                  "hayas dado permisos al navegador. Presiona 'Reintentar GPS' para volver a intentar."
              );
            },
            {
              enableHighAccuracy: false,
              timeout: 15000,
              maximumAge: 60000, // Aceptar ubicación de hasta 1 minuto atrás
            }
          );
        } else {
          setGpsPermissionDenied(true);
          setError(
            "⚠️ Error obteniendo ubicación GPS. Asegúrate de tener GPS activado y " +
              "presiona 'Reintentar GPS'."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    // Cargar todas las dependencias
    loadDependencias();

    // Solicitar ubicación al cargar
    solicitarUbicacion();

    // Reintentar cada 15 segundos si no tenemos ubicación
    const intervalo = setInterval(() => {
      if (!location && !gpsPermissionDenied) {
        console.log("🔄 Reintentando obtener ubicación automáticamente...");
        solicitarUbicacion();
      }
    }, 15000);

    return () => clearInterval(intervalo);
  }, []);

  const loadDependencias = async () => {
    try {
      const { data, error } = await supabase
        .from("dependencias")
        .select("*")
        .order("nombre");

      if (error) throw error;

      // Si no hay datos, usar dependencias de prueba
      if (!data || data.length === 0) {
        setDependencias([
          {
            id: "001",
            nombre: "CIC",
            codigo: "INT-001",
            direccion: "Calle Garay y Nogoya",
            created_at: new Date().toISOString(),
          },
          {
            id: "002",
            nombre: "NIDO",
            codigo: "OBR-001",
            direccion: "Calle Misiones y Buenos Aires",
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        setDependencias(data);
      }
    } catch (err) {
      console.error("Error cargando dependencias:", err);
      // Si hay error, usar datos de prueba
      setDependencias([
        {
          id: "001",
          nombre: "CIC",
          codigo: "INT-001",
          direccion: "Calle Garay y Nogoya",
          created_at: new Date().toISOString(),
        },
        {
          id: "002",
          nombre: "NIDO",
          codigo: "OBR-001",
          direccion: "Calle Misiones y Buenos Aires",
          created_at: new Date().toISOString(),
        },
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
      setError("Por favor ingresá tu DNI");
      return;
    }

    if (!dependencia) {
      setError("Por favor seleccioná una dependencia");
      return;
    }

    if (!photoBlob) {
      setError("Por favor tomá una foto");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Subir foto a Supabase Storage
      const fileName = `${Date.now()}-${documento}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("fotos-fichadas")
        .upload(fileName, photoBlob);

      if (uploadError) throw uploadError;

      // Obtener URL pública de la foto
      const { data: urlData } = supabase.storage
        .from("fotos-fichadas")
        .getPublicUrl(fileName);

      // Obtener información de la dependencia cercana
      const depCercana = location
        ? encontrarDependenciaCercana(location)
        : null;

      // Guardar fichada con ubicación validada
      const fichadaData: FichadaInsert = {
        dependencia_id: dependencia.id,
        documento,
        tipo: tipoFichada,
        foto_url: urlData.publicUrl,
        latitud: location?.lat,
        longitud: location?.lng,
      };

      console.log("Enviando fichada:", fichadaData);

      const { error: insertError } = await supabase
        .from("fichadas")
        .insert([fichadaData]);

      if (insertError) throw insertError;

      setSuccess(true);
      setDocumento("");
      setPhotoBlob(null);
      setPhotoPreview("");
      setDependencia(null);
      setTipoFichada("entrada");

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError("Error al registrar fichada. Intenta nuevamente.");
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
              <label
                htmlFor="documento"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Documento (DNI)
              </label>
              <input
                type="text"
                id="documento"
                value={documento}
                onChange={(e) =>
                  setDocumento(e.target.value.replace(/\D/g, ""))
                }
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
                  onClick={() => setTipoFichada("entrada")}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition ${
                    tipoFichada === "entrada"
                      ? "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-500 dark:text-green-400"
                      : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                  }`}
                >
                  <LogIn className="w-5 h-5" />
                  <span className="font-semibold">Entrada</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoFichada("salida")}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition ${
                    tipoFichada === "salida"
                      ? "bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-400"
                      : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                  }`}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Salida</span>
                </button>
              </div>
            </div>

            {/* Selector de Dependencia */}
            <div>
              <label
                htmlFor="dependencia"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Dependencia
              </label>
              <select
                id="dependencia"
                value={dependencia?.id || ""}
                onChange={(e) => {
                  const selected = dependencias.find(
                    (d) => d.id === e.target.value
                  );
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
                      setPhotoPreview("");
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
            <div className="space-y-3">
              {location && locationValidation?.permitido ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-3 flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-green-700 dark:text-green-300 font-medium text-sm">
                      ✓ Ubicación válida
                    </p>
                    <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                      {locationValidation.mensaje}
                    </p>
                  </div>
                </div>
              ) : location &&
                locationValidation &&
                !locationValidation.permitido ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-yellow-700 dark:text-yellow-300 font-medium text-sm">
                      ⚠️ Advertencia: Estás fuera del rango
                    </p>
                    <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                      {locationValidation.mensaje}
                    </p>
                    <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-2 italic">
                      Podés fichar igual, pero tu ubicación quedará registrada.
                    </p>
                  </div>
                </div>
              ) : gpsPermissionDenied ? (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-orange-700 dark:text-orange-300 font-medium text-sm">
                        ⚠️ Permisos de ubicación necesarios
                      </p>
                      <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                        Debes habilitar la ubicación para fichar. Asegúrate de:
                      </p>
                      <ul className="text-orange-600 dark:text-orange-400 text-xs mt-2 ml-4 list-disc space-y-1">
                        <li>Tener GPS/ubicación activado en tu dispositivo</li>
                        <li>
                          Dar permisos de ubicación a este sitio en el navegador
                        </li>
                        <li>Estar en CIC o NIDO (a menos de 100m)</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGpsPermissionDenied(false);
                      setError("");
                      solicitarUbicacion();
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <MapPin className="w-4 h-4" />
                    Reintentar GPS
                  </button>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-3 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700 dark:text-blue-300 text-sm">
                    Obteniendo ubicación GPS...
                  </span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                loading || !dependencia || !documento || !photoBlob || !location
              }
              className="w-full bg-[#b6c544] hover:bg-[#9fb338] disabled:bg-gray-400 text-white font-medium py-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Registrando fichada...
                </>
              ) : (
                "Registrar Fichada"
              )}
            </button>

            {/* Indicador de qué falta */}
            {(!documento || !dependencia || !photoBlob || !location) && (
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                <div className="text-center">
                  {!documento && "⚠ Falta: DNI • "}
                  {!dependencia && "⚠ Falta: Dependencia • "}
                  {!photoBlob && "⚠ Falta: Foto • "}
                  {!location && "⚠ Falta: Ubicación GPS"}
                </div>
                {gpsPermissionDenied && (
                  <div className="text-orange-600 dark:text-orange-400 font-medium text-center bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-800">
                    � Habilita los permisos de ubicación para continuar
                  </div>
                )}
              </div>
            )}

            {/* Advertencia adicional si está fuera de rango pero puede fichar */}
            {documento &&
              dependencia &&
              photoBlob &&
              location &&
              locationValidation &&
              !locationValidation.permitido && (
                <div className="text-sm text-yellow-700 dark:text-yellow-300 text-center bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  ⚠️ <strong>Importante:</strong> Tu ubicación actual quedará
                  registrada aunque estés fuera del rango permitido.
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
