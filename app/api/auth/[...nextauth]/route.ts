export async function GET() {
  return Response.json({ mode: "mock", message: "M2 frontend build: real auth is intentionally disabled." });
}

export async function POST() {
  return Response.json({ mode: "mock", message: "M2 frontend build: real auth is intentionally disabled." });
}
