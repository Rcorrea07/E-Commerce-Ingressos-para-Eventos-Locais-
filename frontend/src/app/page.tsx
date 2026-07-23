import { Hero } from "@/components/sections/Hero";
import { EventCard } from "@/components/events/Eventcard";
import { events } from "@/mocks/events";

export default function Home() {
  return (
    <main>
      <Hero />
      <section className="bg-gray-950 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 flex items-center gap-2">
            🔥 Eventos em Destaque
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}