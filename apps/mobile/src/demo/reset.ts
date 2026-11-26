// Fase 1 (demo): deja ambos stores demo en blanco (cierre de sesion, cambio de modo).
import { useDemoDriver } from './useDemoDriver';
import { useDemoRide } from './useDemoRide';

export const resetDemo = () => {
  useDemoRide.getState().reset();
  useDemoDriver.getState().wipe();
};
