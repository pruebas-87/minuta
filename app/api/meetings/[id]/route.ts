import { deleteMeeting, readMeeting } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const meeting = await readMeeting(id);
  if (!meeting) {
    return Response.json({ error: "Acta no encontrada." }, { status: 404 });
  }
  return Response.json({ meeting }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const meeting = await readMeeting(id);
  if (!meeting) {
    return Response.json({ error: "Acta no encontrada." }, { status: 404 });
  }
  await deleteMeeting(id);
  return Response.json({ ok: true });
}
