"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Camera as CameraIcon, RefreshCw, AlertCircle } from "lucide-react";
import { validateImageFile, compressImage, logger } from "@/lib/utils";

interface CameraProps {
  onCapture: (blob: Blob) => void;
  disabled?: boolean;
}

export default function Camera({ onCapture, disabled }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Detectar plataforma
  const [deviceInfo] = useState(() => {
    if (typeof window === "undefined") return { isIOS: false, isAndroid: false, isMobile: false, browser: "" };
    const ua = navigator.userAgent.toLowerCase();

    let browser = "unknown";
    if (ua.includes("crios")) browser = "chrome-ios";
    else if (ua.includes("fxios")) browser = "firefox-ios";
    else if (ua.includes("safari") && !ua.includes("chrome")) browser = "safari";
    else if (ua.includes("chrome")) browser = "chrome";
    else if (ua.includes("firefox")) browser = "firefox";
    else if (ua.includes("samsung")) browser = "samsung";

    return {
      isIOS: /iphone|ipad|ipod/.test(ua) || (ua.includes("mac") && "ontouchend" in document),
      isAndroid: /android/i.test(ua),
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      browser
    };
  });

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        logger.log("📷 Track detenido:", track.label);
      });
      setStream(null);
      setIsCameraActive(false);
      setIsCameraReady(false);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setIsCameraReady(false);

      // Verificar si getUserMedia está disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        logger.error("getUserMedia no disponible");
        setError("⚠️ Tu navegador no soporta acceso a cámara. Prueba con Chrome, Safari o Firefox.");
        return;
      }

      logger.log(`📷 Iniciando cámara en ${deviceInfo.browser} (${deviceInfo.isMobile ? "móvil" : "desktop"})`);

      // Configuración de constraints optimizada para móviles
      const constraints: MediaStreamConstraints = {
        video: deviceInfo.isMobile
          ? {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          }
          : {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
        audio: false,
      };

      logger.log("📷 Solicitando stream con constraints:", constraints);

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      logger.log("📷 Stream obtenido:", mediaStream.getVideoTracks().map(t => ({
        label: t.label,
        readyState: t.readyState,
        enabled: t.enabled
      })));

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Esperar a que el video esté realmente listo
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          const timeoutId = setTimeout(() => {
            reject(new Error("Timeout esperando video"));
          }, 10000);

          const handleLoadedMetadata = () => {
            clearTimeout(timeoutId);
            logger.log("📷 Video metadata cargada:", {
              width: video.videoWidth,
              height: video.videoHeight
            });
            resolve();
          };

          const handleError = (e: Event) => {
            clearTimeout(timeoutId);
            logger.error("📷 Error en video element:", e);
            reject(new Error("Error cargando video"));
          };

          video.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
          video.addEventListener("error", handleError, { once: true });

          // Si ya tiene metadata, resolver inmediatamente
          if (video.readyState >= 1) {
            clearTimeout(timeoutId);
            resolve();
          }
        });

        // Intentar reproducir el video
        try {
          await videoRef.current.play();
          logger.log("📷 Video reproduciéndose");
        } catch (playErr) {
          logger.error("📷 Error al reproducir video:", playErr);
        }

        setStream(mediaStream);
        setIsCameraActive(true);
        setIsCameraReady(true);
        setRetryCount(0);
      }
    } catch (err: unknown) {
      const error = err as Error & { name?: string };
      logger.error("📷 Error al acceder a cámara:", error.name, error.message);

      let errorMessage = "";

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        if (deviceInfo.isIOS) {
          errorMessage = "🚫 Permiso de cámara denegado.\n\n📱 En iPhone/iPad:\n1. Ve a Configuración > Safari > Cámara\n2. Selecciona 'Permitir'\n3. Recarga esta página";
        } else if (deviceInfo.isAndroid) {
          errorMessage = "🚫 Permiso de cámara denegado.\n\n📱 En Android:\n1. Toca el icono de candado/info en la barra de direcciones\n2. Permite el acceso a 'Cámara'\n3. Recarga esta página";
        } else {
          errorMessage = "🚫 Permiso de cámara denegado. Por favor, permite el acceso a la cámara en tu navegador y recarga la página.";
        }
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        errorMessage = "📷 No se encontró ninguna cámara. ¿Está conectada correctamente?";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        // La cámara está siendo usada por otra aplicación
        if (retryCount < 2) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => startCamera(), 1500);
          errorMessage = "📷 La cámara estaba ocupada. Reintentando...";
        } else {
          errorMessage = "📷 La cámara está siendo usada por otra aplicación. Cierra otras apps (WhatsApp, Instagram, etc.) e intenta de nuevo.";
        }
      } else if (error.name === "OverconstrainedError") {
        // Reintentar con constraints mínimos
        if (retryCount < 1) {
          setRetryCount(prev => prev + 1);
          try {
            const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (videoRef.current) {
              videoRef.current.srcObject = simpleStream;
              await videoRef.current.play();
              setStream(simpleStream);
              setIsCameraActive(true);
              setIsCameraReady(true);
              setError("");
              return;
            }
          } catch {
            errorMessage = "📷 No se pudo iniciar la cámara. Intenta recargar la página.";
          }
        }
      } else if (error.name === "AbortError") {
        errorMessage = "📷 La solicitud de cámara fue cancelada. Presiona 'Abrir Cámara' para intentar de nuevo.";
      } else if (error.name === "SecurityError") {
        errorMessage = "🔒 Por seguridad, la cámara solo funciona en conexiones seguras (HTTPS).";
      } else {
        errorMessage = `📷 Error al acceder a la cámara. Intenta recargar la página o usa otro navegador.`;
      }

      setError(errorMessage);
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, deviceInfo, retryCount]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      setError("La cámara no está lista. Espera un momento e intenta de nuevo.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        canvas.toBlob(
          async (blob) => {
            if (blob) {
              // Validar el archivo
              const validation = validateImageFile(blob);
              if (!validation.valid) {
                setError(validation.error || "Error al validar la imagen");
                setIsProcessing(false);
                return;
              }

              // Comprimir la imagen
              try {
                const compressedBlob = await compressImage(blob, 1920, 0.8);
                onCapture(compressedBlob);
                stopCamera();
                logger.log("📷 Foto capturada y comprimida");
              } catch (err) {
                logger.error("Error al comprimir imagen:", err);
                // Si falla la compresión, usar la original
                onCapture(blob);
                stopCamera();
              }
            } else {
              setError("Error al capturar la foto. Intenta de nuevo.");
            }
            setIsProcessing(false);
          },
          "image/jpeg",
          0.9
        );
      } else {
        setError("El video no tiene contenido. Espera a que la cámara esté lista.");
        setIsProcessing(false);
      }
    } catch (err) {
      logger.error("Error al capturar foto:", err);
      setError("Error al capturar la foto. Intenta nuevamente.");
      setIsProcessing(false);
    }
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Auto-iniciar cámara cuando cambia facingMode
  useEffect(() => {
    if (facingMode && !stream) {
      startCamera();
    }
  }, [facingMode, stream, startCamera]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-[4/3]">
        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
            <button
              onClick={startCamera}
              disabled={disabled}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
            >
              <CameraIcon className="w-5 h-5" />
              Abrir Cámara
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isCameraActive ? "hidden" : ""
            }`}
        />

        {/* Indicador de carga de cámara */}
        {isCameraActive && !isCameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm">Iniciando cámara...</p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm whitespace-pre-line">{error}</p>
              <button
                onClick={startCamera}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm"
              >
                <CameraIcon className="w-4 h-4" />
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {isCameraActive && isCameraReady && (
        <div className="flex gap-3">
          <button
            onClick={capturePhoto}
            disabled={disabled || isProcessing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Procesando...
              </>
            ) : (
              <>
                <CameraIcon className="w-5 h-5" />
                Capturar Foto
              </>
            )}
          </button>
          <button
            onClick={switchCamera}
            disabled={disabled || isProcessing}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition"
            title="Cambiar cámara"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
