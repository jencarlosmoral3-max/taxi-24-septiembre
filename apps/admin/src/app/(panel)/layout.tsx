import { PanelProvider } from "@/components/panel-context";
import { Shell } from "@/components/shell";
import { SosProvider } from "@/components/sos-context";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <SosProvider>
      <PanelProvider>
        <Shell>{children}</Shell>
      </PanelProvider>
    </SosProvider>
  );
}
