"use client";

import { useState } from "react";
import { useSos } from "@/components/sos-context";

export function SosView() {
  const { incidentes, atender, pendientes } = useSos();
  const [selId, setSelId] = useState(incidentes[0].id);
  const sel = incidentes.find((i) => i.id === selId) ?? incidentes[0];

  return (
    <>
      <h1 className="text-2xl font-semibold">SOS e incidencias</h1>
      <p className="mt-1 text-text-muted" aria-live="polite">
        {pendientes === 0 ? "Sin alertas pendientes" : `${pendientes} sin atender`}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        <section aria-label="Alertas">
          <ul className="flex flex-col gap-2">
            {incidentes.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  aria-pressed={i.id === sel.id}
                  onClick={() => setSelId(i.id)}
                  className={`w-full rounded-card border p-4 text-left transition-colors ${
                    i.atendida
                      ? `bg-surface hover:bg-surface-2 ${i.id === sel.id ? "border-text-muted" : "border-border"}`
                      : "border-danger bg-danger-strong/15 hover:bg-danger-strong/25"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{i.pasajero}</span>
                    <span className={`chip ${i.atendida ? "bg-surface-2 text-text-muted" : "bg-danger-strong text-white"}`}>
                      {i.atendida ? "Atendida" : "Sin atender"}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-text-muted">{i.hora}</span>
                  <span className="mt-1 block text-sm">{i.ubicacion}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="det" className={`card flex flex-col gap-6 ${sel.atendida ? "" : "border-danger"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="det" className="text-xl font-semibold">Alerta SOS · viaje {sel.viaje}</h2>
              <p className="text-sm text-text-muted">{sel.hora}</p>
            </div>
            <span className={`chip ${sel.atendida ? "bg-success-strong text-white" : "bg-danger-strong text-white"}`}>
              {sel.atendida ? "Atendida" : "Sin atender"}
            </span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-text-muted">Pasajero</dt><dd>{sel.pasajero}</dd>
            <dt className="text-text-muted">Conductor</dt><dd>{sel.conductor}</dd>
            <dt className="text-text-muted">Viaje</dt><dd>{sel.viaje}</dd>
            <dt className="text-text-muted">Ubicación</dt><dd>{sel.ubicacion}</dd>
            <dt className="text-text-muted">Hora</dt><dd>{sel.hora}</dd>
          </dl>
          {!sel.atendida && (
            <div className="border-t border-border pt-5">
              <button type="button" className="btn-primary" onClick={() => atender(sel.id)}>Marcar atendida</button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
