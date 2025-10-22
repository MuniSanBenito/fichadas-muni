# Configuración de Supabase

## 1. Variables de Entorno

Creá un archivo `.env.local` en la raíz del proyecto con:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

## 2. Esquema de Base de Datos

Ejecutá el siguiente SQL en tu proyecto de Supabase (SQL Editor):

```sql
-- Tabla de dependencias
CREATE TABLE dependencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  direccion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de fichadas
CREATE TABLE fichadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dependencia_id UUID REFERENCES dependencias(id) ON DELETE CASCADE,
  documento VARCHAR(20) NOT NULL,
  tipo VARCHAR(10) NOT NULL DEFAULT 'entrada' CHECK (tipo IN ('entrada', 'salida')),
  foto_url TEXT,
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_fichadas_dependencia ON fichadas(dependencia_id);
CREATE INDEX idx_fichadas_documento ON fichadas(documento);
CREATE INDEX idx_fichadas_fecha ON fichadas(fecha_hora);
CREATE INDEX idx_fichadas_tipo ON fichadas(tipo);

-- Habilitar Row Level Security
ALTER TABLE dependencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichadas ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (permitir lectura y escritura pública para simplificar)
-- Podés ajustar esto según tus necesidades de seguridad
CREATE POLICY "Permitir lectura de dependencias" ON dependencias
  FOR SELECT USING (true);

CREATE POLICY "Permitir escritura de fichadas" ON fichadas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir lectura de fichadas" ON fichadas
  FOR SELECT USING (true);
```

## 3. Configurar Storage

1. Ve a Storage en tu dashboard de Supabase
2. Crea un bucket llamado `fotos-fichadas`
3. Configura las políticas de acceso:

```sql
-- Permitir subir fotos
CREATE POLICY "Permitir subir fotos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'fotos-fichadas');

-- Permitir ver fotos
CREATE POLICY "Permitir ver fotos" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos-fichadas');
```

## 4. Datos de Ejemplo

```sql
-- Insertar algunas dependencias de ejemplo
INSERT INTO dependencias (nombre, codigo, direccion) VALUES
  ('Intendencia', 'INT-001', 'Calle Principal 123'),
  ('Obras Públicas', 'OBR-001', 'Av. Trabajo 456'),
  ('Desarrollo Social', 'SOC-001', 'Barrio Centro');
```
