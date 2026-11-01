import { extractFromFile } from "@/lib/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "No se pudo leer el archivo." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Falta el archivo." }, { status: 400 });
  }

  try {
    const result = await extractFromFile(file);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo leer el archivo." },
      { status: 422 },
    );
  }
}
