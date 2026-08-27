import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, ErrorApi } from '@/lib/api';
import { subirMedia } from '@/lib/media';
import { TEMA } from '@/lib/tema';

interface Comunidad {
  slug: string;
  nombre: string;
}

const LIMITE = 2000;

/**
 * Escribir una publicación.
 *
 * Es una pestaña y no un botón flotante a propósito: en la barra de la web
 * "Vender" ocupa el centro, pero en nativo lo que más se hace es publicar, y el
 * centro de la barra es el punto más fácil de alcanzar con el pulgar.
 */
export default function Publicar() {
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    api<Comunidad[]>('/perfil/mis-comunidades')
      .then((c) => {
        setComunidades(c);
        setSlug(c[0]?.slug ?? null);
      })
      .catch(() => setError('No se pudieron cargar tus comunidades.'));
  }, []);

  async function elegirFoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Necesitamos permiso para elegir una foto.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (r.canceled || !r.assets[0]) return;
    const asset = r.assets[0];
    setSubiendo(true);
    setError(null);
    try {
      const subida = await subirMedia(
        asset.uri,
        asset.fileName ?? 'foto.jpg',
        asset.mimeType ?? 'image/jpeg',
      );
      setMediaIds([subida.id]);
      setPreview(subida.url);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo subir la foto.');
    } finally {
      setSubiendo(false);
    }
  }

  async function publicar() {
    if (!slug || !texto.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      await api('/posts', {
        method: 'POST',
        body: JSON.stringify({ comunidadSlug: slug, texto: texto.trim(), mediaIds }),
      });
      setTexto('');
      setMediaIds([]);
      setPreview(null);
      router.push('/(tabs)/feed');
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo publicar.');
    } finally {
      setEnviando(false);
    }
  }

  const restantes = LIMITE - texto.length;

  return (
    <ScrollView style={e.pantalla} contentContainerStyle={e.contenido}>
      <Text style={e.etiqueta}>Publicar en</Text>
      <View style={e.chips}>
        {comunidades.map((c) => (
          <Pressable
            key={c.slug}
            onPress={() => setSlug(c.slug)}
            style={[e.chip, slug === c.slug && e.chipActivo]}
            accessibilityRole="button"
            accessibilityState={{ selected: slug === c.slug }}
          >
            <Text style={[e.chipTexto, slug === c.slug && e.chipTextoActivo]}>{c.nombre}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={e.area}
        placeholder="¿Qué está pasando en el campus?"
        placeholderTextColor={TEMA.textoTenue}
        multiline
        maxLength={LIMITE}
        value={texto}
        onChangeText={setTexto}
        textAlignVertical="top"
      />

      {preview && (
        <Image source={{ uri: preview }} style={e.preview} contentFit="cover" />
      )}

      <View style={e.barra}>
        <Pressable style={e.adjuntar} onPress={elegirFoto} disabled={subiendo}>
          <Text style={e.adjuntarTexto}>{subiendo ? '…' : '📷 Foto'}</Text>
        </Pressable>
        {/* El contador solo aparece cuando empieza a importar; siempre visible
            es ruido que nadie mira. */}
        <Text style={[e.contador, restantes < 0 && e.contadorMal]}>
          {restantes < 200 ? restantes : ''}
        </Text>
        <Pressable
          style={[e.boton, (enviando || !texto.trim() || !slug) && e.botonApagado]}
          disabled={enviando || !texto.trim() || !slug}
          onPress={publicar}
        >
          <Text style={e.botonTexto}>{enviando ? 'Publicando…' : 'Publicar'}</Text>
        </Pressable>
      </View>

      {error && <Text style={e.error}>{error}</Text>}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  contenido: { padding: 16 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: TEMA.textoMedio, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    borderWidth: 1,
    borderColor: TEMA.borde,
    backgroundColor: TEMA.superficie,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActivo: { backgroundColor: TEMA.naranjaSuave, borderColor: TEMA.naranja },
  chipTexto: { fontSize: 13, color: TEMA.textoMedio },
  chipTextoActivo: { color: TEMA.naranjaHondo, fontWeight: '700' },
  area: {
    backgroundColor: TEMA.superficie,
    borderWidth: 1,
    borderColor: TEMA.borde,
    borderRadius: TEMA.radio,
    padding: 14,
    minHeight: 160,
    fontSize: 16,
    lineHeight: 23,
    color: TEMA.texto,
  },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: TEMA.radioChico, marginTop: 10 },
  adjuntar: {
    marginRight: 'auto',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TEMA.borde,
    backgroundColor: TEMA.superficie,
  },
  adjuntarTexto: { fontSize: 14, color: TEMA.textoMedio, fontWeight: '600' },
  contador: { fontSize: 13, color: TEMA.textoTenue },
  contadorMal: { color: TEMA.peligro, fontWeight: '700' },
  boton: {
    backgroundColor: TEMA.naranja,
    borderRadius: 999,
    minHeight: TEMA.tactil,
    paddingHorizontal: 26,
    justifyContent: 'center',
  },
  botonApagado: { opacity: 0.45 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { color: TEMA.peligro, marginTop: 12, fontSize: 14 },
});
