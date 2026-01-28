"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { validarUbicacionParaFichar } from "@/lib/gpsConfig";
import { logger } from "@/lib/utils";

export interface GeolocationState {
    location: { lat: number; lng: number; accuracy?: number } | null;
    locationValidation: {
        permitido: boolean;
        mensaje: string;
    } | null;
    error: string;
    loading: boolean;
    permissionDenied: boolean;
    retryCount: number;
    isIOS: boolean;
    isAndroid: boolean;
}

interface UseGeolocationOptions {
    /** Intervalo de reintento automático en ms (default: 15000) */
    retryInterval?: number;
    /** Si debe reintentar automáticamente (default: true) */
    autoRetry?: boolean;
    /** Timeout para obtener ubicación en ms (default: 10000 para móvil) */
    timeout?: number;
    /** Si debe usar alta precisión (default: true) */
    highAccuracy?: boolean;
}

const DEFAULT_OPTIONS: UseGeolocationOptions = {
    retryInterval: 15000,
    autoRetry: true,
    timeout: 10000,
    highAccuracy: true,
};

/**
 * Detecta si estamos en iOS
 */
const detectIOS = (): boolean => {
    if (typeof window === "undefined") return false;

    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent) ||
        (userAgent.includes("mac") && "ontouchend" in document);
};

/**
 * Detecta si estamos en Android
 */
const detectAndroid = (): boolean => {
    if (typeof window === "undefined") return false;
    return /android/i.test(window.navigator.userAgent);
};

/**
 * Detecta si estamos en un navegador móvil
 */
const isMobileBrowser = (): boolean => {
    if (typeof window === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        window.navigator.userAgent
    );
};

