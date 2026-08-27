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
import { router } from 'expo-router';

import { api } from '@/lib/api';
import { TEMA } from '@/lib/tema';
import { haceCuanto } from '@/componentes/tarjeta-post';

interface Notificacion {
  id: string;
  tipo: string;
  texto: string;
  url?: string;
  leida: boolean;
  createdAt: string;
  actor: { handle: string; nombre: string } | null;
}

const ICONO: Record<string, string> = {
  REACCION: '🧡',
  COMENTARIO: '💬',
  SEGUIDOR: '👋',
  MENSAJE: '✉️',
  EVENTO: '🎉',
  MODERACION: '⚖️',
};

export default function Avisos() {
  const [avisos, setAvisos] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const traer = useCallback(async () => {
    try {
      const r = await api<{ notificaciones: Notificacion[] }>('/notificaciones');
      setAvisos(r.notificaciones);
      // Abrir la pestaña ya cuenta como leerlas: dejar el globo encendido
      // despues de verlas es la queja clasica de toda app de avisos.
      if (r.notificaciones.some((n) => !n.leida)) {
        await api('/notificaciones/leidas', { method: 'POST', body: JSON.stringify({}) }).catch(
          () => undefined,
        );
      }
    } catch {
      setAvisos([]);
    }
  }, []);

  useEffect(() => {
    traer().finally(() => setCargando(false));
  }, [traer]);

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
          colors={[TEMA.naranja]}
        />
      }
      ListEmptyComponent={
        <View style={e.vacio}>
          <Text style={e.vacioTitulo}>Sin avisos</Text>
          <Text style={e.vacioTexto}>Aquí te avisamos cuando alguien reaccione o te escriba.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[e.fila, !item.leida && e.filaNueva]}
          onPress={() => {
            if (!item.url) return;
            if (item.url.startsWith('/mensajes/')) router.push(item.url as `/mensajes/${string}`);
            else if (item.url.startsWith('/publicacion/')) router.push(item.url as `/publicacion/${string}`);
            else if (item.url.startsWith('/perfil/')) router.push(item.url as `/perfil/${string}`);
            else if (item.url.startsWith('/eventos/')) router.push(item.url as `/eventos/${string}`);
            else if (item.url.startsWith('/marketplace/')) router.push(item.url as `/marketplace/${string}`);
          }}
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
    alignItems: 'flex-start',
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
  vacio: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  vacioTitulo: { fontSize: 17, fontWeight: '700', color: TEMA.texto, marginBottom: 4 },
  vacioTexto: { fontSize: 14, color: TEMA.textoMedio, textAlign: 'center' },
});
