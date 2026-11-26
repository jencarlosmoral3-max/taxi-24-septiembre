import { Link } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { theme } from '@/theme/theme';

export default function Index() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/vyro-wordmark-light.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Vyro"
      />
      {__DEV__ && (
        <Link href="/dev-components" style={styles.link}>
          <Text variant="body14Medium" muted>
            Componentes (dev)
          </Text>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  logo: { width: 200, height: 73 },
  link: { position: 'absolute', bottom: theme.spacing['3xl'], padding: theme.spacing.md },
});
