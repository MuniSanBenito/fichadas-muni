"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase, type Fichada, type Dependencia } from "@/lib/supabase";
import {
  Search,
  Download,
  Eye,
  Calendar,
  MapPin,
  Building2,
  User,
  FileText,
  X,
  Filter,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  LogOut,
  LogIn,
} from "lucide-react";

interface FichadaConDependencia extends Fichada {
  dependencia?: Dependencia;
}

export default function AdminPanel() {
  const [fichadas, setFichadas] = useState<FichadaConDependencia[]>([]);
  const [filteredFichadas, setFilteredFichadas] = useState<
    FichadaConDependencia[]
  >([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros
  const [searchDni, setSearchDni] = useState("");
  const [selectedDependencia, setSelectedDependencia] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Modal para ver foto
  const [selectedFichada, setSelectedFichada] =
    useState<FichadaConDependencia | null>(null);

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
  }, [fichadas, searchDni, selectedDependencia, fechaDesde, fechaHasta]);

  useEffect(() => {
    loadData();
  }, []);

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

      // Cargar fichadas
      const { data: fichadasData, error: fichadasError } = await supabase
        .from("fichadas")
        .select("*")
        .order("fecha_hora", { ascending: false });

      if (fichadasError) throw fichadasError;

      // Combinar fichadas con sus dependencias
      const fichadasConDependencia = (fichadasData || []).map((fichada) => ({
        ...fichada,
        dependencia: depData?.find((d) => d.id === fichada.dependencia_id),
      }));

      setFichadas(fichadasConDependencia);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los datos. Intente nuevamente.");
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
  };

  const exportToTXT = () => {
    /**
     * Formato TXT de ancho fijo para sistema SIGEM
     * Total: 26 caracteres por línea
     *
     * Campo       | Desde | Hasta | Ancho | Ejemplo
     * ------------|-------|-------|-------|----------
     * DNI         | 1     | 9     | 9     | "36651182 "
     * Espacio     | 10    | 10    | 1     | " "
     * Día         | 11    | 12    | 2     | "11"
     * Espacio     | 13    | 13    | 1     | " "
     * Mes         | 14    | 15    | 2     | "03"
     * Espacio     | 16    | 16    | 1     | " "
     * Año         | 17    | 20    | 4     | "2025"
     * Espacio     | 21    | 21    | 1     | " "
     * Hora        | 22    | 23    | 2     | "09"
     * Espacio     | 24    | 24    | 1     | " "
     * Minutos     | 25    | 26    | 2     | "02"
     *
     * Ejemplo: "36651182  11 03 2025 09 02"
     */

    const lines = filteredFichadas.map((f) => {
      const fecha = new Date(f.fecha_hora);

      // Extraer componentes de fecha/hora
      const dia = fecha.getDate().toString().padStart(2, "0");
      const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
      const anio = fecha.getFullYear().toString();
      const hora = fecha.getHours().toString().padStart(2, "0");
      const minutos = fecha.getMinutes().toString().padStart(2, "0");

      // DNI: 9 caracteres (rellenar con espacios a la derecha)
      const dni = f.documento.padEnd(9, " ");

      // Construir línea según formato exacto (26 caracteres)
      // DNI(9) + SP + Día(2) + SP + Mes(2) + SP + Año(4) + SP + Hora(2) + SP + Min(2)
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
  };

  const clearFilters = () => {
    setSearchDni("");
    setSelectedDependencia("");
    setFechaDesde("");
    setFechaHasta("");
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("es-AR"),
      time: date.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const handleLogout = async () => {
    if (confirm("¿Está seguro que desea cerrar sesión?")) {
      await supabase.auth.signOut();
      window.location.href = "/admin";
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#f0f9e6] dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-[#b6c544]" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Fichadas
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {filteredFichadas.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Hoy
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {
                      filteredFichadas.filter((f) => {
                        const today = new Date();
                        const fichadaDate = new Date(f.fecha_hora);
                        return (
                          fichadaDate.toDateString() === today.toDateString()
                        );
                      }).length
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Dependencias
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dependencias.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Filtros
              </h2>
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-[#076633] hover:text-[#054d26] dark:text-[#b6c544] font-medium"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* DNI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                DNI
              </label>
              <input
                type="text"
                value={searchDni}
                onChange={(e) =>
                  setSearchDni(e.target.value.replace(/\D/g, ""))
                }
                placeholder="Buscar por DNI"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Dependencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Dependencia
              </label>
              <select
                value={selectedDependencia}
                onChange={(e) => setSelectedDependencia(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Todas</option>
                {dependencias.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha Desde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Botones de exportación */}
          <div className="mt-4 flex flex-wrap gap-3 justify-end">
            <button
              onClick={exportToTXT}
              disabled={filteredFichadas.length === 0}
              className="flex items-center gap-2 bg-[#b6c544] hover:bg-[#9fb338] disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition shadow-lg hover:shadow-xl"
              title="Exportar en formato TXT de ancho fijo para cargar en el sistema"
            >
              <FileText className="w-4 h-4" />
              Exportar TXT Sistema ({filteredFichadas.length} registros)
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredFichadas.length === 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Exportar CSV ({filteredFichadas.length} registros)
            </button>
          </div>
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
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b6c544] mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">
                  Cargando fichadas...
                </p>
              </div>
            ) : filteredFichadas.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No se encontraron fichadas
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      DNI
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Dependencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Foto
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredFichadas.map((fichada) => {
                    const { date, time } = formatDateTime(fichada.fecha_hora);
                    return (
                      <tr
                        key={fichada.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {date}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {time}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {fichada.documento}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              fichada.tipo === "entrada"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            }`}
                          >
                            {fichada.tipo === "entrada" ? (
                              <>
                                <LogIn className="w-3 h-3" /> Entrada
                              </>
                            ) : (
                              <>
                                <LogOut className="w-3 h-3" /> Salida
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {fichada.dependencia?.nombre || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {fichada.latitud && fichada.longitud ? (
                            <a
                              href={`https://www.google.com/maps?q=${fichada.latitud},${fichada.longitud}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-[#076633] hover:text-[#054d26] dark:text-[#b6c544] font-medium"
                            >
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm">Ver mapa</span>
                            </a>
                          ) : (
                            <span className="text-sm text-gray-400">
                              No disponible
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {fichada.foto_url ? (
                            <button
                              onClick={() => setSelectedFichada(fichada)}
                              className="flex items-center gap-2 text-[#076633] hover:text-[#054d26] dark:text-[#b6c544] font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="text-sm">Ver foto</span>
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Sin foto
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal para ver foto - Versión mejorada */}
        {selectedFichada && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedFichada(null)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-[#b6c544] p-2.5 rounded-xl">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Detalle de Fichada
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      DNI: {selectedFichada.documento}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFichada(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-xl transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Información en tarjetas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-[#f0f9e6] dark:bg-[#b6c544]/20 p-4 rounded-2xl border border-[#b6c544]/30 dark:border-[#b6c544]/50">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-[#076633] dark:text-[#b6c544]" />
                      <span className="text-xs font-medium text-[#076633] dark:text-[#b6c544] uppercase">
                        DNI
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedFichada.documento}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-2xl border ${
                      selectedFichada.tipo === "entrada"
                        ? "bg-green-50 dark:bg-green-900/20 border-green-500/30 dark:border-green-500/50"
                        : "bg-orange-50 dark:bg-orange-900/20 border-orange-500/30 dark:border-orange-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {selectedFichada.tipo === "entrada" ? (
                        <LogIn className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <LogOut className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      )}
                      <span
                        className={`text-xs font-medium uppercase ${
                          selectedFichada.tipo === "entrada"
                            ? "text-green-600 dark:text-green-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        Tipo
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                      {selectedFichada.tipo}
                    </p>
                  </div>

                  <div className="bg-[#7bcbe2]/10 dark:bg-[#7bcbe2]/20 p-4 rounded-2xl border border-[#7bcbe2]/30 dark:border-[#7bcbe2]/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-[#7bcbe2] dark:text-[#7bcbe2]" />
                      <span className="text-xs font-medium text-[#076633] dark:text-[#7bcbe2] uppercase">
                        Dependencia
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedFichada.dependencia?.nombre || "N/A"}
                    </p>
                  </div>

                  <div className="bg-[#b6c544]/10 dark:bg-[#b6c544]/20 p-4 rounded-2xl border border-[#b6c544]/30 dark:border-[#b6c544]/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-[#076633] dark:text-[#b6c544]" />
                      <span className="text-xs font-medium text-[#076633] dark:text-[#b6c544] uppercase">
                        Fecha
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatDateTime(selectedFichada.fecha_hora).date}
                    </p>
                  </div>

                  <div className="bg-[#fbd300]/10 dark:bg-[#fbd300]/20 p-4 rounded-2xl border border-[#fbd300]/30 dark:border-[#fbd300]/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-[#076633] dark:text-[#fbd300]" />
                      <span className="text-xs font-medium text-[#076633] dark:text-[#fbd300] uppercase">
                        Hora
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatDateTime(selectedFichada.fecha_hora).time}
                    </p>
                  </div>
                </div>

                {/* Foto con zoom y mejor presentación */}
                {selectedFichada.foto_url && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        Fotografía
                      </h4>
                      <a
                        href={selectedFichada.foto_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[#076633] hover:text-[#054d26] dark:text-[#b6c544] font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Descargar
                      </a>
                    </div>
                    <div className="relative group overflow-hidden rounded-2xl border-4 border-gray-200 dark:border-gray-700 shadow-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedFichada.foto_url}
                        alt="Foto de fichada"
                        className="w-full h-auto object-contain max-h-[500px] transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  </div>
                )}

                {/* Ubicación con mejor diseño */}
                {selectedFichada.latitud && selectedFichada.longitud && (
                  <div className="bg-[#f0f9e6] dark:bg-gray-700 p-6 rounded-2xl border border-[#b6c544]/30 dark:border-gray-600">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#b6c544] p-3 rounded-xl">
                          <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            Ubicación GPS
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {selectedFichada.latitud.toFixed(6)},{" "}
                            {selectedFichada.longitud.toFixed(6)}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${selectedFichada.latitud},${selectedFichada.longitud}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-[#b6c544] hover:bg-[#9fb338] text-white px-6 py-3 rounded-xl transition shadow-lg hover:shadow-xl font-medium"
                      >
                        <MapPin className="w-5 h-5" />
                        Abrir en Google Maps
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
