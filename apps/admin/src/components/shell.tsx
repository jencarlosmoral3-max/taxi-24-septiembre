"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { asset } from "@/lib/format";
import { Icon, type IconName } from "./icons";
import { useSos } from "./sos-context";
import { adminActual } from "@/mock/data";

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/solicitudes", label: "Solicitudes", icon: "solicitudes" },
  { href: "/padron", label: "Padrón", icon: "padron" },
  { href: "/viajes", label: "Viajes", icon: "viajes" },
  { href: "/sos", label: "SOS", icon: "sos" },
  { href: "/configuracion", label: "Configuración", icon: "configuracion" },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { pendientes } = useSos();
  return (
    <nav aria-label="Principal">
      <ul className="flex flex-col gap-1">
        {links.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-input px-3 text-sm font-medium transition-colors ${
                  active ? "bg-surface-2 text-primary" : "text-text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                <Icon name={l.icon} />
                <span className="flex-1">{l.label}</span>
                {l.href === "/sos" && pendientes > 0 && (
                  <span className="rounded-full bg-danger-strong px-2 py-0.5 text-xs font-semibold text-white">
                    <span className="sr-only">Pendientes: </span>
                    {pendientes}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const wordmark = (cls: string) => (
  <Image src={asset("/vyro-wordmark-light.png")} alt="Vyro" width={120} height={44} priority className={cls} />
);

export function Shell({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex lg:w-64 lg:p-5">
        {wordmark("mb-8 ml-2 mt-2")}
        <NavList />
        <p className="mt-auto px-2 text-xs text-text-muted">Sindicato 24 de Septiembre · Santa Cruz</p>
      </aside>

      <div className="border-b border-border bg-surface md:hidden">
        <div className="flex min-h-16 items-center justify-between px-4">
          {wordmark("h-9 w-auto")}
          <button
            type="button"
            className="btn-secondary"
            aria-expanded={abierto}
            aria-controls="menu-movil"
            onClick={() => setAbierto((v) => !v)}
          >
            Menú
          </button>
        </div>
        <div id="menu-movil" hidden={!abierto} className="px-4 pb-4">
          <NavList onNavigate={() => setAbierto(false)} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-end gap-4 border-b border-border px-4 py-2 md:px-6 lg:px-8">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{adminActual.nombre}</p>
            <p className="text-xs text-text-muted">{adminActual.rol}</p>
          </div>
          <Link href="/login" className="btn-secondary">
            Cerrar sesión
          </Link>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
