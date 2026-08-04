'use client';

import { useState } from 'react';
import { Ticket } from '@/mocks/tickets';

interface TicketSelectorProps {
  tickets: Ticket[];
  eventName: string;
}

export function TicketSelector({ tickets, eventName }: TicketSelectorProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    tickets.reduce((acc, ticket) => ({ ...acc, [ticket.id]: 0 }), {})
  );

  const updateQuantity = (ticketId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[ticketId] || 0;
      const newQuantity = Math.max(0, current + delta);
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket && newQuantity > ticket.available) {
        return prev;
      }
      return { ...prev, [ticketId]: newQuantity };
    });
  };

  const total = tickets.reduce((sum, ticket) => {
    const qty = quantities[ticket.id] || 0;
    return sum + ticket.price * qty;
  }, 0);

  const hasItems = total > 0;

  return (
    <div className="space-y-4">
      {tickets.map((ticket) => {
        const qty = quantities[ticket.id] || 0;
        const isAvailable = ticket.available > 0;

        return (
          <div key={ticket.id} className="border-b border-gray-700 pb-4 last:border-0">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-white">{ticket.type}</h3>
                <p className="text-sm text-gray-400">
                  R$ {ticket.price.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  {isAvailable ? `${ticket.available} disponíveis` : 'Esgotado'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(ticket.id, -1)}
                  disabled={qty === 0 || !isAvailable}
                  className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center"
                >
                  -
                </button>
                <span className="text-white w-8 text-center font-semibold">{qty}</span>
                <button
                  onClick={() => updateQuantity(ticket.id, 1)}
                  disabled={!isAvailable || qty >= ticket.available}
                  className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="pt-4 border-t border-gray-700">
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-purple-400">R$ {total.toFixed(2)}</span>
        </div>
        <button
          disabled={!hasItems}
          className="w-full mt-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-full transition"
        >
          Continuar para o checkout →
        </button>
      </div>
    </div>
  );
}