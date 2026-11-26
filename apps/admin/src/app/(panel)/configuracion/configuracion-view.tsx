"use client";

import { useState } from "react";
import { configuracionInicial } from "@/mock/data";

type Campo = {
  name: "tarifaMinima" | "radioKm" | "expiracionOfertaS" | "expiracionPedidoMin";
  label: string;
  unidad: string;
  ayuda: string;
  min: number;
  max: number;
  step: number;
};

const campos: Campo[] = [
  { name: "tarifaMinima", label: "Tarifa mínima", unidad: "Bs", ayuda: "Ningún pedido puede ofrecer menos que esto.", min: 5, max: 100, step: 0.5 },
  { name: "radioKm", label: "Radio de búsqueda", unidad: "km", ayuda: "Distancia máxima entre el pasajero y los conductores que reciben el pedido.", min: 1, max: 15, step: 0.5 },
  { name: "expiracionOfertaS", label: "Expiración de ofertas", unidad: "segundos", ayuda: "Tiempo que una oferta del conductor sigue vigente.", min: 15, max: 180, step: 1 },
  { name: "expiracionPedidoMin", label: "Expiración de pedidos", unidad: "minutos", ayuda: "Tiempo que un pedido espera ofertas antes de cancelarse.", min: 1, max: 30, step: 1 },
];

export function ConfiguracionView() {
  const [vals, setVals] = useState<Record<Campo["name"], string>>(
    Object.fromEntries(Object.entries(configuracionInicial).map(([k, v]) => [k, String(v)])) as Record<Campo["name"], string>,
  );
  const [errores, setErrores] = useState<Partial<Record<Campo["name"], string>>>({});
  const [guardado, setGuardado] = useState(false);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const nuevos: typeof errores = {};
    for (const c of campos) {
      const raw = vals[c.name].trim().replace(",", ".");
      const n = Number(raw);
      if (raw === "" || Number.isNaN(n)) nuevos[c.name] = "Ingresa un número.";
      else if (n < c.min || n > c.max) nuevos[c.name] = `Debe estar entre ${c.min} y ${c.max} ${c.unidad}.`;
    }
    setErrores(nuevos);
    setGuardado(Object.keys(nuevos).length === 0); // mock: la fase 2 persiste en Supabase
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Configuración</h1>
      <p className="mt-1 text-text-muted">Parámetros que aplican a todos los pedidos de Vyro.</p>

      <form onSubmit={guardar} noValidate className="card mt-6 max-w-2xl">
        <div className="flex flex-col gap-6">
          {campos.map((c) => (
            <div key={c.name}>
              <label htmlFor={c.name} className="label">{c.label} ({c.unidad})</label>
              <input
                id={c.name}
                name={c.name}
                inputMode="decimal"
                value={vals[c.name]}
                onChange={(e) => { setVals((v) => ({ ...v, [c.name]: e.target.value })); setGuardado(false); }}
                aria-invalid={!!errores[c.name]}
                aria-describedby={`${c.name}-msg`}
                className={`field tabular-nums ${errores[c.name] ? "border-danger" : ""}`}
              />
              <p id={`${c.name}-msg`} className={`mt-2 text-sm ${errores[c.name] ? "msg-error" : "text-text-muted"}`}>
                {errores[c.name] ?? c.ayuda}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button type="submit" className="btn-primary">Guardar cambios</button>
          <p role="status" className="text-sm font-medium text-success">
            {guardado ? "Cambios guardados." : ""}
          </p>
        </div>
      </form>
    </>
  );
}
