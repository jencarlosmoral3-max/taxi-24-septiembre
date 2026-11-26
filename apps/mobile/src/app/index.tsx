import { Image, StyleSheet, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/vyro-wordmark-light.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Vyro"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#191919' },
  logo: { width: 200, height: 73 },
});
