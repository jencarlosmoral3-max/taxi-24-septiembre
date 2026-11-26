import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vyro — Panel del sindicato",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
