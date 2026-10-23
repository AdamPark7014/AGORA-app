'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import { olvidarSesion, sesion } from '@/lib/sesion';
import { Avatar } from '@/componentes/avatar';
import { Flag, IconoNav } from '@/componentes/iconos';
import { ToggleTema } from '@/componentes/proveedor-tema';

interface Yo {
  handle: string | null;
  nombre: string | null;
  fotoUrl: string | null;
  esStaff: boolean;
  puedeModerar: boolean;
}

interface Comunidad {
  slug: string;
  nombre: string;
}

const SECCIONES: Array<{
  href: string;
  icono: 'marketplace' | 'aventones' | 'anonimo' | 'directorio' | 'ajustes';
  texto: string;
  nota: string;
}> = [
  { href: '/marketplace', icono: 'marketplace', texto: 'Marketplace', nota: 'Compra y vende en campus' },
  { href: '/aventones', icono: 'aventones', texto: 'Aventones', nota: 'Comparte coche a Cholula' },
  { href: '/anonimo', icono: 'anonimo', texto: 'Sin nombre', nota: 'Publicar sin firmar' },
  { href: '/directorio', icono: 'directorio', texto: 'Directorio', nota: 'Buscar gente' },
  { href: '/ajustes', icono: 'ajustes', texto: 'Ajustes', nota: 'Tu perfil y privacidad' },
];

export default function Mas() {
  const router = useRouter();
  const [yo, setYo] = useState<Yo | null>(null);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);

  useEffect(() => {
    sesion().then(setYo).catch(() => undefined);
    api<Comunidad[]>('/perfil/mis-comunidades')
      .then(setComunidades)
      .catch(() => undefined);
  }, []);

  async function salir() {
    try {
      await api('/auth/salir', { method: 'POST' });
    } finally {
      olvidarSesion();
      router.push('/');
    }
  }

  return (
    <main>
      <h1>Más</h1>

      <div className="panel" style={{ marginBottom: 12 }}>
        <p className="panel-titulo">Accesos rápidos</p>
        <ul className="menu">
          <li>
            <Link href="/buscar">
              <span className="menu-icono" aria-hidden="true">
                <IconoNav nombre="directorio" size={20} />
              </span>
              <span>
                Buscar
                <br />
                <span className="tenue" style={{ fontSize: '0.8rem' }}>Personas, posts y más</span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/guardados">
              <span className="menu-icono" aria-hidden="true">
                <IconoNav nombre="guardados" size={20} />
              </span>
              <span>
                Guardados
                <br />
                <span className="tenue" style={{ fontSize: '0.8rem' }}>Posts para ver después</span>
              </span>
            </Link>
          </li>
          <li>
            <Link href="/notificaciones">
              <span className="menu-icono" aria-hidden="true">
                <IconoNav nombre="notificaciones" size={20} />
              </span>
              <span>
                Notificaciones
                <br />
                <span className="tenue" style={{ fontSize: '0.8rem' }}>
                  Likes, menciones y avisos — también desde la campana arriba
                </span>
              </span>
            </Link>
          </li>
        </ul>
      </div>

      {/* El botón de tema solo, sin texto, parecía un control huérfano. */}
      <div className="panel mas-apariencia">
        <span>
          <strong>Apariencia</strong>
          <br />
          <span className="tenue" style={{ fontSize: '0.8rem' }}>Modo claro u oscuro</span>
        </span>
        <ToggleTema conTexto />
      </div>

      {yo?.handle && (
        <Link href={`/perfil/${yo.handle}`} className="persona" style={{ marginBottom: 14 }}>
          <Avatar
            nombre={yo.nombre ?? yo.handle}
            semilla={yo.handle}
            fotoUrl={yo.fotoUrl}
            anillo="naranja"
            verificado={yo?.esStaff}
          />
          <span>
            <span className="persona-nombre">Tu perfil</span>
            <br />
            <span className="tenue">@{yo.handle}</span>
          </span>
        </Link>
      )}

      <div className="panel">
        <ul className="menu">
          {yo?.puedeModerar && (
            <li>
              <Link href="/moderacion">
                <span className="menu-icono" aria-hidden="true">
                  <Flag size={20} strokeWidth={1.75} />
                </span>
                <span>
                  Moderar
                  <br />
                  <span className="tenue" style={{ fontSize: '0.8rem' }}>
                    Cola de reportes
                  </span>
                </span>
              </Link>
            </li>
          )}
          {SECCIONES.map((s) => (
            <li key={s.href}>
              <Link href={s.href}>
                <span className="menu-icono" aria-hidden="true">
                  <IconoNav nombre={s.icono} size={20} />
                </span>
                <span>
                  {s.texto}
                  <br />
                  <span className="tenue" style={{ fontSize: '0.8rem' }}>
                    {s.nota}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {comunidades.length > 0 && (
        <div className="panel" style={{ marginTop: 12 }}>
          <p className="panel-titulo">Tus comunidades</p>
          <ul className="comunidades">
            {comunidades.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/feed?comunidad=${encodeURIComponent(c.slug)}`}
                  className="comunidad-enlace"
                >
                  {c.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <p className="tenue" style={{ fontSize: '0.85rem' }}>
          <Link href="/reglas">Reglas</Link> · <Link href="/terminos">Términos</Link> ·{' '}
          <Link href="/privacidad">Privacidad</Link>
        </p>
        <button type="button" className="secundario" onClick={salir} style={{ marginTop: 12 }}>
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}
