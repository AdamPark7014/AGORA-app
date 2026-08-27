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
import { haceCuanto } from '@/componentes/tarjeta-post';

interface Anuncio {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  precioMxn: number;
  estadoVenta: string;
  createdAt: string;
  imagenes: string[];
  vendedor: { handle: string; nombre: string } | null;
}

const CATEGORIAS = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'LIBROS', etiqueta: 'Libros' },
  { valor: 'ELECTRONICA', etiqueta: 'Electrónica' },
  { valor: 'ROPA', etiqueta: 'Ropa' },
  { valor: 'OTRO', etiqueta: 'Otro' },
] as const;

export default function Marketplace() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [categoria, setCategoria] = useState('');
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ titulo: '', descripcion: '', categoria: 'LIBROS', precioMxn: '' });

  const cargar = useCallback(
    async (desde?: string) => {
      const p = new URLSearchParams();
      if (categoria) p.set('categoria', categoria);
      if (q.trim()) p.set('q', q.trim());
      if (desde) p.set('cursor', desde);
      try {
        const datos = await api<{ anuncios: Anuncio[]; siguienteCursor: string | null }>(`/anuncios?${p}`);
        setAnuncios((prev) => (desde ? [...prev, ...datos.anuncios] : datos.anuncios));
        setCursor(datos.siguienteCursor);
      } catch {
        if (!desde) setAnuncios([]);
      }
    },
    [categoria, q],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setCargando(true);
      cargar().finally(() => setCargando(false));
    }, 250);
    return () => clearTimeout(t);
  }, [categoria, q, cargar]);

  async function publicar() {
    setEnviando(true);
    setError(null);
    try {
      await api('/anuncios', {
        method: 'POST',
        body: JSON.stringify({
          titulo: nuevo.titulo.trim(),
          descripcion: nuevo.descripcion.trim(),
          categoria: nuevo.categoria,
          precioMxn: Number(nuevo.precioMxn),
          mediaIds: [],
        }),
      });
      setModal(false);
      setNuevo({ titulo: '', descripcion: '', categoria: 'LIBROS', precioMxn: '' });
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo publicar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={e.pantalla}>
      <View style={e.barra}>
        <TextInput
          style={e.buscar}
          placeholder="Buscar anuncios…"
          placeholderTextColor={TEMA.textoMedio}
          value={q}
          onChangeText={setQ}
        />
        <Pressable style={e.nuevo} onPress={() => setModal(true)}>
          <Text style={e.nuevoTexto}>+ Vender</Text>
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={CATEGORIAS}
        keyExtractor={(c) => c.valor || 'todas'}
        showsHorizontalScrollIndicator={false}
        style={e.filtros}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            style={[e.chip, categoria === item.valor && e.chipActivo]}
            onPress={() => setCategoria(item.valor)}
          >
            <Text style={[e.chipTexto, categoria === item.valor && e.chipTextoActivo]}>{item.etiqueta}</Text>
          </Pressable>
        )}
      />

      {cargando ? (
        <ActivityIndicator color={TEMA.naranja} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={anuncios}
          keyExtractor={(a) => a.id}
          contentContainerStyle={e.lista}
          onEndReached={() => cursor && cargar(cursor)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<Text style={e.vacio}>No hay anuncios con esos filtros.</Text>}
          renderItem={({ item }) => (
            <Pressable style={e.tarjeta} onPress={() => router.push(`/marketplace/${item.id}`)}>
              <Text style={e.precio}>${item.precioMxn.toLocaleString('es-MX')}</Text>
              <Text style={e.titulo}>{item.titulo}</Text>
              <Text style={e.meta}>
                {item.vendedor?.nombre ?? 'Alguien'} · {haceCuanto(item.createdAt)}
              </Text>
              {item.estadoVenta !== 'DISPONIBLE' && (
                <Text style={e.vendido}>Vendido</Text>
              )}
            </Pressable>
          )}
        />
      )}

      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <View style={e.modal}>
          <Text style={e.modalTitulo}>Nuevo anuncio</Text>
          <TextInput
            style={e.input}
            placeholder="Título"
            placeholderTextColor={TEMA.textoMedio}
            value={nuevo.titulo}
            onChangeText={(t) => setNuevo({ ...nuevo, titulo: t })}
          />
          <TextInput
            style={[e.input, { minHeight: 80 }]}
            placeholder="Descripción"
            placeholderTextColor={TEMA.textoMedio}
            multiline
            value={nuevo.descripcion}
            onChangeText={(t) => setNuevo({ ...nuevo, descripcion: t })}
          />
          <TextInput
            style={e.input}
            placeholder="Precio MXN"
            placeholderTextColor={TEMA.textoMedio}
            keyboardType="numeric"
            value={nuevo.precioMxn}
            onChangeText={(t) => setNuevo({ ...nuevo, precioMxn: t })}
          />
          {error && <Text style={e.error}>{error}</Text>}
          <View style={e.modalAcciones}>
            <Pressable style={e.botonSec} onPress={() => setModal(false)}>
              <Text>Cancelar</Text>
            </Pressable>
            <Pressable style={e.boton} onPress={publicar} disabled={enviando}>
              <Text style={e.botonTexto}>{enviando ? '…' : 'Publicar'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  barra: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 0 },
  buscar: {
    flex: 1,
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    paddingHorizontal: 12,
    minHeight: 44,
    color: TEMA.texto,
  },
  nuevo: {
    backgroundColor: TEMA.naranja,
    borderRadius: TEMA.radioChico,
    paddingHorizontal: 14,
    justifyContent: 'center',
    minHeight: 44,
  },
  nuevoTexto: { color: '#fff', fontWeight: '700' },
  filtros: { maxHeight: 48, marginVertical: 10 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TEMA.borde,
    paddingHorizontal: 14,
    minHeight: 34,
    justifyContent: 'center',
    backgroundColor: TEMA.superficie,
  },
  chipActivo: { backgroundColor: TEMA.naranjaSuave, borderColor: TEMA.naranja },
  chipTexto: { fontSize: 13, color: TEMA.textoMedio, fontWeight: '600' },
  chipTextoActivo: { color: TEMA.naranjaHondo },
  lista: { padding: 12, flexGrow: 1 },
  tarjeta: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 14,
    marginBottom: 8,
  },
  precio: { fontSize: 18, fontWeight: '800', color: TEMA.naranjaHondo },
  titulo: { fontSize: 16, fontWeight: '700', color: TEMA.texto, marginTop: 4 },
  meta: { fontSize: 12, color: TEMA.textoMedio, marginTop: 4 },
  vendido: { fontSize: 12, color: TEMA.peligro, fontWeight: '700', marginTop: 4 },
  vacio: { textAlign: 'center', color: TEMA.textoMedio, marginTop: 40 },
  modal: { flex: 1, padding: 16, backgroundColor: TEMA.fondo },
  modalTitulo: { fontSize: 20, fontWeight: '800', marginBottom: 16, color: TEMA.texto },
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
  error: { color: TEMA.peligro, marginBottom: 8 },
  modalAcciones: { flexDirection: 'row', gap: 10, marginTop: 8 },
  botonSec: {
    flex: 1,
    minHeight: TEMA.tactil,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TEMA.borde,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TEMA.superficie,
  },
  boton: {
    flex: 1,
    minHeight: TEMA.tactil,
    borderRadius: 999,
    backgroundColor: TEMA.naranja,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonTexto: { color: '#fff', fontWeight: '700' },
});
