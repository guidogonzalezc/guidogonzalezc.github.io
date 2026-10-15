# Guido Gonzalez — portfolio

Portfolio estático de Rigging TD y desarrollo de herramientas, compatible con GitHub Pages. HTML, CSS y JavaScript, sin compilación ni dependencias que instalar.

## Publicar en GitHub Pages

1. Sube estos cambios al repositorio `guidogonzalezc/guidogonzalezc.github.io`.
2. En GitHub, abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Selecciona **main** y **/(root)**, y pulsa **Save**.
5. Cuando termine el despliegue, la web estará en https://guidogonzalezc.github.io/.

El alojamiento es gratuito para repositorios públicos. `.nojekyll` permite servir los archivos estáticos directamente. No requiere dominio propio; si se añade uno, el dominio se paga aparte.

Documentación oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Vista previa local

Desde la carpeta del proyecto ejecuta `python -m http.server 4174` y abre http://localhost:4174. También puedes usar cualquier servidor de archivos estáticos.

## Editar contenido

- `index.html`: portada, presentación, proyectos, showreel, experiencia y contacto.
- `about.html`, `blog.html`, `contact.html`: páginas interiores.
- `posts/`: artículos y breakdowns, con sus direcciones originales.
- `css/style.css`: estilos compartidos, portada y tamaños para móvil.
- `css/works.css`: diseño de las páginas de proyecto, índice lateral, explicaciones y código desplegable.
- `js/main.js`: menú móvil, selector de fondos, animaciones y filtros del blog.
- `assets/`: imágenes locales y favicon.
- `scripts/`: herramientas descargables de Maya.

## Cambiar los fondos de portada

La portada utiliza tres fotogramas del reel original de 1920 × 1080: Sprouts, Here Be Dragons y Out Cold. Se guardan en `assets/reel/` como WebP, con 1920 píxeles de ancho y recortados para quitar las bandas del montaje. Cada fondo enlaza al momento correspondiente del reel de YouTube. Los tiempos y recortes se documentan en `assets/reel/README.md`.

Puedes cambiar los archivos de imagen o los atributos `src` dentro de `.hero-scenes` en `index.html`. Actualiza también las entradas de `scenes` en `js/main.js` si cambia el título o el enlace del proyecto.

Para una siguiente iteración, una captura limpia del viewport sin paneles, con el rig bien iluminado y encuadre panorámico, daría más fuerza al fondo. Una exportación de 1920 × 1080 en WebP o JPEG sería suficiente. Usa material propio que puedas mostrar públicamente.

## Comportamiento

- Los fondos rotan cada 15 segundos en el orden Here Be Dragons → Out Cold → Sprouts. Los botones permiten seleccionar o pausar la rotación; una selección manual reinicia los 15 segundos. La rotación se pausa cuando la pestaña no está visible y empieza pausada si se prefiere reducir movimiento.
- El showreel se carga de forma diferida y tiene un enlace alternativo a YouTube.
- El contenido y los enlaces funcionan sin JavaScript; el menú permanece desplegado.
- Se respeta la preferencia de reducir movimiento.
- Entrada escalonada en portada y secciones, fundido entre fondos y detalles animados en tarjetas y enlaces. En escritorio, el fondo tiene un parallax suave y las imágenes de proyecto responden al cursor. La barra bajo el menú muestra el progreso de lectura.
- Google Fonts y el reproductor de YouTube requieren conexión; las fuentes tienen alternativas locales.

GitHub Pages publica los cambios que se suben a `main`. Editar archivos localmente no publica la web: es necesario guardar los cambios en Git y subirlos al repositorio.
