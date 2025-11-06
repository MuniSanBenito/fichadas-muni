-- ========================================
-- RATE LIMITING PARA FICHADAS
-- ========================================
-- Fecha: 2025-11-06
-- Descripción: Función para prevenir fichadas duplicadas en corto tiempo

-- Función para verificar si un usuario puede fichar
-- Retorna TRUE si puede fichar, FALSE si debe esperar
CREATE OR REPLACE FUNCTION check_fichada_rate_limit(dni_input VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  ultima_fichada TIMESTAMP;
  tiempo_minimo_minutos INTEGER := 5; -- 5 minutos entre fichadas
BEGIN
  -- Buscar la última fichada del usuario
  SELECT MAX(fecha_hora) INTO ultima_fichada
  FROM fichadas
  WHERE documento = dni_input;
  
  -- Si nunca fichó, puede fichar
  IF ultima_fichada IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si han pasado al menos N minutos desde la última fichada
  IF ultima_fichada > NOW() - INTERVAL '1 minute' * tiempo_minimo_minutos THEN
    RETURN FALSE; -- Debe esperar
  END IF;
  
  RETURN TRUE; -- Puede fichar
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- POLÍTICA RLS (Row Level Security) OPCIONAL
-- ========================================
-- Si quieres agregar seguridad a nivel de fila en Supabase:

-- Habilitar RLS en la tabla fichadas
-- ALTER TABLE fichadas ENABLE ROW LEVEL SECURITY;

-- Política para que solo usuarios autenticados puedan ver fichadas
-- CREATE POLICY "Usuarios autenticados pueden ver fichadas"
-- ON fichadas FOR SELECT
-- TO authenticated
-- USING (true);

-- Política para que solo usuarios autenticados puedan insertar fichadas
-- CREATE POLICY "Usuarios autenticados pueden insertar fichadas"
-- ON fichadas FOR INSERT
-- TO authenticated
-- WITH CHECK (true);

-- ========================================
-- TRIGGER PARA VALIDAR FICHADAS
-- ========================================
-- Trigger que se ejecuta antes de insertar una fichada

CREATE OR REPLACE FUNCTION validar_fichada_antes_insertar()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar rate limit
  IF NOT check_fichada_rate_limit(NEW.documento) THEN
    RAISE EXCEPTION 'Debes esperar al menos 5 minutos entre fichadas. DNI: %', NEW.documento;
  END IF;
  
  -- Validar que el documento sea numérico y tenga 7-8 dígitos
  IF NEW.documento !~ '^\d{7,8}$' THEN
    RAISE EXCEPTION 'DNI inválido. Debe ser numérico de 7 u 8 dígitos. DNI: %', NEW.documento;
  END IF;
  
  -- Validar que el tipo sea 'entrada' o 'salida'
  IF NEW.tipo NOT IN ('entrada', 'salida') THEN
    RAISE EXCEPTION 'Tipo de fichada inválido. Debe ser "entrada" o "salida". Tipo: %', NEW.tipo;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_validar_fichada ON fichadas;
CREATE TRIGGER trigger_validar_fichada
  BEFORE INSERT ON fichadas
  FOR EACH ROW
  EXECUTE FUNCTION validar_fichada_antes_insertar();

-- ========================================
-- FUNCIÓN PARA OBTENER ÚLTIMA FICHADA
-- ========================================
-- Útil para el frontend

CREATE OR REPLACE FUNCTION get_ultima_fichada(dni_input VARCHAR)
RETURNS TABLE (
  id UUID,
  documento VARCHAR,
  tipo VARCHAR,
  fecha_hora TIMESTAMP,
  dependencia_id VARCHAR,
  minutos_desde_ultima INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.documento,
    f.tipo,
    f.fecha_hora,
    f.dependencia_id,
    EXTRACT(EPOCH FROM (NOW() - f.fecha_hora))::INTEGER / 60 AS minutos_desde_ultima
  FROM fichadas f
  WHERE f.documento = dni_input
  ORDER BY f.fecha_hora DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ESTADÍSTICAS POR DEPENDENCIA
-- ========================================
-- Vista materializada para estadísticas rápidas (opcional)

-- CREATE MATERIALIZED VIEW IF NOT EXISTS stats_fichadas_por_dependencia AS
-- SELECT 
--   d.id AS dependencia_id,
--   d.nombre AS dependencia_nombre,
--   COUNT(f.id) AS total_fichadas,
--   COUNT(CASE WHEN f.tipo = 'entrada' THEN 1 END) AS total_entradas,
--   COUNT(CASE WHEN f.tipo = 'salida' THEN 1 END) AS total_salidas,
--   MAX(f.fecha_hora) AS ultima_fichada
-- FROM dependencias d
-- LEFT JOIN fichadas f ON d.id = f.dependencia_id
-- GROUP BY d.id, d.nombre;

-- Refrescar la vista materializada (ejecutar periódicamente)
-- REFRESH MATERIALIZED VIEW stats_fichadas_por_dependencia;
