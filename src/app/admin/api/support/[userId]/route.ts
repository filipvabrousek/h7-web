import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/admin/guard";
import { loadSupportThread } from "@/lib/admin/support";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await requireAuthUser();
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId } = await params;
  const messages = await loadSupportThread(userId);
  return NextResponse.json({ messages });
}
