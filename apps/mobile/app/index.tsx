import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, ErrorApi, guardarToken, leerToken } from '@/lib/api';
import { TEMA } from '@/lib/tema';

/**
 * Entrada por OTP.
 *
 * Mismo flujo que la web, con dos diferencias que impone la plataforma:
 * se pide `modo: 'token'` porque no hay cookies entre orígenes, y el token
 * acabado en el llavero del sistema.
 */
export default function Entrar() {
  const [paso, setPaso] = useState<'correo' | 'codigo'>('correo');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [comprobando, setComprobando] = useState(true);

  // Si ya hay token guardado, no se pide entrar otra vez.
  useEffect(() => {
    leerToken()
      .then(async (token) => {
        if (!token) return setComprobando(false);
        try {
          const yo = await api<{ tienePerfil?: boolean }>('/auth/yo');
          if (yo.tienePerfil === false) router.replace('/registro');
          else router.replace('/(tabs)/feed');
        } catch {
          setComprobando(false);
        }
      })
      .catch(() => setComprobando(false));
  }, []);

  async function pedirCodigo() {
    setCargando(true);
    setError(null);
    try {
      await api('/auth/otp/solicitar', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setPaso('codigo');
    } catch (e) {
      // Un 429 significa "acabas de pedir uno", no "no se pudo": el anterior
      // sigue vivo, así que se avanza igual.
      if (e instanceof ErrorApi && e.estado === 429) setPaso('codigo');
      else setError(e instanceof ErrorApi ? e.message : 'No se pudo enviar el código.');
    } finally {
      setCargando(false);
    }
  }

  async function verificar() {
    setCargando(true);
    setError(null);
    try {
      const r = await api<{ tienePerfil: boolean; token?: string }>('/auth/otp/verificar', {
        method: 'POST',
        body: JSON.stringify({ email, codigo, modo: 'token' }),
      });
      if (!r.token) throw new ErrorApi(500, 'El servidor no devolvió sesión.');
      await guardarToken(r.token);
      if (!r.tienePerfil) {
        router.replace('/registro');
      } else {
        router.replace('/(tabs)/feed');
      }
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo verificar.');
    } finally {
      setCargando(false);
    }
  }

  if (comprobando) {
    return (
      <View style={[e.pantalla, e.centrado]}>
        <ActivityIndicator color={TEMA.naranja} />
      </View>
    );
  }

  return (
    <View style={e.pantalla}>
      {paso === 'correo' ? (
        <>
          <Text style={e.titulo}>Lo que pasa en el campus</Text>
          <Text style={e.entradilla}>
            Entra con tu correo @udlap.mx y te mandamos un código.
          </Text>

          <TextInput
            style={e.campo}
            placeholder="nombre.apellido@udlap.mx"
            placeholderTextColor={TEMA.textoTenue}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Pressable
            style={[e.boton, cargando && e.botonApagado]}
            disabled={cargando}
            onPress={pedirCodigo}
          >
            <Text style={e.botonTexto}>
              {cargando ? 'Enviando…' : 'Mandarme el código'}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={e.titulo}>Revisa tu correo</Text>
          <Text style={e.entradilla}>Te mandamos 6 dígitos a {email}.</Text>

          <TextInput
            style={[e.campo, e.campoCodigo]}
            placeholder="000000"
            placeholderTextColor={TEMA.textoTenue}
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
            value={codigo}
            onChangeText={(v) => setCodigo(v.replace(/\D/g, ''))}
          />

          <Pressable
            style={[e.boton, (cargando || codigo.length !== 6) && e.botonApagado]}
            disabled={cargando || codigo.length !== 6}
            onPress={verificar}
          >
            <Text style={e.botonTexto}>{cargando ? 'Verificando…' : 'Entrar'}</Text>
          </Pressable>

          <Pressable
            style={e.fantasma}
            onPress={() => {
              setPaso('correo');
              setCodigo('');
              setError(null);
            }}
          >
            <Text style={e.fantasmaTexto}>Cambiar correo</Text>
          </Pressable>
        </>
      )}

      {error && <Text style={e.error}>{error}</Text>}
    </View>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, padding: 24, backgroundColor: TEMA.fondo },
  centrado: { justifyContent: 'center', alignItems: 'center' },
  titulo: { fontSize: 26, fontWeight: '800', color: TEMA.texto, marginBottom: 6 },
  entradilla: { fontSize: 15, color: TEMA.textoMedio, marginBottom: 24 },
  campo: {
    backgroundColor: TEMA.superficie,
    borderWidth: 1,
    borderColor: TEMA.borde,
    borderRadius: TEMA.radioChico,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: TEMA.texto,
    marginBottom: 14,
  },
  campoCodigo: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 10,
  },
  boton: {
    backgroundColor: TEMA.naranja,
    borderRadius: 999,
    minHeight: TEMA.tactil,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  botonApagado: { opacity: 0.45 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  fantasma: { minHeight: TEMA.tactil, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  fantasmaTexto: { color: TEMA.textoMedio, fontSize: 15 },
  error: { color: TEMA.peligro, marginTop: 14, fontSize: 14 },
});
