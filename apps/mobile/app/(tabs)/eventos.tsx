import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { TEMA } from '@/lib/tema';

interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  lugar: string | null;
  inicioAt: string;
  costoMxn: number | null;
  miRespuesta: string | null;
  vanAIr: number;
}

const ICONO: Record<string, string> = {
  FIESTA: '🎉',
  ACADEMICO: '📚',
  DEPORTIVO: '⚽',
  CULTURAL: '🎭',
  ORGANIZACION: '🏛️',
  OTRO: '📌',
};

function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modal, setModal] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [nuevo, setNuevo] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'FIESTA',
    lugar: '',
    inicioAt: '',
  });

  const traer = useCallback(async () => {
    try {
      const r = await api<{ eventos: Evento[] }>('/eventos');
      setEventos(r.eventos);
    } catch {
      setEventos([]);
    }
  }, []);

  useEffect(() => {
    traer().finally(() => setCargando(false));
  }, [traer]);

  async function responder(id: string, actual: string | null) {
    // El servidor trata la asistencia como interruptor: mandar 'VOY' otra vez
    // la retira. No existe un 'NO_VOY' que mandar.
    const quita = actual === 'VOY';

    // Optimista: el chip cambia al tocarlo. Es la accion que mas se toca en
    // esta pantalla y esperar al servidor se siente lento.
    setEventos((lista) =>
      lista.map((ev) =>
        ev.id === id
          ? { ...ev, miRespuesta: quita ? null : 'VOY', vanAIr: ev.vanAIr + (quita ? -1 : 1) }
          : ev,
      ),
    );

    try {
      await api(`/eventos/${id}/asistencia`, {
        method: 'POST',
        body: JSON.stringify({ respuesta: 'VOY' }),
      });
    } catch {
      // Si falla, se vuelve a lo que dice el servidor en vez de adivinar.
      traer();
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
    <>
    <FlatList
      data={eventos}
      keyExtractor={(ev) => ev.id}
      contentContainerStyle={e.lista}
      ListHeaderComponent={
        <Pressable style={e.crear} onPress={() => setModal(true)}>
          <Text style={e.crearTexto}>+ Crear evento</Text>
        </Pressable>
      }
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
          <Text style={e.vacioTitulo}>Nada en la agenda</Text>
          <Text style={e.vacioTexto}>Cuando alguien publique una fiesta o un evento, sale aquí.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={e.tarjeta} onPress={() => router.push(`/eventos/${item.id}`)}>
          <Text style={e.tipo}>
            {ICONO[item.tipo] ?? '📌'} {item.tipo.toLowerCase()}
          </Text>
          <Text style={e.titulo}>{item.titulo}</Text>
          <Text style={e.meta}>
            {cuando(item.inicioAt)}
            {item.lugar ? ` · ${item.lugar}` : ''}
          </Text>
          {item.descripcion ? (
            <Text style={e.descripcion} numberOfLines={3}>
              {item.descripcion}
            </Text>
          ) : null}
          <View style={e.pie}>
            <Pressable
              onPress={(ev) => {
                ev.stopPropagation();
                responder(item.id, item.miRespuesta);
              }}
              style={[e.asistir, item.miRespuesta === 'VOY' && e.asistirActivo]}
              accessibilityRole="button"
              accessibilityLabel={item.miRespuesta === 'VOY' ? 'Ya no voy' : 'Voy'}
            >
              <Text style={[e.asistirTexto, item.miRespuesta === 'VOY' && e.asistirTextoActivo]}>
                {item.miRespuesta === 'VOY' ? '✓ Voy' : 'Voy'}
              </Text>
            </Pressable>
            <Text style={e.cuenta}>
              {item.vanAIr} {item.vanAIr === 1 ? 'persona va' : 'personas van'}
            </Text>
            {item.costoMxn ? <Text style={e.costo}>${item.costoMxn}</Text> : null}
          </View>
        </Pressable>
      )}
    />

    <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
      <View style={e.modal}>
        <Text style={e.modalTitulo}>Nuevo evento</Text>
        <TextInput style={e.input} placeholder="Título" value={nuevo.titulo} onChangeText={(t) => setNuevo({ ...nuevo, titulo: t })} />
        <TextInput style={e.input} placeholder="Lugar" value={nuevo.lugar} onChangeText={(t) => setNuevo({ ...nuevo, lugar: t })} />
        <TextInput style={[e.input, { minHeight: 80 }]} placeholder="Descripción" multiline value={nuevo.descripcion} onChangeText={(t) => setNuevo({ ...nuevo, descripcion: t })} />
        <TextInput style={e.input} placeholder="Inicio (ISO, ej. 2026-08-25T19:00)" value={nuevo.inicioAt} onChangeText={(t) => setNuevo({ ...nuevo, inicioAt: t })} autoCapitalize="none" />
        <Pressable
          style={e.crear}
          disabled={enviando}
          onPress={async () => {
            setEnviando(true);
            try {
              await api('/eventos', {
                method: 'POST',
                body: JSON.stringify({
                  titulo: nuevo.titulo.trim(),
                  descripcion: nuevo.descripcion.trim(),
                  tipo: nuevo.tipo,
                  lugar: nuevo.lugar.trim(),
                  inicioAt: nuevo.inicioAt,
                }),
              });
              setModal(false);
              await traer();
            } catch (err) {
              // Silencioso en UI por ahora.
            } finally {
              setEnviando(false);
            }
          }}
        >
          <Text style={e.crearTexto}>{enviando ? '…' : 'Publicar evento'}</Text>
        </Pressable>
        <Pressable onPress={() => setModal(false)} style={{ marginTop: 12, alignItems: 'center' }}>
          <Text style={{ color: TEMA.textoMedio }}>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
    </>
  );
}

