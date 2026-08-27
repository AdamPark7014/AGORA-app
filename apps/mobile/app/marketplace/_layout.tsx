import { Stack } from 'expo-router';

import { TEMA } from '@/lib/tema';

export default function MarketplaceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: TEMA.superficie },
        headerTintColor: TEMA.texto,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: TEMA.fondo },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Marketplace' }} />
      <Stack.Screen name="[id]" options={{ title: 'Anuncio' }} />
    </Stack>
  );
}
