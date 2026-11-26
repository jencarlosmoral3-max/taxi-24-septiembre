import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";

export const metadata = { title: "Ingresar — Vyro" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md p-8 text-center">
        <Image src="/vyro-wordmark-light.png" alt="Vyro" width={160} height={58} priority className="mx-auto mb-6" />
        <h1 className="text-2xl font-semibold">Panel del sindicato</h1>
        <p className="mt-2 text-text-muted">Sindicato 24 de Septiembre · Santa Cruz de la Sierra</p>
        {/* Mock: la fase 2 inicia OAuth con Google. */}
        <Link href="/solicitudes" className="btn-primary mt-8 h-14 w-full text-base">
          <Icon name="google" />
          Ingresar con Google
        </Link>
        <p className="mt-4 text-sm text-text-muted">Solo para administradores autorizados del sindicato.</p>
      </div>
    </main>
  );
}
