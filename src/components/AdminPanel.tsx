"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase, type Fichada, type Dependencia } from "@/lib/supabase";
import {
  handleSupabaseError,
  getTodayRange,
  getThisWeekRange,
  getThisMonthRange,
  logger,
} from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import { calcularDistancia } from "@/lib/gpsConfig";
import {
  FileText,
  RefreshCw,
  ArrowLeft,
  LogOut,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Componentes refactorizados
import {
  StatsCards,
  FichadasFilters,
  FichadasTable,
  FichadaModal,
  ExportButtons,
  DependenciasManager,
} from "./admin";

export interface FichadaConDependencia extends Fichada {
  dependencia?: Dependencia;
}

const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
const EXPORT_BATCH_SIZE = 1000;

export default function AdminPanel() {
  const [fichadas, setFichadas] = useState<FichadaConDependencia[]>([]);
  const [displayFichadas, setDisplayFichadas] = useState<FichadaConDependencia[]>([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  // Export
  const [exportingAll, setExportingAll] = useState(false);

  // Filtros
  const [searchDni, setSearchDni] = useState("");
  const [selectedDependencia, setSelectedDependencia] = useState("");
  const [selectedTipoFichada, setSelectedTipoFichada] = useState<
    "" | "entrada" | "salida"
  >("");
  const [soloFueraDeRango, setSoloFueraDeRango] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Debounce timer for DNI search
  const dniDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Modal para ver foto
  const [selectedFichada, setSelectedFichada] =
    useState<FichadaConDependencia | null>(null);

  const calcularDistanciaDependencia = useCallback(
    (fichada: FichadaConDependencia): { distancia: number; valida: boolean } | null => {
      if (
        !fichada.latitud ||
        !fichada.longitud ||
        !fichada.dependencia?.latitud ||
        !fichada.dependencia?.longitud
      ) {
        return null;
      }

      const distancia = calcularDistancia(
        fichada.latitud,
        fichada.longitud,
        fichada.dependencia.latitud,
        fichada.dependencia.longitud
      );

      const radioPermitido = fichada.dependencia.radio_metros || 100;
      return {
        distancia: Math.round(distancia),
        valida: distancia <= radioPermitido,
      };
    },
    []
  );

  // Builds a Supabase query with all server-side filters applied
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildFilteredQuery = useCallback(
    (baseQuery: any) => {
      let query = baseQuery;
      if (searchDni) {
        query = query.ilike("documento", `%${searchDni}%`);
      }
      if (selectedDependencia) {
        query = query.eq("dependencia_id", selectedDependencia);
      }
      if (selectedTipoFichada) {
        query = query.eq("tipo", selectedTipoFichada);
      }
      if (fechaDesde) {
        query = query.gte("fecha_hora", `${fechaDesde}T00:00:00`);
      }
      if (fechaHasta) {
        query = query.lte("fecha_hora", `${fechaHasta}T23:59:59.999`);
      }
      return query;
    },
    [searchDni, selectedDependencia, selectedTipoFichada, fechaDesde, fechaHasta]
  );

  // Client-side GPS filter (can't be done in Supabase)
  const applyClientFilters = useCallback(
    (data: FichadaConDependencia[]) => {
      if (!soloFueraDeRango) return data;
      return data.filter((f) => {
        const distanciaInfo = calcularDistanciaDependencia(f);
        return distanciaInfo && !distanciaInfo.valida;
      });
    },
    [soloFueraDeRango, calcularDistanciaDependencia]
  );

  // Update displayFichadas when fichadas or GPS filter changes
  useEffect(() => {
    setDisplayFichadas(applyClientFilters(fichadas));
  }, [fichadas, applyClientFilters]);

  // Reload data when page, page size, or server-side filters change
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, searchDni, selectedDependencia, selectedTipoFichada, fechaDesde, fechaHasta]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchDni, selectedDependencia, selectedTipoFichada, fechaDesde, fechaHasta, itemsPerPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar dependencias
      const { data: depData, error: depError } = await supabase
        .from("dependencias")
        .select("*")
        .order("nombre");

      if (depError) throw depError;
      setDependencias(depData || []);

      // Cargar fichadas con paginación y filtros server-side
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const baseQuery = supabase
        .from("fichadas")
        .select("*", { count: "exact" });

      const {
        data: fichadasData,
        error: fichadasError,
        count,
      } = await buildFilteredQuery(baseQuery)
        .order("fecha_hora", { ascending: false })
        .range(from, to);

      if (fichadasError) throw fichadasError;

      // Actualizar el conteo total
      setTotalCount(count || 0);

      // Combinar fichadas con sus dependencias
      const fichadasConDependencia = (fichadasData || []).map((fichada: Fichada) => ({
        ...fichada,
        dependencia: depData?.find((d) => d.id === fichada.dependencia_id),
      }));

      setFichadas(fichadasConDependencia);
    } catch (err) {
      logger.error("Error cargando datos:", err);
      setError(handleSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // Fetch ALL filtered records in batches (for export)
  const fetchAllFiltered = async (depData: Dependencia[]): Promise<FichadaConDependencia[]> => {
    const allRecords: FichadaConDependencia[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const baseQuery = supabase
        .from("fichadas")
        .select("*");

      const { data, error: fetchError } = await buildFilteredQuery(baseQuery)
        .order("fecha_hora", { ascending: false })
        .range(offset, offset + EXPORT_BATCH_SIZE - 1);

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        const withDeps = data.map((fichada: Fichada) => ({
          ...fichada,
          dependencia: depData.find((d) => d.id === fichada.dependencia_id),
        }));
        allRecords.push(...withDeps);
        offset += EXPORT_BATCH_SIZE;
        if (data.length < EXPORT_BATCH_SIZE) {
          hasMore = false;
        }
      }
    }

    return allRecords;
  };

  const generateCSVContent = (data: FichadaConDependencia[]) => {
    const headers = ["Fecha y Hora", "DNI", "Tipo", "Dependencia", "Ubicación"];
    const rows = data.map((f) => [
      new Date(f.fecha_hora).toLocaleString("es-AR"),
      f.documento,
      f.tipo.charAt(0).toUpperCase() + f.tipo.slice(1),
      f.dependencia?.nombre || "N/A",
      f.latitud && f.longitud ? `${f.latitud}, ${f.longitud}` : "No disponible",
    ]);

    return [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
  };

  const generateTXTContent = (data: FichadaConDependencia[]) => {
    const lines = data.map((f) => {
      const fecha = new Date(f.fecha_hora);
      const dia = fecha.getDate().toString().padStart(2, "0");
      const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
      const anio = fecha.getFullYear().toString();
      const hora = fecha.getHours().toString().padStart(2, "0");
      const minutos = fecha.getMinutes().toString().padStart(2, "0");
      const dni = f.documento.padEnd(9, " ");
      return `${dni} ${dia} ${mes} ${anio} ${hora} ${minutos}`;
    });
    return lines.join("\n");
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const content = generateCSVContent(displayFichadas);
    downloadFile(content, `fichadas_pagina_${currentPage}_${new Date().toISOString().split("T")[0]}.csv`, "text/csv;charset=utf-8;");
  };

  const exportToTXT = () => {
    const content = generateTXTContent(displayFichadas);
    downloadFile(content, `fichadas_pagina_${currentPage}_${new Date().toISOString().split("T")[0]}.txt`, "text/plain;charset=utf-8;");
  };

  const exportAllCSV = async () => {
    setExportingAll(true);
    try {
      const allData = await fetchAllFiltered(dependencias);
      const content = generateCSVContent(allData);
      downloadFile(content, `fichadas_completo_${new Date().toISOString().split("T")[0]}.csv`, "text/csv;charset=utf-8;");
    } catch (err) {
      logger.error("Error exportando todos los registros CSV:", err);
      setError("Error al exportar. Intente nuevamente.");
    } finally {
      setExportingAll(false);
    }
  };

  const exportAllTXT = async () => {
    setExportingAll(true);
    try {
      const allData = await fetchAllFiltered(dependencias);
      const content = generateTXTContent(allData);
      downloadFile(content, `fichadas_completo_${new Date().toISOString().split("T")[0]}.txt`, "text/plain;charset=utf-8;");
    } catch (err) {
      logger.error("Error exportando todos los registros TXT:", err);
      setError("Error al exportar. Intente nuevamente.");
    } finally {
      setExportingAll(false);
    }
  };

  const clearFilters = () => {
    setSearchDni("");
    setSelectedDependencia("");
    setSelectedTipoFichada("");
    setSoloFueraDeRango(false);
    setFechaDesde("");
    setFechaHasta("");
  };

  const setQuickFilter = (filterType: "hoy" | "semana" | "mes") => {
    let range;
    switch (filterType) {
      case "hoy":
        range = getTodayRange();
        break;
      case "semana":
        range = getThisWeekRange();
        break;
      case "mes":
        range = getThisMonthRange();
        break;
    }
    setFechaDesde(range.desde);
    setFechaHasta(range.hasta);
  };

  const handleLogout = async () => {
    if (confirm("¿Está seguro que desea cerrar sesión?")) {
      await supabase.auth.signOut();
      window.location.href = "/admin";
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Botón de regreso */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#076633] hover:text-[#054d26] dark:text-[#b6c544] font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al registro de fichadas
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#b6c544] p-3 rounded-full">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Panel de Administración
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gestión de fichadas - Recursos Humanos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                className="flex items-center gap-2 bg-[#b6c544] hover:bg-[#9fb338] text-white px-4 py-2 rounded-lg transition shadow-lg hover:shadow-xl"
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Actualizar
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          </div>

          {/* Estadísticas */}
          <StatsCards
            totalFichadas={totalCount}
            entradas={displayFichadas.filter((f) => f.tipo === "entrada").length}
            salidas={displayFichadas.filter((f) => f.tipo === "salida").length}
            dependencias={dependencias.length}
          />
        </div>

        {/* Gestión de Dependencias */}
        <DependenciasManager />

        {/* Filtros */}
        <FichadasFilters
          searchDni={searchDni}
          setSearchDni={setSearchDni}
          selectedDependencia={selectedDependencia}
          setSelectedDependencia={setSelectedDependencia}
          selectedTipoFichada={selectedTipoFichada}
          setSelectedTipoFichada={setSelectedTipoFichada}
          soloFueraDeRango={soloFueraDeRango}
          setSoloFueraDeRango={setSoloFueraDeRango}
          fechaDesde={fechaDesde}
          setFechaDesde={setFechaDesde}
          fechaHasta={fechaHasta}
          setFechaHasta={setFechaHasta}
          dependencias={dependencias}
          onClearFilters={clearFilters}
          onQuickFilter={setQuickFilter}
        />

        {/* Botones de exportación */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <ExportButtons
            onExportCSV={exportToCSV}
            onExportTXT={exportToTXT}
            onExportAllCSV={exportAllCSV}
            onExportAllTXT={exportAllTXT}
            recordCount={displayFichadas.length}
            totalFilteredCount={totalCount}
            exportingAll={exportingAll}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Tabla de fichadas */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <FichadasTable
            fichadas={displayFichadas}
            loading={loading}
            onSelectFichada={setSelectedFichada}
          />

          {/* Paginación */}
          {!loading && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              {/* Selector de registros por página */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Registros por página:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrando{" "}
                  <span className="font-medium">
                    {totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  a{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalCount)}
                  </span>{" "}
                  de <span className="font-medium">{totalCount}</span>{" "}
                  resultados
                </p>
              </div>

              {/* Botones de paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-end">
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal para ver foto */}
        <FichadaModal
          fichada={selectedFichada}
          onClose={() => setSelectedFichada(null)}
        />

        {/* Footer con versión */}
        <div className="text-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Municipalidad de San Benito · v{APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}
