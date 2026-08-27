import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api, ErrorApi } from '@/lib/api';
import { TEMA } from '@/lib/tema';

interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  lugar: string;
  inicioAt: string;
  costoMxn: number | null;
  cupo: number | null;
  esMio: boolean;
  autor: { handle: string; nombre: string } | null;
  comunidad: { nombre: string } | null;
  vanAIr: number;
  miRespuesta: string | null;
}

const TIPOS: Record<string, string> = {
  FIESTA: 'Fiesta',
  ACADEMICO: 'Académico',
  DEPORTIVO: 'Deportivo',
  CULTURAL: 'Cultural',
  ORGANIZACION: 'Organización',
  OTRO: 'Otro',
};

export default function EventoDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setEvento(await api<Evento>(`/eventos/${id}`));
    } catch (e) {
      setError(e instanceof ErrorApi && e.estado === 404 ? 'Ese evento no existe.' : 'No se pudo cargar.');
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function responder(respuesta: 'VOY' | 'ME_INTERESA' | 'NO_VOY') {
    try {
      const r = await api<{ miRespuesta: string | null }>(`/eventos/${id}/asistencia`, {
        method: 'POST',
        body: JSON.stringify({ respuesta }),
      });
      setEvento((e) => (e ? { ...e, miRespuesta: r.miRespuesta } : e));
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo responder.');
    }
  }

  async function borrar() {
    await api(`/eventos/${id}`, { method: 'DELETE' });
    router.back();
  }

  if (!evento && !error) {
    return (
      <View style={e.centro}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  if (error || !evento) {
    return (
      <View style={e.centro}>
        <Text style={e.error}>{error}</Text>
      </View>
    );
  }

  const fecha = new Date(evento.inicioAt);

  return (
    <ScrollView style={e.pantalla} contentContainerStyle={e.contenido}>
      <Text style={e.tipo}>{TIPOS[evento.tipo] ?? evento.tipo}</Text>
      <Text style={e.titulo}>{evento.titulo}</Text>
      <Text style={e.meta}>
        {fecha.toLocaleString('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
      <Text style={e.meta}>📍 {evento.lugar}</Text>
      {evento.comunidad && <Text style={e.meta}>{evento.comunidad.nombre}</Text>}
      {evento.costoMxn ? <Text style={e.costo}>${evento.costoMxn} MXN</Text> : null}
      <Text style={e.descripcion}>{evento.descripcion}</Text>
      <Text style={e.cuenta}>{evento.vanAIr} personas van</Text>

      <View style={e.respuestas}>
        {(['VOY', 'ME_INTERESA', 'NO_VOY'] as const).map((r) => (
          <Pressable
            key={r}
            style={[e.chip, evento.miRespuesta === r && e.chipActivo]}
            onPress={() => responder(r)}
          >
            <Text style={[e.chipTexto, evento.miRespuesta === r && e.chipTextoActivo]}>
              {r === 'VOY' ? 'Voy' : r === 'ME_INTERESA' ? 'Me interesa' : 'No voy'}
            </Text>
          </Pressable>
        ))}
      </View>

      {evento.autor && (
        <Pressable onPress={() => router.push(`/perfil/${evento.autor!.handle}`)}>
          <Text style={e.autor}>Organiza {evento.autor.nombre}</Text>
        </Pressable>
      )}

      {evento.esMio && (
        <Pressable style={e.borrar} onPress={borrar}>
          <Text style={e.borrarTexto}>Eliminar evento</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  contenido: { padding: 16 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: TEMA.peligro },
  tipo: { fontSize: 13, fontWeight: '700', color: TEMA.naranjaHondo },
  titulo: { fontSize: 24, fontWeight: '800', color: TEMA.texto, marginTop: 6 },
  meta: { fontSize: 14, color: TEMA.textoMedio, marginTop: 6 },
  costo: { fontSize: 16, fontWeight: '700', color: TEMA.texto, marginTop: 8 },
  descripcion: { fontSize: 16, lineHeight: 24, color: TEMA.texto, marginTop: 16 },
  cuenta: { fontSize: 14, color: TEMA.textoMedio, marginTop: 12 },
  respuestas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: {
    borderWidth: 1,
    borderColor: TEMA.naranja,
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActivo: { backgroundColor: TEMA.naranja },
  chipTexto: { color: TEMA.naranjaHondo, fontWeight: '700' },
  chipTextoActivo: { color: '#fff' },
  autor: { color: TEMA.naranja, marginTop: 20, fontWeight: '600' },
  borrar: { marginTop: 24, alignItems: 'center' },
  borrarTexto: { color: TEMA.peligro, fontWeight: '700' },
});
