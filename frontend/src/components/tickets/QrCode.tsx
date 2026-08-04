"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrCode({ payload, size = 220 }: { payload: string; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    void QRCode.toCanvas(canvas.current, payload, { width: size, margin: 2, color: { dark: "#140f1d", light: "#ffffff" }, errorCorrectionLevel: "M" });
  }, [payload, size]);
  return <canvas ref={canvas} width={size} height={size} className="max-w-full rounded-xl bg-white p-2" aria-label="QR Code do ingresso" />;
}
