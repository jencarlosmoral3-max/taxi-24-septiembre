import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text, TextField } from '@/components';
import { PhotoSlot } from '@/components/driver/PhotoSlot';
import { useDemoDriver } from '@/demo/useDemoDriver';
import { theme } from '@/theme/theme';

const TITLES = ['Tus datos', 'Licencia y carnet', 'Tu vehículo', 'Fotos finales'];
const REQUIRED = 'Obligatorio';
const MAX_YEAR = new Date().getFullYear() + 1;

type Form = {
  name: string; ci: string; member: string;
  plate: string; brand: string; model: string; color: string; year: string; ruat: string; soat: string;
};
const EMPTY: Form = { name: '', ci: '', member: '', plate: '', brand: '', model: '', color: '', year: '', ruat: '', soat: '' };
const PHOTOS = {
  license: 'Licencia de conducir',
  ciFront: 'Carnet de identidad (anverso)',
  ciBack: 'Carnet de identidad (reverso)',
  car: 'Foto del vehículo',
  plate: 'Foto de la placa',
  selfie: 'Selfie',
} as const;
type PhotoKey = keyof typeof PHOTOS;

// Devuelve los errores de un paso (vacio = valido).
type Errors = Partial<Record<keyof Form | 'photos', string>>;
const STEP_PHOTOS: Partial<Record<number, PhotoKey[]>> = { 1: ['license', 'ciFront', 'ciBack'], 3: ['car', 'plate', 'selfie'] };
function validate(step: number, f: Form, photos: Partial<Record<PhotoKey, boolean>>): Errors {
  const e: Errors = {};
  if (STEP_PHOTOS[step]?.some((k) => !photos[k])) e.photos = 'Marca todas las fotos como listas para continuar';
  const required: (keyof Form)[] = step === 0 ? ['name', 'ci', 'member'] : step === 2 ? ['plate', 'brand', 'model', 'color', 'year', 'ruat', 'soat'] : [];
  for (const k of required) if (!f[k].trim()) e[k] = REQUIRED;
  if (step === 0 && !e.name && f.name.trim().length < 3) e.name = 'Escribe tu nombre completo';
  if (step === 0 && !e.ci && !/^\d{5,10}(-[0-9][A-Za-z])?$/.test(f.ci.trim())) e.ci = 'Solo números, con complemento opcional, p. ej. 1234567 o 1234567-1B';
  if (step === 0 && !e.member && !/^\d+$/.test(f.member.trim())) e.member = 'Solo números';
  if (step === 2) {
    if (!e.year && (!/^\d{4}$/.test(f.year) || +f.year < 1980 || +f.year > MAX_YEAR)) e.year = 'Año de 4 dígitos, p. ej. 2016';
    if (!e.soat && !/^(0[1-9]|1[0-2])\/\d{4}$/.test(f.soat)) e.soat = 'Usa el formato MM/AAAA, p. ej. 08/2027';
    else if (!e.soat && +f.soat.slice(3) * 12 + +f.soat.slice(0, 2) < new Date().getFullYear() * 12 + new Date().getMonth() + 1) e.soat = 'Tu SOAT está vencido';
  }
  return e;
}

