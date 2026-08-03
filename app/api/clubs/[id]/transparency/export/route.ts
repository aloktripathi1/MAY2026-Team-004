import { getMockSession } from "@/backend/auth/mock-session";
import { requireClubAdminAccess } from "@/backend/domain/workflow-rules";
import { prisma } from "@/backend/db/prisma";
import { jsonError } from "@/backend/api/http";
import { toCsv } from "@/lib/csv";

/** GET /api/clubs/[id]/transparency/export — CSV download of the club's transparency log (#104). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getMockSession();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", "Authentication required.", { status: 401 });
  }

  try {
    requireClubAdminAccess(session.user.memberships, params.id);
  } catch {
    return jsonError("FORBIDDEN", "Not authorized for this club.", { status: 403 });
  }

  const club = await prisma.club.findUnique({ where: { id: params.id } });
  if (!club) {
    return jsonError("CLUB_NOT_FOUND", "Club not found.", { status: 404 });
  }

  const rows = await prisma.transparencyLogEntry.findMany({
    where: { clubId: params.id },
    orderBy: { date: "desc" },
  });

  const csv = toCsv(
    ["Date", "Event", "Outcome", "Attendance", "Spend"],
    rows.map((r) => [r.date, r.eventName, r.outcome, r.attendance, r.spend]),
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${club.slug}-transparency-log.csv"`,
    },
  });
}
