# 🚀 Guía de Inicio Rápido

## Pasos para Poner en Marcha la Aplicación

### 1️⃣ Instalar Dependencias

Ejecutá en la terminal:

```bash
pnpm install
```

Esto instalará todas las librerías necesarias incluyendo `qrcode`.

### 2️⃣ Configurar Supabase

#### Crear Proyecto
1. Andá a [https://supabase.com](https://supabase.com)
2. Creá una cuenta gratuita si no tenés
3. Creá un nuevo proyecto

#### Ejecutar SQL
1. En el proyecto de Supabase, andá a **SQL Editor**
2. Abrí el archivo `SUPABASE_SETUP.md`
3. Copiá todo el código SQL y ejecutalo en el SQL Editor

#### Configurar Storage
1. Andá a **Storage** en Supabase
2. Creá un nuevo bucket llamado `fotos-fichadas`
3. Hacelo **público** (Public bucket)

#### Copiar Credenciales
1. Andá a **Settings** > **API**
2. Copiá la **URL** y la **anon/public key**

### 3️⃣ Variables de Entorno

Creá un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-aqui
```

### 4️⃣ Crear Iconos PWA

Necesitás crear dos archivos PNG:
- `public/icon-192.png` (192x192 píxeles)
- `public/icon-512.png` (512x512 píxeles)

**Opción Rápida**: Usá [https://www.pwabuilder.com/imageGenerator](https://www.pwabuilder.com/imageGenerator)

O temporalmente, podés usar imágenes de prueba para empezar.

### 5️⃣ Ejecutar la Aplicación

```bash
pnpm dev
```

La aplicación se abrirá en [http://localhost:3000](http://localhost:3000)

### 6️⃣ Cargar Datos de Prueba

En Supabase SQL Editor, ejecutá:

```sql
INSERT INTO dependencias (nombre, codigo, direccion) VALUES
  ('Intendencia', 'INT-001', 'Calle Principal 123'),
  ('Obras Públicas', 'OBR-001', 'Av. Trabajo 456'),
  ('Desarrollo Social', 'SOC-001', 'Barrio Centro');
```

### 7️⃣ Probar la Aplicación

#### Generar QR
1. Andá a [http://localhost:3000/admin](http://localhost:3000/admin)
2. Hacé clic en una dependencia
3. Descargá o imprimí el QR

#### Registrar Fichada
1. Escaneá el QR con tu celular (o abrí la URL manualmente)
2. Ingresá un DNI de prueba
3. Tomá una foto con la cámara
4. Registrá la fichada

## ✅ Verificación

Si todo funciona correctamente deberías:
- ✅ Ver el formulario de fichadas en la página principal
- ✅ Ver la lista de dependencias en `/admin`
- ✅ Poder generar códigos QR
- ✅ Poder activar la cámara y tomar fotos
- ✅ Ver ubicación capturada
- ✅ Registrar fichadas exitosamente

## 🐛 Problemas Comunes

### "Cannot find module 'qrcode'"
**Solución**: Ejecutá `pnpm install`

### "No se pudo cargar la dependencia"
**Solución**: 
- Verificá que las variables de entorno estén bien configuradas
- Verificá que hayas ejecutado el SQL en Supabase
- Verificá que hayas insertado las dependencias de prueba

### "Error al subir foto"
**Solución**:
- Verificá que el bucket `fotos-fichadas` exista en Supabase Storage
- Verificá que el bucket sea público
- Verificá las políticas de Storage (ver SUPABASE_SETUP.md)

### "No se puede acceder a la cámara"
**Solución**:
- En Chrome/Edge, podés probar en `localhost` sin HTTPS
- En producción, necesitás HTTPS obligatoriamente
- Verificá los permisos del navegador

## 📱 Para Probar como PWA en Celular

### Opción 1: Usando ngrok (Recomendado para pruebas)

```bash
# Instalar ngrok
npm install -g ngrok

# En una terminal, ejecutá la app
pnpm dev

# En otra terminal, exponé el puerto
ngrok http 3000
```

Esto te dará una URL HTTPS que podés abrir en tu celular.

### Opción 2: Deploy en Vercel

Es la forma más rápida de tenerlo en producción con HTTPS automático.

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel
```

Después configurá las variables de entorno en el dashboard de Vercel.

## 🎯 Próximos Pasos

1. **Personalizá los colores**: Editá `src/app/globals.css` y `public/manifest.json`
2. **Agregá más dependencias**: Insertá más registros en la tabla `dependencias`
3. **Creá iconos personalizados**: Con el logo de la municipalidad
4. **Deploy a producción**: Usando Vercel, Netlify, etc.
5. **Panel de reportes** (opcional): Podés agregar una página para ver las fichadas registradas

## 📞 Necesitás Ayuda?

Si tenés algún problema:
1. Revisá los archivos de documentación (README.md, SUPABASE_SETUP.md)
2. Verificá la consola del navegador para errores
3. Verificá la consola de la terminal donde corre `pnpm dev`
