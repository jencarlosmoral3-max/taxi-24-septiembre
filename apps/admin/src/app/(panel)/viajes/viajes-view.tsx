"use client";

import { useState } from "react";
import { conductores, taxisEnVivo, viajes, type EstadoViaje } from "@/mock/data";

const bs = (n: number) => `Bs ${n.toLocaleString("es-BO", { minimumFractionDigits: 2 })}`;

const chipEstado: Record<EstadoViaje, string> = {
  "en curso": "bg-primary text-on-primary",
  completado: "bg-success-strong text-white",
  cancelado: "bg-surface-2 text-text-muted border border-border",
};

function MapaEnVivo() {
  return (
    <div
      role="img"
      aria-label={`Mapa de ejemplo con ${taxisEnVivo.length} taxis conectados`}
      className="relative aspect-[16/10] min-h-72 overflow-hidden rounded-card border border-border bg-surface"
    >
      {/* Calles y anillos estilizados (maqueta; la fase 2 usa el mapa real). */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {[44, 30, 17].map((r) => (
          <ellipse key={r} cx="50" cy="52" rx={r * 1.3} ry={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        ))}
        {[[50, 0, 50, 100], [0, 52, 100, 52], [10, 10, 90, 94], [90, 8, 12, 92]].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-surface-2)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {taxisEnVivo.map((t) => (
        <span
          key={t.id}
          className={`absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-bg text-[10px] font-semibold ${
            t.ocupado ? "bg-primary text-on-primary" : "bg-success-strong text-white"
          }`}
          style={{ left: `${t.x}%`, top: `${t.y}%` }}
        >
          {t.nroInterno}
        </span>
      ))}
      <ul className="absolute bottom-3 left-3 flex gap-4 rounded-full bg-bg/90 px-4 py-2 text-xs">
        <li className="flex items-center gap-2"><span className="size-3 rounded-full bg-primary" aria-hidden="true" />Con viaje</li>
        <li className="flex items-center gap-2"><span className="size-3 rounded-full bg-success-strong" aria-hidden="true" />Libre</li>
      </ul>
    </div>
  );
}

function EnVivo() {
  const activos = viajes.filter((v) => v.estado === "en curso");
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <MapaEnVivo />
      <section aria-labelledby="activos">
        <h2 id="activos" className="mb-3 text-base font-semibold">Viajes activos ({activos.length})</h2>
        <ul className="flex flex-col gap-3">
          {activos.map((v) => (
            <li key={v.id} className="card p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{v.pasajero}</span>
                <span className="font-semibold tabular-nums">{bs(v.tarifa)}</span>
              </div>
              <p className="mt-1 text-text-muted">{v.origen} → {v.destino}</p>
              <p className="mt-1 text-xs text-text-muted">Conductor: {v.conductor} · desde {v.hora}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Historial() {
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState("");
  const [conductor, setConductor] = useState("");

  const filtrados = viajes.filter(
    (v) => (!fecha || v.fecha === fecha) && (!estado || v.estado === estado) && (!conductor || v.conductor === conductor),
  );

  return (
    <>
      <form role="search" aria-label="Filtros del historial" onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-end gap-4">
        <div className="w-full sm:w-48">
          <label htmlFor="fecha" className="label">Fecha</label>
          <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="field" />
        </div>
        <div className="w-full sm:w-48">
          <label htmlFor="est" className="label">Estado</label>
          <select id="est" value={estado} onChange={(e) => setEstado(e.target.value)} className="field">
            <option value="">Todos</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
            <option value="en curso">En curso</option>
          </select>
        </div>
        <div className="min-w-56 flex-1">
          <label htmlFor="cond" className="label">Conductor</label>
          <select id="cond" value={conductor} onChange={(e) => setConductor(e.target.value)} className="field">
            <option value="">Todos</option>
            {conductores.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
        <button type="button" className="btn-secondary" onClick={() => { setFecha(""); setEstado(""); setConductor(""); }}>
          Limpiar filtros
        </button>
      </form>

      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[820px] border-collapse">
          <caption className="sr-only">Historial de viajes</caption>
          <thead>
            <tr>
              <th scope="col" className="th">Fecha</th>
              <th scope="col" className="th">Pasajero</th>
              <th scope="col" className="th">Conductor</th>
              <th scope="col" className="th">Recorrido</th>
              <th scope="col" className="th text-right">Tarifa</th>
              <th scope="col" className="th">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((v) => (
              <tr key={v.id}>
                <th scope="row" className="td text-left font-normal tabular-nums">
                  {new Date(`${v.fecha}T12:00`).toLocaleDateString("es-BO", { day: "2-digit", month: "short" })}, {v.hora}
                </th>
                <td className="td">{v.pasajero}</td>
                <td className="td">{v.conductor}</td>
                <td className="td text-text-muted">{v.origen} → {v.destino}</td>
                <td className="td text-right font-semibold tabular-nums">{bs(v.tarifa)}</td>
                <td className="td"><span className={`chip capitalize ${chipEstado[v.estado]}`}>{v.estado}</span></td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={6} className="td py-10 text-center text-text-muted">No hay viajes con esos filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ViajesView() {
  const [tab, setTab] = useState<"vivo" | "historial">("vivo");
  const tabs = [
    { id: "vivo", label: "En vivo" },
    { id: "historial", label: "Historial" },
  ] as const;

  return (
    <>
      <h1 className="text-2xl font-semibold">Viajes</h1>
      <div role="tablist" aria-label="Vista de viajes" className="mt-6 mb-6 flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            type="button"
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const next = tab === "vivo" ? "historial" : "vivo";
                setTab(next);
                document.getElementById(`tab-${next}`)?.focus();
              }
            }}
            className={`min-h-12 border-b-2 px-5 text-sm font-medium ${
              tab === t.id ? "border-primary text-text" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "vivo" ? <EnVivo /> : <Historial />}
      </div>
    </>
  );
}
