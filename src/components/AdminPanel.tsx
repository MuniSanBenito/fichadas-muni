"use client";

import { useState, useEffect, useCallback } from "react";
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

const ITEMS_PER_PAGE = 50;

export default function AdminPanel() {
  const [fichadas, setFichadas] = useState<FichadaConDependencia[]>([]);
  const [filteredFichadas, setFilteredFichadas] = useState<
    FichadaConDependencia[]
  >([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filtros
  const [searchDni, setSearchDni] = useState("");
  const [selectedDependencia, setSelectedDependencia] = useState("");
  const [selectedTipoFichada, setSelectedTipoFichada] = useState<
    "" | "entrada" | "salida"
  >("");
  const [soloFueraDeRango, setSoloFueraDeRango] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

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

  const filterFichadas = useCallback(() => {
    let filtered = [...fichadas];

    // Filtrar por DNI
    if (searchDni) {
      filtered = filtered.filter((f) => f.documento.includes(searchDni));
    }

    // Filtrar por dependencia
    if (selectedDependencia) {
      filtered = filtered.filter(
        (f) => f.dependencia_id === selectedDependencia
      );
    }

    // Filtrar por tipo de fichada
    if (selectedTipoFichada) {
      filtered = filtered.filter((f) => f.tipo === selectedTipoFichada);
    }

    // Filtrar solo fichadas fuera de rango
    if (soloFueraDeRango) {
      filtered = filtered.filter((f) => {
        const distanciaInfo = calcularDistanciaDependencia(f);
        return distanciaInfo && !distanciaInfo.valida;
      });
    }

    // Filtrar por fecha desde
    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      filtered = filtered.filter((f) => new Date(f.fecha_hora) >= desde);
    }

    // Filtrar por fecha hasta
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      filtered = filtered.filter((f) => new Date(f.fecha_hora) <= hasta);
    }

    setFilteredFichadas(filtered);
  }, [
    fichadas,
    searchDni,
    selectedDependencia,
    selectedTipoFichada,
    soloFueraDeRango,
    fechaDesde,
    fechaHasta,
    calcularDistanciaDependencia,
  ]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    filterFichadas();
  }, [filterFichadas]);

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

      // Cargar fichadas con paginación
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const {
        data: fichadasData,
        error: fichadasError,
        count,
      } = await supabase
        .from("fichadas")
        .select("*", { count: "exact" })
        .order("fecha_hora", { ascending: false })
        .range(from, to);

      if (fichadasError) throw fichadasError;

      // Actualizar el conteo total
      setTotalCount(count || 0);

      // Combinar fichadas con sus dependencias
      const fichadasConDependencia = (fichadasData || []).map((fichada) => ({
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

  const exportToCSV = () => {
    const headers = ["Fecha y Hora", "DNI", "Tipo", "Dependencia", "Ubicación"];
    const rows = filteredFichadas.map((f) => [
      new Date(f.fecha_hora).toLocaleString("es-AR"),
      f.documento,
      f.tipo.charAt(0).toUpperCase() + f.tipo.slice(1),
      f.dependencia?.nombre || "N/A",
      f.latitud && f.longitud ? `${f.latitud}, ${f.longitud}` : "No disponible",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `fichadas_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToTXT = () => {
    const lines = filteredFichadas.map((f) => {
      const fecha = new Date(f.fecha_hora);

      const dia = fecha.getDate().toString().padStart(2, "0");
      const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
      const anio = fecha.getFullYear().toString();
      const hora = fecha.getHours().toString().padStart(2, "0");
      const minutos = fecha.getMinutes().toString().padStart(2, "0");

      const dni = f.documento.padEnd(9, " ");
      const linea = `${dni} ${dia} ${mes} ${anio} ${hora} ${minutos}`;

      return linea;
    });

    const txtContent = lines.join("\n");

    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `fichadas_${new Date().toISOString().split("T")[0]}.txt`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
            totalFichadas={filteredFichadas.length}
            entradas={filteredFichadas.filter((f) => f.tipo === "entrada").length}
            salidas={filteredFichadas.filter((f) => f.tipo === "salida").length}
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
            recordCount={filteredFichadas.length}
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
            fichadas={filteredFichadas}
            loading={loading}
            onSelectFichada={setSelectedFichada}
          />

          {/* Paginación */}
          {!loading && totalCount > ITEMS_PER_PAGE && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
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
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrando{" "}
                    <span className="font-medium">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{" "}
                    a{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}
                    </span>{" "}
                    de <span className="font-medium">{totalCount}</span>{" "}
                    resultados
                  </p>
                </div>
                <div>
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
