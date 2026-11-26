import { Placeholder } from '@/demo/Placeholder';
import { useOnboarding } from '@/store/onboarding';

export default function Onboarding() {
  const markSeen = useOnboarding((s) => s.markSeen);
  return <Placeholder title="Bienvenido a Vyro" onNext={markSeen} />;
}
