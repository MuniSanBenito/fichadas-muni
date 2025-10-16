# ✅ Checklist de Implementación

## 📦 Instalación y Configuración Inicial

- [ ] **1. Instalar dependencias**
  ```bash
  pnpm install
  ```
  Esto instalará todas las librerías necesarias (Next.js, Supabase, qrcode, etc.)

- [ ] **2. Crear proyecto en Supabase**
  - Ir a [https://supabase.com](https://supabase.com)
  - Crear cuenta y nuevo proyecto
  - Anotar el nombre del proyecto

## 🗃️ Configuración de Base de Datos

- [ ] **3. Ejecutar SQL en Supabase**
  - Ir a SQL Editor en Supabase
  - Copiar todo el contenido de `SUPABASE_SETUP.md` (sección SQL)
  - Ejecutar el script completo
  - Verificar que se crearon las tablas `dependencias` y `fichadas`

- [ ] **4. Configurar Storage**
  - Ir a Storage en Supabase
  - Crear bucket llamado `fotos-fichadas`
  - Marcarlo como **público**
  - Ejecutar las políticas de Storage del `SUPABASE_SETUP.md`

- [ ] **5. Insertar dependencias de prueba**
  ```sql
  INSERT INTO dependencias (nombre, codigo, direccion) VALUES
    ('Intendencia', 'INT-001', 'Calle Principal 123'),
    ('Obras Públicas', 'OBR-001', 'Av. Trabajo 456'),
    ('Desarrollo Social', 'SOC-001', 'Barrio Centro');
  ```

## 🔑 Variables de Entorno

- [ ] **6. Copiar credenciales de Supabase**
  - Ir a Settings > API en Supabase
  - Copiar la **Project URL**
  - Copiar la **anon/public key**

- [ ] **7. Crear archivo `.env.local`**
  - Crear el archivo en la raíz del proyecto
  - Agregar:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_aqui
    ```
  - Reemplazar con tus valores reales

## 🎨 Iconos PWA

- [ ] **8. Crear iconos** (Ver `ICONOS_PWA.md`)
  - Opción A: Usar [PWA Builder](https://www.pwabuilder.com/imageGenerator)
  - Opción B: Convertir `public/icon-temp.svg` a PNG
  - Opción C: Crear manualmente con logo de la municipalidad
  
- [ ] **9. Colocar iconos en public/**
  - `public/icon-192.png` (192x192px)
  - `public/icon-512.png` (512x512px)

## 🚀 Prueba en Desarrollo

- [ ] **10. Ejecutar el servidor**
  ```bash
  pnpm dev
  ```

- [ ] **11. Verificar página principal**
  - Abrir [http://localhost:3000](http://localhost:3000)
  - Debe aparecer el formulario de fichadas
  - Debe mostrar "Escanea un código QR..."

- [ ] **12. Verificar página admin**
  - Abrir [http://localhost:3000/admin](http://localhost:3000/admin)
  - Debe aparecer la lista de dependencias
  - Hacer clic en una dependencia
  - Debe generarse el código QR

- [ ] **13. Probar generación de QR**
  - En `/admin`, seleccionar una dependencia
  - Descargar el QR generado
  - Verificar que el archivo PNG se descargue correctamente

- [ ] **14. Probar registro de fichada**
  - Escanear el QR con el celular (o abrir la URL manualmente)
  - Ingresar un DNI de prueba (ej: 12345678)
  - Permitir acceso a la cámara
  - Tomar una foto
  - Verificar que se capture la ubicación
  - Hacer clic en "Registrar Fichada"
  - Debe aparecer mensaje de éxito

- [ ] **15. Verificar datos en Supabase**
  - Ir a Table Editor > fichadas
  - Debe aparecer el registro recién creado
  - Verificar que tenga: documento, foto_url, latitud, longitud, fecha_hora
  - Ir a Storage > fotos-fichadas
  - Verificar que la foto se haya subido

## 📱 Prueba PWA en Móvil

- [ ] **16. Exponer con HTTPS** (elegir una opción)
  
  **Opción A: Usando ngrok (más rápido)**
  ```bash
  npm install -g ngrok
  ngrok http 3000
  ```
  
  **Opción B: Deploy en Vercel (recomendado)**
  ```bash
  npm install -g vercel
  vercel
  ```
  Configurar variables de entorno en Vercel Dashboard

- [ ] **17. Probar instalación PWA**
  - Abrir la URL HTTPS en el celular
  - Chrome/Edge debe ofrecer "Agregar a pantalla de inicio"
  - Instalar la PWA
  - Verificar que aparezca el ícono en el celular

- [ ] **18. Probar funcionalidad offline**
  - Abrir la PWA instalada
  - Activar modo avión
  - La app debe cargar la interfaz (aunque no funcione sin internet)
  - Desactivar modo avión
  - Probar registro completo

## 🎯 Personalización (Opcional)

- [ ] **19. Cambiar colores**
  - Editar `src/app/globals.css` (variables CSS)
  - Editar `public/manifest.json` (theme_color, background_color)

- [ ] **20. Cambiar textos**
  - "Municipalidad de San Benito" → Editar en componentes
  - Títulos y descripciones según necesidad

- [ ] **21. Agregar más dependencias**
  - Insertar en Supabase tabla `dependencias`
  - Seguir el formato: nombre, código único, dirección

## 🚀 Deploy a Producción

- [ ] **22. Verificar configuración**
  - Todos los tests locales pasan ✅
  - Iconos están en su lugar ✅
  - Variables de entorno configuradas ✅

- [ ] **23. Deploy** (elegir plataforma)
  
  **Vercel (Recomendado)**
  - Conectar repositorio GitHub
  - Configurar variables de entorno
  - Deploy automático
  
  **Netlify**
  - Build command: `pnpm build`
  - Publish directory: `.next`
  - Configurar variables de entorno
  
  **Railway/Render**
  - Similar a Vercel

- [ ] **24. Verificar producción**
  - Abrir URL de producción
  - Probar todo el flujo nuevamente
  - Verificar HTTPS activo
  - Probar instalación PWA desde producción

## 📊 Opcional: Panel de Reportes

Si querés agregar un panel para ver las fichadas registradas:

- [ ] **25. Crear página de reportes**
  - Nueva página en `src/app/reportes/page.tsx`
  - Consultar tabla `fichadas` con JOIN a `dependencias`
  - Mostrar lista con filtros (fecha, dependencia, documento)
  - Agregar exportación a CSV/Excel

## ✅ Checklist Final

Antes de entregar el proyecto, verificá:

- ✅ La app funciona en desarrollo y producción
- ✅ Se pueden generar QR para todas las dependencias
- ✅ Se pueden registrar fichadas correctamente
- ✅ Las fotos se suben a Supabase Storage
- ✅ La ubicación se captura correctamente
- ✅ La PWA se puede instalar en móvil
- ✅ Los iconos se ven bien
- ✅ Hay documentación clara (README, etc.)
- ✅ Las credenciales no están en el código (solo en .env.local)

## 🎉 ¡Listo!

Tu aplicación está completa y lista para usar. Los empleados pueden escanear los QR y registrar sus fichadas con foto y ubicación en tiempo real.
