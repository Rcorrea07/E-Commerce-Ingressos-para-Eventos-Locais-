import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
export default function AdminDashboardPage() { return <DashboardShell area="admin"><AnalyticsDashboard scope="admin" /></DashboardShell>; }
