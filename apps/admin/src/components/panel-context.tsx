"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { conductores as conductoresInicial, solicitudes, type Conductor } from "@/mock/data";

export type Resolucion = { tipo: "aprobada" } | { tipo: "rechazada"; motivo: string };

type Ctx = {
  resueltas: Record<string, Resolucion>;
  resolver: (id: string, r: Resolucion) => void;
  conductores: Conductor[];
  alternar: (id: string) => void;
};
const PanelCtx = createContext<Ctx | null>(null);

// Estado mock de solicitudes y padrón compartido entre pantallas (en memoria, sobrevive a la navegación).
export function PanelProvider({ children }: { children: ReactNode }) {
  const [resueltas, setResueltas] = useState<Record<string, Resolucion>>({});
  const [conductores, setConductores] = useState(conductoresInicial);

  const resolver = (id: string, r: Resolucion) => {
    setResueltas((p) => ({ ...p, [id]: r }));
    const s = solicitudes.find((x) => x.id === id);
    if (r.tipo === "aprobada" && s) {
      const v = s.vehiculo;
      setConductores((l) => [
        ...l,
        {
          id: `c-${s.id}`, nombre: s.nombre, nroInterno: s.nroInterno, telefono: s.telefono,
          vehiculo: `${v.marca} ${v.modelo} ${v.anio} · ${v.color}`, placa: v.placa,
          estado: "aprobado", viajes: 0, calificacion: 0,
        },
      ]);
    }
  };
  const alternar = (id: string) =>
    setConductores((l) => l.map((c) => (c.id === id ? { ...c, estado: c.estado === "aprobado" ? "suspendido" : "aprobado" } : c)));

  return <PanelCtx value={{ resueltas, resolver, conductores, alternar }}>{children}</PanelCtx>;
}

export function usePanel() {
  const c = useContext(PanelCtx);
  if (!c) throw new Error("usePanel fuera de PanelProvider");
  return c;
}