export default function Registro() {
  const insets = useSafeAreaInsets();
  const submit = useDemoDriver((s) => s.submitApplication);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [tried, setTried] = useState(false);
  const [photos, setPhotos] = useState<Partial<Record<PhotoKey, boolean>>>({});
  const set = (k: keyof Form) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const errors = tried ? validate(step, f, photos) : {};
  const last = step === TITLES.length - 1;

  const back = useCallback(() => {
    if (step === 0) return false;
    setStep((s) => s - 1);
    setTried(false);
    return true;
  }, [step]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]);

  const next = () => {
    if (Object.keys(validate(step, f, photos)).length) return setTried(true);
    setTried(false);
    if (last) {
      submit();
      router.replace('/conductor/pendiente');
    } else setStep(step + 1);
  };
  const slot = (k: PhotoKey) => <PhotoSlot key={k} label={PHOTOS[k]} ready={!!photos[k]} onToggle={() => setPhotos((p) => ({ ...p, [k]: !p[k] }))} />;
  const field = (k: keyof Form, label: string, extra: object = {}) => (
    <TextField label={label} value={f[k]} onChangeText={set(k)} error={errors[k]} {...extra} />
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.root, { paddingTop: insets.top + theme.spacing.xs }]}>
      <View style={styles.header}>
        {step > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Paso anterior" onPress={back} style={styles.back}>
            <MaterialCommunityIcons name="arrow-left" size={theme.size.icon * 1.2} color={theme.colors.text} />
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar registro" onPress={() => router.back()} style={styles.back}>
            <MaterialCommunityIcons name="close" size={theme.size.icon * 1.2} color={theme.colors.text} />
          </Pressable>
        )}
        <View style={styles.flex}>
          <Text variant="body14Medium" muted accessibilityLabel={`Paso ${step + 1} de ${TITLES.length}`}>
            Paso {step + 1}/{TITLES.length}
          </Text>
          <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {TITLES.map((t, i) => (
              <View key={t} style={[styles.bar, i <= step && styles.barOn]} />
            ))}
          </View>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text variant="title24" accessibilityRole="header">
          {TITLES[step]}
        </Text>
        {step === 0 && (
          <>
            {field('name', 'Nombre completo', { autoCapitalize: 'words', textContentType: 'name' })}
            {field('ci', 'Carnet de identidad (CI)', { autoCapitalize: 'characters', autoCorrect: false, placeholder: '1234567 o 1234567-1B' })}
            {field('member', 'Nº interno / de socio del sindicato', { inputMode: 'numeric' })}
          </>
        )}
        {step === 1 && (
          <>
            <Text muted>En la próxima versión podrás subir las fotos reales. Por ahora toca cada recuadro para marcarla como lista.</Text>
            {slot('license')}
            {slot('ciFront')}
            {slot('ciBack')}
            {!!errors.photos && <Text color={theme.colors.danger}>{errors.photos}</Text>}
          </>
        )}
        {step === 2 && (
          <>
            <TextField label="Placa" value={f.plate} onChangeText={(v) => set('plate')(v.toUpperCase())} error={errors.plate} autoCapitalize="characters" autoCorrect={false} />
            {field('brand', 'Marca', { autoCapitalize: 'words' })}
            {field('model', 'Modelo', { autoCapitalize: 'words' })}
            {field('color', 'Color', { autoCapitalize: 'words' })}
            {field('year', 'Año', { inputMode: 'numeric', maxLength: 4 })}
            {field('ruat', 'Nº de RUAT', { autoCapitalize: 'characters' })}
            {field('soat', 'Vencimiento del SOAT (MM/AAAA)', { inputMode: 'numeric', placeholder: '08/2027', maxLength: 7 })}
          </>
        )}
        {step === 3 && (
          <>
            <Text muted>En la próxima versión podrás subir las fotos reales. Por ahora toca cada recuadro para marcarla como lista.</Text>
            {slot('car')}
            {slot('plate')}
            {slot('selfie')}
            {!!errors.photos && <Text color={theme.colors.danger}>{errors.photos}</Text>}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        <Button label={last ? 'Enviar solicitud' : 'Continuar'} onPress={next} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.xs },
  back: { width: theme.size.touchMin, height: theme.size.touchMin, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, paddingRight: theme.size.screenPadding, gap: theme.spacing['2xs'] },
  bars: { flexDirection: 'row', gap: theme.spacing['2xs'] },
  bar: { flex: 1, height: theme.size.handleHeight, borderRadius: theme.radii.pill, backgroundColor: theme.colors.border },
  barOn: { backgroundColor: theme.colors.primary },
  content: { padding: theme.size.screenPadding, gap: theme.spacing.md },
  footer: { paddingHorizontal: theme.size.screenPadding, paddingTop: theme.spacing.sm },
});
