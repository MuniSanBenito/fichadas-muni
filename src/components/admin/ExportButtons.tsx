"use client";

import { Download, FileText } from "lucide-react";

interface ExportButtonsProps {
    onExportCSV: () => void;
    onExportTXT: () => void;
    recordCount: number;
    disabled?: boolean;
}

export default function ExportButtons({
    onExportCSV,
    onExportTXT,
    recordCount,
    disabled = false,
}: ExportButtonsProps) {
    return (
        <div className="mt-4 flex flex-wrap gap-3 justify-end">
            <button
                onClick={onExportTXT}
                disabled={disabled || recordCount === 0}
                className="flex items-center gap-2 bg-[#b6c544] hover:bg-[#9fb338] disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition shadow-lg hover:shadow-xl"
                title="Exportar en formato TXT de ancho fijo para cargar en el sistema"
            >
                <FileText className="w-4 h-4" />
                Exportar TXT Sistema ({recordCount} registros)
            </button>
            <button
                onClick={onExportCSV}
                disabled={disabled || recordCount === 0}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition"
            >
                <Download className="w-4 h-4" />
                Exportar CSV ({recordCount} registros)
            </button>
        </div>
    );
}
