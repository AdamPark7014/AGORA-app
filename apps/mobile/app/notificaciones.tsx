import { router } from 'expo-router';
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
import { haceCuanto } from '@/componentes/tarjeta-post';

interface Notificacion {
  id: string;
  tipo: string;
  texto: string;
  url: string;
  leida: boolean;
  createdAt: string;
}

const ICONO: Record<string, string> = {
  REACCION: '🧡',
  COMENTARIO: '💬',
  SEGUIDOR: '👋',
  MENSAJE: '✉️',
  EVENTO_NUEVO: '🎉',
  MODERACION: '⚖️',
};

export default function NotificacionesHistorial() {
  const [avisos, setAvisos] = useState<Notificacion[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const traer = useCallback(async (desde?: string) => {
    try {
      const p = desde ? `?cursor=${desde}` : '';
      const r = await api<{ notificaciones: Notificacion[]; siguienteCursor: string | null }>(
        `/notificaciones${p}`,
      );
      setAvisos((prev) => (desde ? [...prev, ...r.notificaciones] : r.notificaciones));
      setCursor(r.siguienteCursor);
      if (!desde && r.notificaciones.some((n) => !n.leida)) {
        await api('/notificaciones/leidas', { method: 'POST', body: JSON.stringify({}) }).catch(
          () => undefined,
        );
      }
    } catch {
      if (!desde) setAvisos([]);
    }
  }, []);

  useEffect(() => {
    traer().finally(() => setCargando(false));
  }, [traer]);

  function abrir(url: string) {
    if (url.startsWith('/mensajes/')) router.push(url as `/mensajes/${string}`);
    else if (url.startsWith('/publicacion/')) router.push(url as `/publicacion/${string}`);
    else if (url.startsWith('/perfil/')) router.push(url as `/perfil/${string}`);
    else if (url.startsWith('/eventos/')) router.push(url as `/eventos/${string}`);
    else if (url.startsWith('/marketplace/')) router.push(url as `/marketplace/${string}`);
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
      data={avisos}
      keyExtractor={(n) => n.id}
      contentContainerStyle={e.lista}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={async () => {
            setRefrescando(true);
            await traer();
            setRefrescando(false);
          }}
          tintColor={TEMA.naranja}
        />
      }
      onEndReached={() => cursor && traer(cursor)}
      ListEmptyComponent={<Text style={e.vacio}>Sin notificaciones todavía.</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={[e.fila, !item.leida && e.filaNueva]}
          onPress={() => item.url && abrir(item.url)}
          disabled={!item.url}
        >
          <Text style={e.icono}>{ICONO[item.tipo] ?? '🔔'}</Text>
          <View style={e.filaTexto}>
            <Text style={e.texto}>{item.texto}</Text>
            <Text style={e.tiempo}>{haceCuanto(item.createdAt)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const e = StyleSheet.create({
  lista: { padding: 12, backgroundColor: TEMA.fondo, flexGrow: 1 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TEMA.fondo },
  fila: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 12,
    marginBottom: 8,
    minHeight: TEMA.tactil,
  },
  filaNueva: { backgroundColor: TEMA.naranjaSuave, borderColor: TEMA.naranja },
  icono: { fontSize: 18 },
  filaTexto: { flex: 1 },
  texto: { fontSize: 14, lineHeight: 20, color: TEMA.texto },
  tiempo: { fontSize: 12, color: TEMA.textoMedio, marginTop: 2 },
  vacio: { textAlign: 'center', color: TEMA.textoMedio, padding: 40 },
});
