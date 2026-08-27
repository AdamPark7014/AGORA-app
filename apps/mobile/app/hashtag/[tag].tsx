import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { TEMA } from '@/lib/tema';
import { haceCuanto } from '@/componentes/tarjeta-post';

interface Publicacion {
  id: string;
  texto: string;
  createdAt: string;
  autor: { handle: string; nombre: string } | null;
  comunidad: { nombre: string };
}

export default function Hashtag() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const etiqueta = decodeURIComponent(tag ?? '');
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(
    async (desde?: string) => {
      if (!etiqueta) return;
      try {
        const p = new URLSearchParams();
        if (desde) p.set('cursor', desde);
        const datos = await api<{ publicaciones: Publicacion[]; siguienteCursor: string | null }>(
          `/hashtags/${encodeURIComponent(etiqueta)}?${p}`,
        );
        setPublicaciones((prev) => (desde ? [...prev, ...datos.publicaciones] : datos.publicaciones));
        setCursor(datos.siguienteCursor);
      } catch {
        if (!desde) setPublicaciones([]);
      }
    },
    [etiqueta],
  );

  useEffect(() => {
    setCargando(true);
    cargar().finally(() => setCargando(false));
  }, [cargar]);

  if (cargando) {
    return (
      <View style={e.centro}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  return (
    <FlatList
      data={publicaciones}
      keyExtractor={(p) => p.id}
      contentContainerStyle={e.lista}
      ListHeaderComponent={<Text style={e.titulo}>#{etiqueta}</Text>}
      onEndReached={() => cursor && cargar(cursor)}
      ListEmptyComponent={<Text style={e.vacio}>Nadie ha usado este hashtag todavía.</Text>}
      renderItem={({ item }) => (
        <Pressable style={e.tarjeta} onPress={() => router.push(`/publicacion/${item.id}`)}>
          {item.autor && (
            <Text style={e.autor}>{item.autor.nombre}</Text>
          )}
          <Text style={e.meta}>{haceCuanto(item.createdAt)} · {item.comunidad.nombre}</Text>
          <Text style={e.texto} numberOfLines={4}>{item.texto}</Text>
        </Pressable>
      )}
    />
  );
}

const e = StyleSheet.create({
  lista: { padding: 12, flexGrow: 1, backgroundColor: TEMA.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TEMA.fondo },
  titulo: { fontSize: 22, fontWeight: '800', color: TEMA.texto, marginBottom: 12 },
  vacio: { textAlign: 'center', color: TEMA.textoMedio, padding: 40 },
  tarjeta: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 12,
    marginBottom: 8,
  },
  autor: { fontWeight: '700', color: TEMA.texto },
  meta: { fontSize: 12, color: TEMA.textoMedio, marginTop: 2 },
  texto: { fontSize: 15, lineHeight: 21, color: TEMA.texto, marginTop: 6 },
});
