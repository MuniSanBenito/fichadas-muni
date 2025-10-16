# Iconos para PWA

Para completar la configuración de la PWA, necesitás crear dos iconos:

1. **icon-192.png** - 192x192 pixels
2. **icon-512.png** - 512x512 pixels

Colocá estos iconos en la carpeta `public/`

## Opción 1: Usar Herramientas Online (Más Fácil)

### PWA Builder (Recomendado)
1. Andá a [https://www.pwabuilder.com/imageGenerator](https://www.pwabuilder.com/imageGenerator)
2. Subí una imagen del logo de la municipalidad (mínimo 512x512px)
3. Descargá los iconos generados
4. Renombralos a `icon-192.png` e `icon-512.png`
5. Colocálos en la carpeta `public/`

### Otras Opciones
- [https://realfavicongenerator.net/](https://realfavicongenerator.net/)
- [https://favicon.io/](https://favicon.io/)

## Opción 2: Crear Manualmente

Si tenés Photoshop, GIMP, Figma u otra herramienta de diseño:

1. Creá un documento de 512x512px
2. Diseñá el ícono con el logo de la municipalidad
3. Exportá como PNG en dos tamaños:
   - 192x192px → `icon-192.png`
   - 512x512px → `icon-512.png`
4. Colocálos en `public/`

## Opción 3: Usar Icono Temporal (Para Desarrollo)

Incluí un icono SVG temporal en `public/icon-temp.svg` que podés convertir:

### Convertir SVG a PNG Online
1. Andá a [https://svgtopng.com/](https://svgtopng.com/) o [https://cloudconvert.com/svg-to-png](https://cloudconvert.com/svg-to-png)
2. Subí el archivo `public/icon-temp.svg`
3. Convertí a 192x192px y descargá como `icon-192.png`
4. Convertí a 512x512px y descargá como `icon-512.png`
5. Colocá ambos archivos en `public/`

## Requisitos del Icono

- **Formato**: PNG
- **Fondo**: Puede ser transparente o de color sólido
- **Diseño**: Simple y reconocible, especialmente en tamaños pequeños
- **Colores**: Preferentemente los colores institucionales de la municipalidad

## ¿Qué pasa si no tengo los iconos?

La aplicación funcionará igual, pero:
- ❌ No se verá el ícono al instalar la PWA
- ❌ Aparecerá un ícono genérico en el celular
- ✅ Todas las funcionalidades seguirán funcionando normalmente

Podés empezar a desarrollar sin los iconos y agregarlos después.

## Verificar que Funciona

Después de agregar los iconos:
1. Recargá la aplicación (Ctrl+F5 o Cmd+Shift+R)
2. En Chrome/Edge, abrí las DevTools (F12)
3. Andá a la pestaña "Application" > "Manifest"
4. Verificá que los iconos se muestren correctamente
