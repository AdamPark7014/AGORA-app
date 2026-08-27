import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, ErrorApi } from '@/lib/api';
import { TEMA } from '@/lib/tema';

interface Aventon {
  id: string;
  sentido: 'A_CAMPUS' | 'DESDE_CAMPUS';
  origen: string;
  destino: string;
  salidaAt: string;
  lugares: number;
  ocupados: number;
  cuotaMxn: number;
  nota: string | null;
  conductor: { handle: string; nombre: string } | null;
  voyYo: boolean;
  esMio: boolean;
}

function mananaTemprano(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(7, 30, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Aventones() {
  const [aventones, setAventones] = useState<Aventon[]>([]);
  const [sentido, setSentido] = useState('');
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({
    sentido: 'A_CAMPUS',
    origen: '',
    destino: 'Campus UDLAP',
    salidaAt: mananaTemprano(),
    lugares: '3',
    cuotaMxn: '25',
    nota: '',
  });

  const cargar = useCallback(async () => {
    try {
      const q = sentido ? `?sentido=${sentido}` : '';
      const datos = await api<{ aventones: Aventon[] }>(`/aventones${q}`);
      setAventones(datos.aventones);
    } catch {
      setAventones([]);
    }
  }, [sentido]);

  useEffect(() => {
    setCargando(true);
    cargar().finally(() => setCargando(false));
  }, [cargar]);

  async function publicar() {
    setEnviando(true);
    setError(null);
    try {
      await api('/aventones', {
        method: 'POST',
        body: JSON.stringify({
          sentido: nuevo.sentido,
          origen: nuevo.origen.trim(),
          destino: nuevo.destino.trim(),
          salidaAt: nuevo.salidaAt,
          lugares: Number(nuevo.lugares),
          cuotaMxn: Number(nuevo.cuotaMxn),
          nota: nuevo.nota.trim() || null,
        }),
      });
      setModal(false);
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo publicar.');
    } finally {
      setEnviando(false);
    }
  }

  async function asiento(id: string, voyYo: boolean) {
    await api(`/aventones/${id}/asiento`, { method: voyYo ? 'DELETE' : 'POST' });
    await cargar();
  }

  async function escribir(handle: string) {
    const { id } = await api<{ id: string }>('/mensajes/abrir', {
      method: 'POST',
      body: JSON.stringify({ handle }),
    });
    router.push(`/mensajes/${id}`);
  }

  return (
    <View style={e.pantalla}>
      <View style={e.barra}>
        {(['', 'A_CAMPUS', 'DESDE_CAMPUS'] as const).map((s) => (
          <Pressable
            key={s || 'todos'}
            style={[e.chip, sentido === s && e.chipActivo]}
            onPress={() => setSentido(s)}
          >
            <Text style={[e.chipTexto, sentido === s && e.chipTextoActivo]}>
              {s === '' ? 'Todos' : s === 'A_CAMPUS' ? '→ Campus' : '← Desde campus'}
            </Text>
          </Pressable>
        ))}
        <Pressable style={e.nuevo} onPress={() => setModal(true)}>
          <Text style={e.nuevoTexto}>+ Ofrecer</Text>
        </Pressable>
      </View>

      {cargando ? (
        <ActivityIndicator color={TEMA.naranja} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={aventones}
          keyExtractor={(a) => a.id}
          contentContainerStyle={e.lista}
          ListEmptyComponent={<Text style={e.vacio}>No hay aventones con ese filtro.</Text>}
          renderItem={({ item }) => (
            <View style={e.tarjeta}>
              <Text style={e.ruta}>{item.origen} → {item.destino}</Text>
              <Text style={e.meta}>
                {new Date(item.salidaAt).toLocaleString('es-MX')} · ${item.cuotaMxn} ·{' '}
                {item.ocupados}/{item.lugares} lugares
              </Text>
              {item.nota ? <Text style={e.nota}>{item.nota}</Text> : null}
              {item.conductor && (
                <Pressable onPress={() => escribir(item.conductor!.handle)}>
                  <Text style={e.conductor}>{item.conductor.nombre}</Text>
                </Pressable>
              )}
              {!item.esMio && item.ocupados < item.lugares && (
                <Pressable style={[e.boton, item.voyYo && e.botonActivo]} onPress={() => asiento(item.id, item.voyYo)}>
                  <Text style={[e.botonTexto, item.voyYo && e.botonTextoActivo]}>
                    {item.voyYo ? '✓ Voy en este' : 'Apartar lugar'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <View style={e.modal}>
          <Text style={e.modalTitulo}>Nuevo aventón</Text>
          <TextInput style={e.input} placeholder="Origen" value={nuevo.origen} onChangeText={(t) => setNuevo({ ...nuevo, origen: t })} />
          <TextInput style={e.input} placeholder="Destino" value={nuevo.destino} onChangeText={(t) => setNuevo({ ...nuevo, destino: t })} />
          <TextInput style={e.input} placeholder="Lugares" keyboardType="numeric" value={nuevo.lugares} onChangeText={(t) => setNuevo({ ...nuevo, lugares: t })} />
          <TextInput style={e.input} placeholder="Cuota MXN" keyboardType="numeric" value={nuevo.cuotaMxn} onChangeText={(t) => setNuevo({ ...nuevo, cuotaMxn: t })} />
          <TextInput style={e.input} placeholder="Nota (opcional)" value={nuevo.nota} onChangeText={(t) => setNuevo({ ...nuevo, nota: t })} />
          {error && <Text style={e.error}>{error}</Text>}
          <Pressable style={e.boton} onPress={publicar} disabled={enviando}>
            <Text style={e.botonTexto}>{enviando ? '…' : 'Publicar aventón'}</Text>
          </Pressable>
          <Pressable style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setModal(false)}>
            <Text style={{ color: TEMA.textoMedio }}>Cancelar</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  barra: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, alignItems: 'center' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: TEMA.borde, paddingHorizontal: 12, minHeight: 34, justifyContent: 'center', backgroundColor: TEMA.superficie },
  chipActivo: { backgroundColor: TEMA.naranjaSuave, borderColor: TEMA.naranja },
  chipTexto: { fontSize: 12, color: TEMA.textoMedio, fontWeight: '600' },
  chipTextoActivo: { color: TEMA.naranjaHondo },
  nuevo: { marginLeft: 'auto', backgroundColor: TEMA.naranja, borderRadius: 999, paddingHorizontal: 14, minHeight: 34, justifyContent: 'center' },
  nuevoTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
  lista: { padding: 12, flexGrow: 1 },
  tarjeta: { backgroundColor: TEMA.superficie, borderRadius: TEMA.radioChico, borderWidth: 1, borderColor: TEMA.borde, padding: 14, marginBottom: 8 },
  ruta: { fontSize: 16, fontWeight: '700', color: TEMA.texto },
  meta: { fontSize: 13, color: TEMA.textoMedio, marginTop: 4 },
  nota: { fontSize: 14, color: TEMA.texto, marginTop: 8 },
  conductor: { color: TEMA.naranja, fontWeight: '600', marginTop: 8 },
  boton: { marginTop: 10, borderWidth: 1, borderColor: TEMA.naranja, borderRadius: 999, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  botonActivo: { backgroundColor: TEMA.naranja },
  botonTexto: { color: TEMA.naranjaHondo, fontWeight: '700' },
  botonTextoActivo: { color: '#fff' },
  vacio: { textAlign: 'center', color: TEMA.textoMedio, marginTop: 40 },
  modal: { flex: 1, padding: 16, backgroundColor: TEMA.fondo },
  modalTitulo: { fontSize: 20, fontWeight: '800', marginBottom: 16, color: TEMA.texto },
  input: { backgroundColor: TEMA.superficie, borderWidth: 1, borderColor: TEMA.borde, borderRadius: TEMA.radioChico, padding: 12, marginBottom: 10, fontSize: 15, color: TEMA.texto },
  error: { color: TEMA.peligro, marginBottom: 8 },
});
