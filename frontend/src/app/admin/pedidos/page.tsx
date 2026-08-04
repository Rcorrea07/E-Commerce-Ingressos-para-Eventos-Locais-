import { AdminRecords } from "@/components/admin/AdminRecords";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
export default function AdminOrdersPage() { return <DashboardShell area="admin"><AdminRecords kind="orders" /></DashboardShell>; }
