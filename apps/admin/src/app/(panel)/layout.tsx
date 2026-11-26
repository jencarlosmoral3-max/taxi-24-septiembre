import { Shell } from "@/components/shell";
import { SosProvider } from "@/components/sos-context";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <SosProvider>
      <Shell>{children}</Shell>
    </SosProvider>
  );
}
