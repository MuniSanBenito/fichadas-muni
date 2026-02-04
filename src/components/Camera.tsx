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
  const [constraintLevel, setConstraintLevel] = useState(0);

  // Detectar plataforma
  const [deviceInfo] = useState(() => {
    if (typeof window === "undefined") return { isIOS: false, isAndroid: false, isMobile: false, browser: "", isOldDevice: false };
    const ua = navigator.userAgent.toLowerCase();

    let browser = "unknown";
    if (ua.includes("crios")) browser = "chrome-ios";
    else if (ua.includes("fxios")) browser = "firefox-ios";
    else if (ua.includes("safari") && !ua.includes("chrome")) browser = "safari";
    else if (ua.includes("chrome")) browser = "chrome";
    else if (ua.includes("firefox")) browser = "firefox";
    else if (ua.includes("samsung")) browser = "samsung";

    const androidMatch = ua.match(/android\s*(\d+)/i);
    const androidVersion = androidMatch ? parseInt(androidMatch[1]) : 99;
    const isOldAndroid = androidVersion < 8;

    const iosMatch = ua.match(/os\s*(\d+)/i);
    const iosVersion = iosMatch ? parseInt(iosMatch[1]) : 99;
    const isOldIOS = iosVersion < 13;

    return {
      isIOS: /iphone|ipad|ipod/.test(ua) || (ua.includes("mac") && "ontouchend" in document),
      isAndroid: /android/i.test(ua),
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      browser,
      isOldDevice: isOldAndroid || isOldIOS
    };
  });

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try { track.stop(); } catch { /* ignore */ }
      });
      setStream(null);
      setIsCameraActive(false);
      setIsCameraReady(false);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const getConstraints = useCallback((level: number): MediaStreamConstraints => {
    if (level === 0) {
      return {
        video: deviceInfo.isMobile
          ? { facingMode: { ideal: facingMode }, width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 } }
          : { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      };
    }
    if (level === 1) {
      return {
        video: { facingMode, width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      };
    }
    return { video: true, audio: false };
  }, [facingMode, deviceInfo.isMobile]);

  const startCamera = useCallback(async () => {
    try {
      setError("");
      setIsCameraReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("⚠️ Tu navegador no soporta acceso a cámara. Actualiza tu navegador o usa Chrome/Firefox.");
        return;
      }

      const startLevel = deviceInfo.isOldDevice ? 1 : constraintLevel;
      let constraints = getConstraints(startLevel);

      logger.log(`📷 Iniciando cámara (nivel ${startLevel}) en ${deviceInfo.browser}`);

      let mediaStream: MediaStream;

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        logger.log("📷 Fallback a constraints más simples...");
        const nextLevel = Math.min(startLevel + 1, 2);
        setConstraintLevel(nextLevel);
        constraints = getConstraints(nextLevel);

        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          logger.log("📷 Último intento con video: true");
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      logger.log("📷 Stream obtenido correctamente");

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        const timeoutMs = deviceInfo.isOldDevice ? 15000 : 10000;

        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          const timeoutId = setTimeout(() => {
            if (video.readyState >= 1 || video.videoWidth > 0) resolve();
            else reject(new Error("Timeout"));
          }, timeoutMs);

          const handleReady = () => {
            clearTimeout(timeoutId);
            resolve();
          };

          video.addEventListener("loadedmetadata", handleReady, { once: true });
          video.addEventListener("canplay", handleReady, { once: true });

          if (video.readyState >= 2) {
            clearTimeout(timeoutId);
            resolve();
          }
        });

        try {
          await videoRef.current.play();
        } catch {
          logger.log("📷 Play falló pero continuando");
        }

        setStream(mediaStream);
        setIsCameraActive(true);
        setIsCameraReady(true);
        setRetryCount(0);
      }
    } catch (err: unknown) {
      const error = err as Error & { name?: string };
      logger.error("📷 Error:", error.name, error.message);

      let errorMessage = "";

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        if (deviceInfo.isIOS) {
          errorMessage = "🚫 Permiso de cámara denegado.\n\n📱 En iPhone/iPad:\n1. Ve a Configuración > Safari > Cámara\n2. Selecciona 'Permitir'\n3. Recarga esta página";
        } else if (deviceInfo.isAndroid) {
          errorMessage = "🚫 Permiso de cámara denegado.\n\n📱 En Android:\n1. Toca el icono de candado en la barra\n2. Permite 'Cámara'\n3. Recarga esta página";
        } else {
          errorMessage = "🚫 Permiso de cámara denegado. Permite el acceso y recarga.";
        }
      } else if (error.name === "NotFoundError") {
        errorMessage = "📷 No se encontró cámara.";
      } else if (error.name === "NotReadableError") {
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => startCamera(), 2000);
          errorMessage = "📷 Cámara ocupada. Reintentando...";
        } else {
          errorMessage = "📷 Cámara ocupada. Cierra otras apps.";
        }
      } else if (error.name === "OverconstrainedError") {
        if (constraintLevel < 2) {
          setConstraintLevel(prev => prev + 1);
          setTimeout(() => startCamera(), 500);
          return;
        }
        errorMessage = "📷 Cámara no compatible.";
      } else {
        errorMessage = "📷 Error al acceder a la cámara. Recarga la página.";
      }

      setError(errorMessage);
      stopCamera();
    }
  }, [facingMode, deviceInfo, retryCount, constraintLevel, getConstraints, stopCamera]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      setError("La cámara no está lista. Espera un momento.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      const videoWidth = video.videoWidth || video.clientWidth || 320;
      const videoHeight = video.videoHeight || video.clientHeight || 240;

      if (context && videoWidth > 0 && videoHeight > 0) {
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        // Voltear horizontalmente si es cámara frontal
        if (facingMode === "user") {
          context.translate(videoWidth, 0);
          context.scale(-1, 1);
        }

        context.drawImage(video, 0, 0, videoWidth, videoHeight);

        const quality = deviceInfo.isOldDevice ? 0.7 : 0.85;

        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const validation = validateImageFile(blob);
              if (!validation.valid) {
                setError(validation.error || "Error al validar");
                setIsProcessing(false);
                return;
              }

              try {
                const maxSize = deviceInfo.isOldDevice ? 800 : 1280;
                const compressedBlob = await compressImage(blob, maxSize, deviceInfo.isOldDevice ? 0.6 : 0.8);
                onCapture(compressedBlob);
                stopCamera();
              } catch {
                onCapture(blob);
                stopCamera();
              }
            } else {
              setError("Error al capturar. Intenta de nuevo.");
            }
            setIsProcessing(false);
          },
          "image/jpeg",
          quality
        );
      } else {
        canvas.width = 320;
        canvas.height = 240;
        if (context) {
          context.drawImage(video, 0, 0, 320, 240);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                onCapture(blob);
                stopCamera();
              } else {
                setError("No se pudo capturar.");
              }
              setIsProcessing(false);
            },
            "image/jpeg",
            0.7
          );
        }
      }
    } catch {
      setError("Error al capturar. Intenta de nuevo.");
      setIsProcessing(false);
    }
  };

  const switchCamera = () => {
    stopCamera();
    setConstraintLevel(0);
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  useEffect(() => {
    if (facingMode && !stream) {
      startCamera();
    }
  }, [facingMode, stream, startCamera]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          try { track.stop(); } catch { /* ignore */ }
        });
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
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg flex items-center gap-2 transition text-lg"
            >
              <CameraIcon className="w-6 h-6" />
              Abrir Cámara
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isCameraActive ? "hidden" : ""}`}
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />

        {isCameraActive && !isCameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
              <p className="text-base">Iniciando cámara...</p>
              <p className="text-xs mt-1 text-gray-300">Esto puede tardar unos segundos</p>
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
                onClick={() => {
                  setConstraintLevel(0);
                  setRetryCount(0);
                  startCamera();
                }}
                className="mt-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-3 rounded-lg flex items-center gap-2 transition text-base"
              >
                <CameraIcon className="w-5 h-5" />
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
            className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg font-medium transition flex items-center justify-center gap-2 text-lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                Procesando...
              </>
            ) : (
              <>
                <CameraIcon className="w-6 h-6" />
                Tomar Foto
              </>
            )}
          </button>
          <button
            onClick={switchCamera}
            disabled={disabled || isProcessing}
            className="bg-gray-600 hover:bg-gray-700 active:bg-gray-800 disabled:bg-gray-400 text-white px-5 py-4 rounded-lg transition"
            title="Cambiar cámara"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
