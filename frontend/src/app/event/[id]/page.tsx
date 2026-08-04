"use client";

import React, { useState } from "react";
import { notFound, useRouter } from "next/navigation";
import Image from "next/image";
import { events } from "@/mocks/events";
import { tickets } from "@/mocks/tickets";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default function EventPage({ params }: EventPageProps) {
  const router = useRouter();

  const { id } = React.use(params);

  const event = events.find((e) => e.id === id);

  if (!event) {
    notFound();
  }

  // Filtra os ingressos deste evento
  const eventTickets = tickets.filter((t) => t.eventId === event.id);

  // Estado para quantidades
  const [quantities, setQuantities] = useState<Record<string, number>>(
    eventTickets.reduce((acc, ticket) => ({ ...acc, [ticket.id]: 0 }), {})
  );

  // Atualiza quantidade
  const updateQuantity = (ticketId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[ticketId] || 0;
      const newQuantity = Math.max(0, current + delta);
      const ticket = eventTickets.find((t) => t.id === ticketId);
      if (ticket && newQuantity > ticket.available) {
        return prev;
      }
      return { ...prev, [ticketId]: newQuantity };
    });
  };

  // Calcula total
  const total = eventTickets.reduce((sum, ticket) => {
    const qty = quantities[ticket.id] || 0;
    return sum + ticket.price * qty;
  }, 0);

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);

  // Formatação de data
  const eventDate = new Date(event.date);
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const formattedDate = `${weekdays[eventDate.getDay()]}, ${eventDate.getDate()} ${months[eventDate.getMonth()]}`;

  return (
    <main className="min-h-screen bg-gray-950 text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 text-purple-400 hover:text-purple-300 transition flex items-center gap-2"
        >
          ← Voltar
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative h-80 w-full bg-gray-700 rounded-2xl overflow-hidden">
              {event.image ? (
                <Image
                  src={event.image}
                  alt={event.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-purple-700 to-purple-900 flex items-center justify-center text-6xl">
                  🎉
                </div>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold">{event.name}</h1>

            <div className="flex flex-wrap gap-3 text-gray-300">
              <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full">
                <span>📅</span> {formattedDate}
              </div>
              <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full">
                <span>⏰</span> {event.time}
              </div>
              <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full">
                <span>📍</span> {event.location}
              </div>
              <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full">
                <span>🏷️</span> {event.category}
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-2">Sobre o evento</h2>
              <p className="text-gray-400 leading-relaxed">
                {event.name} é um evento imperdível para quem ama {event.category.toLowerCase()}.
                Prepare-se para uma experiência única com muita energia, música e diversão.
                Venha fazer parte dessa história!
              </p>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-2">Organizador</h2>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-2xl font-bold">
                  E
                </div>
                <div>
                  <p className="font-medium text-white">Eventos Inc.</p>
                  <p className="text-sm text-gray-400">organizador@eventos.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Ingressos</h2>

              {eventTickets.length === 0 ? (
                <p className="text-gray-400">Nenhum ingresso disponível</p>
              ) : (
                <div className="space-y-4">
                  {eventTickets.map((ticket) => {
                    const qty = quantities[ticket.id] || 0;
                    const isAvailable = ticket.available > 0;

                    return (
                      <div
                        key={ticket.id}
                        className={`border-b border-gray-700 pb-4 last:border-0 ${
                          !isAvailable ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">{ticket.type}</h3>
                            <p className="text-sm text-gray-400">
                              {ticket.price === 0 ? "Gratuito" : `R$ ${ticket.price.toFixed(2)}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {isAvailable ? `${ticket.available} disponíveis` : "Esgotado"}
                            </p>
                          </div>
                          {isAvailable && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(ticket.id, -1)}
                                disabled={qty === 0}
                                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className="text-white w-8 text-center font-semibold">{qty}</span>
                              <button
                                onClick={() => updateQuantity(ticket.id, 1)}
                                disabled={qty >= ticket.available}
                                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalTickets > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-purple-400">R$ {total.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {totalTickets} ingresso(s) selecionado(s)
                  </div>
                  <button
                    onClick={() => alert("Redirecionando para o checkout...")}
                    className="w-full mt-4 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 rounded-xl transition-all hover:scale-[1.02]"
                  >
                    Continuar para o checkout →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
