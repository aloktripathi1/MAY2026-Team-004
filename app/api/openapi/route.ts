import { readFile } from "node:fs/promises";
import path from "node:path";

/** Serves docs/openapi.yaml for Swagger UI and external editors. */
export async function GET() {
  const filePath = path.join(process.cwd(), "docs", "openapi.yaml");
  const yaml = await readFile(filePath, "utf8");

  return new Response(yaml, {
    headers: {
      "Content-Type": "application/yaml; charset=utf-8",
      "Cache-Control": "no-store",
      // Spec fetch from editor.swagger.io (when mixed content is not blocking)
      "Access-Control-Allow-Origin": "*",
    },
  });
}
