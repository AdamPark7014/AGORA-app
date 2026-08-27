import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { api } from '@/lib/api';
import { TEMA } from '@/lib/tema';

export function BotonGuardar({ postId, inicial = false }: { postId: string; inicial?: boolean }) {
  const [guardado, setGuardado] = useState(inicial);

  async function alternar() {
    const era = guardado;
    setGuardado(!era);
    try {
      await api(`/posts/${postId}/guardar`, { method: era ? 'DELETE' : 'POST' });
    } catch {
      setGuardado(era);
    }
  }

  return (
    <Pressable onPress={alternar} style={e.boton} accessibilityRole="button">
      <Text style={[e.texto, guardado && e.activo]}>{guardado ? '🔖' : '🏷️'}</Text>
    </Pressable>
  );
}

const e = StyleSheet.create({
  boton: { minHeight: TEMA.tactil, justifyContent: 'center', paddingHorizontal: 4 },
  texto: { fontSize: 16 },
  activo: { opacity: 1 },
});
