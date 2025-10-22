-- Migración: Agregar columna tipo a la tabla fichadas
-- Permite diferenciar entre entrada y salida

-- Agregar columna tipo con valor por defecto 'entrada'
ALTER TABLE fichadas 
ADD COLUMN tipo VARCHAR(10) NOT NULL DEFAULT 'entrada' 
CHECK (tipo IN ('entrada', 'salida'));

-- Crear índice para mejorar consultas por tipo
CREATE INDEX idx_fichadas_tipo ON fichadas(tipo);

-- Comentario descriptivo
COMMENT ON COLUMN fichadas.tipo IS 'Tipo de fichada: entrada o salida';
