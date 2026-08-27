import { ScrollView, StyleSheet, Text } from 'react-native';

import { TEMA } from '@/lib/tema';

export default function Terminos() {
  return (
    <ScrollView style={e.pantalla} contentContainerStyle={e.contenido}>
      <Text style={e.titulo}>Términos de uso</Text>
      <Text style={e.fecha}>Última actualización: agosto 2026</Text>

      <Text style={e.h2}>Qué es Ágora</Text>
      <Text style={e.p}>
        Ágora es una red social independiente para la comunidad verificada de la UDLAP.
        No está afiliada ni respaldada oficialmente por la universidad.
      </Text>

      <Text style={e.h2}>Quién puede usarla</Text>
      <Text style={e.p}>
        Solo personas con correo @udlap.mx verificado. Al registrarte confirmas que eres parte
        de esa comunidad y que la información que das es veraz.
      </Text>

      <Text style={e.h2}>Contenido permitido</Text>
      <Text style={e.p}>
        Publica con respeto. Está prohibido el acoso, las amenazas, compartir datos personales
        de terceros sin permiso, contenido íntimo sin consentimiento y la suplantación de identidad.
      </Text>

      <Text style={e.h2}>Tu responsabilidad</Text>
      <Text style={e.p}>
        Eres responsable de lo que publicas. Ágora puede suspender cuentas que abusen de la
        plataforma o pongan en riesgo a otros miembros.
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
