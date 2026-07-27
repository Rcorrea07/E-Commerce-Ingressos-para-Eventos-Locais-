import Image from "next/image";
import { Event } from "@/mocks/events";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const formattedPrice = event.price === 0 ? "Gratuito" : `R$ ${event.price.toFixed(2)}`;

  const eventDate = new Date(event.date);
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const formattedDate = `${weekdays[eventDate.getDay()]}, ${eventDate.getDate()} ${months[eventDate.getMonth()]}`;

  return (
    <div className="bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-300 border border-gray-700 flex flex-col h-full overflow-hidden">
      <div className="relative h-48 w-full bg-gray-700 shrink-0">
        {event.image ? (
          <Image src={event.image} alt={event.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-purple-700 to-purple-900 flex items-center justify-center text-4xl">
            🎉
          </div>
        )}
        <span className="absolute top-3 left-3 bg-purple-600/90 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
          {event.category}
        </span>
        <span className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
          {formattedDate} • {event.time}
        </span>
      </div>

      <div className="p-4 flex flex-col grow">
        <h3 className="font-bold text-lg text-white line-clamp-1">{event.name}</h3>
        <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {event.location}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-purple-400">{formattedPrice}</span>
          <button className="text-sm font-medium text-purple-400 hover:text-purple-300 hover:underline transition">
            Ver evento →
          </button>
        </div>
      </div>
    </div>
  );
}