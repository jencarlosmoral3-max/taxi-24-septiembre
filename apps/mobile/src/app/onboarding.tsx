import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { useOnboarding } from '@/store/onboarding';
import { theme } from '@/theme/theme';

const SLIDES = [
  { icon: 'taxi', title: 'Pide tu taxi', body: 'Elige a dónde vas y te conectamos con taxis cerca de ti.' },
  { icon: 'cash', title: 'Ofrece tu precio', body: 'Tú propones la tarifa y los conductores te responden.' },
  { icon: 'shield-check', title: 'Conductores del sindicato verificados', body: 'Todos están registrados y aprobados por el sindicato.' },
] as const;

const ICON_CIRCLE = 160;
const ICON_SIZE = 80;

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const markSeen = useOnboarding((s) => s.markSeen);
  const list = useRef<FlatList>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const next = () => (last ? markSeen() : list.current?.scrollToIndex({ index: page + 1 }));

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + theme.spacing.xl }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Saltar" onPress={markSeen} style={styles.skip}>
          <Text variant="body16Medium" muted>
            Saltar
          </Text>
        </Pressable>
      </View>
      <FlatList
        ref={list}
        data={SLIDES}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index }) => (
          <View style={[styles.slide, { width }]} accessible accessibilityLabel={`Paso ${index + 1} de ${SLIDES.length}. ${item.title}. ${item.body}`}>
            <View style={styles.circle}>
              <MaterialCommunityIcons name={item.icon} size={ICON_SIZE} color={theme.colors.primary} />
            </View>
            <Text variant="title24" style={styles.center}>
              {item.title}
            </Text>
            <Text muted style={styles.center}>
              {item.body}
            </Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.dots} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {SLIDES.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <Button label={last ? 'Empezar' : 'Siguiente'} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  top: { alignItems: 'flex-end', paddingHorizontal: theme.spacing.sm },
  skip: { minHeight: theme.size.touchMin, minWidth: theme.size.touchMin, paddingHorizontal: theme.spacing.md, alignItems: 'center', justifyContent: 'center' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md, paddingHorizontal: theme.size.screenPadding },
  circle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  center: { textAlign: 'center' },
  footer: { gap: theme.spacing.xl, paddingHorizontal: theme.size.screenPadding },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xs },
  dot: { width: theme.spacing.xs, height: theme.spacing.xs, borderRadius: theme.radii.pill, backgroundColor: theme.colors.border },
  dotActive: { backgroundColor: theme.colors.primary, width: theme.spacing.xl },
});
