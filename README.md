# Sistema de Fichadas - Municipalidad de San Benito

PWA (Progressive Web App) para el registro de fichadas en las distintas dependencias de la municipalidad.

## 🚀 Características

- ✅ **PWA Instalable**: La aplicación puede instalarse en dispositivos móviles
- 📸 **Captura de Foto en Tiempo Real**: Obligatorio tomar foto, sin opción de galería
- 📍 **Geolocalización**: Registro automático de ubicación y hora
- 🔲 **Códigos QR por Dependencia**: Generación de QR únicos para cada lugar
- 💾 **Base de Datos Supabase**: Almacenamiento seguro de datos y fotos
- 🎨 **UI Moderna**: Interfaz responsive con Tailwind CSS

## 📋 Requisitos Previos

- Node.js 18+ instalado
- Cuenta en [Supabase](https://supabase.com)
- pnpm, npm, yarn o bun

## 🛠️ Instalación

### 1. Clonar e instalar dependencias

```bash
# Instalar dependencias
pnpm install
# o
npm install
```

### 2. Configurar Supabase

1. Creá un proyecto en [Supabase](https://supabase.com)
2. Ejecutá el SQL del archivo `SUPABASE_SETUP.md` en el SQL Editor
3. Creá un bucket de Storage llamado `fotos-fichadas` (público)
4. Copiá tus credenciales de Supabase

### 3. Variables de Entorno

Creá un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
```

### 4. Iconos PWA

Creá dos iconos para la PWA (ver `ICONOS_PWA.md`):
- `public/icon-192.png` (192x192px)
- `public/icon-512.png` (512x512px)

### 5. Ejecutar en Desarrollo

```bash
pnpm dev
# o
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📱 Uso de la Aplicación

### Para Empleados

1. **Escanear QR**: Escaneá el código QR de la dependencia con la cámara del celular
2. **Ingresar DNI**: Escribí tu número de documento
3. **Tomar Foto**: Tomá una selfie (debe ser en tiempo real, no de galería)
4. **Registrar**: Presioná "Registrar Fichada"

La ubicación y hora se registran automáticamente.

### Para Administradores

1. **Acceder a Admin**: Ingresá a `/admin` en tu navegador
2. **Seleccionar Dependencia**: Hacé clic en una dependencia de la lista
3. **Generar QR**: El código QR se genera automáticamente
4. **Descargar/Imprimir**: Descargá o imprimí el QR para colocarlo en la dependencia

## 🗂️ Estructura del Proyecto

```
fichadas-muni/
├── src/
│   ├── app/
│   │   ├── admin/          # Página de generación de QR
│   │   ├── page.tsx        # Página principal de fichadas
│   │   └── layout.tsx      # Layout con metadata PWA
│   ├── components/
│   │   ├── Camera.tsx      # Componente de cámara
│   │   └── FichadasForm.tsx # Formulario de fichadas
│   └── lib/
│       └── supabase.ts     # Cliente y tipos de Supabase
├── public/
│   ├── manifest.json       # Manifest de PWA
│   └── sw.js              # Service Worker
├── SUPABASE_SETUP.md      # Instrucciones de BD
└── ICONOS_PWA.md          # Instrucciones de iconos
```

## 🗃️ Estructura de Base de Datos

### Tabla `dependencias`
- `id` (UUID): Identificador único
- `nombre` (VARCHAR): Nombre de la dependencia
- `codigo` (VARCHAR): Código único para QR
- `direccion` (TEXT): Dirección física
- `created_at` (TIMESTAMP): Fecha de creación

### Tabla `fichadas`
- `id` (UUID): Identificador único
- `dependencia_id` (UUID): Referencia a dependencia
- `documento` (VARCHAR): DNI del empleado
- `foto_url` (TEXT): URL de la foto en Storage
- `latitud` (DECIMAL): Coordenada de ubicación
- `longitud` (DECIMAL): Coordenada de ubicación
- `fecha_hora` (TIMESTAMP): Fecha y hora de fichada
- `created_at` (TIMESTAMP): Fecha de registro

## 🚀 Deploy

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurá las variables de entorno en Vercel Dashboard
```

### Otras Plataformas

También podés deployar en:
- Netlify
- Railway
- Render

Asegurate de configurar las variables de entorno en la plataforma elegida.

## 🔧 Tecnologías

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **QR Generation**: qrcode
- **Iconos**: Lucide React
- **PWA**: Service Worker + Manifest

## 📝 Licencia

Proyecto desarrollado para la Municipalidad de San Benito.

## 🤝 Soporte

Para dudas o problemas, contactá al equipo de desarrollo.