const e = StyleSheet.create({
  lista: { padding: 12, backgroundColor: TEMA.fondo, flexGrow: 1 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TEMA.fondo },
  tarjeta: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radio,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 14,
    marginBottom: 10,
  },
  tipo: { fontSize: 12, color: TEMA.naranjaHondo, fontWeight: '700', textTransform: 'capitalize' },
  titulo: { fontSize: 17, fontWeight: '700', color: TEMA.texto, marginTop: 2 },
  meta: { fontSize: 13, color: TEMA.textoMedio, marginTop: 2 },
  descripcion: { fontSize: 14, lineHeight: 20, color: TEMA.texto, marginTop: 8 },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  asistir: {
    borderWidth: 1,
    borderColor: TEMA.naranja,
    borderRadius: 999,
    paddingHorizontal: 20,
    minHeight: TEMA.tactil,
    justifyContent: 'center',
  },
  asistirActivo: { backgroundColor: TEMA.naranja },
  asistirTexto: { color: TEMA.naranjaHondo, fontWeight: '700', fontSize: 14 },
  asistirTextoActivo: { color: '#fff' },
  cuenta: { fontSize: 13, color: TEMA.textoMedio, flex: 1 },
  costo: { fontSize: 14, fontWeight: '700', color: TEMA.texto },
  vacio: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  vacioTitulo: { fontSize: 17, fontWeight: '700', color: TEMA.texto, marginBottom: 4 },
  vacioTexto: { fontSize: 14, color: TEMA.textoMedio, textAlign: 'center' },
  crear: {
    backgroundColor: TEMA.naranja,
    borderRadius: 999,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  crearTexto: { color: '#fff', fontWeight: '700' },
  modal: { flex: 1, padding: 16, backgroundColor: TEMA.fondo },
  modalTitulo: { fontSize: 20, fontWeight: '800', color: TEMA.texto, marginBottom: 12 },
  input: {
    backgroundColor: TEMA.superficie,
    borderWidth: 1,
    borderColor: TEMA.borde,
    borderRadius: TEMA.radioChico,
    padding: 12,
    marginBottom: 10,
    fontSize: 15,
    color: TEMA.texto,
  },
});
