"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { events } from "@/mocks/events";
import Link from "next/link";
import React from "react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const [quantity, setQuantity] = useState(1);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(15);
  const [seconds, setSeconds] = useState(0);

  const eventId = searchParams.get("id") || "1";
  const event = events.find((item) => String(item.id) === String(eventId));

  const handleCancelReservation = useCallback(() => {
    setDeadline(null);
    setMinutes(15);
    setSeconds(0);
  }, []);

  const getTime = useCallback((targetDeadline: string) => {
    const time = Date.parse(targetDeadline) - Date.now();

    if (time <= 0) {
      handleCancelReservation();
    } else {
      setMinutes(Math.floor((time / 1000 / 60) % 60));
      setSeconds(Math.floor((time / 1000) % 60));
    }
  }, [handleCancelReservation]);

  useEffect(() => {
    if (deadline) {
      const interval = setInterval(() => getTime(deadline), 1000);
      return () => clearInterval(interval);
    }
  }, [deadline, getTime]);

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Evento não encontrado!</h1>
        <Link href="/" className="text-purple-400 hover:underline">
          ← Voltar para os eventos
        </Link>
      </div>
    );
  }

  const handleIncrease = () => setQuantity((prev) => prev + 1);
  const handleDecrease = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleStartCheckout = () => {
    const newDeadline = new Date(Date.now() + 15 * 60 * 1000).toString();
    setDeadline(newDeadline);
  };

  const handleConfirmReservation = () => {
  };

  const totalPrice = event.price * quantity;
  const formattedTotalPrice = event.price === 0 ? "Gratuito" : `R$ ${totalPrice.toFixed(2)}`;

  const totalSecondsLeft = minutes * 60 + seconds;
  const progressPercentage = (totalSecondsLeft / (15 * 60)) * 100;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
        <Link href="/" className="text-sm text-purple-400 hover:underline mb-4 inline-block">
          ← Voltar
        </Link>

        <h1 className="text-3xl font-bold mb-2">Finalizar Compra</h1>
        <p className="text-gray-400 mb-6">Você está adquirindo ingresso para:</p>

        {deadline && (
          <div className="bg-purple-950/40 border border-purple-800/50 p-4 rounded-xl mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-purple-200 font-medium">
                Reserva temporária criada! Tempo restante:
              </span>

              <span className="font-mono text-lg font-bold text-purple-400">
                {minutes < 10 ? "0" + minutes : minutes}:
                {seconds < 10 ? "0" + seconds : seconds}
              </span>
            </div>

            <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-gray-800 p-4 rounded-xl mb-6">
          <h2 className="text-xl font-semibold text-purple-300">{event.name}</h2>
          <p className="text-sm text-gray-400 mt-1 mb-4"> {event.location}</p>
          
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-700 pt-4 mt-2">
            <div>
              <p className="text-xs text-gray-400">Total a pagar:</p>
              <p className="text-xl font-bold text-white">
                {formattedTotalPrice}
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-center gap-3 bg-gray-900 px-3 py-2 rounded-lg border border-gray-700">
              <button
                onClick={handleDecrease}
                className="w-7 h-7 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-lg font-bold transition cursor-pointer transition-transform duration-100 active:scale-90"
                aria-label="Diminuir quantidade"
              >
                -
              </button>
              
              <span className="font-semibold text-base min-w-[20px] text-center">
                {quantity}
              </span>

              <button
                onClick={handleIncrease}
                className="w-7 h-7 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-lg font-bold transition cursor-pointer transition-transform duration-100 active:scale-90"
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {!deadline ? (
          <button
            onClick={handleStartCheckout}
            className="w-full bg-purple-600 hover:bg-purple-500 font-bold py-3 rounded-xl transition cursor-pointer transition-transform duration-100 active:scale-90"
          >
            Confirmar Pedido ({quantity} {quantity === 1 ? "ingresso" : "ingressos"})
          </button>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={handleCancelReservation}
              className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-bold py-3 rounded-xl transition cursor-pointer transition-transform duration-100 active:scale-90"
            >
              Cancelar Reserva
            </button>
            <button
              onClick={handleConfirmReservation}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition cursor-pointer transition-transform duration-100 active:scale-90"
            >
              Confirmar Reserva
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Checkout() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <CheckoutContent />
    </Suspense>
  );
}
