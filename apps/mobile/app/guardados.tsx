import { router } from 'expo-router';
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
  numComments: number;
  numReactions: number;
}

export default function Guardados() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const datos = await api<{ publicaciones: Publicacion[] }>('/guardados');
      setPublicaciones(datos.publicaciones);
    } catch {
      setPublicaciones([]);
    }
  }, []);

  useEffect(() => {
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
      ListEmptyComponent={
        <Text style={e.vacio}>Toca 🔖 en cualquier publicación del feed para guardarla aquí.</Text>
      }
      renderItem={({ item }) => (
        <Pressable style={e.tarjeta} onPress={() => router.push(`/publicacion/${item.id}`)}>
          {item.autor && (
            <Text style={e.autor} onPress={() => router.push(`/perfil/${item.autor!.handle}`)}>
              {item.autor.nombre}
            </Text>
          )}
          <Text style={e.meta}>{haceCuanto(item.createdAt)} · {item.comunidad.nombre}</Text>
          <Text style={e.texto} numberOfLines={4}>{item.texto}</Text>
          <Text style={e.cuentas}>
            {item.numReactions} reacciones · {item.numComments} comentarios
          </Text>
        </Pressable>
      )}
    />
  );
}

const e = StyleSheet.create({
  lista: { padding: 12, flexGrow: 1, backgroundColor: TEMA.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TEMA.fondo },
  vacio: { textAlign: 'center', color: TEMA.textoMedio, padding: 40 },
  tarjeta: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 14,
    marginBottom: 8,
  },
  autor: { fontWeight: '700', color: TEMA.texto, fontSize: 15 },
  meta: { fontSize: 12, color: TEMA.textoMedio, marginTop: 2 },
  texto: { fontSize: 15, lineHeight: 21, color: TEMA.texto, marginTop: 8 },
  cuentas: { fontSize: 12, color: TEMA.naranja, marginTop: 8, fontWeight: '600' },
});
