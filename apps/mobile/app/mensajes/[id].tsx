import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, ErrorApi } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { TEMA } from '@/lib/tema';

interface Mensaje {
  id: string;
  texto: string;
  createdAt: string;
  mio: boolean;
}

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [con, setCon] = useState<{ handle: string; nombre: string } | null>(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [siguienteCursor, setSiguienteCursor] = useState<string | null>(null);
  const [cargandoAntiguos, setCargandoAntiguos] = useState(false);
  const listaRef = useRef<FlatList>(null);

  /** Devuelve `true` si llegaron mensajes nuevos, para no frenar el sondeo. */
  const traerRecientes = useCallback(async (): Promise<boolean> => {
    try {
      const datos = await api<{
        mensajes: Mensaje[];
        con: { handle: string; nombre: string } | null;
        siguienteCursor: string | null;
      }>(`/mensajes/${id}`);
      setCon(datos.con);
      setSiguienteCursor(datos.siguienteCursor);
      let huboNuevos = false;
      setMensajes((previos) => {
        if (previos.length === 0) {
          huboNuevos = datos.mensajes.length > 0;
          return datos.mensajes;
        }
        const ids = new Set(previos.map((m) => m.id));
        const nuevos = datos.mensajes.filter((m) => !ids.has(m.id));
        if (!nuevos.length) return previos;
        huboNuevos = true;
        return [...previos, ...nuevos];
      });
      setError(null);
      return huboNuevos;
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.estado === 404
          ? 'Esa conversación no existe.'
          : 'No se pudo cargar.',
      );
      return false;
    }
  }, [id]);

  useEffect(() => {
    traerRecientes()
      .finally(() => setCargando(false))
      .then(() => {
        setTimeout(() => listaRef.current?.scrollToEnd({ animated: false }), 100);
      });
  }, [traerRecientes]);

  // En el telefono cada peticion despierta la radio: el techo de un minuto en
  // una conversacion callada es bateria y datos que no se gastan.
  const { reiniciar: reanudarSondeo } = usePolling(
    () => traerRecientes(),
    4_000,
    !cargando,
    60_000,
  );

  async function cargarAntiguos() {
    if (!siguienteCursor || cargandoAntiguos) return;
    setCargandoAntiguos(true);
    try {
      const datos = await api<{ mensajes: Mensaje[]; siguienteCursor: string | null }>(
        `/mensajes/${id}?cursor=${siguienteCursor}`,
      );
      setSiguienteCursor(datos.siguienteCursor);
      setMensajes((prev) => [...datos.mensajes, ...prev]);
    } catch {
      // Silencioso.
    } finally {
      setCargandoAntiguos(false);
    }
  }

  async function enviar() {
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await api(`/mensajes/${id}`, {
        method: 'POST',
        body: JSON.stringify({ texto: limpio }),
      });
      setTexto('');
      await traerRecientes();
      // Acabas de escribir: vuelve el ritmo rapido aunque estuviera frenado.
      reanudarSondeo();
      setTimeout(() => listaRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo enviar.');
    } finally {
      setEnviando(false);
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
    <KeyboardAvoidingView
      style={e.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <FlatList
        ref={listaRef}
        data={mensajes}
        keyExtractor={(m) => m.id}
        contentContainerStyle={e.hilo}
        onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          siguienteCursor ? (
            <Pressable
              style={e.cargarMas}
              onPress={cargarAntiguos}
              disabled={cargandoAntiguos}
            >
              <Text style={e.cargarMasTexto}>
                {cargandoAntiguos ? 'Cargando…' : 'Cargar mensajes anteriores'}
              </Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <Text style={e.vacio}>Todavía no hay mensajes. Escribe el primero.</Text>
        }
        renderItem={({ item }) => (
          <View style={[e.burbuja, item.mio && e.burbujaMia]}>
            <Text style={[e.burbujaTexto, item.mio && e.burbujaTextoMia]}>{item.texto}</Text>
          </View>
        )}
      />

      {error && <Text style={e.error}>{error}</Text>}

      <View style={e.composer}>
        <TextInput
          style={e.input}
          multiline
          maxLength={4000}
          placeholder={`Escribe a ${con?.nombre ?? '…'}`}
          placeholderTextColor={TEMA.textoMedio}
          value={texto}
          onChangeText={setTexto}
        />
        <Pressable
          style={[e.enviar, (!texto.trim() || enviando) && e.enviarDeshabilitado]}
          onPress={enviar}
          disabled={!texto.trim() || enviando}
        >
          <Text style={e.enviarTexto}>{enviando ? '…' : 'Enviar'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TEMA.fondo },
  hilo: { padding: 12, paddingBottom: 8, flexGrow: 1 },
  cargarMas: {
    alignSelf: 'center',
    marginBottom: 12,
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
  },
  cargarMasTexto: { color: TEMA.naranja, fontWeight: '600', fontSize: 13 },
  vacio: { textAlign: 'center', color: TEMA.textoMedio, marginTop: 40 },
  burbuja: {
    alignSelf: 'flex-start',
    maxWidth: '82%',
    backgroundColor: TEMA.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TEMA.borde,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  burbujaMia: {
    alignSelf: 'flex-end',
    backgroundColor: TEMA.naranja,
    borderColor: TEMA.naranja,
  },
  burbujaTexto: { fontSize: 15, lineHeight: 21, color: TEMA.texto },
  burbujaTextoMia: { color: '#fff' },
  error: { color: TEMA.peligro, fontSize: 13, paddingHorizontal: 12, marginBottom: 4 },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: TEMA.borde,
    backgroundColor: TEMA.superficie,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    backgroundColor: TEMA.fondo,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: TEMA.texto,
  },
  enviar: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: TEMA.naranja,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  enviarDeshabilitado: { opacity: 0.5 },
  enviarTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
