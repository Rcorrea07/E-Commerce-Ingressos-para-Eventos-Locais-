import { AdminRecords } from "@/components/admin/AdminRecords";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
export default function AdminTicketsPage() { return <DashboardShell area="admin"><AdminRecords kind="tickets" /></DashboardShell>; }
