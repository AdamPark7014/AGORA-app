import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { TEMA } from '@/lib/tema';

interface Persona {
  handle: string;
  nombre: string;
  apellidos: string;
  generacion: number | null;
  carrera: string | null;
  escuela: string | null;
}

export default function Directorio() {
  const [q, setQ] = useState('');
  const [generacion, setGeneracion] = useState('');
  const [resultados, setResultados] = useState<Persona[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const ANO = new Date().getFullYear();
  const generaciones = Array.from({ length: 8 }, (_, i) => String(ANO + 1 - i));

  const buscar = useCallback(
    async (desde?: string) => {
      const p = new URLSearchParams();
      if (q.trim()) p.set('q', q.trim());
      if (generacion) p.set('generacion', generacion);
      if (desde) p.set('cursor', desde);
      try {
        const datos = await api<{ resultados: Persona[]; siguienteCursor: string | null }>(
          `/directorio?${p}`,
        );
        setResultados((prev) => (desde ? [...prev, ...datos.resultados] : datos.resultados));
        setCursor(datos.siguienteCursor);
      } catch {
        if (!desde) setResultados([]);
      }
    },
    [q, generacion],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setCargando(true);
      buscar().finally(() => setCargando(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, generacion, buscar]);

  return (
    <View style={e.pantalla}>
      <TextInput
        style={e.input}
        placeholder="Nombre o @handle"
        placeholderTextColor={TEMA.textoMedio}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
      />
      <FlatList
        horizontal
        data={['', ...generaciones]}
        keyExtractor={(g) => g || 'todas'}
        showsHorizontalScrollIndicator={false}
        style={e.filtros}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable
            style={[e.chip, generacion === item && e.chipActivo]}
            onPress={() => setGeneracion(item)}
          >
            <Text style={[e.chipTexto, generacion === item && e.chipTextoActivo]}>
              {item ? `Gen ${item}` : 'Todas'}
            </Text>
          </Pressable>
        )}
      />

      {cargando ? (
        <ActivityIndicator color={TEMA.naranja} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={resultados}
          keyExtractor={(p) => p.handle}
          contentContainerStyle={e.lista}
          onEndReached={() => cursor && buscar(cursor)}
          ListEmptyComponent={<Text style={e.vacio}>Nadie coincide con esa búsqueda.</Text>}
          renderItem={({ item }) => (
            <Pressable style={e.fila} onPress={() => router.push(`/perfil/${item.handle}`)}>
              <View style={e.avatar}>
                <Text style={e.avatarTexto}>
                  {`${item.nombre} ${item.apellidos}`
                    .split(' ')
                    .slice(0, 2)
                    .map((x) => x[0]?.toUpperCase() ?? '')
                    .join('')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={e.nombre}>{item.nombre} {item.apellidos}</Text>
                <Text style={e.sub}>
                  @{item.handle}
                  {item.carrera ? ` · ${item.carrera}` : ''}
                  {item.generacion ? ` · Gen ${item.generacion}` : ''}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  input: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    paddingHorizontal: 14,
    minHeight: 44,
    fontSize: 15,
    color: TEMA.texto,
  },
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
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 12,
    marginBottom: 8,
    minHeight: TEMA.tactil,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: TEMA.naranjaSuave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexto: { color: TEMA.naranjaHondo, fontWeight: '800' },
  nombre: { fontSize: 15, fontWeight: '700', color: TEMA.texto },
  sub: { fontSize: 12, color: TEMA.textoMedio, marginTop: 2 },
  vacio: { textAlign: 'center', color: TEMA.textoMedio, marginTop: 40 },
});
