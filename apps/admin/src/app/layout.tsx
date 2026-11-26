import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Vyro — Panel del sindicato",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={poppins.variable}>
      <body className="min-h-screen">
        <p role="note" className="border-b border-border bg-surface-2 px-4 py-1.5 text-center text-xs text-text-muted">
          Demo con datos de ejemplo. No es el panel real del sindicato.
        </p>
        {children}
      </body>
    </html>
  );
}
