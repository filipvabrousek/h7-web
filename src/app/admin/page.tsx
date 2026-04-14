import { requireAuthUser, isAdminEmail } from "@/lib/admin/guard";
import { loadAdminStats } from "@/lib/admin/stats";
import { StatsDashboard } from "@/components/admin/StatsDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminStatsPage() {
  const user = await requireAuthUser();
  if (!isAdminEmail(user.email)) return null; // layout shows denied panel

  const stats = await loadAdminStats();
  return <StatsDashboard stats={stats} />;
}
