import { memo, useState } from 'react';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/lib/api';
import { TEMA } from '@/lib/tema';
import { BotonGuardar } from '@/componentes/boton-guardar';
export interface Post {
  id: string;
  texto: string;
  createdAt: string;
  autor: { handle: string; nombre: string } | null;
  comunidad: { slug: string; nombre: string };
  media: { url: string; mime: string; esVideo: boolean }[];
  encuesta: { pregunta: string; opciones: { id: string; texto: string; votos: number }[] } | null;
  numComments: number;
  numReactions: number;
  miReaccion: string | null;
  guardado?: boolean;
}

const REACCIONES = [
  { tipo: 'ME_LATE', emoji: '🧡' },
  { tipo: 'ME_RIO', emoji: '😂' },
  { tipo: 'APOYO', emoji: '🤝' },
  { tipo: 'NO_MAMES', emoji: '😮' },
] as const;

function TextoConHashtags({ texto }: { texto: string }) {
  const partes = texto.split(/(#\w+)/g);
  return (
    <Text style={e.cuerpo}>
      {partes.map((parte, i) =>
        parte.startsWith('#') ? (
          <Text
            key={i}
            style={e.hashtag}
            onPress={() => router.push(`/hashtag/${encodeURIComponent(parte.slice(1))}`)}
          >
            {parte}
          </Text>
        ) : (
          <Text key={i}>{parte}</Text>
        ),
      )}
    </Text>
  );
}
export function haceCuanto(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

/** Avatar de iniciales: mismo criterio que la web, sin pedir imagen al servidor. */
function Avatar({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={e.avatar}>
      <Text style={e.avatarTexto}>{iniciales || '?'}</Text>
    </View>
  );
}

/**
 * Una publicación del feed.
 *
 * `memo` importa aquí de verdad: la lista re-renderiza en cada scroll y cada
 * tarjeta puede traer imagen. Sin esto, el feed se siente pegajoso en gama baja.
 */
export const TarjetaPost = memo(function TarjetaPost({ post }: { post: Post }) {
  const [miReaccion, setMiReaccion] = useState(post.miReaccion);
  const [total, setTotal] = useState(post.numReactions);
  const [encuesta, setEncuesta] = useState(post.encuesta);
  const [votando, setVotando] = useState(false);

  async function reaccionar(tipo: string) {
    const activa = miReaccion === tipo;
    const anterior = miReaccion;
    setMiReaccion(activa ? null : tipo);
    setTotal((t) => t + (activa ? -1 : anterior && anterior !== tipo ? 0 : 1) - (anterior && anterior !== tipo ? 1 : 0));
    try {
      await api(`/posts/${post.id}/reacciones`, {
        method: 'POST',
        body: JSON.stringify({ tipo: activa ? null : tipo }),
      });
    } catch {
      setMiReaccion(anterior);
      setTotal(post.numReactions);
    }
  }

  async function votar(opcionId: string) {
    if (votando || !encuesta) return;
    setVotando(true);
    try {
      const r = await api<{ encuesta: Post['encuesta'] }>(`/posts/${post.id}/votos`, {
        method: 'POST',
        body: JSON.stringify({ opcionId }),
      });
      setEncuesta(r.encuesta);
    } catch {
      // Silencioso.
    } finally {
      setVotando(false);
    }
  }

  const imagen = post.media.find((m) => !m.esVideo);
  const votosTotales = encuesta?.opciones.reduce((s, o) => s + o.votos, 0) ?? 0;

  return (
    <View style={e.tarjeta}>
      <Pressable
        style={e.cabeza}
        onPress={() => post.autor && router.push(`/perfil/${post.autor.handle}`)}
        disabled={!post.autor}
      >
        <Avatar nombre={post.autor?.nombre ?? '?'} />
        <View style={e.cabezaTexto}>
          <Text style={e.nombre} numberOfLines={1}>
            {post.autor?.nombre ?? 'Cuenta eliminada'}
          </Text>
          <Text style={e.meta} numberOfLines={1}>
            {post.comunidad.nombre} · {haceCuanto(post.createdAt)}
          </Text>
        </View>
      </Pressable>

      {post.texto ? <TextoConHashtags texto={post.texto} /> : null}
      {imagen && (
        <Image
          source={{ uri: imagen.url }}
          style={e.imagen}
          // `expo-image` cachea en memoria y disco; con `Image` de React Native
          // cada vuelta al feed vuelve a descargar la misma foto.
          contentFit="cover"
          transition={160}
          cachePolicy="memory-disk"
          accessibilityLabel={post.texto ? undefined : `Imagen de ${post.autor?.nombre ?? "alguien"}`}
        />
      )}

      {encuesta && (
        <View style={e.encuesta}>
          <Text style={e.encuestaPregunta}>{encuesta.pregunta}</Text>
          {encuesta.opciones.map((o) => {
            const pct = votosTotales ? Math.round((o.votos / votosTotales) * 100) : 0;
            return (
              <Pressable
                key={o.id}
                style={e.opcion}
                onPress={() => votar(o.id)}
                disabled={votando}
              >
                <View style={[e.opcionBarra, { width: `${pct}%` }]} />
                <Text style={e.opcionTexto}>
                  {o.texto} · {pct}%
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={e.acciones}>
        {REACCIONES.map((r) => (
          <Pressable
            key={r.tipo}
            onPress={() => reaccionar(r.tipo)}
            style={e.accion}
            accessibilityRole="button"
          >
            <Text style={[e.accionTexto, miReaccion === r.tipo && e.accionActiva]}>
              {r.emoji}
            </Text>
          </Pressable>
        ))}
        <Text style={e.contadorReacciones}>{total}</Text>
        <BotonGuardar postId={post.id} inicial={post.guardado} />
        <Link href={`/publicacion/${post.id}`} asChild>
          <Pressable style={e.accion} accessibilityRole="link">
            <Text style={e.accionTexto}>💬 {post.numComments}</Text>
          </Pressable>
        </Link>
      </View>    </View>
  );
});

const e = StyleSheet.create({
  tarjeta: {
    backgroundColor: TEMA.superficie,
    borderRadius: TEMA.radio,
    borderWidth: 1,
    borderColor: TEMA.borde,
    padding: 14,
    marginBottom: 10,
  },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cabezaTexto: { flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEMA.naranjaSuave,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexto: { color: TEMA.naranjaHondo, fontWeight: '700', fontSize: 14 },
  nombre: { fontWeight: '700', fontSize: 15, color: TEMA.texto },
  meta: { fontSize: 13, color: TEMA.textoMedio },
  cuerpo: { fontSize: 15, lineHeight: 22, color: TEMA.texto },
  hashtag: { color: TEMA.naranja, fontWeight: '600' },
  imagen: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: TEMA.radioChico,
    marginTop: 10,
    backgroundColor: TEMA.superficie2,
  },
  encuesta: { marginTop: 10, gap: 6 },
  encuestaPregunta: { fontWeight: '600', color: TEMA.texto, marginBottom: 2 },
  opcion: {
    backgroundColor: TEMA.superficie2,
    borderRadius: TEMA.radioChico,
    minHeight: 36,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  opcionBarra: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: TEMA.naranjaSuave,
  },
  opcionTexto: { paddingHorizontal: 10, fontSize: 14, color: TEMA.texto },
  acciones: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: TEMA.borde,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  contadorReacciones: { fontSize: 13, color: TEMA.textoMedio, marginRight: 4 },
  accion: { minHeight: TEMA.tactil, justifyContent: 'center', paddingRight: 4 },
  accionTexto: { fontSize: 14, color: TEMA.textoMedio },
  accionActiva: { color: TEMA.naranjaHondo, fontWeight: '600' },
});
