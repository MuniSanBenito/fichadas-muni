"use client";

import { useState, useEffect } from "react";
import Camera from "./Camera";
import {
  supabase,
  type FichadaInsert,
  type Dependencia,
  type TipoFichada,
} from "@/lib/supabase";
import { validarUbicacionParaFichar, validarUbicacionParaDependencia } from "@/lib/gpsConfig";
import {
  sanitizeDNI,
  isValidDNI,
  handleSupabaseError,
  logger,
} from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
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

  // Detectar plataforma una sola vez
  const [deviceInfo] = useState(() => {
    if (typeof window === "undefined") return { isIOS: false, isAndroid: false, isMobile: false };
    const ua = navigator.userAgent.toLowerCase();
    return {
      isIOS: /iphone|ipad|ipod/.test(ua) || (ua.includes("mac") && "ontouchend" in document),
      isAndroid: /android/i.test(ua),
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    };
  });

  // Watch ID para limpiar en móviles
  const [watchId, setWatchId] = useState<number | null>(null);

  // Función para solicitar ubicación GPS optimizada para móviles
  const solicitarUbicacion = () => {
    if (!navigator.geolocation) {
      logger.error("Geolocalización no disponible");
      setError(
        "⚠️ Tu navegador no soporta geolocalización. Por favor usa Chrome, Firefox o Safari."
      );
      setGpsPermissionDenied(true);
      return;
    }

    logger.log(`🔄 Solicitando ubicación GPS... (${deviceInfo.isIOS ? "iOS" : deviceInfo.isAndroid ? "Android" : "Desktop"})`);

    // Configuración optimizada por plataforma
    const geoOptionsHigh: PositionOptions = deviceInfo.isIOS
      ? { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      : deviceInfo.isAndroid
        ? { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        : { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 };

    const geoOptionsLow: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 30000
    };

    // Handler de éxito
    const onSuccess = (position: GeolocationPosition) => {
      logger.log("✅ Ubicación obtenida:", {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });

      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setLocation(userLocation);
      setGpsPermissionDenied(false);
      setError("");

      logger.log("📍 Ubicación guardada, se validará al seleccionar dependencia");
    };

    // Handler de error
    const onError = (err: GeolocationPositionError, isRetry: boolean = false) => {
      logger.error("❌ Error obteniendo ubicación:", err.message, "Código:", err.code);

      if (err.code === 1) {
        // PERMISSION_DENIED
        let errorMsg = "🚫 Necesitamos acceso a tu ubicación para verificar que estés en una dependencia municipal. ";

        if (deviceInfo.isIOS) {
          errorMsg += "Ve a Configuración > Privacidad > Servicios de ubicación > Safari y selecciona 'Mientras se usa la app'.";
        } else if (deviceInfo.isAndroid) {
          errorMsg += "Toca el ícono de candado/info en la barra de direcciones y permite el acceso a la ubicación.";
        } else {
          errorMsg += "Por favor, habilita los permisos de ubicación en tu navegador y presiona 'Reintentar GPS'.";
        }

        setGpsPermissionDenied(true);
        setError(errorMsg);
      } else if (err.code === 3 && !isRetry) {
        // TIMEOUT - reintentar con baja precisión
        logger.log("⏱️ Timeout - reintentando con baja precisión...");
        setRetryCount((prev) => prev + 1);

        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (e) => onError(e, true),
          geoOptionsLow
        );
      } else if (err.code === 2) {
        // POSITION_UNAVAILABLE
        let errorMsg = "⚠️ No se pudo determinar tu ubicación. ";

        if (deviceInfo.isIOS) {
          errorMsg += "Asegúrate de tener los Servicios de ubicación activados en Configuración > Privacidad.";
        } else if (deviceInfo.isAndroid) {
          errorMsg += "Activa el GPS desde la barra de notificaciones o ve a Configuración > Ubicación.";
        } else {
          errorMsg += "Verifica que tengas GPS activado.";
        }

        setGpsPermissionDenied(true);
        setError(errorMsg);
      } else {
        setGpsPermissionDenied(true);
        setError(
          "⚠️ No se pudo obtener tu ubicación. Verifica que tengas GPS activado y " +
          "presiona 'Reintentar GPS' para volver a intentar."
        );
      }
    };

    // En móviles, usar watchPosition para activar el GPS más rápido
    if (deviceInfo.isMobile) {
      // Limpiar watch anterior si existe
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      const newWatchId = navigator.geolocation.watchPosition(
        (position) => {
          // Al obtener la primera posición, dejar de observar
          navigator.geolocation.clearWatch(newWatchId);
          setWatchId(null);
          onSuccess(position);
        },
        (err) => {
          navigator.geolocation.clearWatch(newWatchId);
          setWatchId(null);
          onError(err);
        },
        geoOptionsHigh
      );

      setWatchId(newWatchId);

      // Fallback con getCurrentPosition después de 3 segundos
      setTimeout(() => {
        if (!location) {
          navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptionsHigh);
        }
      }, 3000);
    } else {
      // En desktop, usar getCurrentPosition directamente
      navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptionsHigh);
    }
  };

  useEffect(() => {
    // Cargar todas las dependencias
    loadDependencias();

    // Pequeño delay en iOS para asegurar que la página esté cargada
    const delay = deviceInfo.isIOS ? 500 : 0;
    const timeoutId = setTimeout(solicitarUbicacion, delay);

    // Reintentar cada 15 segundos si no tenemos ubicación
    const intervalo = setInterval(() => {
      if (!location && !gpsPermissionDenied) {
        logger.log("🔄 Reintentando obtener ubicación automáticamente...");
        solicitarUbicacion();
      }
    }, 15000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalo);
      // Limpiar watchPosition si existe
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validar ubicación cuando cambie la dependencia seleccionada o la ubicación
  useEffect(() => {
    if (!location) {
      setLocationValidation(null);
      return;
    }

    // Si hay una dependencia seleccionada, validar contra ella
    if (dependencia) {
      const validation = validarUbicacionParaDependencia(location, {
        nombre: dependencia.nombre,
        latitud: dependencia.latitud,
        longitud: dependencia.longitud,
        radio_metros: dependencia.radio_metros,
      });
      setLocationValidation(validation);
      logger.log("📍 Validación GPS contra dependencia seleccionada:", validation);
    } else {
      // Si no hay dependencia seleccionada, validar contra la dependencia más cercana (comportamiento original)
      const validation = validarUbicacionParaFichar(location);
      setLocationValidation(validation);
      logger.log("📍 Validación GPS general:", validation);
    }
  }, [location, dependencia]);

  const loadDependencias = async () => {
    try {
      const { data, error } = await supabase
        .from("dependencias")
        .select("*")
        .order("nombre");

      if (error) throw error;

      setDependencias(data || []);
    } catch (err) {
      logger.error("Error cargando dependencias:", err);
      setError(handleSupabaseError(err));
    }
  };

  const handlePhotoCapture = (blob: Blob) => {
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar DNI
    const dniSanitizado = sanitizeDNI(documento);
    if (!isValidDNI(dniSanitizado)) {
      setError("Por favor ingresá un DNI válido (7 u 8 dígitos)");
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

    if (!location) {
      setError("Esperando ubicación GPS...");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Subir foto a Supabase Storage
      const fileName = `${Date.now()}-${dniSanitizado}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("fotos-fichadas")
        .upload(fileName, photoBlob);

      if (uploadError) throw uploadError;

      // Obtener URL pública de la foto
      const { data: urlData } = supabase.storage
        .from("fotos-fichadas")
        .getPublicUrl(fileName);

      // Guardar fichada con ubicación validada
      const fichadaData: FichadaInsert = {
        dependencia_id: dependencia.id,
        documento: dniSanitizado,
        tipo: tipoFichada,
        foto_url: urlData.publicUrl,
        latitud: location?.lat,
        longitud: location?.lng,
      };

      logger.log("Enviando fichada:", fichadaData);

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
      setError(handleSupabaseError(err));
      logger.error("Error al registrar fichada:", err);
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
                onChange={(e) => {
                  const sanitized = sanitizeDNI(e.target.value);
                  setDocumento(sanitized);
                }}
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
                  className={`flex items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition ${tipoFichada === "entrada"
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
                  className={`flex items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 transition ${tipoFichada === "salida"
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
                        <li>
                          Estar en BIBLIOTECA, CIC o NIDO (a menos de 100m)
                        </li>
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
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            v{APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}
