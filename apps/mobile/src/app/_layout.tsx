import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '../spike/gps-task'; // SPIKE F-06: registra la task tambien en arranque headless

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#191919' } }} />
    </>
  );
}
