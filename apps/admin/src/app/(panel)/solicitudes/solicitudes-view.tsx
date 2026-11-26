"use client";

import { useRef, useState } from "react";
import { usePanel, type Resolucion } from "@/components/panel-context";
import { DOC_KINDS, solicitudes as inicial } from "@/mock/data";

export function SolicitudesView() {
  const { resueltas, resolver: resolverCtx } = usePanel();
  const detRef = useRef<HTMLHeadingElement>(null);
  const pendientes = inicial.filter((s) => !resueltas[s.id]);
  const [selId, setSelId] = useState(inicial[0].id);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState(false);

  const sel = inicial.find((s) => s.id === selId) ?? null;
  const res = sel ? resueltas[sel.id] : undefined;

  function elegir(id: string) {
    setSelId(id);
    setRechazando(false);
    setMotivo("");
    setErrorMotivo(false);
  }

  function resolver(r: Resolucion) {
    if (!sel) return;
    resolverCtx(sel.id, r);
    setRechazando(false);
    setMotivo("");
    const siguiente = inicial.find((s) => s.id !== sel.id && !resueltas[s.id]);
    if (siguiente) setSelId(siguiente.id);
    detRef.current?.focus(); // el botón pulsado desaparece
  }

  function confirmarRechazo(e: React.FormEvent) {
    e.preventDefault();
    if (motivo.trim().length < 10) return setErrorMotivo(true);
    resolver({ tipo: "rechazada", motivo: motivo.trim() });
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Solicitudes de conductores</h1>
      <p className="mt-1 text-text-muted" aria-live="polite">
        {pendientes.length} pendientes de revisión
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <section aria-label="Lista de solicitudes">
          <ul className="flex flex-col gap-2">
            {inicial.map((s) => {
              const r = resueltas[s.id];
              const active = s.id === selId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => elegir(s.id)}
                    aria-current={active ? "true" : undefined}
                    className={`w-full rounded-card border p-4 text-left transition-colors ${
                      active ? "border-primary bg-surface-2" : "border-border bg-surface hover:bg-surface-2"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{s.nombre}</span>
                      {r && (
                        <span className={`chip ${r.tipo === "aprobada" ? "bg-success-strong text-white" : "bg-danger-strong text-white"}`}>
                          {r.tipo === "aprobada" ? "Aprobada" : "Rechazada"}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-text-muted">
                      Interno {s.nroInterno} · {s.vehiculo.marca} {s.vehiculo.modelo}
                    </span>
                    <span className="mt-1 block text-xs text-text-muted">Enviada {s.enviada}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {sel && (
          <section aria-labelledby="detalle" className="card flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="detalle" ref={detRef} tabIndex={-1} className="text-xl font-semibold">{sel.nombre}</h2>
                <p className="text-sm text-text-muted">Solicitud enviada {sel.enviada}</p>
              </div>
              {res && (
                <span className={`chip ${res.tipo === "aprobada" ? "bg-success-strong text-white" : "bg-danger-strong text-white"}`}>
                  {res.tipo === "aprobada" ? "Aprobada" : "Rechazada"}
                </span>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section aria-labelledby="h-datos">
              <h3 id="h-datos" className="mb-3 text-base font-semibold">Datos personales</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                <dt className="text-text-muted">CI</dt><dd>{sel.ci}</dd>
                <dt className="text-text-muted">Teléfono</dt><dd>{sel.telefono}</dd>
                <dt className="text-text-muted">N.º interno</dt><dd className="font-semibold tabular-nums">{sel.nroInterno}</dd>
              </dl>
              </section>
              <section aria-labelledby="h-veh">
              <h3 id="h-veh" className="mb-3 text-base font-semibold">Vehículo</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                <dt className="text-text-muted">Marca y modelo</dt><dd>{sel.vehiculo.marca} {sel.vehiculo.modelo}</dd>
                <dt className="text-text-muted">Año</dt><dd>{sel.vehiculo.anio}</dd>
                <dt className="text-text-muted">Color</dt><dd>{sel.vehiculo.color}</dd>
                <dt className="text-text-muted">Placa</dt><dd className="font-semibold">{sel.vehiculo.placa}</dd>
              </dl>
              </section>
            </div>

            <div>
              <h3 className="mb-3 text-base font-semibold">Documentos</h3>
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {DOC_KINDS.map((d) => (
                  <li key={d}>
                    <button
                      type="button"
                      className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-input border border-dashed border-border bg-surface-2 text-sm text-text-muted hover:border-text-muted hover:text-text"
                      aria-label={`Ver ${d} (vista previa de ejemplo)`}
                    >
                      <span className="font-medium text-text">{d}</span>
                      <span className="text-xs">Vista previa</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {res?.tipo === "rechazada" && (
              <p className="msg-error rounded-input border border-danger p-4 text-sm">
                <strong>Motivo del rechazo:</strong> {res.motivo}
              </p>
            )}

            {!res && !rechazando && (
              <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                <button type="button" className="btn-primary" onClick={() => resolver({ tipo: "aprobada" })}>
                  Aprobar
                </button>
                <button type="button" className="btn-danger" onClick={() => setRechazando(true)}>
                  Rechazar
                </button>
              </div>
            )}

            {!res && rechazando && (
              <form onSubmit={confirmarRechazo} noValidate className="border-t border-border pt-5">
                <label htmlFor="motivo" className="label">Motivo del rechazo</label>
                <textarea
                  id="motivo"
                  rows={3}
                  value={motivo}
                  onChange={(e) => { setMotivo(e.target.value); setErrorMotivo(false); }}
                  aria-invalid={errorMotivo}
                  aria-describedby="motivo-ayuda"
                  autoFocus
                  className="field py-3"
                  placeholder="Ej.: la licencia está vencida"
                />
                <p id="motivo-ayuda" role={errorMotivo ? "alert" : undefined} className={`mt-2 text-sm ${errorMotivo ? "msg-error" : "text-text-muted"}`}>
                  {errorMotivo ? "Escribe un motivo de al menos 10 caracteres." : "El conductor verá este motivo."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="submit" className="btn-danger">Confirmar rechazo</button>
                  <button type="button" className="btn-secondary" onClick={() => { setRechazando(false); setErrorMotivo(false); detRef.current?.focus(); }}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </section>
        )}
      </div>
    </>
  );
}