export function useGeolocation(options: UseGeolocationOptions = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const isIOS = detectIOS();
    const isAndroid = detectAndroid();
    const isMobile = isMobileBrowser();

    const [state, setState] = useState<GeolocationState>({
        location: null,
        locationValidation: null,
        error: "",
        loading: true,
        permissionDenied: false,
        retryCount: 0,
        isIOS,
        isAndroid,
    });

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const isMounted = useRef(true);

    const updateState = useCallback((updates: Partial<GeolocationState>) => {
        if (isMounted.current) {
            setState((prev) => ({ ...prev, ...updates }));
        }
    }, []);

    /**
     * Obtiene las opciones de geolocalización optimizadas para el dispositivo
     */
    const getGeoOptions = useCallback(
        (highAccuracy: boolean = true): PositionOptions => {
            // En iOS, usar configuración más permisiva para evitar timeouts
            if (isIOS) {
                return {
                    enableHighAccuracy: highAccuracy,
                    timeout: highAccuracy ? 15000 : 20000,
                    maximumAge: highAccuracy ? 0 : 30000,
                };
            }

            // En Android, configuración estándar
            if (isAndroid) {
                return {
                    enableHighAccuracy: highAccuracy,
                    timeout: highAccuracy ? 10000 : 15000,
                    maximumAge: highAccuracy ? 0 : 10000,
                };
            }

            // Desktop/otros
            return {
                enableHighAccuracy: highAccuracy,
                timeout: opts.timeout,
                maximumAge: 0,
            };
        },
        [isIOS, isAndroid, opts.timeout]
    );

    /**
     * Procesa una posición exitosa
     */
    const handleSuccess = useCallback(
        (position: GeolocationPosition) => {
            logger.log("✅ Ubicación obtenida:", {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                device: isIOS ? "iOS" : isAndroid ? "Android" : "Desktop",
            });

            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
            };

            const validation = validarUbicacionParaFichar(userLocation);
            logger.log("📍 Validación GPS:", validation);

            updateState({
                location: userLocation,
                locationValidation: validation,
                error: "",
                loading: false,
                permissionDenied: false,
            });
        },
        [isIOS, isAndroid, updateState]
    );

    /**
     * Procesa un error de geolocalización
     */
    const handleError = useCallback(
        (err: GeolocationPositionError, isRetry: boolean = false) => {
            logger.error(
                "❌ Error obteniendo ubicación:",
                err.message,
                "Código:",
                err.code,
                "Dispositivo:",
                isIOS ? "iOS" : isAndroid ? "Android" : "Desktop"
            );

            if (err.code === 1) {
                // PERMISSION_DENIED
                let errorMsg = "🚫 Necesitamos acceso a tu ubicación para verificar que estés en una dependencia municipal. ";

                if (isIOS) {
                    errorMsg +=
                        "Ve a Configuración > Privacidad > Servicios de ubicación > Safari (o tu navegador) y selecciona 'Mientras se usa la app'.";
                } else if (isAndroid) {
                    errorMsg +=
                        "Toca el ícono de candado en la barra de direcciones y permite el acceso a la ubicación.";
                } else {
                    errorMsg +=
                        "Habilita los permisos de ubicación en tu navegador y presiona 'Reintentar GPS'.";
                }

                updateState({
                    error: errorMsg,
                    permissionDenied: true,
                    loading: false,
                });
            } else if (err.code === 3 && !isRetry) {
                // TIMEOUT - reintentar con configuración más flexible
                logger.log("⏱️ Timeout - reintentando con baja precisión...");

                setState((prev) => ({
                    ...prev,
                    retryCount: prev.retryCount + 1,
                }));

                // Reintentar con baja precisión
                navigator.geolocation.getCurrentPosition(
                    handleSuccess,
                    (retryErr) => handleError(retryErr, true),
                    getGeoOptions(false) // Baja precisión
                );
            } else if (err.code === 2) {
                // POSITION_UNAVAILABLE
                let errorMsg = "⚠️ No se pudo determinar tu ubicación. ";

                if (isIOS) {
                    errorMsg +=
                        "Asegúrate de tener los Servicios de ubicación activados en Configuración > Privacidad.";
                } else if (isAndroid) {
                    errorMsg +=
                        "Activa el GPS desde la barra de notificaciones o ve a Configuración > Ubicación.";
                } else {
                    errorMsg += "Verifica que tengas GPS activado.";
                }

                updateState({
                    error: errorMsg,
                    permissionDenied: true,
                    loading: false,
                });
            } else {
                // Error genérico después de reintento
                updateState({
                    error:
                        "⚠️ No se pudo obtener tu ubicación. Verifica que tengas GPS activado y " +
                        "hayas dado permisos al navegador. Presiona 'Reintentar GPS' para volver a intentar.",
                    permissionDenied: true,
                    loading: false,
                });
            }
        },
        [isIOS, isAndroid, updateState, handleSuccess, getGeoOptions]
    );

    /**
     * Solicita la ubicación actual
     */
    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            logger.error("Geolocalización no disponible");
            updateState({
                error:
                    "⚠️ Tu navegador no soporta geolocalización. Por favor usa Chrome, Firefox o Safari.",
                permissionDenied: true,
                loading: false,
            });
            return;
        }

        logger.log(
            `🔄 Solicitando ubicación GPS... (${isIOS ? "iOS" : isAndroid ? "Android" : "Desktop"
            })`
        );
        updateState({ loading: true, error: "" });

        // En móviles, usar watchPosition primero para activar el GPS más rápido
        if (isMobile && watchIdRef.current === null) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    // Solo usar la primera posición válida
                    if (watchIdRef.current !== null) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                    }
                    handleSuccess(position);
                },
                (err) => {
                    if (watchIdRef.current !== null) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                    }
                    handleError(err);
                },
                getGeoOptions(true)
            );

            // Fallback con getCurrentPosition después de 3 segundos
            setTimeout(() => {
                if (state.loading && !state.location) {
                    navigator.geolocation.getCurrentPosition(
                        handleSuccess,
                        handleError,
                        getGeoOptions(true)
                    );
                }
            }, 3000);
        } else {
            // En desktop, usar getCurrentPosition directamente
            navigator.geolocation.getCurrentPosition(
                handleSuccess,
                handleError,
                getGeoOptions(true)
            );
        }
    }, [
        isIOS,
        isAndroid,
        isMobile,
        updateState,
        handleSuccess,
        handleError,
        getGeoOptions,
        state.loading,
        state.location,
    ]);

    /**
     * Reintenta obtener la ubicación
     */
    const retry = useCallback(() => {
        updateState({
            permissionDenied: false,
            error: "",
            loading: true,
        });
        requestLocation();
    }, [requestLocation, updateState]);

    // Solicitar ubicación al montar
    useEffect(() => {
        isMounted.current = true;

        // Pequeño delay en iOS para asegurar que la página esté completamente cargada
        const delay = isIOS ? 500 : 0;
        const timeoutId = setTimeout(requestLocation, delay);

        return () => {
            isMounted.current = false;
            clearTimeout(timeoutId);

            // Limpiar watchPosition si existe
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [requestLocation, isIOS]);

    // Auto-retry interval
    useEffect(() => {
        if (!opts.autoRetry) return;

        // Solo reintentar si no tenemos ubicación y no hay permiso denegado
        if (!state.location && !state.permissionDenied && !state.loading) {
            intervalRef.current = setInterval(() => {
                logger.log("🔄 Reintentando obtener ubicación automáticamente...");
                requestLocation();
            }, opts.retryInterval);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [
        state.location,
        state.permissionDenied,
        state.loading,
        opts.autoRetry,
        opts.retryInterval,
        requestLocation,
    ]);

    return {
        ...state,
        retry,
        requestLocation,
        isMobile,
    };
}

export default useGeolocation;
