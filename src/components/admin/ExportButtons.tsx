"use client";

import { Download, FileText, Loader2 } from "lucide-react";

interface ExportButtonsProps {
    onExportCSV: () => void;
    onExportTXT: () => void;
    onExportAllCSV: () => void;
    onExportAllTXT: () => void;
    recordCount: number;
    totalFilteredCount: number;
    exportingAll: boolean;
}

export default function ExportButtons({
    onExportCSV,
    onExportTXT,
    onExportAllCSV,
    onExportAllTXT,
    recordCount,
    totalFilteredCount,
    exportingAll,
}: ExportButtonsProps) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Exportar página actual
            </h3>
            <div className="flex flex-wrap gap-3 mb-4">
                <button
                    onClick={onExportTXT}
                    disabled={recordCount === 0}
                    className="flex items-center gap-2 bg-[#b6c544] hover:bg-[#9fb338] disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition shadow-lg hover:shadow-xl text-sm"
                    title="Exportar página actual en formato TXT"
                >
                    <FileText className="w-4 h-4" />
                    TXT página ({recordCount})
                </button>
                <button
                    onClick={onExportCSV}
                    disabled={recordCount === 0}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition text-sm"
                    title="Exportar página actual en formato CSV"
                >
                    <Download className="w-4 h-4" />
                    CSV página ({recordCount})
                </button>
            </div>

            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Exportar todos los registros filtrados
            </h3>
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={onExportAllTXT}
                    disabled={exportingAll || totalFilteredCount === 0}
                    className="flex items-center gap-2 bg-[#076633] hover:bg-[#054d26] disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition shadow-lg hover:shadow-xl text-sm"
                    title="Exportar TODOS los registros filtrados en formato TXT"
                >
                    {exportingAll ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <FileText className="w-4 h-4" />
                    )}
                    Exportar Todo TXT ({totalFilteredCount} registros)
                </button>
                <button
                    onClick={onExportAllCSV}
                    disabled={exportingAll || totalFilteredCount === 0}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition shadow-lg hover:shadow-xl text-sm"
                    title="Exportar TODOS los registros filtrados en formato CSV"
                >
                    {exportingAll ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                    Exportar Todo CSV ({totalFilteredCount} registros)
                </button>
            </div>

            {exportingAll && (
                <p className="mt-3 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Descargando todos los registros, por favor espere...
                </p>
            )}
        </div>
    );
}
