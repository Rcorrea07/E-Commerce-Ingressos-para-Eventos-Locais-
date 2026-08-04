import { AdminRecords } from "@/components/admin/AdminRecords";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
export default function AdminUsersPage() { return <DashboardShell area="admin"><AdminRecords kind="users" /></DashboardShell>; }
