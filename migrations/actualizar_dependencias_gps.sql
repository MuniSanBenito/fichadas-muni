-- Migración: Actualizar dependencias con coordenadas GPS
-- Agrega columnas de latitud y longitud para validación de ubicación

-- 1. Agregar columnas de GPS a la tabla dependencias (si no existen)
ALTER TABLE dependencias 
ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS radio_metros INTEGER DEFAULT 100;

-- 2. Comentarios descriptivos
COMMENT ON COLUMN dependencias.latitud IS 'Latitud GPS de la dependencia';
COMMENT ON COLUMN dependencias.longitud IS 'Longitud GPS de la dependencia';
COMMENT ON COLUMN dependencias.radio_metros IS 'Radio de tolerancia en metros para fichar (default: 100m = 1 manzana)';

-- 3. Actualizar o insertar dependencias CIC y NIDO con sus coordenadas

-- Eliminar dependencias anteriores si existen (opcional, comentar si querés mantener datos)
-- DELETE FROM dependencias WHERE codigo IN ('CIC-001', 'NIDO-001');

-- Insertar o actualizar CIC
INSERT INTO dependencias (nombre, codigo, direccion, latitud, longitud, radio_metros)
VALUES (
  'CIC',
  'CIC-001',
  'Calle Garay y Nogoya',
  -31.771765084997554,
  -60.42306082350464,
  100
)
ON CONFLICT (codigo) 
DO UPDATE SET 
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud,
  radio_metros = EXCLUDED.radio_metros,
  direccion = EXCLUDED.direccion;

-- Insertar o actualizar NIDO
INSERT INTO dependencias (nombre, codigo, direccion, latitud, longitud, radio_metros)
VALUES (
  'NIDO',
  'NIDO-001',
  'Calle Misiones y Buenos Aires',
  -31.777360074698333,
  -60.43369446481205,
  100
)
ON CONFLICT (codigo) 
DO UPDATE SET 
  latitud = EXCLUDED.latitud,
  longitud = EXCLUDED.longitud,
  radio_metros = EXCLUDED.radio_metros,
  direccion = EXCLUDED.direccion;

-- 4. Crear índice para mejorar consultas por ubicación GPS
CREATE INDEX IF NOT EXISTS idx_dependencias_gps ON dependencias(latitud, longitud);

-- 5. Verificar que las dependencias se crearon correctamente
SELECT 
  nombre, 
  codigo, 
  latitud, 
  longitud, 
  radio_metros,
  direccion
FROM dependencias
WHERE codigo IN ('CIC-001', 'NIDO-001')
ORDER BY nombre;
