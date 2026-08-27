import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, ErrorApi } from '@/lib/api';
import { TEMA } from '@/lib/tema';

interface MiPerfil {
  handle: string;
  nombre: string;
  apellidos: string;
  bio: string | null;
  ciudadOrigen: string | null;
  instagram: string | null;
  intereses: string[];
  busco: string | null;
  visibilidad: 'UNIVERSIDAD' | 'COMUNIDADES';
}

export default function Ajustes() {
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [bio, setBio] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [instagram, setInstagram] = useState('');
  const [busco, setBusco] = useState('');
  const [intereses, setIntereses] = useState<string[]>([]);
  const [nuevoInteres, setNuevoInteres] = useState('');
  const [visibilidad, setVisibilidad] = useState<'UNIVERSIDAD' | 'COMUNIDADES'>('UNIVERSIDAD');
  const [comunidades, setComunidades] = useState<Array<{ slug: string; nombre: string; silenciada: boolean }>>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<MiPerfil>('/perfil/mio').then((p) => {
        setPerfil(p);
        setBio(p.bio ?? '');
        setCiudad(p.ciudadOrigen ?? '');
        setInstagram(p.instagram ?? '');
        setBusco(p.busco ?? '');
        setIntereses(p.intereses ?? []);
        setVisibilidad(p.visibilidad ?? 'UNIVERSIDAD');
      }),
      api<Array<{ slug: string; nombre: string; silenciada: boolean }>>('/perfil/mis-comunidades').then(
        setComunidades,
      ),
    ])
      .catch((e) =>
        setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar tu perfil.'),
      )
      .finally(() => setCargando(false));
  }, []);

  function agregarInteres() {
    const limpio = nuevoInteres.trim();
    if (!limpio || intereses.length >= 10) return;
    if (intereses.some((i) => i.toLowerCase() === limpio.toLowerCase())) {
      setNuevoInteres('');
      return;
    }
    setIntereses([...intereses, limpio]);
    setNuevoInteres('');
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      await api('/perfil', {
        method: 'PATCH',
        body: JSON.stringify({
          bio,
          ciudadOrigen: ciudad || null,
          instagram: instagram.replace(/^@/, '') || null,
          busco: busco || null,
          intereses,
          visibilidad,
        }),
      });
      setAviso('Cambios guardados.');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarSilencio(slug: string, silenciada: boolean) {
    try {
      await api(`/perfil/comunidades/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ silenciada }),
      });
      setComunidades((prev) => prev.map((c) => (c.slug === slug ? { ...c, silenciada } : c)));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo actualizar.');
    }
  }

  if (cargando) {
    return (
      <View style={e.centro}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  return (
    <ScrollView style={e.pantalla} contentContainerStyle={e.contenido}>
      {perfil && (
        <Pressable onPress={() => router.push(`/perfil/${perfil.handle}`)}>
          <Text style={e.verPerfil}>Ver tu perfil público →</Text>
        </Pressable>
      )}

      <Text style={e.etiqueta}>Bio</Text>
      <TextInput style={e.input} multiline value={bio} onChangeText={setBio} maxLength={500} />

      <Text style={e.etiqueta}>Ciudad de origen</Text>
      <TextInput style={e.input} value={ciudad} onChangeText={setCiudad} />

      <Text style={e.etiqueta}>Instagram (sin @)</Text>
      <TextInput style={e.input} value={instagram} onChangeText={setInstagram} autoCapitalize="none" />

      <Text style={e.etiqueta}>¿Qué buscas en Ágora?</Text>
      <TextInput style={e.input} value={busco} onChangeText={setBusco} maxLength={200} />

      <Text style={e.etiqueta}>Intereses</Text>
      <View style={e.chips}>
        {intereses.map((i) => (
          <Pressable key={i} style={e.chip} onPress={() => setIntereses(intereses.filter((x) => x !== i))}>
            <Text style={e.chipTexto}>{i} ×</Text>
          </Pressable>
        ))}
      </View>
      <View style={e.fila}>
        <TextInput
          style={[e.input, { flex: 1 }]}
          value={nuevoInteres}
          onChangeText={setNuevoInteres}
          placeholder="Agregar interés"
          placeholderTextColor={TEMA.textoMedio}
        />
        <Pressable style={e.botonChico} onPress={agregarInteres}>
          <Text style={e.botonChicoTexto}>+</Text>
        </Pressable>
      </View>

      <Text style={e.etiqueta}>Quién ve tu perfil</Text>
      <View style={e.opciones}>
        {(['UNIVERSIDAD', 'COMUNIDADES'] as const).map((v) => (
          <Pressable
            key={v}
            style={[e.opcion, visibilidad === v && e.opcionActiva]}
            onPress={() => setVisibilidad(v)}
          >
            <Text style={[e.opcionTexto, visibilidad === v && e.opcionTextoActiva]}>
              {v === 'UNIVERSIDAD' ? 'Toda la UDLAP' : 'Solo mis comunidades'}
            </Text>
          </Pressable>
        ))}
      </View>

      {comunidades.length > 0 && (
        <View style={e.bloque}>
          <Text style={e.bloqueTitulo}>Silenciar comunidades en el feed</Text>
          {comunidades.map((c) => (
            <View key={c.slug} style={e.filaSilencio}>
              <Text style={e.filaSilencioTexto}>{c.nombre}</Text>
              <Switch
                value={c.silenciada}
                onValueChange={(v) => alternarSilencio(c.slug, v)}
                trackColor={{ true: TEMA.naranja }}
              />
            </View>
          ))}
        </View>
      )}

      {error && <Text style={e.error}>{error}</Text>}
      {aviso && <Text style={e.aviso}>{aviso}</Text>}

      <Pressable style={[e.guardar, guardando && e.guardarApagado]} onPress={guardar} disabled={guardando}>
        <Text style={e.guardarTexto}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  contenido: { padding: 16, paddingBottom: 40 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TEMA.fondo },
  verPerfil: { color: TEMA.naranja, fontWeight: '700', marginBottom: 16 },
  etiqueta: { fontSize: 13, fontWeight: '700', color: TEMA.textoMedio, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: TEMA.superficie,
    borderWidth: 1,
    borderColor: TEMA.borde,
    borderRadius: TEMA.radioChico,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: TEMA.texto,
    minHeight: 44,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { backgroundColor: TEMA.naranjaSuave, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipTexto: { fontSize: 13, color: TEMA.naranjaHondo },
  fila: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  botonChico: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TEMA.naranja,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonChicoTexto: { color: '#fff', fontSize: 22, fontWeight: '700' },
  opciones: { gap: 8 },
  opcion: {
    borderWidth: 1,
    borderColor: TEMA.borde,
    borderRadius: TEMA.radioChico,
    padding: 12,
    backgroundColor: TEMA.superficie,
  },
  opcionActiva: { borderColor: TEMA.naranja, backgroundColor: TEMA.naranjaSuave },
  opcionTexto: { fontSize: 14, color: TEMA.textoMedio },
  opcionTextoActiva: { color: TEMA.naranjaHondo, fontWeight: '700' },
  bloque: {
    marginTop: 20,
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radio,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 14,
  },
  bloqueTitulo: { fontSize: 14, fontWeight: '700', color: TEMA.texto, marginBottom: 10 },
  filaSilencio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  filaSilencioTexto: { fontSize: 14, color: TEMA.texto, flex: 1 },
  error: { color: TEMA.peligro, marginTop: 12 },
  aviso: { color: TEMA.naranjaHondo, marginTop: 12, fontWeight: '600' },
  guardar: {
    marginTop: 20,
    backgroundColor: TEMA.naranja,
    borderRadius: 999,
    minHeight: TEMA.tactil,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guardarApagado: { opacity: 0.5 },
  guardarTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
