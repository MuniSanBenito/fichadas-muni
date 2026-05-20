"use client";

import { useState, useRef, useMemo } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  LogIn,
  LogOut,
} from "lucide-react";
import { supabase, type Dependencia } from "@/lib/supabase";
import { isValidDNI, logger } from "@/lib/utils";

interface ParsedRecord {
  fecha_hora: string; // YYYY-MM-DD HH:MM:00
  documento: string;
  lineaOriginal: string;
  error?: string;
}

interface ImportResult {
  insertados: number;
  duplicados: number;
  errores: number;
  detallesErrores: string[];
}

interface ImportRelojFisicoProps {
  dependencias: Dependencia[];
  onImportComplete: () => void;
}

/**
 * Importa fichadas desde archivo de reloj físico.
 * Formato esperado (separado por espacios o tabs):
 *   DNI  DD  MM  YYYY  HH  MM
 * Ejemplo:
 *   39683817  05 11 2025 07 18
 */
export default function ImportRelojFisico({
  dependencias,
  onImportComplete,
}: ImportRelojFisicoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [invalidRecords, setInvalidRecords] = useState<ParsedRecord[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState("");
  const [dependenciaId, setDependenciaId] = useState<string>("");
  const [tipo, setTipo] = useState<"entrada" | "salida">("entrada");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dependenciaSeleccionada = useMemo(
    () => dependencias.find((d) => d.id === dependenciaId),
    [dependencias, dependenciaId],
  );

  const parseFile = (text: string) => {
    setParseError("");
    setResult(null);

    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      setParseError("El archivo está vacío.");
      return;
    }

    const valid: ParsedRecord[] = [];
    const invalid: ParsedRecord[] = [];

    for (const line of lines) {
      // Split por cualquier whitespace (espacios múltiples, tabs, etc.)
      const tokens = line.trim().split(/\s+/);

      // Formato esperado: DNI DD MM YYYY HH MM (6 tokens)
      if (tokens.length !== 6) {
        invalid.push({
          fecha_hora: "",
          documento: tokens[0] || "",
          lineaOriginal: line,
          error: `Se esperaban 6 valores (DNI DD MM YYYY HH MM), se encontraron ${tokens.length}`,
        });
        continue;
      }

      const [dni, dd, mm, yyyy, hh, min] = tokens;

      // Validar DNI (7 u 8 dígitos)
      if (!isValidDNI(dni)) {
        invalid.push({
          fecha_hora: "",
          documento: dni,
          lineaOriginal: line,
          error: "DNI inválido (debe tener 7 u 8 dígitos)",
        });
        continue;
      }

      // Validar componentes de fecha
      const day = parseInt(dd, 10);
      const month = parseInt(mm, 10);
      const year = parseInt(yyyy, 10);
      const hour = parseInt(hh, 10);
      const minute = parseInt(min, 10);

      const fechaValida =
        !isNaN(day) &&
        day >= 1 &&
        day <= 31 &&
        !isNaN(month) &&
        month >= 1 &&
        month <= 12 &&
        !isNaN(year) &&
        year >= 2000 &&
        year <= 2100 &&
        !isNaN(hour) &&
        hour >= 0 &&
        hour <= 23 &&
        !isNaN(minute) &&
        minute >= 0 &&
        minute <= 59;

      if (!fechaValida) {
        invalid.push({
          fecha_hora: "",
          documento: dni,
          lineaOriginal: line,
          error: "Fecha u hora inválida",
        });
        continue;
      }

      // Construir fecha_hora en formato ISO sin zona (PostgreSQL timestamp)
      const fecha_hora = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")} ${hh.padStart(2, "0")}:${min.padStart(2, "0")}:00`;

      valid.push({
        fecha_hora,
        documento: dni,
        lineaOriginal: line,
      });
    }

    setParsedRecords(valid);
    setInvalidRecords(invalid);

    if (valid.length === 0 && invalid.length > 0) {
      setParseError(
        "Ninguna línea pudo ser parseada. Verificá el formato del archivo.",
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setParsedRecords([]);
    setInvalidRecords([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseFile(text);
    };
    reader.readAsText(selectedFile, "utf-8");
  };

  const handleImport = async () => {
    if (parsedRecords.length === 0) return;
    if (!dependenciaId) {
      setParseError("Seleccioná una dependencia antes de importar.");
      return;
    }

    setImporting(true);
    setResult(null);
    setProgress({ current: 0, total: parsedRecords.length });

    const importResult: ImportResult = {
      insertados: 0,
      duplicados: 0,
      errores: 0,
      detallesErrores: [],
    };

    try {
      // 1. Buscar duplicados existentes en batch (mucho más eficiente que 1 query por registro)
      const documentosUnicos = [
        ...new Set(parsedRecords.map((r) => r.documento)),
      ];
      const fechasUnicas = [...new Set(parsedRecords.map((r) => r.fecha_hora))];

      // Buscar todas las fichadas existentes que coincidan con algún DNI y fecha del archivo
      const { data: existingFichadas, error: fetchError } = await supabase
        .from("fichadas")
        .select("documento, fecha_hora, tipo")
        .in("documento", documentosUnicos)
        .in("fecha_hora", fechasUnicas);

      if (fetchError) throw fetchError;

      // Construir set de claves existentes para lookup O(1)
      const existingKeys = new Set(
        (existingFichadas || []).map(
          (f) => `${f.documento}|${f.fecha_hora}|${f.tipo}`,
        ),
      );

      // 2. Filtrar duplicados y preparar inserts
      const toInsert: Array<{
        documento: string;
        tipo: "entrada" | "salida";
        fecha_hora: string;
        dependencia_id: string;
        origen: string;
      }> = [];

      for (const record of parsedRecords) {
        const key = `${record.documento}|${record.fecha_hora}|${tipo}`;
        if (existingKeys.has(key)) {
          importResult.duplicados++;
        } else {
          toInsert.push({
            documento: record.documento,
            tipo,
            fecha_hora: record.fecha_hora,
            dependencia_id: dependenciaId,
            origen: "Reloj_Fisico",
          });
          // Agregar al set para detectar duplicados dentro del mismo archivo
          existingKeys.add(key);
        }
      }

      // 3. Insertar en batches de 100
      const BATCH_SIZE = 100;
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from("fichadas")
          .insert(batch);

        if (insertError) {
          importResult.errores += batch.length;
          if (importResult.detallesErrores.length < 10) {
            importResult.detallesErrores.push(
              `Batch ${i / BATCH_SIZE + 1}: ${insertError.message}`,
            );
          }
          logger.error("Error insertando batch:", insertError);
        } else {
          importResult.insertados += batch.length;
        }

        setProgress({
          current: Math.min(i + BATCH_SIZE, toInsert.length),
          total: toInsert.length,
        });
      }
    } catch (err) {
      logger.error("Error en importación:", err);
      importResult.errores =
        parsedRecords.length -
        importResult.insertados -
        importResult.duplicados;
      importResult.detallesErrores.push(
        `Error general: ${err instanceof Error ? err.message : "desconocido"}`,
      );
    }

    setResult(importResult);
    setImporting(false);

    if (importResult.insertados > 0) {
      onImportComplete();
    }
  };

  const resetForm = () => {
    setFile(null);
    setParsedRecords([]);
    setInvalidRecords([]);
    setResult(null);
    setParseError("");
    setProgress({ current: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validRecords = parsedRecords;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500 p-2 rounded-lg">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Importar Reloj Físico
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Subir archivo .txt del reloj biométrico (formato: DNI DD MM YYYY
              HH MM)
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-6 space-y-4">
          {/* File input */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              className="hidden"
              id="reloj-file-input"
            />
            <label
              htmlFor="reloj-file-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <FileText className="w-10 h-10 text-gray-400" />
              {file ? (
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Haga clic para seleccionar archivo .txt
                  </span>
                  <span className="text-xs text-gray-500">
                    Una fichada por línea — formato: DNI DD MM YYYY HH MM
                  </span>
                </>
              )}
            </label>
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">
                {parseError}
              </p>
            </div>
          )}

          {/* Preview */}
          {(parsedRecords.length > 0 || invalidRecords.length > 0) &&
            !result && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Vista previa del archivo
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {validRecords.length}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400">
                      Válidos
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {invalidRecords.length}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-400">
                      Inválidos
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {parsedRecords.length + invalidRecords.length}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      Total líneas
                    </p>
                  </div>
                </div>

                {/* Selector de Dependencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dependencia del reloj físico{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dependenciaId}
                    onChange={(e) => setDependenciaId(e.target.value)}
                    disabled={importing}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  >
                    <option value="">Seleccioná una dependencia...</option>
                    {dependencias.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.nombre}
                      </option>
                    ))}
                  </select>
                  {dependenciaSeleccionada && (
                    <p className="text-xs text-gray-500 mt-1">
                      Todas las fichadas se asignarán a:{" "}
                      <strong>{dependenciaSeleccionada.nombre}</strong>
                    </p>
                  )}
                </div>

                {/* Selector de Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de fichadas en este archivo{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTipo("entrada")}
                      disabled={importing}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                        tipo === "entrada"
                          ? "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-500 dark:text-green-400"
                          : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <LogIn className="w-4 h-4" />
                      <span className="font-semibold text-sm">Entrada</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipo("salida")}
                      disabled={importing}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                        tipo === "salida"
                          ? "bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:border-orange-500 dark:text-orange-400"
                          : "bg-white border-gray-300 text-gray-700 hover:border-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-semibold text-sm">Salida</span>
                    </button>
                  </div>
                </div>

                {/* Líneas inválidas */}
                {invalidRecords.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Líneas inválidas (no se importarán):
                    </p>
                    <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto font-mono">
                      {invalidRecords.slice(0, 10).map((r, i) => (
                        <li key={i}>
                          <span className="font-semibold">{r.error}:</span>{" "}
                          {r.lineaOriginal}
                        </li>
                      ))}
                      {invalidRecords.length > 10 && (
                        <li className="italic font-sans">
                          ... y {invalidRecords.length - 10} más
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Barra de progreso */}
                {importing && progress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Insertando fichadas...</span>
                      <span>
                        {progress.current} / {progress.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(progress.current / progress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3">
                  <button
                    onClick={handleImport}
                    disabled={
                      validRecords.length === 0 || importing || !dependenciaId
                    }
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-5 py-2.5 rounded-lg transition shadow-lg hover:shadow-xl text-sm font-medium"
                  >
                    {importing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {importing
                      ? "Importando..."
                      : `Importar ${validRecords.length} registros`}
                  </button>
                  <button
                    onClick={resetForm}
                    disabled={importing}
                    className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg transition text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

          {/* Resultado de importación */}
          {result && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Resultado de la importación
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {result.insertados}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    Insertados
                  </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {result.duplicados}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    Duplicados
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {result.errores}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Errores
                  </p>
                </div>
              </div>

              {result.detallesErrores.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                    Detalle de errores:
                  </p>
                  <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 max-h-40 overflow-y-auto">
                    {result.detallesErrores.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={resetForm}
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg transition text-sm"
              >
                Importar otro archivo
              </button>
            </div>
          )}

          {/* Importing progress */}
          {importing && (
            <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Procesando registros, por favor espere...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
