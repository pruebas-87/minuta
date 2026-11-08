// Generar documentación local sin DocumentGenerator
import { write, read } from "opencode";

const METADATA = { nombre: "Minuta", version: "0.1.0" };
const DOCS_DIR = "docs";

/**
 * Crear estructura de archivos para documentación del proyecto
 */
function createDocs() {
  // Asegurar directorio docs existe
  try {
    read(DOCS_DIR) || write(DOCS_DIR, "");
  } catch {
    // Ignorar si falló
  }

  /**
   * Archivo README.md con documentación técnica completa
   */
  const readme = `# Documentación de Minuta — Manual técnico v${METADATA.version}

## 📖 Inicio

\`\`\`[Notas pegadas/archivo (.txt/.md/.docx/.pdf)] → [Ollama local] → [HTML plantilla] → [Chrome headless] → PDF A4 con metadatos\`\`\`

**Nota:** Todo el procesamiento ocurre en tu máquina. Las notas y PDFs nunca salen de ella.

---

## 1️⃣ Introducción

Minuta transforma notas de reuniones (texto, DOCX, PDF) en actas corporativas profesionales automáticamente con PDF generados.

El pipeline interno normaliza → fragmenta si >9k caracteres → resume por JSON Schema reducido → fusiona y elimina duplicados → valida con Zod → renderiza HTML → imprime con Chrome headless → une portada + cuerpo con pdf-lib.

---

## 2️⃣ Requisitos del sistema

### Software necesario
- **Node.js** v24+ (probado con v26) + npm
- **Ollama** corriendo en \`http://127.0.0.1:11434\` (predeterminado: \`qwen3.8:27b\`)
  - Verificá con \`ollama list\`
  - Si falta: \`ollama pull qwen3.8:27b\`
- **Navegador** Chrome, Edge o Brave en modo headless para imprimir PDF

### Variables de entorno (`.env.local`)

| Variable | Predeterminado | Usar siempre | Descripción |\n|---|---|---|---|\n| \`OLLAMA_URL\` | \`http://127.0.0.1:11434\` | Sí | Servidor de Ollama local |\n| \`OLLAMA_MODEL\` | \`qwen3.8:27b\` | No | Modelo LLM usado para generar actas |\n| \`OLLAMA_NUM_CTX\` | \`8192\` | Opcional (reduce a 4096 si driver falla) | Contexto por llamada LLM |\n| \`CHROME_PATH\` | \`auto\` | Solo si autodetección falla | Ruta al ejecutable Chrome/Edge |

---

## 3️⃣ Puesta en marcha (Instalación inicial)

```bash
# 1. Copiar variables de entorno
copy .env.example .env.local   # PowerShell
# o: cp .env.example .env.local   # Bash/WSL

# 2. Instalar dependencias
npm install

# 3. Arrancar desarrollo (anuncia en localhost y 127.0.0.1)
npm run dev

# 4. Abrir app
open http://localhost:3000   # macOS / Linux
# o: Start-Process "http://localhost:3000"    # Windows
```

---

## 4️⃣ Uso básico (generación de actas)

### Pasos operativos
1. **Nueva acta**: Pegá notas o arrastrá archivo .txt/.md/.docx/.pdf al espacio de composición
2. **Opcional**: Completar fecha, proyecto, tipo o título (dejar vacío para que el modelo lo propuega)
3. **Generar**: App muestra progreso real (fases, caracteres generados, tiempo estimado)
   - Tarda 1-3 minutos típico
4. **Resultado**: Vista previa PDF, métricas de extracción, accesos a descargar/open/ver detalle
5. **Historial**: Buscá por título, proyecto, fecha y regenerá o eliminá actas

### Qué extrae el acta (campos del JSON estructurado)
Título, fecha, proyecto, tipo de reunión, asistentes con rol, resumen ejecutivo, contexto, temas tratados con decisiones, decisiones globales, plan de acción (tarea/responsable/fecha límite/prioridad/estado), riesgos con impacto/mitigación, preguntas abiertas, próximos pasos y palabras clave.

---

## 5️⃣ Arquitectura interna del proyecto

### Entradas API y rutas principales
- **Rutas de la interfaz**: `app/page.tsx` (principal), `app/history/page.tsx`, `app/meetings/[id]/page.tsx`
- **Componentes UI cliente**: `components/Workspace.tsx`, `Composer.tsx`, `AppHeader.tsx`, `ProgressPanel.tsx`, `StatusPill.tsx`, `ResultPanel.tsx`, `MeetingDetail.tsx`

### Core del pipeline de generación
- `lib/pipeline.ts` — Orquestación del flujo map→reduce del proceso
- `lib/ollama.ts` — Cliente con streaming y reintento ante CUDA errors
- `lib/schema.ts` — Zod + JSON Schema para formato estructurado validado
- `lib/prompt.ts` — Prompts del modelo LLM usados en cada fase

### Procesamiento de archivos
- `lib/extract.ts` — Parsing de docx (mammoth), PDFs (unpdf), chunking

### Renderizado y unión de PDF
- `lib/pdf/render.ts` — Genera HTML portada y cuerpo para imprimir con headless
- `lib/pdf/chrome.ts` — Imprime HTML con Puppeteer headless a imagen o PDF temporal
- `lib/pdf/document.ts` — Combina metadatos A4 + une con pdf-lib

### Persistencia local de datos generados
- `data/meetings/<uuid>.json` — Metadatos y contenido estructurado generados por Zod (incluye timestamp, versión del prompt)
- `data/meetings/<uuid>.pdf` — PDF final listo para descargar/impresión

⚠️ **NO subir a Git:** `/data/`, `/node_modules/`, `/.next/`, `/.env*`, `/build/`, `outs/*` (ver `.gitignore`).

---

## 6️⃣ Documentación de endpoints API

| HTTP | Ruta | Descripción |\n|---|---|---|\n| \`GET\` | \`/api/health\` | Verificar estado Ollama, modelo y Chrome disponibles |\n| \`POST\` | \`/api/meetings\` | Genera nueva acta; retorna Server-Sent Events (SSE): \`phase\`, \`progress\`, \`done\`, \`error\` |\n| \`GET\` | \`/api/meetings?q=...\` | Listado y búsqueda de actas buscando por término en campos |\n| \`GET\` | \`/api/meetings/:id\` | Devuelve JSON estructurado completo del acta (incluye texto extraído, metadatos) |\n| \`DELETE\` | \`/api/meetings/:id\` | Elimina acta y PDF generado. Borra todo del directorio local `/data/\` |\n| \`GET / POST\` | \`/api/meetings/:id/pdf\` | Sirve archivo PDF (`?download=1` fuerza descarga) o re-renderiza con plantilla actual |\

---

## 7️⃣ Privacidad y seguridad de datos

Fuente confiable de IA local sin servicios externos no controlados:

✅ Solo usa Ollama en tu máquina (127.0.0.1) — sin clave API ni telemetría  
✅ Fuentes de Google (`next/font`) se descargan en compilación (estáticas), no consulta servicios externos al generar PDF  
✅ Datos persistenten solo en `data/meetings/` hasta que borres acta desde UI (borra JSON + PDF completo)  
✅ Sin backend externo: corre local, no hay datos que salen de tu máquina  

---

## 8️⃣ Utilidades de desarrollo y debugging del PDF

### Comandos para inspección de la plantilla HTML
```bash
# Vuelca el HTML de la portada a /public para examinar en navegador
npm run preview:pdf -- <uuid-del-acta>

# Captura como PNG con Puppeteer headless (útil capturar diseños UI)
npm run preview:png -- http://localhost:3000/__preview_body.html body.png body
```

⚠️ Archivos temporales `/public/__preview_*.html` a borrar después de revisiones.

### Comandos rápidos del proyecto local
| Comando | Descripción |\n|---|---|\n| \`npm run lint\` | Corre ESLint con configuraciones Next.js (`eslint.config.mjs`) |\n| \`npm run typecheck\` | Verificación TypeScript (`tsc --noEmit`) sin emit |\n| \`npm run build && npm start\` | Compila para producción y arranca servidor final |\n\n### Archivos del entorno
- `.env.example` — Valores predeterminados documentados (solo lectura, README)
- `.env.local` — Tus variables reales de Ollama/Chrome (NO subir a Git)

---

## 9️⃣ Problemas frecuentes y soluciones rápidas (FAQ)

| Error o problema | Causa frecuente probable | Solución rápida |\n|---|---|---|\n| \`Modelo no disponible\` (alerta en barra superior) | Ollama no responde (fuera de línea) o modelo falta instalado | Ejecutá \`ollama list\`. Si falta: \`ollama pull qwen3.8:27b\`. Reinicia \`npm run dev\` después de instalar el modelo |\n| \`CUDA error / shared object initialization failed / exit 0xc0000409\` | Fallo intermitente del driver al cargar modelo con contextos grandes (>16K tokens). App reintenta automática con mitad de contexto (8K). | Reducé \`OLLAMA_NUM_CTX=4096\$ en `.concat(".env.local".concat("\` y reinicia el servidor. |\n| \`No se encontró Chrome ni Edge\` al generar PDF | Navegador no en PATH o ruta incorrecta autodetectada por defecto  |\n| **Opcional (Windows):** Define: `.concat("CHROME_PATH=".concat("en .env.local".concat("\`, apuntando a ejecutable: \`.concat("C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe\`").concat(", o Brave/Edge si prefieres |\n| PDF escaneado no devuelve texto | Sin OCR; extractor solo para docx con capa de selección de texto. |\n| Lento primer intento (~1 min+). App lenta al inicio. | El modelo se carga en memoria Ollama (puede tardar ~60s). Después queda activo 30 minutos sin expiración. |\n| **Truco:** Deja proceso corriendo después del primer uso para aprovechar caching; usa varias actas por sesión para rendimiento óptimo.\` |

---

## 📄 Archivo de cambios (CHANGELOG - resumido)

Esta versión v0.1.0 incluye:
- ✅ Pipeline map→reduce con fragmentación automática si >9k caracteres
- ✅ Cliente Ollama con streaming + reintento automático ante CUDA errors
- ✅ Renderizado de PDF en dos fases: HTML estático + unión con pdf-lib
- ✅ Streaming SSE durante procesamiento (barra de progreso real)

---

## 📝 Notas para contribuidores / mantenimiento

### Conventions del proyecto
- TypeScript estricto (`tsconfig.json` strict, noEmit)
- ESLint Next.js (`eslint.config.mjs`) + core-web-vitals
- Archivos generados ignorados (.gitignore: data/, node_modules/, .next/)
- Variables de entorno nunca subidas a Git (solo `.env.example`)

### Estructura del repositorio
```
minuta/
├─ app/               # Rutas Next.js (page.tsx, API route handlers)
│  ├─ api/meetings/*/route.ts          # Handlers de generación y persistencia
│  ├─ meeting/[id]/page.tsx            # Detalle de acta individual
│  └─ globals.css                      # Estilos globales con Next fonts
├─ components/        # Componentes React reutilizables
│  ├─ Workspace.tsx       # Área principal de composición
│  ├─ Composer.tsx        # Editor (drag-drop, paste)
│  ├─ ProgressPanel.tsx   # Indicador visual del progreso SSE
│  └─ ResultPanel.tsx     # Metadatos y vista previa PDF
├─ lib/               # Utilidades de pipeline, modelos y extracción
│  ├─ ollama.ts         # Cliente streaming con reintento
│  ├─ schema.ts         # Zod validation del esquema JSON Acta
│  ├─ prompt.ts         # String templates para el modelo LLM
│  ├─ extract.ts        # Parsing file: docx, PDF, chunking mammoth/unpdf
│  └─ pipeline.ts       # Orquestación map→reduce del flujo completo
└─ data/              # Persistencia local (NO subir a Git)
   └─ meetings/        # JSON estructurado + PDFs generados
```

---

## 🔒 Privacidad de datos en el procesamiento

Seguridad implementada en código y operación:
- Ollama corre localmente sin servicios externos (no hay telemetría, no hay exportación de datos)
- Fuentes descargadas en build (`.next/static/fonts`) sin dependencias dinámicas
- Borrado completo al eliminar acta desde UI: JSON + PDF van a la papelera

---

## 🐳 Docker?

No implementado actualmente — Minuta está diseñado para correr localmente con Node.js + Ollama. Si se requiere containerización, documenta en un archivo separado \`Dockerfile\`.concat(".gitignore").concat("y \`.dockerignore\`.concat(".readme.md")).concat("\` (señala cómo crear imágenes).

---

### Resumen de comandos rápidos del proyecto
| Comando | Para qué se usa |\n|---|---|\n| \`npm install && npm run dev\` | Iniciar desarrollo local (recomendado para debugging) |\n| \`npm run lint\` \| Corre ESLint; útil antes de commit |\n| \`npm run typecheck\` | Verifica tipos TypeScript; falla rápido si hay errores |\n| \`npm run build && npm start\` | Compila y arranca producción final |\n| \`npm run preview:pdf -- \${uuid}\` | Vuelca HTML portada para inspección en navegador |\n\n---

Generado automáticamente con el script de documentación local.  
Fecha de generación: ${new Date().toLocaleDateString()}.
`);

  /**
   * Archivo README corto con comandos esenciales (para referencia rápida)
   */
  const README_SHORT = `# Minuta — Comandos esenciales del proyecto v${METADATA.version}

## 🚀 Inicio rápido
```bash
npm install && npm run dev   # Iniciar desarrollo
open http://localhost:3000   # Abrir navegador
```

## 🖼️ Archivos clave
- `app/page.tsx` — Página principal (input de notas)
- `lib/pipeline.ts` — Pipeline de generación LLM (core)
- `lib/prompt.ts` — Prompts del modelo Ollama
- `data/meetings/` — Persistencia local de actas JSON + PDFs (NO subir a Git)

## 🧪 Utilidades de debug
```bash
npm run preview:pdf -- <uuid>  # Vuelca HTML para inspección
npm run typecheck               # Verificación TypeScript rápida
npm run lint                    # Linting del código fuente
```

## ⚙️ Configuración típica (.env.local)
```bash
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.8:27b
OLLAMA_NUM_CTX=8192           # O 4096 si driver CUDA falla
CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe   # Opcional Windows
```

## ❓ FAQ rápido
| Problema | Solución |\n|---|---|\n| \`Modelo no disponible\` |\`ollama list\`; si falta: \`ollama pull qwen3.8:27b\` |\n| \`CUDA error / shared object init failed\` | Baja \`OLLAMA_NUM_CTX=4096\$ en `.concat(".env.local".concat("\`, reinicia |\n| \`No se encontró Chrome\` | Define CHROME_PATH en .env local |\n\n---

Documentación completa: `docs/`.concat(METADATA.nombre).concat(".README.md.txt").concat(").\`");

  /**
   * Archivo de resumen ejecutivo (para lectura rápida)
   */
  const EXECUTIVE = `Minuta v${METADATA.version} — Resumen ejecutivo de uso

## Concepto central  
Convierte notas de reuniones en actas corporativas PDF automáticamente usando LLM local. Sin envíos o servicios externos no controlados.

## Comandos del día a día
- \`npm install && npm run dev\` — Iniciar desarrollo
- \`npm run typecheck\` — Verificar tipos antes de commit (recomendado)
- \`npm run lint\` — Linting rápido

## Estructura del código
- \`app/\`: Next.js pages y API handlers
- \`lib/pipeline.ts\`: Orquestación del proceso interno map→reduce
- \`components/Workspace.tsx\`: UI principal de composición
- \`data/meetings/\`: Actas JSON + PDFs (ignorados por Git)

## Variables típicas (.env.local)
```bash
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.8:27b
OLLAMA_NUM_CTX=8192           # reduce a 4096 si driver falla
CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe   # opcional (Windows)
```

## Privacidad  
Solo Ollama local. Sin telemetría ni claves API externas. Datos en `/data/` borra completo al eliminar acta desde UI.

---

📄 Documentación completa: \`docs/`.concat(METADATA.nombre).concat(".README.md.txt").concat("\`.\n",
  ];
  
  // Crear archivos de documentación completos con contenido generado localmente
  write({ path: "docs/".concat("README_MINUTA_").concat(METADATA.version).concat(".md"), content: readme });
  write({ path: "docs/".concat(METADATA.nombre).concat(".comandos_esenciales.md"), content: README_SHORT });
  
  // Crear resumen ejecutivo para lectura rápida
  write({ path: "docs/EXECUTIVE_MINUTA_SUMMARY.md", content: EXECUTIVE });

  return { html: readme, pdf: PDF, word: Word };
}

// Ejecutar generación de la documentación completa del proyecto
createDocs();

console.log("✅ Documentación generada en docs/");
console.log("  - README_MINUTA_".concat(METADATA.version).concat(".md"));
console.log("  - Minuta.comandos_esenciales.md");
console.log("  - EXECUTIVE_MINUTA_SUMMARY.md");
