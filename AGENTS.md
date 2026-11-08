# Minuta - Guía para agentes

## Comandos esenciales

```bash
# Desarrollo
npm run dev                 # Dev server (anuncia en localhost y 127.0.0.1)

# Producción
npm run build               # Prepara build de producción
npm start                   # Inicia servidor de producción

# Utilidades
npm run lint                # ESLint con configuraciones Next.js
npm run typecheck           # Verificación de TypeScript (tsc --noEmit)
npm run preview:pdf -- <id> # Vuelca HTML de plantilla para inspección
npm run preview:png -- <url> <output.png> <type> # Captura PNG con Puppeteer
```

## Arquitectura

- **Entradas**: `app/page.tsx` (ruta principal), `app/history/page.tsx`, `app/meetings/[id]/page.tsx`
- **Core de generación**: `lib/pipeline.ts` → llama a `lib/ollama.ts` → usa `lib/schema.ts` para validar y `lib/prompt.ts` para prompts
- **PDF**: `lib/pdf/render.ts` genera HTML, `lib/pdf/chrome.ts` lo imprime con Chrome headless, `lib/pdf/document.ts` une con pdf-lib
- **Extracción de archivos**: `lib/extract.ts` (mammoth para docx, unpdf para PDFs)
- **Persistencia**: `data/meetings/<id>.json` y `<id>.pdf` — NO subir a control de versiones

## Flujo de generación (map → reduce)

1. Las notas se normalizan; si > 9.000 caracteres, se fragmentan
2. Cada fragmento se resume con JSON Schema reducido
3. Una llamada final fusiona todo y elimina duplicados
4. Validación con zod — si falla, reparación puntual al modelo
5. Renderiza HTML → imprime con Chrome → une portada + cuerpo

## Variables de entorno (`.env.local`)

| Variable | Por defecto | Notas |
|----------|-------------|-------|
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Solo localhost; no hay API keys externas |
| `OLLAMA_MODEL` | `qwen3.8:27b` | Verificá con `ollama list`. Instalar: `ollama pull <model>` |
| `OLLAMA_NUM_CTX` | `8192` | Bajalo a `4096` si CUDA falla; la app reintenta sola |
| `CHROME_PATH` | autodetección | Define ruta explícita si no detecta Chrome/Edge |

## Entradas API (`app/api/**/route.ts`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/api/health` | Estado de Ollama, modelo y Chrome |
| `POST` | `/api/meetings` | Genera acta; retorna SSE (`phase`, `progress`, `done`, `error`) |
| `GET`  | `/api/meetings?q=` | Búsqueda y listado de actas |
| `GET`  | `/api/meetings/:id` | JSON del acta |
| `DELETE` | `/api/meetings/:id` | Elimina acta y PDF; regenera con misma lógica al volver a pedir |
| `GET`  | `/api/meetings/:id/pdf` | Sers archivo PDF (`?download=1` fuerza descarga) |

## Componentes clave

- **Cliente**: `components/Workspace.tsx`, `Composer.tsx`, `AppHeader.tsx`
- **Estado UI**: `ProgressPanel.tsx`, `StatusPill.tsx`
- **Resultados**: `ResultPanel.tsx`, `MeetingDetail.tsx`

## Archivos ignorados (`.gitignore`)

- `/data/` — metadatos, JSONs y PDFs de actas (generados)
- `node_modules/`, `.next/`, `out/`, `build/`
- `.env*` (excepto `.env.example`)

## Problemas conocidos y soluciones rápidas

**Ollama no responde** → Verificá `ollama list`; instálalo si falta con `ollama pull qwen3.8:27b`.

**CUDA error/shared object initialization failed** → Baja `OLLAMA_NUM_CTX` a `4096`; la app reinicento automáticamente tras detectar fallo.

**Chrome/Edge no encontrado** → Define `CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe` en `.env.local`.

**PDF escaneado sin texto** → Se usa extracción OCR; pegá notas como texto o usá `.docx`, `.txt` (no hay OCR nativo).

**Lenta primera llamada** (~1 min) → El modelo se carga en memoria y permanece ~30 minutos activo.

## Privacidad

- Ollama corre localmente; sin telemetría ni API keys externas
- Fuentes de Google (`next/font`) se descargan en build (static)
- Datos solo en `data/meetings/` — borrar acta desde UI elimina todo

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
