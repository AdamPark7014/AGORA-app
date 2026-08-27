import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, ErrorApi } from '@/lib/api';
import { TEMA } from '@/lib/tema';
import { haceCuanto } from '@/componentes/tarjeta-post';

interface Anonima {
  id: string;
  texto: string;
  createdAt: string;
  alias: string;
  esMio: boolean;
  numComments: number;
  numReactions: number;
  miReaccion: string | null;
}

const REACCIONES = [
  { tipo: 'ME_LATE', emoji: '🔥' },
  { tipo: 'ME_RIO', emoji: '😂' },
  { tipo: 'APOYO', emoji: '🤝' },
] as const;

export default function Anonimo() {
  const [habilitada, setHabilitada] = useState<boolean | null>(null);
  const [alias, setAlias] = useState<string | null>(null);
  const [posts, setPosts] = useState<Anonima[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const d = await api<{ publicaciones: Anonima[] }>('/anonimo');
      setPosts(d.publicaciones);
    } catch {
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    api<{ habilitada: boolean }>('/anonimo/estado')
      .then(async (est) => {
        setHabilitada(est.habilitada);
        if (!est.habilitada) return;
        await cargar();
        const a = await api<{ alias: string }>('/anonimo/alias');
        setAlias(a.alias);
      })
      .catch(() => setHabilitada(false))
      .finally(() => setCargando(false));
  }, [cargar]);

  async function publicar() {
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      await api('/anonimo', { method: 'POST', body: JSON.stringify({ texto: texto.trim() }) });
      setTexto('');
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo publicar.');
    } finally {
      setEnviando(false);
    }
  }

  async function reaccionar(id: string, tipo: string, actual: string | null) {
    const quita = actual === tipo;
    await api(`/posts/${id}/reacciones`, {
      method: 'POST',
      body: JSON.stringify({ tipo: quita ? null : tipo }),
    });
    await cargar();
  }

  if (cargando) {
    return (
      <View style={e.centro}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  if (!habilitada) {
    return (
      <View style={e.centro}>
        <Text style={e.titulo}>Zona sin nombre apagada</Text>
        <Text style={e.sub}>El equipo la tiene desactivada por ahora.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      contentContainerStyle={e.lista}
      ListHeaderComponent={
        <View style={e.composer}>
          <Text style={e.alias}>Publicas como {alias ?? '…'}</Text>
          <TextInput
            style={e.input}
            multiline
            maxLength={600}
            placeholder="Di algo sin que sepan quién eres…"
            placeholderTextColor={TEMA.textoMedio}
            value={texto}
            onChangeText={setTexto}
          />
          {error && <Text style={e.error}>{error}</Text>}
          <Pressable style={[e.boton, enviando && e.botonApagado]} onPress={publicar} disabled={enviando}>
            <Text style={e.botonTexto}>{enviando ? '…' : 'Publicar'}</Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={<Text style={e.vacio}>Nadie ha dicho nada todavía. Sé el primero.</Text>}
      renderItem={({ item }) => (
        <View style={e.tarjeta}>
          <Text style={e.postAlias}>{item.alias}</Text>
          <Text style={e.meta}>{haceCuanto(item.createdAt)}</Text>
          <Text style={e.postTexto}>{item.texto}</Text>
          <View style={e.reacciones}>
            {REACCIONES.map((r) => (
              <Pressable key={r.tipo} onPress={() => reaccionar(item.id, r.tipo, item.miReaccion)}>
                <Text style={[e.reaccion, item.miReaccion === r.tipo && e.reaccionActiva]}>
                  {r.emoji} {item.numReactions}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    />
  );
}

const e = StyleSheet.create({
  lista: { padding: 12, flexGrow: 1, backgroundColor: TEMA.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: TEMA.fondo },
  titulo: { fontSize: 18, fontWeight: '700', color: TEMA.texto },
  sub: { color: TEMA.textoMedio, marginTop: 8, textAlign: 'center' },
  composer: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radio,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 14,
    marginBottom: 12,
  },
  alias: { fontSize: 13, color: TEMA.textoMedio, marginBottom: 8 },
  input: { minHeight: 80, fontSize: 15, color: TEMA.texto, textAlignVertical: 'top' },
  error: { color: TEMA.peligro, marginTop: 8 },
  boton: { marginTop: 10, backgroundColor: TEMA.naranja, borderRadius: 999, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  botonApagado: { opacity: 0.5 },
  botonTexto: { color: '#fff', fontWeight: '700' },
  vacio: { textAlign: 'center', color: TEMA.textoMedio, padding: 24 },
  tarjeta: { backgroundColor: TEMA.superficie, borderRadius: TEMA.radioChico, borderWidth: 1, borderColor: TEMA.borde, padding: 14, marginBottom: 8 },
  postAlias: { fontWeight: '700', color: TEMA.texto },
  meta: { fontSize: 12, color: TEMA.textoMedio, marginTop: 2 },
  postTexto: { fontSize: 15, lineHeight: 22, color: TEMA.texto, marginTop: 8 },
  reacciones: { flexDirection: 'row', gap: 16, marginTop: 10 },
  reaccion: { fontSize: 14, color: TEMA.textoMedio },
  reaccionActiva: { fontWeight: '700', color: TEMA.naranjaHondo },
});
