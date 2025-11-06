-- ========================================
-- OPTIMIZACIÓN DE ÍNDICES PARA FICHADAS
-- ========================================
-- Fecha: 2025-11-06
-- Descripción: Índices compuestos para mejorar el rendimiento de consultas frecuentes

-- Índice compuesto para búsquedas por documento y fecha
-- Útil para: Ver histórico de fichadas de un empleado
CREATE INDEX IF NOT EXISTS idx_fichadas_documento_fecha 
ON fichadas(documento, fecha_hora DESC);

-- Índice compuesto para búsquedas por dependencia y fecha
-- Útil para: Ver fichadas de una dependencia específica
CREATE INDEX IF NOT EXISTS idx_fichadas_dependencia_fecha 
ON fichadas(dependencia_id, fecha_hora DESC);

-- Índice para búsquedas por tipo de fichada
-- Útil para: Filtrar solo entradas o solo salidas
CREATE INDEX IF NOT EXISTS idx_fichadas_tipo 
ON fichadas(tipo);

-- Índice compuesto para búsquedas por tipo y fecha
-- Útil para: Ver solo entradas/salidas en un rango de fechas
CREATE INDEX IF NOT EXISTS idx_fichadas_tipo_fecha 
ON fichadas(tipo, fecha_hora DESC);

-- Índice para búsquedas geoespaciales (si se necesita en el futuro)
-- Útil para: Búsquedas por proximidad geográfica
CREATE INDEX IF NOT EXISTS idx_fichadas_location 
ON fichadas(latitud, longitud) 
WHERE latitud IS NOT NULL AND longitud IS NOT NULL;

-- ========================================
-- ANÁLISIS DE RENDIMIENTO
-- ========================================
-- Ejecutar después de crear los índices para actualizar estadísticas
ANALYZE fichadas;

-- ========================================
-- VERIFICAR ÍNDICES CREADOS
-- ========================================
-- SELECT 
--   indexname, 
--   indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'fichadas';
