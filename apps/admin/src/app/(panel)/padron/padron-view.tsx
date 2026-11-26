"use client";

import { useRef, useState } from "react";
import { usePanel } from "@/components/panel-context";
import { miles } from "@/lib/format";
import type { EstadoConductor } from "@/mock/data";

export function PadronView() {
  const { conductores: lista, alternar } = usePanel();
  const listaRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<"todos" | EstadoConductor>("todos");

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const filtrados = lista.filter(
    (c) =>
      (estado === "todos" || c.estado === estado) &&
      norm(`${c.nombre} ${c.nroInterno} ${c.placa} ${c.telefono}`).includes(norm(q.trim())),
  );


  return (
    <>
      <h1 className="text-2xl font-semibold">Padrón de conductores</h1>
      <p className="mt-1 text-text-muted">{lista.length} conductores registrados</p>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-6 flex flex-wrap gap-4">
        <div className="min-w-64 flex-1">
          <label htmlFor="q" className="label">Buscar</label>
          <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, N.º interno, placa o teléfono" className="field" />
        </div>
        <div className="w-full sm:w-52">
          <label htmlFor="estado" className="label">Estado</label>
          <select id="estado" value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} className="field">
            <option value="todos">Todos</option>
            <option value="aprobado">Aprobado</option>
            <option value="suspendido">Suspendido</option>
          </select>
        </div>
      </form>

      <div ref={listaRef} tabIndex={-1} role="region" aria-label="Resultados" className="card mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[780px] border-collapse">
          <caption className="sr-only">Conductores y vehículos del sindicato</caption>
          <thead>
            <tr>
              <th scope="col" className="th">Conductor</th>
              <th scope="col" className="th">N.º</th>
              <th scope="col" className="th">Vehículo</th>
              <th scope="col" className="th">Placa</th>
              <th scope="col" className="th text-right">Viajes</th>
              <th scope="col" className="th">Estado</th>
              <th scope="col" className="th"><span className="sr-only">Acción</span></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => (
              <tr key={c.id}>
                <th scope="row" className="td text-left font-medium">
                  {c.nombre}
                  <span className="block text-xs font-normal text-text-muted">{c.telefono}</span>
                </th>
                <td className="td tabular-nums">{c.nroInterno}</td>
                <td className="td">{c.vehiculo}</td>
                <td className="td whitespace-nowrap">{c.placa}</td>
                <td className="td text-right tabular-nums">{miles(c.viajes)}</td>
                <td className="td">
                  <span className={`chip ${c.estado === "aprobado" ? "bg-success-strong text-white" : "bg-danger-strong text-white"}`}>
                    {c.estado === "aprobado" ? "Aprobado" : "Suspendido"}
                  </span>
                </td>
                <td className="td text-right">
                  <button type="button" onClick={() => { alternar(c.id); if (estado !== "todos") listaRef.current?.focus(); }} className="btn-secondary" aria-label={`${c.estado === "aprobado" ? "Suspender" : "Reactivar"} a ${c.nombre}`}>
                    {c.estado === "aprobado" ? "Suspender" : "Reactivar"}
                  </button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={7} className="td py-10 text-center text-text-muted">Ningún conductor coincide con la búsqueda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
