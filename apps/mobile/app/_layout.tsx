import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { TEMA } from '@/lib/tema';

/**
 * Raíz de la app nativa.
 *
 * Un `Stack` simple: la pantalla de entrada y las pestañas. La navegación por
 * pestañas vive en `(tabs)/_layout`, que es donde Expo Router espera el grupo.
 */
export default function Raiz() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: TEMA.superficie },
          headerTintColor: TEMA.texto,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: TEMA.fondo },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Ágora' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="registro" options={{ title: 'Completa tu perfil' }} />
        <Stack.Screen name="publicacion/[id]" options={{ title: 'Publicación' }} />
        <Stack.Screen name="mensajes" options={{ headerShown: false }} />
        <Stack.Screen name="marketplace" options={{ headerShown: false }} />
        <Stack.Screen name="buscar" options={{ title: 'Buscar' }} />
        <Stack.Screen name="mas" options={{ title: 'Más' }} />
        <Stack.Screen name="ajustes" options={{ title: 'Ajustes' }} />
        <Stack.Screen name="perfil/[handle]" options={{ title: 'Perfil' }} />
        <Stack.Screen name="eventos/[id]" options={{ title: 'Evento' }} />
        <Stack.Screen name="hashtag/[tag]" options={{ title: 'Hashtag' }} />
        <Stack.Screen name="directorio" options={{ title: 'Directorio' }} />
        <Stack.Screen name="guardados" options={{ title: 'Guardados' }} />
        <Stack.Screen name="notificaciones" options={{ title: 'Notificaciones' }} />
        <Stack.Screen name="aventones" options={{ title: 'Aventones' }} />
        <Stack.Screen name="anonimo" options={{ title: 'Sin nombre' }} />
        <Stack.Screen name="terminos" options={{ title: 'Términos' }} />
        <Stack.Screen name="privacidad" options={{ title: 'Privacidad' }} />
      </Stack>
    </>
  );
}
