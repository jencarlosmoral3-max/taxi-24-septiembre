import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { Text } from '@/components/Text';

// Segundos restantes hasta ttlMs desde el montaje; onExpire se llama una sola vez.
export function useCountdown(ttlMs: number, onExpire: () => void): number {
  const [deadline] = useState(() => Date.now() + ttlMs);
  const [left, setLeft] = useState(Math.ceil(ttlMs / 1000));
  const expire = useRef(onExpire);
  const fired = useRef(false);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);
  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(l);
      if (l === 0 && !fired.current) {
        fired.current = true;
        expire.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [deadline]);
  return left;
}

// Texto visible cada segundo; el lector de pantalla solo se entera en 45/30/15/10/5/0 s.
export function Countdown({ left, color }: { left: number; color?: string }) {
  const bucket = left > 15 ? Math.ceil(left / 15) * 15 : left > 10 ? 15 : left > 5 ? 10 : left > 0 ? 5 : 0;
  const label = bucket === 0 ? 'Tiempo agotado' : left === bucket ? `Quedan ${bucket} segundos` : `Quedan menos de ${bucket} segundos`;
  // iOS no tiene live regions: se anuncia a mano, solo cuando cambia el tramo.
  const lastBucket = useRef(bucket);
  useEffect(() => {
    if (Platform.OS === 'ios' && lastBucket.current !== bucket) AccessibilityInfo.announceForAccessibility(label);
    lastBucket.current = bucket;
  }, [bucket, label]);
  return (
    <Text
      variant="body16Medium"
      color={color}
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
    >
      {left} s
    </Text>
  );
}
