import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text, TextField } from '@/components';
import { geoSearch, httpStatus } from '@/lib/geo';
import { useTripDraft, type Place } from '@/store/tripDraft';
import { theme } from '@/theme/theme';

export default function Destino() {
  const insets = useSafeAreaInsets();
  const origin = useTripDraft((s) => s.origin);
  const allRecents = useTripDraft((s) => s.recents);
  const saved = useTripDraft((s) => s.saved);
  // Un lugar guardado no se repite en Recientes.
  const recents = allRecents.filter((r) => ![saved.home, saved.work].some((p) => p && p.lat === r.lat && p.lng === r.lng));
  const setDestination = useTripDraft((s) => s.setDestination);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);

  // Sesgo redondeado a ~1 km para que la cache de la query no se rompa con cada fix GPS.
  const bias = origin ? { lat: +origin.lat.toFixed(2), lng: +origin.lng.toFixed(2) } : null;
  const enabled = q.length >= 3;
  const search = useQuery({
    queryKey: ['geo-search', q, bias],
    queryFn: () => geoSearch(q, bias),
    enabled,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const pick = (p: Place) => {
    setDestination({ name: p.name, address: p.address, lat: p.lat, lng: p.lng });
    router.back();
  };

  const searching = enabled && text.trim() === q;
  const results = enabled ? search.data : undefined;
  let status: string | null = null;
  const rateLimited = search.isError && httpStatus(search.error) === 429;
  if (enabled && search.isError) {
    status = rateLimited ? 'Muchas búsquedas seguidas. Espera un momento.' : 'No pudimos buscar ahora. Intenta de nuevo.';
  } else if (searching && search.isSuccess && !search.isPlaceholderData && results?.length === 0) {
    status = 'No encontramos ese lugar.';
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + theme.spacing.md, paddingBottom: insets.bottom }]}>
      <View style={styles.head}>
        <Button label="Volver" variant="secondary" onPress={() => router.back()} />
        <TextField
          label="Destino"
          placeholder="¿A dónde vas?"
          value={text}
          onChangeText={setText}
          autoFocus
          onSubmitEditing={() => setQ(text.trim())}
          autoCapitalize="words"
          maxLength={100}
          autoCorrect={false}
          returnKeyType="search"
        />
        {enabled && search.isFetching && (
          <Text muted accessibilityLiveRegion="polite">
            Buscando…
          </Text>
        )}
        {status && (
          <Text muted={!search.isError} color={search.isError ? theme.colors.danger : undefined} accessibilityLiveRegion="polite">
            {status}
          </Text>
        )}
        {enabled && search.isError && !rateLimited && <Button label="Reintentar" variant="secondary" onPress={() => search.refetch()} />}
        {!enabled && recents.length === 0 && <Text muted>Escribe al menos 3 letras o fija el punto en el mapa.</Text>}
        <Button label="Fijar en el mapa" variant="secondary" onPress={() => router.push('/fijar-destino')} />
      </View>
      <FlatList
        keyboardShouldPersistTaps="handled"
        style={search.isPlaceholderData ? styles.dim : undefined}
        data={enabled ? (results ?? []) : recents}
        keyExtractor={(p, i) => `${p.lat},${p.lng},${i}`}
        ListHeaderComponent={
          enabled ? undefined : (
            <View>
              {(['home', 'work'] as const).map((k) => {
                const p = saved[k];
                const label = k === 'home' ? 'Casa' : 'Trabajo';
                return (
                  <View key={k} style={styles.savedRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={p ? `${label}. ${p.address}` : `Agregar ${label.toLowerCase()}`}
                      onPress={() => (p ? pick(p) : router.push({ pathname: '/fijar-destino', params: { guardar: k } }))}
                      style={styles.savedMain}
                    >
                      <Text variant="body16Medium" numberOfLines={1} muted={!p}>{p ? label : `Agregar ${label.toLowerCase()}`}</Text>
                      {!!p?.address && <Text variant="body14" muted numberOfLines={1}>{p.address}</Text>}
                    </Pressable>
                    {p && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Cambiar ${label.toLowerCase()}`}
                        onPress={() => router.push({ pathname: '/fijar-destino', params: { guardar: k } })}
                        style={styles.savedEdit}
                      >
                        <Text variant="body14Medium" color={theme.colors.primary}>Cambiar</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
              {recents.length > 0 && <Text variant="body14Medium" muted style={styles.section}>Recientes</Text>}
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}. ${item.address}`} onPress={() => pick(item)} style={styles.row}>
            <Text variant="body16Medium" numberOfLines={1}>{item.name}</Text>
            {!!item.address && <Text variant="body14" muted numberOfLines={1}>{item.address}</Text>}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  head: { gap: theme.spacing.xs, paddingHorizontal: theme.size.screenPadding, paddingBottom: theme.spacing.sm },
  section: { paddingHorizontal: theme.size.screenPadding, paddingVertical: theme.spacing.xs },
  row: {
    minHeight: theme.size.touchMin,
    justifyContent: 'center',
    paddingHorizontal: theme.size.screenPadding,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  savedRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  savedMain: { flex: 1, minHeight: theme.size.touchMin, justifyContent: 'center', paddingLeft: theme.size.screenPadding, paddingVertical: theme.spacing.sm },
  savedEdit: { minHeight: theme.size.touchMin, justifyContent: 'center', paddingHorizontal: theme.size.screenPadding },
  dim: { opacity: 0.5 },
});
