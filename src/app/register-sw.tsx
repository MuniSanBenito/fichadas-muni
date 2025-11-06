"use client";

import { useEffect, useState } from "react";

export default function RegisterSW() {
  const [showReload, setShowReload] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[App] SW registrado:", registration);

          // Verificar actualizaciones cada 60 segundos
          setInterval(() => {
            registration.update();
          }, 60000);

          // Detectar cuando hay un nuevo SW esperando
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            console.log("[App] Nueva actualización encontrada");

            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // Hay un nuevo SW esperando para activarse
                  console.log("[App] Nueva versión disponible");
                  setWaitingWorker(newWorker);
                  setShowReload(true);
                }
              });
            }
          });
        })
        .catch((error) => console.log("[App] SW registration failed:", error));

      // Detectar cuando el SW toma control (después de actualizar)
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          console.log("[App] Recargando página...");
          window.location.reload();
        }
      });
    }
  }, []);

  const reloadPage = () => {
    if (waitingWorker) {
      // Enviar mensaje al SW para que se active inmediatamente
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  if (!showReload) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#b6c544",
        color: "white",
        padding: "16px 24px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        maxWidth: "90%",
        animation: "slideUp 0.3s ease-out",
      }}
    >
      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      <span style={{ flex: 1, fontSize: "14px", fontWeight: "500" }}>
        Nueva versión disponible
      </span>

      <button
        onClick={reloadPage}
        style={{
          backgroundColor: "white",
          color: "#b6c544",
          border: "none",
          padding: "8px 16px",
          borderRadius: "4px",
          fontWeight: "bold",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        Actualizar
      </button>
    </div>
  );
}
