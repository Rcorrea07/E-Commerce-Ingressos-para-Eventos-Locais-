import { AdminEventReview } from "@/components/admin/AdminEventReview";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function AdminEventReviewPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <DashboardShell area="admin"><AdminEventReview eventId={id} /></DashboardShell>; }
