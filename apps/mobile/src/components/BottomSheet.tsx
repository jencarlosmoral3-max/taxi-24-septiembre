import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme/theme';

import { Text } from './Text';

type Props = { visible: boolean; onClose: () => void; title?: string; children: ReactNode };

const H = Dimensions.get('window').height;

export function BottomSheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(H));
  const [mounted, setMounted] = useState(visible);

  if (visible && !mounted) setMounted(true); // montar antes de animar la entrada

  useEffect(() => {
    Animated.timing(y, { toValue: visible ? 0 : H, duration: 220, useNativeDriver: true }).start(() => {
      if (!visible) setMounted(false);
    });
  }, [visible, y]);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={styles.scrim}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      />
      <Animated.View
        accessibilityViewIsModal
        style={[styles.sheet, { paddingBottom: theme.spacing.lg + insets.bottom, transform: [{ translateY: y }] }]}
      >
        <View style={styles.handle} />
        {!!title && (
          <Text variant="title20" accessibilityRole="header">
            {title}
          </Text>
        )}
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.scrim },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.card,
    borderTopRightRadius: theme.radii.card,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.size.screenPadding,
    gap: theme.spacing.md,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border },
});
