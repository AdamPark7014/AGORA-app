import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { TEMA } from '@/lib/tema';
import { TarjetaPost, type Post } from '@/componentes/tarjeta-post';

interface Pagina {
  publicaciones: Post[];
  siguienteCursor: string | null;
}

interface Comunidad {
  slug: string;
  nombre: string;
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [comunidad, setComunidad] = useState('');
  const [siguiendo, setSiguiendo] = useState(false);

  useEffect(() => {
    api<Comunidad[]>('/perfil/mis-comunidades').then(setComunidades).catch(() => undefined);
  }, []);

  const traer = useCallback(
    async (desde: string | null, reemplazar: boolean) => {
      try {
        const p = new URLSearchParams();
        if (desde) p.set('cursor', desde);
        if (comunidad) p.set('comunidad', comunidad);
        if (siguiendo) p.set('siguiendo', '1');
        const qs = p.toString() ? `?${p}` : '';
        const data = await api<Pagina>(`/feed${qs}`);
        setPosts((previas) => (reemplazar ? data.publicaciones : [...previas, ...data.publicaciones]));
        setCursor(data.siguienteCursor);
        setError(null);
      } catch {
        setError('No se pudo cargar el feed.');
      }
    },
    [comunidad, siguiendo],
  );

  useEffect(() => {
    setCargando(true);
    traer(null, true).finally(() => setCargando(false));
  }, [traer]);

  async function refrescar() {
    setRefrescando(true);
    await traer(null, true);
    setRefrescando(false);
  }

  if (cargando) {
    return (
      <View style={e.centro}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <TarjetaPost post={item} />}
      contentContainerStyle={e.lista}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={refrescar}
          tintColor={TEMA.naranja}
          colors={[TEMA.naranja]}
        />
      }
      ListHeaderComponent={
        <View style={e.filtros}>
          <Pressable
            style={[e.chip, siguiendo && e.chipActivo]}
            onPress={() => setSiguiendo((s) => !s)}
          >
            <Text style={[e.chipTexto, siguiendo && e.chipTextoActivo]}>Siguiendo</Text>
          </Pressable>
          <Pressable
            style={[e.chip, !comunidad && e.chipActivo]}
            onPress={() => setComunidad('')}
          >
            <Text style={[e.chipTexto, !comunidad && e.chipTextoActivo]}>Todas</Text>
          </Pressable>
          {comunidades.map((c) => (
            <Pressable
              key={c.slug}
              style={[e.chip, comunidad === c.slug && e.chipActivo]}
              onPress={() => setComunidad(c.slug)}
            >
              <Text style={[e.chipTexto, comunidad === c.slug && e.chipTextoActivo]} numberOfLines={1}>
                {c.nombre}
              </Text>
            </Pressable>
          ))}
        </View>
      }
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (cursor) traer(cursor, false);
      }}
      ListEmptyComponent={
        <View style={e.vacio}>
          <Text style={e.vacioTitulo}>Todavía no hay nada</Text>
          <Text style={e.vacioTexto}>
            {error ?? 'Publica algo y arranca la conversación en tu comunidad.'}
          </Text>
        </View>
      }
      ListFooterComponent={
        cursor ? (
          <View style={e.pie}>
            <ActivityIndicator color={TEMA.naranja} />
          </View>
        ) : null
      }
    />
  );
}

const e = StyleSheet.create({
  lista: { padding: 12, backgroundColor: TEMA.fondo, flexGrow: 1 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TEMA.fondo },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TEMA.borde,
    paddingHorizontal: 12,
    minHeight: 32,
    justifyContent: 'center',
    backgroundColor: TEMA.superficie,
    maxWidth: 160,
  },
  chipActivo: { backgroundColor: TEMA.naranjaSuave, borderColor: TEMA.naranja },
  chipTexto: { fontSize: 12, color: TEMA.textoMedio, fontWeight: '600' },
  chipTextoActivo: { color: TEMA.naranjaHondo },
  vacio: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  vacioTitulo: { fontSize: 17, fontWeight: '700', color: TEMA.texto, marginBottom: 4 },
  vacioTexto: { fontSize: 14, color: TEMA.textoMedio, textAlign: 'center' },
  pie: { paddingVertical: 18 },
});
