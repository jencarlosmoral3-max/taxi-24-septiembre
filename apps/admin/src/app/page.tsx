"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Export estático: no hay redirect de servidor; redirige en el cliente (router respeta basePath).
export default function Home() {
  const router = useRouter();
  useEffect(() => router.replace("/solicitudes/"), [router]);
  return (
    <main className="p-6">
      <p>
        Redirigiendo… <Link href="/solicitudes/" className="underline">Ir a Solicitudes</Link>
      </p>
    </main>
  );
}
