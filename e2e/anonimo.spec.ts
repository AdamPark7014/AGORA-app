import { expect, test } from '@playwright/test';

/**
 * Zona pseudonima — Fase 7.
 *
 * Lo que importa probar no es la interfaz, sino que el contrato del anonimato
 * se sostenga en el SERVIDOR: que la respuesta no traiga al autor, que lo
 * anonimo no aparezca donde tiene nombre, y que sin moderacion previa la zona
 * entera este apagada.
 */

const API = 'http://localhost:4200/api';

async function entrar(request: import('@playwright/test').APIRequestContext) {
  const r = await request.post(`${API}/auth/otp/verificar`, {
    data: { email: 'adam.delpozoos@udlap.mx', codigo: '123456' },
    failOnStatusCode: false,
  });
  expect(r.status(), 'el codigo maestro de desarrollo debe funcionar').toBe(201);
}

test('la respuesta anonima nunca incluye al autor', async ({ request }) => {
  await entrar(request);

  const estado = await request.get(`${API}/anonimo/estado`);
  const { habilitada } = await estado.json();
  test.skip(!habilitada, 'la zona esta apagada sin ANTHROPIC_API_KEY');

  // Una propia: en una base nueva (CI) la zona anonima empieza vacia y el
  // feed no tendria nada que revisar.
  const creada = await request.post(`${API}/anonimo`, {
    data: { texto: `prueba e2e del feed anonimo ${Date.now()}` },
  });
  expect(creada.status()).toBe(201);
  const { id } = await creada.json();

  try {
    const feed = await request.get(`${API}/anonimo`);
    const crudo = await feed.text();

    // Ni el id del autor ni un objeto `autor`: el filtrado ocurre en el
    // servidor, no escondiendo campos en la interfaz.
    expect(crudo).toContain(id);
    expect(crudo).not.toContain('authorId');
    expect(crudo).not.toContain('"autor"');
    expect(crudo).toContain('alias');
  } finally {
    await request.delete(`${API}/anonimo/${id}`, { failOnStatusCode: false });
  }
});

test('ninguna ruta de publicaciones revela al autor de una anonima', async ({ request }) => {
  await entrar(request);

  const estado = await request.get(`${API}/anonimo/estado`);
  const { habilitada } = await estado.json();
  test.skip(!habilitada, 'la zona esta apagada sin ANTHROPIC_API_KEY');

  const yo = await (await request.get(`${API}/auth/yo`)).json();
  const handle: string | null = yo?.handle ?? null;

  const creada = await request.post(`${API}/anonimo`, {
    data: { texto: `prueba e2e de anonimato ${Date.now()}` },
  });
  expect(creada.status()).toBe(201);
  const { id } = await creada.json();

  try {
    const detalle = await request.get(`${API}/posts/${id}`);
    expect(detalle.status()).toBe(200);
    const cuerpo = await detalle.json();
    expect(cuerpo.autor).toBeNull();
    expect(cuerpo.anonimo).toBe(true);
    if (handle) expect(JSON.stringify(cuerpo)).not.toContain(handle);

    await request.post(`${API}/posts/${id}/guardar`);
    const guardados = await (await request.get(`${API}/guardados`)).json();
    const guardada = guardados.publicaciones.find((p: { id: string }) => p.id === id);
    expect(guardada, 'la publicacion guardada debe listarse').toBeTruthy();
    expect(guardada.autor).toBeNull();
    if (handle) expect(JSON.stringify(guardada)).not.toContain(handle);

    const tarjeta = await (await request.get(`${API}/public/tarjeta/publicacion/${id}`)).json();
    expect(JSON.stringify(tarjeta)).not.toContain('prueba e2e de anonimato');

    const edicion = await request.patch(`${API}/posts/${id}`, {
      data: { texto: 'editada' },
      failOnStatusCode: false,
    });
    expect(edicion.status()).toBe(400);
  } finally {
    await request.post(`${API}/posts/${id}/guardar`, { failOnStatusCode: false });
    await request.delete(`${API}/anonimo/${id}`, { failOnStatusCode: false });
  }
});

test('lo anonimo no aparece en el feed normal', async ({ request }) => {
  await entrar(request);

  const feed = await request.get(`${API}/feed`);
  const { publicaciones } = await feed.json();

  // Toda publicacion del feed normal tiene autor con nombre. Si alguna llega
  // sin el, es que algo anonimo se colo.
  for (const p of publicaciones) {
    expect(p.autor, `la publicacion ${p.id} llego sin autor`).not.toBeNull();
  }
});

test('sin moderacion previa la zona esta apagada', async ({ request }) => {
  await entrar(request);

  const estado = await request.get(`${API}/anonimo/estado`);
  const { habilitada } = await estado.json();

  if (!habilitada) {
    // Y si esta apagada, publicar debe fallar con 503, no con un 500 raro.
    const intento = await request.post(`${API}/anonimo`, {
      data: { texto: 'no deberia entrar' },
      failOnStatusCode: false,
    });
    expect(intento.status()).toBe(503);
  }
});

test('el texto anonimo tiene tope corto', async ({ request }) => {
  await entrar(request);

  const largo = 'a'.repeat(601);
  const r = await request.post(`${API}/anonimo`, {
    data: { texto: largo },
    failOnStatusCode: false,
  });
  // 400 por validacion, o 503 si la zona esta apagada. Nunca 201.
  expect([400, 503]).toContain(r.status());
});
