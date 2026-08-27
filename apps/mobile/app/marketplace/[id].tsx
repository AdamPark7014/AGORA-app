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
import { haceCuanto } from '@/componentes/tarjeta-post';

interface Anuncio {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  precioMxn: number;
  estadoVenta: string;
  createdAt: string;
  vendedor: { handle: string; nombre: string } | null;
  esMio: boolean;
}

export default function AnuncioDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setAnuncio(await api<Anuncio>(`/anuncios/${id}`));
    } catch (e) {
      setError(e instanceof ErrorApi && e.estado === 404 ? 'Ese anuncio no existe.' : 'No se pudo cargar.');
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function escribir() {
    if (!anuncio?.vendedor) return;
    try {
      const { id: chatId } = await api<{ id: string }>('/mensajes/abrir', {
        method: 'POST',
        body: JSON.stringify({ handle: anuncio.vendedor.handle }),
      });
      router.push(`/mensajes/${chatId}`);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el chat.');
    }
  }

  async function marcar(estadoVenta: string) {
    await api(`/anuncios/${id}`, { method: 'PATCH', body: JSON.stringify({ estadoVenta }) });
    await cargar();
  }

  if (!anuncio && !error) {
    return (
      <View style={e.centro}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  if (error || !anuncio) {
    return (
      <View style={e.centro}>
        <Text style={e.error}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={e.pantalla} contentContainerStyle={e.contenido}>
      <Text style={e.precio}>${anuncio.precioMxn.toLocaleString('es-MX')} MXN</Text>
      <Text style={e.titulo}>{anuncio.titulo}</Text>
      <Text style={e.meta}>
        {anuncio.vendedor ? (
          <Text onPress={() => router.push(`/perfil/${anuncio.vendedor!.handle}`)}>
            {anuncio.vendedor.nombre}
          </Text>
        ) : (
          'Alguien'
        )}{' '}
        · {haceCuanto(anuncio.createdAt)}
      </Text>
      <Text style={e.descripcion}>{anuncio.descripcion}</Text>

      {anuncio.estadoVenta !== 'DISPONIBLE' && (
        <Text style={e.vendido}>Este artículo ya no está disponible.</Text>
      )}

      {anuncio.esMio ? (
        <Pressable style={e.boton} onPress={() => marcar('VENDIDO')}>
          <Text style={e.botonTexto}>Marcar como vendido</Text>
        </Pressable>
      ) : (
        anuncio.estadoVenta === 'DISPONIBLE' &&
        anuncio.vendedor && (
          <Pressable style={e.boton} onPress={escribir}>
            <Text style={e.botonTexto}>Escribir al vendedor</Text>
          </Pressable>
        )
      )}
    </ScrollView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  contenido: { padding: 16 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: TEMA.peligro, textAlign: 'center' },
  precio: { fontSize: 28, fontWeight: '800', color: TEMA.naranjaHondo },
  titulo: { fontSize: 22, fontWeight: '800', color: TEMA.texto, marginTop: 8 },
  meta: { fontSize: 14, color: TEMA.textoMedio, marginTop: 6 },
  descripcion: { fontSize: 16, lineHeight: 24, color: TEMA.texto, marginTop: 16 },
  vendido: { color: TEMA.peligro, marginTop: 12, fontWeight: '600' },
  boton: {
    marginTop: 24,
    backgroundColor: TEMA.naranja,
    borderRadius: 999,
    minHeight: TEMA.tactil,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
