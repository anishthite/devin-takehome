import { getAdjustments } from "@/lib/adjustments/runtime";

export const dynamic = "force-dynamic";

/** Unauthenticated liveness + database check for load balancers; reveals no data. */
export async function GET() {
  try {
    const { sql, database } = await getAdjustments();
    await sql.ping();
    return Response.json({ status: "ok", database });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
