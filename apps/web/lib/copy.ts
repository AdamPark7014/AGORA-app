/**
 * Microcopy en español — tono Ágora UDLAP: cálido, directo, sin corporativo.
 * Centralizado para mantener consistencia entre web y futuras superficies.
 */

export const copy = {
  cargando: {
    momento: 'Un momento…',
    general: 'Cargando…',
    mas: 'Cargando más…',
    catalogo: 'Preparando tu perfil…',
  },

  login: {
    insignia: '● Solo para la UDLAP',
    titulo: 'Tu red en el campus',
    entradilla:
      'Entra con tu correo @udlap.mx y tu contraseña. El código al correo solo se pide una vez, al crear tu cuenta.',
    correo: {
      etiqueta: 'Tu correo @udlap.mx',
      placeholder: 'nombre.apellido@udlap.mx',
    },
    contrasena: {
      etiqueta: 'Contraseña',
      mostrar: 'Mostrar contraseña',
      ocultar: 'Ocultar contraseña',
    },
    recordarme: 'Recordarme en este dispositivo',
    boton: 'Entrar',
    botonEntrando: 'Entrando…',
    olvide: '¿Olvidaste tu contraseña?',
    primeraVez: '¿Primera vez aquí?',
    crearCuenta: 'Crea tu cuenta',
    /** Pedir el código: registro, cuenta de antes sin contraseña, u "olvidé". */
    pedir: {
      titulo: {
        registro: 'Verifica tu correo UDLAP',
        olvide: 'Recupera tu acceso',
      },
      explicacion: {
        registro:
          'Te mandamos un código de 6 dígitos a tu buzón @udlap.mx para comprobar que eres de la UDLAP. Solo esta vez: después entras con tu contraseña.',
        olvide:
          'Te mandamos un código a tu buzón @udlap.mx. Con él entras y eliges una contraseña nueva. Si tu cuenta es de antes y nunca tuvo contraseña, este también es tu camino.',
      },
      boton: 'Enviarme el código',
      botonEnviando: 'Enviando…',
      volver: 'Ya tengo contraseña',
    },
    codigo: {
      titulo: 'Revisa tu correo',
      entradilla: (email: string) => `Te mandamos 6 dígitos a ${email}.`,
      etiqueta: 'Código',
      placeholder: '000000',
      boton: 'Entrar al Ágora',
      botonVerificando: 'Verificando…',
      cambiarCorreo: 'Cambiar correo',
      avisoOutlook:
        'Si no lo ves en la bandeja principal, busca "Ágora" o "Zynora" y revisa Correo no deseado, la pestaña Otros y Cuarentena en Outlook.',
      pie: 'Vence en 15 minutos y solo sirve una vez.',
      reenviar: 'Reenviar código',
      reenviarEn: (segundos: number) => `Reenviar en ${segundos} s`,
      remitente: 'Llega de contacto@zynoratek.com («Ágora · Zynora Tek»).',
      tarda:
        'Outlook de la UDLAP a veces tarda unos minutos en entregarlo. Mientras, revisa Correo no deseado y la pestaña Otros.',
      entrega: {
        enviado: 'Enviando tu código…',
        demorado: 'Outlook está tardando en aceptarlo. Se reintenta solo; dale un minuto.',
        entregado:
          'Entregado en tu buzón UDLAP. Si no está en la bandeja principal, revisa la pestaña Otros o Correo no deseado.',
        rebotado: (email: string) =>
          `Outlook rechazó ${email}: esa dirección no existe en UDLAP. Revisa que esté bien escrita.`,
        bloqueado:
          'Esa dirección había rebotado antes y estaba en pausa. Ya la liberamos: pide el código otra vez.',
        error: 'No pudimos entregarlo. Intenta de nuevo en un minuto.',
        sinNoticias: 'Sigue en camino. Si en un par de minutos no aparece, reenvíalo.',
      },
    },
    nuevaContrasena: {
      titulo: {
        crear: 'Crea tu contraseña',
        olvide: 'Elige una contraseña nueva',
      },
      entradilla: {
        crear: 'Con ella entrarás de ahora en adelante. No volverás a necesitar un código.',
        olvide: 'Tus otras sesiones se cerrarán por seguridad.',
      },
      etiqueta: 'Contraseña nueva',
      confirmar: 'Repítela',
      ayuda: 'Mínimo 8 caracteres. Que no sea tu correo ni una de las típicas.',
      noCoincide: 'Las contraseñas no coinciden.',
      boton: 'Guardar contraseña',
      botonGuardando: 'Guardando…',
    },
    ventajas: [
      {
        titulo: 'Tu carrera y tu generación, ya adentro',
        texto: 'Al entrar caes en tus comunidades. Nada que buscar.',
      },
      {
        titulo: 'Nadie de fuera lee esto',
        texto: 'Solo entra quien tiene correo @udlap.mx. Sin excepciones.',
      },
      {
        titulo: 'Aquí se puede decir lo que piensas',
        texto: 'Critica al profe, quéjate del comedor. Solo hay cinco líneas rojas.',
      },
    ],
    errores: {
      entrar: 'No se pudo entrar. Intenta de nuevo.',
      enviarCodigo: 'No se pudo enviar el código.',
      verificar: 'No se pudo verificar el código.',
      contrasena: 'No se pudo guardar la contraseña.',
    },
  },

  registro: {
    titulo: 'Cuéntanos quién eres',
    entradilla:
      'Con esto entras solo a las comunidades de tu escuela, carrera, generación y colegio.',
    previewTitulo: 'Tu comunidad te espera',
    previewSub: 'Entrarás automáticamente a:',
    boton: 'Crear mi perfil',
    botonCreando: 'Creando tu perfil…',
    errorCatalogo: 'No se pudo cargar el catálogo.',
    errorCrear: 'No se pudo crear el perfil.',
  },

  feed: {
    titulo: '¿Qué está pasando?',
    entradilla: {
      siguiendo: 'Publicaciones de las personas que sigues.',
      comunidad: (nombre: string) => `Publicaciones en ${nombre}.`,
      campus: 'Todo el campus UDLAP: egresados, activos y de todas las carreras.',
    },
    placeholders: [
      '¿Qué onda con el parcial de cálculo?',
      '¿Alguien va al Oxxo?',
      'Critica al profe, pregunta la tarea, arma la reunión…',
      '¿Quién trae los apuntes del viernes?',
      'Busco equipo para el proyecto final…',
    ],
    vacio: {
      campus: {
        titulo: 'El campus está en silencio',
        texto: 'Rompe el hielo: lo que publiques aquí lo ve toda la UDLAP verificada.',
        cta: 'Publicar algo',
      },
      siguiendo: {
        titulo: 'Tu gente aún no ha publicado',
        texto: 'Sigue a más personas del directorio para llenar este carril.',
        cta: 'Explorar directorio',
      },
      comunidad: {
        titulo: 'Nada por aquí todavía',
        texto: 'Sé el primero en publicar en esta comunidad.',
        cta: 'Escribir el primero',
      },
    },
    errores: {
      sesion: 'Necesitas iniciar sesión.',
      cargar: 'No se pudo cargar el feed.',
    },
  },

  mensajes: {
    titulo: 'Mensajes',
    entradilla: 'Tus conversaciones con gente de la UDLAP.',
    vacio: {
      titulo: 'Sin conversaciones todavía',
      texto: 'Encuentra a tu gente en el directorio y mándales un mensaje.',
      cta: 'Ir al directorio',
    },
    chatVacio: 'Todavía no hay mensajes. ¡Saluda!',
    placeholder: 'Escribe algo…',
    errores: {
      sesion: 'Necesitas iniciar sesión.',
      cargar: 'No se pudo cargar la bandeja.',
    },
  },

  notificaciones: {
    titulo: 'Notificaciones',
    entradilla: 'Solo lo que te importa: comentarios, menciones, mensajes y moderación.',
    vacio: {
      titulo: 'Todo tranquilo por aquí',
      texto: 'Cuando alguien interactúe contigo, te avisamos aquí.',
      cta: 'Ver el feed',
    },
    errores: {
      cargar: 'No se pudieron cargar.',
    },
  },

  perfil: {
    vacio: {
      mio: {
        titulo: 'Tu espacio está vacío',
        texto: 'Lo que escribas en tus comunidades aparecerá aquí.',
        cta: 'Publicar algo',
      },
      otro: {
        titulo: 'Sin publicaciones',
        texto: 'Todavía no ha publicado, o no comparten comunidad contigo.',
      },
    },
    privado: {
      titulo: 'Perfil privado',
      texto: 'Solo quienes comparten comunidad pueden ver el perfil completo.',
    },
    noExiste: {
      titulo: 'No existe ese perfil',
      texto: 'Puede que el usuario haya cambiado su nombre de usuario.',
    },
    errores: {
      cargar: 'No se pudo cargar el perfil.',
    },
  },
} as const;
