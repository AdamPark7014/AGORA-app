import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api, borrarToken } from '@/lib/api';
import { TEMA } from '@/lib/tema';

interface Perfil {
  handle: string;
  nombre: string;
  apellidos: string;
  bio: string | null;
  ciudadOrigen: string | null;
  instagram: string | null;
  intereses: string[];
  visibilidad: string;
}

interface Comunidad {
  slug: string;
  nombre: string;
}

export default function Yo() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Perfil>('/perfil/mio').then(setPerfil).catch(() => undefined),
      api<Comunidad[]>('/perfil/mis-comunidades').then(setComunidades).catch(() => undefined),
    ]).finally(() => setCargando(false));
  }, []);

  async function salir() {
    // Se borra el token antes de llamar al servidor: si la red falla, el
    // usuario igual sale. Una sesion que "no se cierra" es un fallo grave.
    await borrarToken();
    api('/auth/salir', { method: 'POST' }).catch(() => undefined);
    router.replace('/');
  }

  if (cargando) {
    return (
      <View style={e.centro}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  const nombreCompleto = perfil ? `${perfil.nombre} ${perfil.apellidos}` : '';

  return (
    <ScrollView style={e.pantalla} contentContainerStyle={e.contenido}>
      <View style={e.cabecera}>
        <View style={e.avatar}>
          <Text style={e.avatarTexto}>
            {nombreCompleto
              .split(' ')
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? '')
              .join('') || '?'}
          </Text>
        </View>
        <Text style={e.nombre}>{nombreCompleto || 'Sin perfil'}</Text>
        {perfil && <Text style={e.handle}>@{perfil.handle}</Text>}
        {perfil?.bio ? <Text style={e.bio}>{perfil.bio}</Text> : null}
        {perfil?.ciudadOrigen ? <Text style={e.dato}>📍 {perfil.ciudadOrigen}</Text> : null}
        {perfil?.instagram ? <Text style={e.dato}>📷 @{perfil.instagram}</Text> : null}
      </View>

      <View style={e.accesos}>
        <Pressable style={e.acceso} onPress={() => router.push('/mas')}>
          <Text style={e.accesoIcono}>☰</Text>
          <Text style={e.accesoTexto}>Más</Text>
        </Pressable>
        <Pressable style={e.acceso} onPress={() => router.push('/mensajes')}>
          <Text style={e.accesoIcono}>✉️</Text>
          <Text style={e.accesoTexto}>Mensajes</Text>
        </Pressable>
        {perfil && (
          <Pressable style={e.acceso} onPress={() => router.push(`/perfil/${perfil.handle}`)}>
            <Text style={e.accesoIcono}>👤</Text>
            <Text style={e.accesoTexto}>Mi perfil</Text>
          </Pressable>
        )}
      </View>

      {perfil && perfil.intereses.length > 0 && (
        <View style={e.bloque}>
          <Text style={e.bloqueTitulo}>Intereses</Text>
          <View style={e.chips}>
            {perfil.intereses.map((i) => (
              <View key={i} style={e.chip}>
                <Text style={e.chipTexto}>{i}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {comunidades.length > 0 && (
        <View style={e.bloque}>
          <Text style={e.bloqueTitulo}>Tus comunidades</Text>
          <View style={e.chips}>
            {comunidades.map((c) => (
              <View key={c.slug} style={e.chip}>
                <Text style={e.chipTexto}>{c.nombre}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable style={e.salir} onPress={salir} accessibilityRole="button">
        <Text style={e.salirTexto}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  contenido: { padding: 16 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TEMA.fondo },
  cabecera: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radio,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: TEMA.naranjaSuave,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarTexto: { color: TEMA.naranjaHondo, fontWeight: '800', fontSize: 26 },
  nombre: { fontSize: 20, fontWeight: '800', color: TEMA.texto },
  handle: { fontSize: 14, color: TEMA.textoMedio, marginTop: 2 },
  accesos: { flexDirection: 'row', gap: 10, marginTop: 12 },
  acceso: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    minHeight: TEMA.tactil,
  },
  accesoIcono: { fontSize: 18 },
  accesoTexto: { fontSize: 14, fontWeight: '700', color: TEMA.texto },
  bio: { fontSize: 15, lineHeight: 21, color: TEMA.texto, marginTop: 10, textAlign: 'center' },
  dato: { fontSize: 13, color: TEMA.textoMedio, marginTop: 6 },
  bloque: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radio,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 14,
    marginTop: 12,
  },
  bloqueTitulo: { fontSize: 13, fontWeight: '700', color: TEMA.textoMedio, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: TEMA.superficie2,
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 32,
    justifyContent: 'center',
  },
  chipTexto: { fontSize: 13, color: TEMA.texto },
  salir: {
    marginTop: 20,
    minHeight: TEMA.tactil,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TEMA.borde,
    backgroundColor: TEMA.superficie,
    justifyContent: 'center',
    alignItems: 'center',
  },
  salirTexto: { color: TEMA.peligro, fontWeight: '700', fontSize: 15 },
});
