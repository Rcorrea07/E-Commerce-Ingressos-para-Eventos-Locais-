import { EventEditor } from "@/components/organizer/EventEditor";
export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <EventEditor eventId={id} />; }
