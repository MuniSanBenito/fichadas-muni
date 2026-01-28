"use client";

import { LogIn, LogOut, Building2, User } from "lucide-react";

interface StatsCardsProps {
    totalFichadas: number;
    entradas: number;
    salidas: number;
    dependencias: number;
}

export default function StatsCards({
    totalFichadas,
    entradas,
    salidas,
    dependencias,
}: StatsCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#f0f9e6] dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <User className="w-8 h-8 text-[#b6c544]" />
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Total Fichadas
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {totalFichadas}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-green-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <LogIn className="w-8 h-8 text-green-600" />
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Entradas
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {entradas}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-orange-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                    <LogOut className="w-8 h-8 text-orange-600" />
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Salidas
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {salidas}
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
                            {dependencias}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
