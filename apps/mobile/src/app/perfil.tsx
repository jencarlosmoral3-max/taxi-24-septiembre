import { router } from 'expo-router';

import { Button } from '@/components';
import { Placeholder } from '@/demo/Placeholder';
import { signOut } from '@/lib/googleSignIn';
import { useAppMode } from '@/store/appMode';

export default function Perfil() {
  const { mode, setMode } = useAppMode();
  const toDriver = mode === 'passenger';
  return (
    <Placeholder title="Perfil">
      <Button
        label={toDriver ? 'Cambiar a modo conductor' : 'Cambiar a modo pasajero'}
        variant="secondary"
        onPress={() => {
          setMode(toDriver ? 'driver' : 'passenger');
          router.replace('/');
        }}
      />
      <Button label="Soporte" variant="secondary" onPress={() => router.push('/soporte')} />
      <Button label="Historial" variant="secondary" onPress={() => router.push('/historial')} />
      <Button label="Cerrar sesión" variant="secondary" onPress={() => signOut()} />
    </Placeholder>
  );
}
