-- Migración: Agregar columna origen a la tabla fichadas
-- Permite distinguir fichadas de la App vs. del Reloj Físico

-- Agregar columna origen con valor por defecto 'App' (idempotente)
ALTER TABLE fichadas
ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'App';

-- Crear índice para filtrar por origen
CREATE INDEX IF NOT EXISTS idx_fichadas_origen ON fichadas(origen);

-- Comentario descriptivo
COMMENT ON COLUMN fichadas.origen IS 'Origen del registro: App o Reloj_Fisico';
