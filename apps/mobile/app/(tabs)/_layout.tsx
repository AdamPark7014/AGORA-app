import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { TEMA } from '@/lib/tema';

/**
 * Barra de pestañas.
 *
 * Los mismos cinco destinos que la barra inferior de la web, en el mismo orden,
 * para que quien use las dos no tenga que reaprender dónde está cada cosa.
 * Material 3 topa en cinco; aquí se usan los cinco exactos.
 *
 * Los iconos son emoji, igual que en la web: sin dependencia de fuente de
 * iconos, y ya se ven idénticos en las dos plataformas.
 */
function Icono({ glifo, color }: { glifo: string; color: ColorValue }) {
  return <Text style={{ fontSize: 22, color }}>{glifo}</Text>;
}

export default function Pestanas() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TEMA.naranja,
        tabBarInactiveTintColor: TEMA.textoMedio,
        tabBarStyle: {
          backgroundColor: TEMA.superficie,
          borderTopColor: TEMA.borde,
          // 49 pt es la altura estandar de UITabBar; sostiene el minimo tactil
          // de 44 pt de Apple sin apretar.
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: TEMA.superficie },
        headerTitleStyle: { fontWeight: '700', color: TEMA.texto },
        sceneStyle: { backgroundColor: TEMA.fondo },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Icono glifo="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="eventos"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color }) => <Icono glifo="🎉" color={color} />,
        }}
      />
      <Tabs.Screen
        name="publicar"
        options={{
          title: 'Publicar',
          tabBarIcon: ({ color }) => <Icono glifo="✏️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          tabBarIcon: ({ color }) => <Icono glifo="🔔" color={color} />,
        }}
      />
      <Tabs.Screen
        name="yo"
        options={{
          title: 'Yo',
          tabBarIcon: ({ color }) => <Icono glifo="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}
