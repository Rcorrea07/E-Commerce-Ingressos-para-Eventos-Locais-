"use client";

import { useSearchParams } from "next/navigation";
import { events } from "@/mocks/events";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";

function DetalhesContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id") || "1";

  const event = events.find((item) => String(item.id) === String(eventId));

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Error 404: Evento não encontrado!</h1>
        <Link href="/" className="text-purple-400 hover:underline">
          ← Voltar para os eventos
        </Link>
      </div>
    );
  }

  const formattedPrice =
    event.price === 0 ? "Gratuito" : `R$ ${event.price.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-gray-900 rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
        
        <div className="relative h-64 w-full bg-gray-800">
          {event.image ? (
            <Image
              src={event.image}
              alt={event.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-purple-700 to-purple-900 flex items-center justify-center text-6xl">
              🎉
            </div>
          )}
        </div>

        <div className="p-6">
          <Link
            href="/"
            className="text-sm text-purple-400 hover:underline mb-4 inline-block font-medium"
          >
            ← Voltar
          </Link>

          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              {event.category}
            </span>
            {event.organization && (
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                {event.organization}
              </span>
            )}
          </div>
          
          <h1 className="text-3xl font-bold mb-2">{event.name}</h1>

          {event.description && (
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {event.description}
            </p>
          )}

          <p className="text-gray-400 mb-6 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {event.location}
          </p>

          <div className="bg-gray-800/60 p-5 rounded-xl mb-6 flex flex-col gap-3 border border-gray-700/50">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Data</span>
              <span className="text-white font-medium">
                {event.date}
              </span>
            </div>

            <div className="border-t border-gray-700/80 pt-3 flex justify-between items-center text-sm">
              <span className="text-gray-400">Horário</span>
              <span className="text-white font-medium">
                {event.time}
              </span>
            </div>

            <div className="border-t border-gray-700/80 pt-3 flex justify-between items-center">
              <span className="text-gray-400">Preço</span>
              <span className="text-xl font-bold text-purple-400">
                {formattedPrice}
              </span>
            </div>
          </div>

          <Link
            href={`/checkout?id=${event.id}`}
            className="block w-full text-center bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition cursor-pointer active:scale-95 shadow-lg shadow-purple-900/30"
          >
            Continuar para o checkout
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function Detalhes() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <DetalhesContent />
    </Suspense>
  );
}
