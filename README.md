# Blackbelt Editor

Editor open source de medios local-first creado por Blackbelt Producciones SpA.

Sitio: [editor.blackbelt.cl](https://editor.blackbelt.cl)

Repositorio: [github.com/aladuuu/editor.blackbelt.cl](https://github.com/aladuuu/editor.blackbelt.cl)

## Que es

Blackbelt Editor es una herramienta web para editar medios usando los recursos locales del navegador del usuario. La app puede publicarse como sitio estatico, pero los archivos se cargan, procesan y exportan en el browser.

## Principios

- Los archivos no se suben a un servidor para editarlos.
- El MVP funciona sin backend.
- El procesamiento ocurre con APIs web locales como Canvas.
- El proyecto esta pensado para crecer por modulos: imagen, GIF, video, audio y batch tools.
- El despliegue recomendado es Cloudflare Pages.

## Estado actual

- Carga local de imagenes.
- Render y exportacion desde Canvas.
- Ajustes de brillo, contraste, saturacion, temperatura y vineta.
- Rotar y voltear.
- Crop con inputs, seleccion arrastrable y manillas de resize.
- Margen de lienzo por borde, con fondo transparente o color.
- Resize con proporcion bloqueable y presets rapidos.
- Texto y marca de agua como capas arrastrables.
- Comparador antes/despues con divisor sobre el canvas.
- Modal de descarga con formato, calidad, peso original y peso estimado.
- Restauracion local de la ultima sesion con localStorage e IndexedDB.
- Exportacion a PNG, JPEG y WebP.

## Open Source

Este proyecto se publica bajo licencia MIT.

Autor y copyright:

```txt
Blackbelt Producciones SpA
```

La idea central del proyecto es ofrecer herramientas de edicion de medios que respeten la privacidad del usuario: la pagina entrega la interfaz, pero el archivo se queda local.

## Roadmap

- Procesamiento por lotes.
- Editor GIF con extraccion y recompresion de frames.
- Video local con WebCodecs y FFmpeg WASM como fallback.
- Audio local para trim, normalizacion y conversion.
- Sistema de plugins para herramientas independientes.

## Desarrollo local

Este proyecto no necesita build para el MVP. Puedes servirlo con cualquier servidor estatico:

```bash
npx serve .
```

Tambien puedes usar Python:

```bash
python3 -m http.server 8787
```

## Cloudflare Pages

Configuracion sugerida:

- Framework preset: `None`
- Build command: vacio
- Build output directory: `.`

Deploy manual con Wrangler:

```bash
npx wrangler pages deploy . --project-name editor-blackbelt-cl
```
