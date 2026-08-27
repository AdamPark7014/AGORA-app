import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '@/lib/api';
import { TEMA } from '@/lib/tema';
import { haceCuanto } from '@/componentes/tarjeta-post';

interface Persona {
  handle: string;
  nombre: string;
  fotoUrl: string | null;
  carrera: string | null;
}

interface Publicacion {
  id: string;
  texto: string;
  createdAt: string;
  autor: { handle: string; nombre: string } | null;
  comunidad: string;
}

interface Evento {
  id: string;
  titulo: string;
  lugar: string;
  inicioAt: string;
}

interface Anuncio {
  id: string;
  titulo: string;
  precioMxn: number;
}

const TIPOS = [
  { valor: 'todo', etiqueta: 'Todo' },
  { valor: 'personas', etiqueta: 'Personas' },
  { valor: 'publicaciones', etiqueta: 'Posts' },
  { valor: 'eventos', etiqueta: 'Eventos' },
  { valor: 'marketplace', etiqueta: 'Market' },
] as const;

export default function Buscar() {
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]['valor']>('todo');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setPersonas([]);
      setPublicaciones([]);
      setEventos([]);
      setAnuncios([]);
      return;
    }

    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const p = new URLSearchParams({ q: q.trim(), tipo });
        const datos = await api<{
          personas: Persona[];
          publicaciones: Publicacion[];
          eventos: Evento[];
          anuncios: Anuncio[];
        }>(`/buscar?${p}`);
        setPersonas(datos.personas);
        setPublicaciones(datos.publicaciones);
        setEventos(datos.eventos);
        setAnuncios(datos.anuncios);
      } catch {
        setPersonas([]);
        setPublicaciones([]);
        setEventos([]);
        setAnuncios([]);
      } finally {
        setCargando(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [q, tipo]);

  const vacio = q.trim().length >= 2 && !cargando &&
    personas.length === 0 && publicaciones.length === 0 && eventos.length === 0 && anuncios.length === 0;

  return (
    <ScrollView style={e.pantalla} contentContainerStyle={e.contenido} keyboardShouldPersistTaps="handled">
      <TextInput
        style={e.input}
        placeholder="Buscar personas, posts, eventos…"
        placeholderTextColor={TEMA.textoMedio}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={e.filtros}>
        {TIPOS.map((t) => (
          <Pressable
            key={t.valor}
            style={[e.chip, tipo === t.valor && e.chipActivo]}
            onPress={() => setTipo(t.valor)}
          >
            <Text style={[e.chipTexto, tipo === t.valor && e.chipTextoActivo]}>{t.etiqueta}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {cargando && <ActivityIndicator color={TEMA.naranja} style={{ marginVertical: 20 }} />}

      {vacio && (
        <Text style={e.vacio}>No encontramos nada con «{q.trim()}».</Text>
      )}

      {personas.length > 0 && (
        <View style={e.bloque}>
          <Text style={e.bloqueTitulo}>Personas</Text>
          {personas.map((p) => (
            <Pressable
              key={p.handle}
              style={e.fila}
              onPress={() => router.push(`/perfil/${p.handle}`)}
            >
              <View style={e.avatar}>
                <Text style={e.avatarTexto}>
                  {p.nombre
                    .split(' ')
                    .slice(0, 2)
                    .map((x) => x[0]?.toUpperCase() ?? '')
                    .join('')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={e.nombre}>{p.nombre}</Text>
                <Text style={e.sub}>@{p.handle}{p.carrera ? ` · ${p.carrera}` : ''}</Text>
              </View>
              <Text style={e.accion} onPress={async () => {
                try {
                  const { id } = await api<{ id: string }>('/mensajes/abrir', {
                    method: 'POST',
                    body: JSON.stringify({ handle: p.handle }),
                  });
                  router.push(`/mensajes/${id}`);
                } catch { /* */ }
              }}>Escribir</Text>
            </Pressable>
          ))}
        </View>
      )}

      {publicaciones.length > 0 && (
        <View style={e.bloque}>
          <Text style={e.bloqueTitulo}>Publicaciones</Text>
          {publicaciones.map((p) => (
            <Pressable
              key={p.id}
              style={e.tarjeta}
              onPress={() => router.push(`/publicacion/${p.id}`)}
            >
              <Text style={e.sub}>
                {p.autor?.nombre ?? 'Alguien'} · {p.comunidad} · {haceCuanto(p.createdAt)}
              </Text>
              <Text style={e.texto} numberOfLines={3}>{p.texto}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {eventos.length > 0 && (
        <View style={e.bloque}>
          <Text style={e.bloqueTitulo}>Eventos</Text>
          {eventos.map((ev) => (
            <Pressable key={ev.id} style={e.tarjeta} onPress={() => router.push(`/eventos/${ev.id}`)}>
              <Text style={e.nombre}>{ev.titulo}</Text>
              <Text style={e.sub}>{ev.lugar} · {new Date(ev.inicioAt).toLocaleDateString('es-MX')}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {anuncios.length > 0 && (
        <View style={e.bloque}>
          <Text style={e.bloqueTitulo}>Marketplace</Text>
          {anuncios.map((a) => (
            <Pressable key={a.id} style={e.tarjeta} onPress={() => router.push(`/marketplace/${a.id}`)}>
              <Text style={e.nombre}>{a.titulo}</Text>
              <Text style={e.sub}>${a.precioMxn.toLocaleString('es-MX')} MXN</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  contenido: { padding: 12, paddingBottom: 32 },
  input: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    paddingHorizontal: 14,
    minHeight: TEMA.tactil,
    fontSize: 15,
    color: TEMA.texto,
    marginBottom: 10,
  },
  filtros: { marginBottom: 12, flexGrow: 0 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TEMA.borde,
    backgroundColor: TEMA.superficie,
    paddingHorizontal: 14,
    minHeight: 34,
    justifyContent: 'center',
    marginRight: 8,
  },
  chipActivo: { backgroundColor: TEMA.naranjaSuave, borderColor: TEMA.naranja },
  chipTexto: { fontSize: 13, fontWeight: '600', color: TEMA.textoMedio },
  chipTextoActivo: { color: TEMA.naranjaHondo },
  vacio: { textAlign: 'center', color: TEMA.textoMedio, marginTop: 24 },
  bloque: { marginBottom: 16 },
  bloqueTitulo: { fontSize: 13, fontWeight: '700', color: TEMA.textoMedio, marginBottom: 8 },
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEMA.naranjaSuave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexto: { color: TEMA.naranjaHondo, fontWeight: '800', fontSize: 14 },
  nombre: { fontSize: 15, fontWeight: '700', color: TEMA.texto },
  sub: { fontSize: 12, color: TEMA.textoMedio, marginTop: 2 },
  accion: { fontSize: 13, fontWeight: '700', color: TEMA.naranja },
  tarjeta: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 12,
    marginBottom: 8,
  },
  texto: { fontSize: 14, lineHeight: 20, color: TEMA.texto, marginTop: 6 },
});
