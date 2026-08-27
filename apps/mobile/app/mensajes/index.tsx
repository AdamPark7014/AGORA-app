import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
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
import { usePolling } from '@/lib/use-polling';
import { TEMA } from '@/lib/tema';
import { haceCuanto } from '@/componentes/tarjeta-post';

interface Conversacion {
  id: string;
  con: { handle: string; nombre: string; fotoUrl: string | null } | null;
  ultimoTexto: string | null;
  ultimoAt: string;
  mioElUltimo: boolean;
  noLeidos: number;
}

export default function BandejaMensajes() {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const traer = useCallback(async () => {
    try {
      const d = await api<{ conversaciones: Conversacion[] }>('/mensajes');
      setConversaciones(d.conversaciones);
    } catch {
      setConversaciones([]);
    }
  }, []);

  useEffect(() => {
    traer().finally(() => setCargando(false));
  }, [traer]);

  // La lista cambia mucho menos que un chat abierto; sin novedades se frena
  // hasta dos minutos.
  usePolling(() => traer(), 15_000, !cargando, 120_000);

  if (cargando) {
    return (
      <View style={e.centro}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  return (
    <FlatList
      data={conversaciones}
      keyExtractor={(c) => c.id}
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
          colors={[TEMA.naranja]}
        />
      }
      ListEmptyComponent={
        <View style={e.vacio}>
          <Text style={e.vacioTitulo}>Sin conversaciones</Text>
          <Text style={e.vacioTexto}>
            Busca a alguien y escríbele. Tus chats aparecerán aquí.
          </Text>
          <Pressable style={e.boton} onPress={() => router.push('/buscar')}>
            <Text style={e.botonTexto}>Buscar personas</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[e.fila, item.noLeidos > 0 && e.filaNueva]}
          onPress={() => router.push(`/mensajes/${item.id}`)}
          accessibilityRole="button"
        >
          <View style={e.avatar}>
            <Text style={e.avatarTexto}>
              {(item.con?.nombre ?? '?')
                .split(' ')
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? '')
                .join('')}
            </Text>
          </View>
          <View style={e.filaTexto}>
            <Text style={[e.nombre, item.noLeidos > 0 && e.nombreNuevo]}>
              {item.con?.nombre ?? 'Alguien'}
            </Text>
            <Text style={[e.preview, item.noLeidos > 0 && e.previewNuevo]} numberOfLines={1}>
              {item.mioElUltimo ? 'Tú: ' : ''}
              {item.ultimoTexto ?? 'Sin mensajes'}
            </Text>
          </View>
          <View style={e.meta}>
            <Text style={e.tiempo}>{haceCuanto(item.ultimoAt)}</Text>
            {item.noLeidos > 0 && (
              <View style={e.globo}>
                <Text style={e.globoTexto}>{item.noLeidos > 9 ? '9+' : item.noLeidos}</Text>
              </View>
            )}
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
    alignItems: 'center',
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 12,
    marginBottom: 8,
    minHeight: TEMA.tactil,
  },
  filaNueva: { backgroundColor: TEMA.naranjaSuave, borderColor: TEMA.naranja },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TEMA.naranjaSuave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexto: { color: TEMA.naranjaHondo, fontWeight: '800', fontSize: 15 },
  filaTexto: { flex: 1, minWidth: 0 },
  nombre: { fontSize: 15, fontWeight: '600', color: TEMA.texto },
  nombreNuevo: { fontWeight: '800' },
  preview: { fontSize: 13, color: TEMA.textoMedio, marginTop: 2 },
  previewNuevo: { color: TEMA.texto, fontWeight: '600' },
  meta: { alignItems: 'flex-end', gap: 6 },
  tiempo: { fontSize: 11, color: TEMA.textoMedio },
  globo: {
    backgroundColor: TEMA.naranja,
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  globoTexto: { color: '#fff', fontSize: 11, fontWeight: '800' },
  vacio: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  vacioTitulo: { fontSize: 17, fontWeight: '700', color: TEMA.texto, marginBottom: 4 },
  vacioTexto: { fontSize: 14, color: TEMA.textoMedio, textAlign: 'center', marginBottom: 16 },
  boton: {
    minHeight: TEMA.tactil,
    borderRadius: 999,
    backgroundColor: TEMA.naranja,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
