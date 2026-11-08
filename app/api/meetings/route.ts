import { z } from "zod";
import { generateMeeting, type ProgressEvent } from "@/lib/pipeline";
import { listMeetings } from "@/lib/store";
import { ChromeError } from "@/lib/pdf/chrome";
import { OllamaError } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Límite del plan Hobby de Vercel (máx. 300s)

const BodySchema = z.object({
  notes: z.string().trim().min(40, "Las notas son demasiado cortas.").max(200_000, "Las notas son demasiado largas."),
  title: z.string().max(120).optional(),
  date: z.string().max(24).optional(),
  project: z.string().max(80).optional(),
  type: z.string().max(60).optional(),
  sourceName: z.string().max(200).optional(),
  sourceKind: z.enum(["texto", "archivo"]).optional(),
});

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? undefined;
  const meetings = await listMeetings(query);
  return Response.json({ meetings }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const meeting = await generateMeeting(parsed.data, send, request.signal);
        send({ type: "done", meeting });
      } catch (error) {
        if (error instanceof OllamaError) {
          send({ type: "error", message: error.message, hint: error.hint });
        } else if (error instanceof ChromeError) {
          send({ type: "error", message: error.message, hint: error.hint });
        } else {
          send({
            type: "error",
            message: error instanceof Error ? error.message : "Error inesperado durante la generación.",
            hint: "Revisá la consola del servidor para más detalle.",
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
