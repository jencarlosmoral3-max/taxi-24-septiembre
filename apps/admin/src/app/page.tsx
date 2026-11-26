import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Image src="/vyro-wordmark-light.png" alt="Vyro" width={240} height={87} priority />
      <h1 className="text-xl font-semibold">Panel del sindicato</h1>
    </main>
  );
}
