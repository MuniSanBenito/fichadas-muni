'use client';

import { useState, useEffect } from 'react';
import { supabase, type Dependencia } from '@/lib/supabase';
import QRCode from 'qrcode';
import { QrCode, Download, Building2, Plus } from 'lucide-react';

export default function AdminPage() {
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDep, setSelectedDep] = useState<Dependencia | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    loadDependencias();
  }, []);

  const loadDependencias = async () => {
    try {
      const { data, error } = await supabase
        .from('dependencias')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setDependencias(data || []);
    } catch (err) {
      console.error('Error cargando dependencias:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateQR = async (dependencia: Dependencia) => {
    setSelectedDep(dependencia);
    const url = `${window.location.origin}/?dep=${dependencia.codigo}`;
    
    try {
      const qrUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(qrUrl);
    } catch (err) {
      console.error('Error generando QR:', err);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl || !selectedDep) return;
    
    const link = document.createElement('a');
    link.download = `qr-${selectedDep.codigo}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const printQR = () => {
    if (!qrDataUrl) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR - ${selectedDep?.nombre}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
              }
              h1 { margin-bottom: 20px; }
              img { max-width: 400px; }
              p { margin-top: 20px; color: #666; }
            </style>
          </head>
          <body>
            <h1>${selectedDep?.nombre}</h1>
            <img src="${qrDataUrl}" alt="QR Code" />
            <p>Escanea este código para registrar tu fichada</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-3 rounded-full">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Generador de QR
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Códigos QR para dependencias
                </p>
              </div>
            </div>
            <a
              href="/"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Volver
            </a>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Lista de Dependencias */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Dependencias
              </h2>
              
              {dependencias.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay dependencias registradas</p>
                  <p className="text-sm mt-2">
                    Agregá dependencias en Supabase siguiendo las instrucciones en SUPABASE_SETUP.md
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dependencias.map((dep) => (
                    <button
                      key={dep.id}
                      onClick={() => generateQR(dep)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        selectedDep?.id === dep.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {dep.nombre}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Código: {dep.codigo}
                      </div>
                      {dep.direccion && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {dep.direccion}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* QR Preview */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Código QR
              </h2>
              
              {!qrDataUrl ? (
                <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="text-center text-gray-500">
                    <QrCode className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p>Seleccioná una dependencia</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                    <img src={qrDataUrl} alt="QR Code" className="max-w-full" />
                  </div>
                  
                  {selectedDep && (
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedDep.nombre}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {window.location.origin}/?dep={selectedDep.codigo}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={downloadQR}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition"
                    >
                      <Download className="w-5 h-5" />
                      Descargar
                    </button>
                    <button
                      onClick={printQR}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition"
                    >
                      Imprimir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Instrucciones
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Seleccioná una dependencia de la lista</li>
            <li>• Descargá o imprimí el código QR generado</li>
            <li>• Colocá el QR en un lugar visible de la dependencia</li>
            <li>• Los empleados escanean el QR para registrar su fichada</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
