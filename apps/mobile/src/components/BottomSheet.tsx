import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme/theme';

import { Text } from './Text';

type Props = { visible: boolean; onClose: () => void; title?: string; children: ReactNode };

export function BottomSheet({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [y] = useState(() => new Animated.Value(height));
  const [mounted, setMounted] = useState(visible);

  if (visible && !mounted) setMounted(true); // montar antes de animar la entrada

  useEffect(() => {
    const anim = Animated.timing(y, { toValue: visible ? 0 : height, duration: 220, useNativeDriver: true });
    anim.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => anim.stop();
  }, [visible, y, height]);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={styles.scrim}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
        pointerEvents="box-none"
      >
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: theme.colors.scrim },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.card,
    borderTopRightRadius: theme.radii.card,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.size.screenPadding,
    gap: theme.spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: theme.size.handleWidth,
    height: theme.size.handleHeight,
    borderRadius: theme.size.handleHeight / 2,
    backgroundColor: theme.colors.border,
  },
});
