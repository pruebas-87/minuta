# Minuta

Aplicación web local que convierte notas de reuniones en actas corporativas en PDF.
Todo el procesamiento —incluido el modelo de lenguaje— ocurre en tu máquina: las notas
y los PDFs nunca salen de ella.

```
Notas pegadas o archivo  →  Ollama (modelo local)  →  HTML plantilla  →  Chrome  →  PDF A4
```

## Requisitos

- **Node.js 24+** (probado con Node 26) y npm.
- **Ollama** corriendo en `http://127.0.0.1:11434` con un modelo instalado
  (por defecto `qwen3.8:27b`). Verificalo con `ollama list`.
- **Chrome, Edge o Brave** instalado. Se usa en modo headless para imprimir el PDF;
  no hace falta instalar Chromium aparte.

## Puesta en marcha

```bash
npm install
copy .env.example .env.local   # PowerShell; en bash: cp .env.example .env.local
npm run dev
```

Abrí `http://127.0.0.1:3000` (o `http://localhost:3000`, es equivalente). El indicador de
la barra superior muestra si Ollama y el modelo están disponibles; hacé clic para volver
a verificar.

Para producción: `npm run build` y `npm start`.

## Variables de entorno

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Servidor de Ollama. |
| `OLLAMA_MODEL` | `qwen3.8:27b` | Modelo usado para generar el acta. |
| `OLLAMA_NUM_CTX` | `8192` | Contexto por llamada. Bajalo a `4096` si el driver CUDA falla. |
| `CHROME_PATH` | autodetección | Ruta al ejecutable de Chrome/Edge. |

## Uso

1. **Nueva acta**: pegá las notas o arrastrá un archivo `.txt`, `.md`, `.docx` o `.pdf`.
   Podés completar fecha, proyecto, tipo y título; si dejás el título vacío, lo propone el modelo.
2. **Generar**: la app muestra el progreso real (fases, caracteres generados y tiempo estimado).
   Un acta típica tarda entre 1 y 3 minutos.
3. **Resultado**: vista previa del PDF, métricas de lo extraído y accesos para descargar,
   abrir o ver el detalle.
4. **Historial**: buscá por título, proyecto, fecha, tipo o asistente; volvé a descargar el PDF,
   regenerarlo con la plantilla actual o eliminar el acta.

### Qué extrae el acta

Título, fecha, proyecto, tipo de reunión, asistentes con rol, resumen ejecutivo, contexto,
temas tratados con sus decisiones, decisiones globales, plan de acción (tarea, responsable,
fecha límite, prioridad y estado), riesgos con impacto y mitigación, preguntas abiertas,
próximos pasos y palabras clave.

### El PDF

- Portada A4 con banda de marca, metadatos, participantes, puntos clave y métricas.
- Cuerpo con numeración de secciones, tabla de acciones con encabezado repetido al cambiar
  de página, y pies con «Página X de Y».
- Portada y cuerpo se generan por separado con Chrome y se unen con `pdf-lib`, que además
  escribe los metadatos del documento.

## Cómo funciona

| Pieza | Archivo |
| --- | --- |
| Rutas de la interfaz | `app/page.tsx`, `app/history/page.tsx`, `app/meetings/[id]/page.tsx` |
| Componentes cliente | `components/Workspace.tsx`, `Composer.tsx`, `ProgressPanel.tsx`, `ResultPanel.tsx`, `MeetingDetail.tsx` |
| Endpoints | `app/api/meetings/route.ts`, `app/api/meetings/[id]/route.ts`, `app/api/meetings/[id]/pdf/route.ts`, `app/api/extract/route.ts`, `app/api/health/route.ts` |
| Pipeline de generación | `lib/pipeline.ts` |
| Cliente de Ollama | `lib/ollama.ts` (streaming, reintento ante fallos CUDA) |
| Esquema y validación | `lib/schema.ts` (zod + JSON Schema para `format`) |
| Prompts | `lib/prompt.ts` |
| Extracción de archivos | `lib/extract.ts` (mammoth, unpdf, chunking) |
| Plantilla PDF | `lib/pdf/render.ts` |
| Impresión y unión | `lib/pdf/chrome.ts`, `lib/pdf/document.ts` |
| Persistencia | `lib/store.ts` |

