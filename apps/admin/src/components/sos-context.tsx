"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { incidentes as inicial, type Incidente } from "@/mock/data";

type Ctx = { incidentes: Incidente[]; atender: (id: string) => void; pendientes: number };
const SosCtx = createContext<Ctx | null>(null);

// Comparte el estado de SOS entre la pantalla y la insignia del menú (mock en memoria).
export function SosProvider({ children }: { children: ReactNode }) {
  const [incidentes, setIncidentes] = useState(inicial);
  const atender = (id: string) =>
    setIncidentes((l) => l.map((i) => (i.id === id ? { ...i, atendida: true } : i)));
  const pendientes = incidentes.filter((i) => !i.atendida).length;
  return <SosCtx value={{ incidentes, atender, pendientes }}>{children}</SosCtx>;
}

export function useSos() {
  const c = useContext(SosCtx);
  if (!c) throw new Error("useSos fuera de SosProvider");
  return c;
}
