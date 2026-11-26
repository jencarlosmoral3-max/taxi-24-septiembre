import { router } from 'expo-router';

import { Button } from '@/components';
import { Placeholder } from '@/demo/Placeholder';

export default function ConductorHome() {
  return (
    <Placeholder title="Conductor" next="/conductor/solicitud">
      <Button label="Perfil" variant="secondary" onPress={() => router.push('/perfil')} />
    </Placeholder>
  );
}
