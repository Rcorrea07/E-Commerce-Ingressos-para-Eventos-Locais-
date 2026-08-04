import { TicketDetails } from "@/components/tickets/TicketDetails";
export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <TicketDetails ticketId={id} />; }