Flujo interno:

1. Las notas se normalizan y, si superan ~9.000 caracteres, se parten en fragmentos (map).
2. Cada fragmento se resume con el esquema reducido; luego una llamada final fusiona todo
   (reduce) y elimina duplicados.
3. La respuesta se valida con zod. Si falla, se pide al modelo una reparación puntual.
4. Un post-proceso normaliza fechas a `AAAA-MM-DD`, prioridades, estados y duplicados.
5. Se renderiza el HTML, Chrome lo imprime y `pdf-lib` une portada + cuerpo con metadatos.

La generación viaja al navegador como Server-Sent Events (`phase`, `progress`, `done`, `error`),
por eso la barra de progreso refleja el avance real del modelo.

## Datos

Cada acta se guarda en `data/meetings/`:

```
<uuid>.json   contenido estructurado + metadatos de la generación
<uuid>.pdf    PDF listo para descargar
```

`data/` está en `.gitignore`. Para hacer una copia de seguridad, copiá esa carpeta.
Si el PDF se borra, el endpoint lo regenera desde el JSON guardado.

## Endpoints

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/health` | Estado de Ollama, modelo y Chrome. |
| `POST` | `/api/extract` | Extrae texto de un archivo (`multipart/form-data`, campo `file`). |
| `GET` | `/api/meetings?q=` | Lista y busca actas. |
| `POST` | `/api/meetings` | Genera un acta y devuelve el progreso por SSE. |
| `GET` | `/api/meetings/:id` | Devuelve el JSON del acta. |
| `DELETE` | `/api/meetings/:id` | Elimina el acta y su PDF. |
| `GET` | `/api/meetings/:id/pdf` | Sirve el PDF (`?download=1` fuerza descarga). |
| `POST` | `/api/meetings/:id/pdf` | Re-renderiza el PDF con la plantilla actual. |

## Problemas frecuentes

**«Modelo no disponible» en la barra superior.** Ollama no responde o el modelo no está
instalado. Verificá `ollama list` y ejecutá `ollama pull qwen3.8:27b` si falta.

**`CUDA error: shared object initialization failed` o `exit status 0xc0000409`.**
Es un fallo intermitente del driver al cargar el modelo con contextos grandes. La app
reintenta automáticamente con la mitad de contexto. Si se repite, poné `OLLAMA_NUM_CTX=4096`
en `.env.local` y reiniciá el servidor.

**«No se encontró Chrome ni Edge».** Definí `CHROME_PATH` en `.env.local` apuntando al
ejecutable (por ejemplo `C:\Program Files\Google\Chrome\Application\chrome.exe`).

**Un PDF escaneado no devuelve texto.** No se aplica OCR: pegá las notas como texto o subí
un `.docx` con texto seleccionable.

**El acta tarda mucho.** La primera llamada carga el modelo en memoria (puede tardar ~1 minuto).
Después de eso el modelo queda activo 30 minutos. Las notas largas se procesan por fragmentos
y suman llamadas.

## Utilidades de desarrollo

```bash
# Vuelca el HTML de la plantilla a /public para inspeccionarlo
npm run preview:pdf -- <id-del-acta>

# Captura ese HTML como PNG con Chrome headless
npm run preview:png -- http://127.0.0.1:3000/__preview_cover.html cover.png cover
npm run preview:png -- http://127.0.0.1:3000/__preview_body.html body.png body

# Verificación de tipos
npm run typecheck
```

Los archivos `public/__preview_*.html` son temporales: borralos cuando termines de revisar.

## Privacidad

- El único servicio externo es Ollama en `127.0.0.1`; no hay claves de API ni telemetría.
- Las fuentes de Google (`next/font`) se descargan en tiempo de compilación; la app no
  consulta servicios externos al generar un acta.
- Los datos quedan en `data/meetings/` hasta que borres el acta desde la interfaz.
