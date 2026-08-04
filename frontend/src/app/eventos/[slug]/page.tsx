import type { Metadata } from "next";
import { EventDetails } from "@/components/events/EventDetails";

export const metadata: Metadata = { title: "Detalhes do evento" };

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EventDetails slug={slug} />;
}
