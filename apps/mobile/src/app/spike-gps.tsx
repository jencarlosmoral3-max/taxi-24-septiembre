// SPIKE F-06: pantalla solo de desarrollo.
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { readState, SpikeState, TASK, writeState } from '../spike/gps-task';

export default function SpikeGps() {
  const [s, setS] = useState<SpikeState | null>(null);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const t = setInterval(async () => {
      setS(await readState());
      setRunning(await Location.hasStartedLocationUpdatesAsync(TASK));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const start = async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    const bg = fg.granted ? await Location.requestBackgroundPermissionsAsync() : fg;
    setMsg(`fg=${fg.status} bg=${bg.status}`);
    if (!bg.granted) return;
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 0,
      foregroundService: { notificationTitle: 'Vyro en línea', notificationBody: 'Compartiendo ubicación' },
    });
  };
  const stop = async () => {
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
  };
  const setPhase = async (phase: string) => {
    const cur = await readState();
    await writeState({ ...cur, phase });
  };
  const btn = { backgroundColor: '#F6C200', padding: 16, margin: 4, borderRadius: 8 };

  return (
    <View style={{ flex: 1, backgroundColor: '#191919', padding: 24, paddingTop: 64 }}>
      <Text style={{ color: '#fff', fontSize: 20 }}>Spike GPS {running ? '(ACTIVO)' : '(parado)'}</Text>
      <Text style={{ color: '#fff' }}>fase: {s?.phase}</Text>
      <TextInput
        testID="phase"
        accessibilityLabel="phase"
        placeholder="fase (a, b, c, d)"
        placeholderTextColor="#888"
        style={{ color: '#fff', borderWidth: 1, borderColor: '#888', marginVertical: 8, padding: 8 }}
        onSubmitEditing={(e) => setPhase(e.nativeEvent.text)}
        autoCapitalize="none"
      />
      <Text style={{ color: '#fff' }}>seq {s?.seq} | enviados {s?.sent} | fallos {s?.failed}</Text>
      <Text style={{ color: '#fff' }}>{msg}</Text>
      <Pressable style={btn} onPress={start} accessibilityLabel="Start"><Text>Start</Text></Pressable>
      <Pressable style={btn} onPress={stop} accessibilityLabel="Stop"><Text>Stop</Text></Pressable>
    </View>
  );
}
