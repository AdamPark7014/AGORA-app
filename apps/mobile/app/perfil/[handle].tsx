import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api, ErrorApi } from '@/lib/api';
import { TEMA } from '@/lib/tema';
import { haceCuanto } from '@/componentes/tarjeta-post';

interface Perfil {
  handle: string;
  nombre: string;
  apellidos: string;
  bio?: string | null;
  fotoUrl?: string | null;
  ciudadOrigen?: string | null;
  instagram?: string | null;
  intereses?: string[];
  seguidores?: number;
  siguiendo?: number;
  publicaciones?: number;
  carrera?: string | null;
  escuela?: string | null;
  yoLeSigo?: boolean;
  restringido?: boolean;
  verificado?: boolean;
}

interface Publicacion {
  id: string;
  texto: string;
  createdAt: string;
  comunidad: string;
  numComments: number;
  numReactions: number;
}

export default function PerfilAjeno() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [yo, setYo] = useState<string | null>(null);
  const [siguiendo, setSiguiendo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    if (!handle) return;
    try {
      const datos = await api<Perfil>(`/perfil/${handle}`);
      setPerfil(datos);
      setSiguiendo(datos.yoLeSigo ?? false);
      if (!datos.restringido) {
        const p = await api<{ publicaciones: Publicacion[]; siguienteCursor: string | null }>(
          `/perfil/${handle}/publicaciones`,
        );
        setPublicaciones(p.publicaciones);
        setCursor(p.siguienteCursor);
      } else {
        setPublicaciones([]);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof ErrorApi && e.estado === 404 ? 'No existe ese perfil.' : 'No se pudo cargar.');
    }
  }, [handle]);

  useEffect(() => {
    cargar().finally(() => setCargando(false));
    api<{ handle: string | null }>('/auth/yo')
      .then((u) => setYo(u.handle))
      .catch(() => undefined);
  }, [cargar]);

  async function alternarSeguir() {
    if (!handle) return;
    setOcupado(true);
    const era = siguiendo;
    setSiguiendo(!era);
    try {
      await api(`/perfil/${handle}/seguir`, { method: 'POST' });
    } catch {
      setSiguiendo(era);
    } finally {
      setOcupado(false);
    }
  }

  async function escribir() {
    if (!handle) return;
    setOcupado(true);
    try {
      const { id } = await api<{ id: string }>('/mensajes/abrir', {
        method: 'POST',
        body: JSON.stringify({ handle }),
      });
      router.push(`/mensajes/${id}`);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el chat.');
    } finally {
      setOcupado(false);
    }
  }

  async function cargarMas() {
    if (!handle || !cursor) return;
    const p = await api<{ publicaciones: Publicacion[]; siguienteCursor: string | null }>(
      `/perfil/${handle}/publicaciones?cursor=${cursor}`,
    );
    setPublicaciones((prev) => [...prev, ...p.publicaciones]);
    setCursor(p.siguienteCursor);
  }

  if (cargando) {
    return (
      <View style={e.centro}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  if (error || !perfil) {
    return (
      <View style={e.centro}>
        <Text style={e.error}>{error ?? 'Perfil no encontrado.'}</Text>
      </View>
    );
  }

  const esMio = yo === handle;
  const nombreCompleto = `${perfil.nombre} ${perfil.apellidos}`;

  return (
    <FlatList
      data={publicaciones}
      keyExtractor={(p) => p.id}
      contentContainerStyle={e.lista}
      ListHeaderComponent={
        <View>
          <View style={e.cabecera}>
            <View style={e.avatar}>
              <Text style={e.avatarTexto}>
                {nombreCompleto
                  .split(' ')
                  .slice(0, 2)
                  .map((x) => x[0]?.toUpperCase() ?? '')
                  .join('')}
              </Text>
            </View>
            <Text style={e.nombre}>
              {nombreCompleto}
              {perfil.verificado ? ' ✓' : ''}
            </Text>
            <Text style={e.handle}>@{perfil.handle}</Text>
            {perfil.bio ? <Text style={e.bio}>{perfil.bio}</Text> : null}
            {perfil.carrera ? <Text style={e.dato}>{perfil.escuela} · {perfil.carrera}</Text> : null}
            {perfil.ciudadOrigen ? <Text style={e.dato}>📍 {perfil.ciudadOrigen}</Text> : null}
            {perfil.instagram ? <Text style={e.dato}>📷 @{perfil.instagram}</Text> : null}

            <View style={e.cifras}>
              <Text style={e.cifra}><Text style={e.cifraN}>{perfil.publicaciones ?? 0}</Text> posts</Text>
              <Text style={e.cifra}><Text style={e.cifraN}>{perfil.seguidores ?? 0}</Text> seguidores</Text>
              <Text style={e.cifra}><Text style={e.cifraN}>{perfil.siguiendo ?? 0}</Text> siguiendo</Text>
            </View>

            {perfil.restringido ? (
              <Text style={e.restringido}>Este perfil es privado o no compartís comunidades.</Text>
            ) : esMio ? (
              <Pressable style={e.botonSec} onPress={() => router.push('/ajustes')}>
                <Text style={e.botonSecTexto}>Editar perfil</Text>
              </Pressable>
            ) : (
              <View style={e.acciones}>
                <Pressable
                  style={[e.boton, siguiendo && e.botonActivo]}
                  onPress={alternarSeguir}
                  disabled={ocupado}
                >
                  <Text style={[e.botonTexto, siguiendo && e.botonTextoActivo]}>
                    {siguiendo ? '✓ Siguiendo' : '＋ Seguir'}
                  </Text>
                </Pressable>
                <Pressable style={e.botonSec} onPress={escribir} disabled={ocupado}>
                  <Text style={e.botonSecTexto}>Escribirle</Text>
                </Pressable>
              </View>
            )}

            {perfil.intereses && perfil.intereses.length > 0 && (
              <View style={e.chips}>
                {perfil.intereses.map((i) => (
                  <View key={i} style={e.chip}>
                    <Text style={e.chipTexto}>{i}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          {!perfil.restringido && (
            <Text style={e.seccionTitulo}>Publicaciones</Text>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={e.post} onPress={() => router.push(`/publicacion/${item.id}`)}>
          <Text style={e.postMeta}>{haceCuanto(item.createdAt)} · {item.comunidad}</Text>
          <Text style={e.postTexto} numberOfLines={4}>{item.texto}</Text>
          <Text style={e.postCuentas}>
            {item.numReactions} reacciones · {item.numComments} comentarios
          </Text>
        </Pressable>
      )}
      ListEmptyComponent={
        !perfil.restringido ? (
          <Text style={e.vacio}>Sin publicaciones todavía.</Text>
        ) : null
      }
      ListFooterComponent={
        cursor ? (
          <Pressable style={e.cargarMas} onPress={cargarMas}>
            <Text style={e.cargarMasTexto}>Cargar más</Text>
          </Pressable>
        ) : null
      }
    />
  );
}

const e = StyleSheet.create({
  lista: { padding: 12, backgroundColor: TEMA.fondo, flexGrow: 1 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TEMA.fondo, padding: 24 },
  error: { color: TEMA.peligro, textAlign: 'center' },
  cabecera: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radio,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: TEMA.naranjaSuave,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarTexto: { color: TEMA.naranjaHondo, fontWeight: '800', fontSize: 26 },
  nombre: { fontSize: 20, fontWeight: '800', color: TEMA.texto },
  handle: { fontSize: 14, color: TEMA.textoMedio, marginTop: 2 },
  bio: { fontSize: 15, lineHeight: 21, color: TEMA.texto, marginTop: 10, textAlign: 'center' },
  dato: { fontSize: 13, color: TEMA.textoMedio, marginTop: 6 },
  cifras: { flexDirection: 'row', gap: 16, marginTop: 14 },
  cifra: { fontSize: 13, color: TEMA.textoMedio },
  cifraN: { fontWeight: '800', color: TEMA.texto },
  restringido: { marginTop: 14, color: TEMA.textoMedio, textAlign: 'center', fontSize: 14 },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 14 },
  boton: {
    borderWidth: 1,
    borderColor: TEMA.naranja,
    borderRadius: 999,
    paddingHorizontal: 18,
    minHeight: TEMA.tactil,
    justifyContent: 'center',
  },
  botonActivo: { backgroundColor: TEMA.naranja },
  botonTexto: { color: TEMA.naranjaHondo, fontWeight: '700' },
  botonTextoActivo: { color: '#fff' },
  botonSec: {
    borderWidth: 1,
    borderColor: TEMA.borde,
    borderRadius: 999,
    paddingHorizontal: 18,
    minHeight: TEMA.tactil,
    justifyContent: 'center',
    backgroundColor: TEMA.superficie2,
  },
  botonSecTexto: { color: TEMA.texto, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' },
  chip: { backgroundColor: TEMA.superficie2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipTexto: { fontSize: 13, color: TEMA.texto },
  seccionTitulo: { fontSize: 15, fontWeight: '700', color: TEMA.texto, marginBottom: 8 },
  post: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 12,
    marginBottom: 8,
  },
  postMeta: { fontSize: 12, color: TEMA.textoMedio, marginBottom: 6 },
  postTexto: { fontSize: 15, lineHeight: 21, color: TEMA.texto },
  postCuentas: { fontSize: 12, color: TEMA.naranja, marginTop: 8, fontWeight: '600' },
  vacio: { textAlign: 'center', color: TEMA.textoMedio, paddingVertical: 24 },
  cargarMas: { alignItems: 'center', paddingVertical: 16 },
  cargarMasTexto: { color: TEMA.naranja, fontWeight: '700' },
});
