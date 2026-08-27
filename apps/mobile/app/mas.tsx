import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api, borrarToken } from '@/lib/api';
import { TEMA } from '@/lib/tema';

interface Yo {
  handle: string | null;
  nombre: string | null;
  puedeModerar?: boolean;
}

const ENLACES = [
  { ruta: '/buscar', emoji: '🔍', titulo: 'Buscar', nota: 'Personas, posts y más' },
  { ruta: '/guardados', emoji: '🔖', titulo: 'Guardados', nota: 'Posts para ver después' },
  { ruta: '/notificaciones', emoji: '🔔', titulo: 'Notificaciones', nota: 'Todo tu historial' },
  { ruta: '/mensajes', emoji: '✉️', titulo: 'Mensajes', nota: 'Tus conversaciones' },
  { ruta: '/marketplace', emoji: '🛍', titulo: 'Marketplace', nota: 'Compra y vende en campus' },
  { ruta: '/aventones', emoji: '🚗', titulo: 'Aventones', nota: 'Comparte coche a Cholula' },
  { ruta: '/anonimo', emoji: '🎭', titulo: 'Sin nombre', nota: 'Publicar sin firmar' },
  { ruta: '/directorio', emoji: '📇', titulo: 'Directorio', nota: 'Buscar gente por carrera' },
  { ruta: '/ajustes', emoji: '⚙️', titulo: 'Ajustes', nota: 'Tu perfil y privacidad' },
] as const;

export default function Mas() {
  const [yo, setYo] = useState<Yo | null>(null);

  useEffect(() => {
    api<Yo>('/auth/yo').then(setYo).catch(() => undefined);
  }, []);

  async function salir() {
    await borrarToken();
    api('/auth/salir', { method: 'POST' }).catch(() => undefined);
    router.replace('/');
  }

  return (
    <ScrollView style={e.pantalla} contentContainerStyle={e.contenido}>
      <Text style={e.titulo}>Más</Text>

      {yo?.handle && (
        <Pressable style={e.perfil} onPress={() => router.push(`/perfil/${yo.handle}`)}>
          <View style={e.avatar}>
            <Text style={e.avatarTexto}>
              {(yo.nombre ?? yo.handle)
                .split(' ')
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? '')
                .join('')}
            </Text>
          </View>
          <View>
            <Text style={e.perfilNombre}>{yo.nombre ?? 'Tu perfil'}</Text>
            <Text style={e.perfilHandle}>@{yo.handle}</Text>
          </View>
        </Pressable>
      )}

      <View style={e.panel}>
        {ENLACES.map((item) => (
          <Pressable key={item.ruta} style={e.fila} onPress={() => router.push(item.ruta)}>
            <Text style={e.emoji}>{item.emoji}</Text>
            <View style={e.filaTexto}>
              <Text style={e.filaTitulo}>{item.titulo}</Text>
              <Text style={e.filaNota}>{item.nota}</Text>
            </View>
            <Text style={e.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={e.legal}>
        <Pressable onPress={() => router.push('/terminos')}>
          <Text style={e.legalLink}>Términos</Text>
        </Pressable>
        <Text style={e.legalSep}> · </Text>
        <Pressable onPress={() => router.push('/privacidad')}>
          <Text style={e.legalLink}>Privacidad</Text>
        </Pressable>
      </View>

      <Pressable style={e.salir} onPress={salir}>
        <Text style={e.salirTexto}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  contenido: { padding: 16, paddingBottom: 40 },
  titulo: { fontSize: 24, fontWeight: '800', color: TEMA.texto, marginBottom: 14 },
  perfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radio,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TEMA.naranjaSuave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexto: { color: TEMA.naranjaHondo, fontWeight: '800', fontSize: 16 },
  perfilNombre: { fontSize: 16, fontWeight: '700', color: TEMA.texto },
  perfilHandle: { fontSize: 13, color: TEMA.textoMedio },
  panel: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radio,
    borderWidth: 1,
    borderColor: TEMA.borde,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    minHeight: TEMA.tactil + 8,
    borderBottomWidth: 1,
    borderBottomColor: TEMA.borde,
  },
  emoji: { fontSize: 20, width: 28 },
  filaTexto: { flex: 1 },
  filaTitulo: { fontSize: 15, fontWeight: '600', color: TEMA.texto },
  filaNota: { fontSize: 12, color: TEMA.textoMedio, marginTop: 1 },
  chevron: { fontSize: 22, color: TEMA.textoMedio },
  legal: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  legalLink: { color: TEMA.naranja, fontSize: 14 },
  legalSep: { color: TEMA.textoMedio },
  salir: {
    marginTop: 16,
    minHeight: TEMA.tactil,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TEMA.borde,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TEMA.superficie,
  },
  salirTexto: { color: TEMA.peligro, fontWeight: '700' },
});
