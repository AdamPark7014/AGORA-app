import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, ErrorApi } from '@/lib/api';
import { TEMA } from '@/lib/tema';

interface Catalogo {
  escuelas: Array<{
    slug: string;
    nombre: string;
    carreras: Array<{ slug: string; nombre: string }>;
  }>;
  colegios: Array<{ slug: string; nombre: string }>;
}

const ANO = new Date().getFullYear();

export default function Registro() {
  const router = useRouter();
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [handle, setHandle] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [carreraSlug, setCarreraSlug] = useState('');
  const [colegioSlug, setColegioSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    api<Catalogo>('/catalogo')
      .then(setCatalogo)
      .catch(() => setError('No se pudo cargar el catálogo.'));
  }, []);

  const carreras = catalogo?.escuelas.flatMap((e) => e.carreras) ?? [];

  async function enviar() {
    setCargando(true);
    setError(null);
    try {
      await api('/perfil', {
        method: 'POST',
        body: JSON.stringify({
          handle: handle.toLowerCase(),
          nombre,
          apellidos,
          generacion: ANO,
          carreraSlug,
          ...(colegioSlug ? { colegioSlug } : {}),
        }),
      });
      router.replace('/(tabs)/feed');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo crear el perfil.');
    } finally {
      setCargando(false);
    }
  }

  if (!catalogo) {
    return (
      <View style={[e.pantalla, e.centrado]}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  return (
    <ScrollView style={e.pantalla} contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={e.titulo}>Crea tu perfil</Text>
      <Text style={e.entradilla}>Último paso para entrar a Ágora.</Text>

      <TextInput
        style={e.campo}
        placeholder="usuario (sin @)"
        placeholderTextColor={TEMA.textoTenue}
        autoCapitalize="none"
        value={handle}
        onChangeText={setHandle}
      />
      <TextInput style={e.campo} placeholder="Nombre" value={nombre} onChangeText={setNombre} />
      <TextInput
        style={e.campo}
        placeholder="Apellidos"
        value={apellidos}
        onChangeText={setApellidos}
      />

      <Text style={e.etiqueta}>Carrera</Text>
      {carreras.map((c) => (
        <Pressable
          key={c.slug}
          style={[e.opcion, carreraSlug === c.slug && e.opcionActiva]}
          onPress={() => setCarreraSlug(c.slug)}
        >
          <Text style={e.opcionTexto}>{c.nombre}</Text>
        </Pressable>
      ))}

      <Text style={e.etiqueta}>Colegio (opcional)</Text>
      {catalogo.colegios.map((c) => (
        <Pressable
          key={c.slug}
          style={[e.opcion, colegioSlug === c.slug && e.opcionActiva]}
          onPress={() => setColegioSlug(colegioSlug === c.slug ? '' : c.slug)}
        >
          <Text style={e.opcionTexto}>{c.nombre}</Text>
        </Pressable>
      ))}

      {error && <Text style={e.error}>{error}</Text>}

      <Pressable
        style={[e.boton, cargando && { opacity: 0.6 }]}
        disabled={cargando || !handle || !nombre || !apellidos || !carreraSlug}
        onPress={enviar}
      >
        <Text style={e.botonTexto}>{cargando ? 'Creando…' : 'Entrar al campus'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  centrado: { justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 24, fontWeight: '800', color: TEMA.texto },
  entradilla: { color: TEMA.textoMedio, marginBottom: 8 },
  campo: {
    backgroundColor: TEMA.superficie,
    borderWidth: 1,
    borderColor: TEMA.borde,
    borderRadius: TEMA.radioChico,
    padding: 12,
    color: TEMA.texto,
  },
  etiqueta: { fontWeight: '600', color: TEMA.texto, marginTop: 8 },
  opcion: {
    padding: 10,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    backgroundColor: TEMA.superficie,
  },
  opcionActiva: { borderColor: TEMA.naranja, backgroundColor: TEMA.naranjaSuave },
  opcionTexto: { color: TEMA.texto, fontSize: 14 },
  error: { color: '#c0392b' },
  boton: {
    backgroundColor: TEMA.naranja,
    padding: 14,
    borderRadius: TEMA.radioChico,
    alignItems: 'center',
    marginTop: 12,
  },
  botonTexto: { color: '#fff', fontWeight: '700' },
});
