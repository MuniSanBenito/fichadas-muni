'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera as CameraIcon, RefreshCw } from 'lucide-react';

interface CameraProps {
  onCapture: (blob: Blob) => void;
  disabled?: boolean;
}

export default function Camera({ onCapture, disabled }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string>('');

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Por favor, permite el acceso.');
      console.error('Error accessing camera:', err);
    }
  }, [facingMode]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            onCapture(blob);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  useEffect(() => {
    if (facingMode && !stream) {
      startCamera();
    }
  }, [facingMode, stream, startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-[4/3]">
        {!isCameraActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startCamera}
              disabled={disabled}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition"
            >
              <CameraIcon className="w-5 h-5" />
              Activar Cámara
            </button>
          </div>
        )}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
        />
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {isCameraActive && (
        <div className="flex gap-3">
          <button
            onClick={capturePhoto}
            disabled={disabled}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            Capturar Foto
          </button>
          <button
            onClick={switchCamera}
            disabled={disabled}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition"
            title="Cambiar cámara"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
