import { ScrollView, StyleSheet, Text } from 'react-native';

import { TEMA } from '@/lib/tema';

export default function Privacidad() {
  return (
    <ScrollView style={e.pantalla} contentContainerStyle={e.contenido}>
      <Text style={e.titulo}>Política de privacidad</Text>
      <Text style={e.fecha}>Última actualización: agosto 2026</Text>

      <Text style={e.h2}>Qué datos guardamos</Text>
      <Text style={e.p}>
        Tu correo UDLAP (para verificar identidad), perfil público, publicaciones, mensajes
        directos y metadatos de uso necesarios para operar la plataforma.
      </Text>

      <Text style={e.h2}>Para qué los usamos</Text>
      <Text style={e.p}>
        Autenticarte, mostrar tu perfil a la comunidad, moderar contenido reportado y enviarte
        notificaciones sobre actividad dirigida a ti (comentarios, mensajes, etc.).
      </Text>

      <Text style={e.h2}>Con quién los compartimos</Text>
      <Text style={e.p}>
        No vendemos tus datos. Solo compartimos información con proveedores técnicos necesarios
        (hosting, correo) bajo contrato de confidencialidad.
      </Text>

      <Text style={e.h2}>Tus derechos</Text>
      <Text style={e.p}>
        Puedes editar tu perfil, silenciar comunidades, bloquear usuarios y solicitar la baja
        de tu cuenta escribiendo al equipo de Ágora.
      </Text>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: TEMA.fondo },
  contenido: { padding: 16, paddingBottom: 40 },
  titulo: { fontSize: 24, fontWeight: '800', color: TEMA.texto },
  fecha: { fontSize: 13, color: TEMA.textoMedio, marginBottom: 20 },
  h2: { fontSize: 17, fontWeight: '700', color: TEMA.texto, marginTop: 16, marginBottom: 6 },
  p: { fontSize: 15, lineHeight: 22, color: TEMA.texto },
});
