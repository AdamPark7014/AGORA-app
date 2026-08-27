import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, ErrorApi } from '@/lib/api';
import { TEMA } from '@/lib/tema';
import { haceCuanto } from '@/componentes/tarjeta-post';

interface Comentario {
  id: string;
  texto: string;
  createdAt: string;
  autor: { nombre: string } | null;
}

interface Detalle {
  id: string;
  texto: string;
  createdAt: string;
  autor: { nombre: string } | null;
  comunidad: { nombre: string };
  numComments: number;
  numReactions: number;
  comentarios: Comentario[];
}

export default function Publicacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<Detalle | null>(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!id) return;
    try {
      setPost(await api<Detalle>(`/posts/${id}`));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar.');
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function comentar() {
    if (!id || !texto.trim()) return;
    try {
      await api(`/posts/${id}/comentarios`, {
        method: 'POST',
        body: JSON.stringify({ texto }),
      });
      setTexto('');
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo comentar.');
    }
  }

  if (!post && !error) {
    return (
      <View style={[e.pantalla, e.centrado]}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={e.pantalla}>
        <Text style={e.error}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={e.pantalla} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={e.meta}>
        {post.autor?.nombre ?? 'Alguien'} · {post.comunidad.nombre} · {haceCuanto(post.createdAt)}
      </Text>
      {post.texto ? <Text style={e.cuerpo}>{post.texto}</Text> : null}
      <Text style={e.meta}>
        {post.numReactions} reacciones · {post.numComments} comentarios
      </Text>

      {post.comentarios.map((c) => (
        <View key={c.id} style={e.comentario}>
          <Text style={e.comentarioAutor}>{c.autor?.nombre ?? 'Alguien'}</Text>
          <Text style={e.comentarioTexto}>{c.texto}</Text>
        </View>
      ))}

      <TextInput
        style={e.campo}
        placeholder="Escribe un comentario…"
        placeholderTextColor={TEMA.textoTenue}
        value={texto}
        onChangeText={setTexto}
        multiline
      />
      <Pressable style={e.boton} onPress={comentar}>
        <Text style={e.botonTexto}>Comentar</Text>
      </Pressable>
      {error && <Text style={e.error}>{error}</Text>}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  centrado: { justifyContent: 'center', alignItems: 'center' },
  meta: { color: TEMA.textoMedio, fontSize: 13 },
  cuerpo: { fontSize: 16, lineHeight: 24, color: TEMA.texto },
  comentario: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radioChico,
    padding: 10,
    borderWidth: 1,
    borderColor: TEMA.borde,
  },
  comentarioAutor: { fontWeight: '700', color: TEMA.texto, fontSize: 13 },
  comentarioTexto: { color: TEMA.texto, marginTop: 4 },
  campo: {
    backgroundColor: TEMA.superficie,
    borderWidth: 1,
    borderColor: TEMA.borde,
    borderRadius: TEMA.radioChico,
    padding: 12,
    color: TEMA.texto,
    minHeight: 80,
  },
  boton: {
    backgroundColor: TEMA.naranja,
    padding: 12,
    borderRadius: TEMA.radioChico,
    alignItems: 'center',
  },
  botonTexto: { color: '#fff', fontWeight: '700' },
  error: { color: '#c0392b' },
});
