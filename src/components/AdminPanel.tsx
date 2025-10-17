'use client';

import { useState, useEffect } from 'react';
import { supabase, type Fichada, type Dependencia } from '@/lib/supabase';
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
  LogOut
} from 'lucide-react';

interface FichadaConDependencia extends Fichada {
  dependencia?: Dependencia;
}

export default function AdminPanel() {
  const [fichadas, setFichadas] = useState<FichadaConDependencia[]>([]);
  const [filteredFichadas, setFilteredFichadas] = useState<FichadaConDependencia[]>([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [searchDni, setSearchDni] = useState('');
  const [selectedDependencia, setSelectedDependencia] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  
  // Modal para ver foto
  const [selectedFichada, setSelectedFichada] = useState<FichadaConDependencia | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterFichadas();
  }, [fichadas, searchDni, selectedDependencia, fechaDesde, fechaHasta]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar dependencias
      const { data: depData, error: depError } = await supabase
        .from('dependencias')
        .select('*')
        .order('nombre');

      if (depError) throw depError;
      setDependencias(depData || []);

      // Cargar fichadas
      const { data: fichadasData, error: fichadasError } = await supabase
        .from('fichadas')
        .select('*')
        .order('fecha_hora', { ascending: false });

      if (fichadasError) throw fichadasError;

      // Combinar fichadas con sus dependencias
      const fichadasConDependencia = (fichadasData || []).map(fichada => ({
        ...fichada,
        dependencia: depData?.find(d => d.id === fichada.dependencia_id)
      }));

      setFichadas(fichadasConDependencia);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const filterFichadas = () => {
    let filtered = [...fichadas];

    // Filtrar por DNI
    if (searchDni) {
      filtered = filtered.filter(f => f.documento.includes(searchDni));
    }

    // Filtrar por dependencia
    if (selectedDependencia) {
      filtered = filtered.filter(f => f.dependencia_id === selectedDependencia);
    }

    // Filtrar por fecha desde
    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      filtered = filtered.filter(f => new Date(f.fecha_hora) >= desde);
    }

    // Filtrar por fecha hasta
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      filtered = filtered.filter(f => new Date(f.fecha_hora) <= hasta);
    }

    setFilteredFichadas(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Fecha y Hora', 'DNI', 'Dependencia', 'Ubicación'];
    const rows = filteredFichadas.map(f => [
      new Date(f.fecha_hora).toLocaleString('es-AR'),
      f.documento,
      f.dependencia?.nombre || 'N/A',
      f.latitud && f.longitud ? `${f.latitud}, ${f.longitud}` : 'No disponible'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `fichadas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchDni('');
    setSelectedDependencia('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('es-AR'),
      time: date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleLogout = async () => {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
      await supabase.auth.signOut();
      window.location.href = '/admin';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9ff] via-[#fef9e7] to-[#e8f8f5] dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Botón de regreso */}
        <div className="mb-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-[#076633] hover:text-[#054d26] dark:text-[#b6c544] font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al registro de fichadas
          </a>
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
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Fichadas</p>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">Hoy</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {filteredFichadas.filter(f => {
                      const today = new Date();
                      const fichadaDate = new Date(f.fecha_hora);
                      return fichadaDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Dependencias</p>
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filtros</h2>
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
                onChange={(e) => setSearchDni(e.target.value.replace(/\D/g, ''))}
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

          {/* Botón de exportación */}
          <div className="mt-4 flex justify-end">
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
                <p className="text-gray-600 dark:text-gray-400">Cargando fichadas...</p>
              </div>
            ) : filteredFichadas.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No se encontraron fichadas</p>
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
                      <tr key={fichada.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {fichada.dependencia?.nombre || 'N/A'}
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
                            <span className="text-sm text-gray-400">No disponible</span>
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
                            <span className="text-sm text-gray-400">Sin foto</span>
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
                  <div className="bg-gradient-to-br from-[#b6c544] to-[#9fb338] p-2.5 rounded-xl">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-[#f0f9e6] to-[#e8f5d8] dark:from-[#b6c544]/20 dark:to-[#9fb338]/20 p-4 rounded-2xl border border-[#b6c544]/30 dark:border-[#b6c544]/50">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-[#076633] dark:text-[#b6c544]" />
                      <span className="text-xs font-medium text-[#076633] dark:text-[#b6c544] uppercase">DNI</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedFichada.documento}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">Dependencia</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedFichada.dependencia?.nombre || 'N/A'}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-2xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase">Fecha</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatDateTime(selectedFichada.fecha_hora).date}
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-2xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase">Hora</span>
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                )}

                {/* Ubicación con mejor diseño */}
                {selectedFichada.latitud && selectedFichada.longitud && (
                  <div className="bg-gradient-to-r from-[#f0f9e6] to-[#e8f5d8] dark:from-gray-700 dark:to-gray-600 p-6 rounded-2xl border border-[#b6c544]/30 dark:border-gray-600">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#b6c544] p-3 rounded-xl">
                          <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">Ubicación GPS</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {selectedFichada.latitud.toFixed(6)}, {selectedFichada.longitud.toFixed(6)}
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
