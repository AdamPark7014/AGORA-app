-- Búsqueda global: acelera ILIKE/contains en directorio, feed y marketplace.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Perfiles (directorio / buscar personas)
CREATE INDEX IF NOT EXISTS "profiles_nombre_apellidos_trgm_idx"
  ON "profiles" USING gin ((coalesce("nombre", '') || ' ' || coalesce("apellidos", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "profiles_handle_trgm_idx"
  ON "profiles" USING gin ("handle" gin_trgm_ops);

-- Posts (búsqueda de publicaciones)
CREATE INDEX IF NOT EXISTS "posts_texto_trgm_idx"
  ON "posts" USING gin ("texto" gin_trgm_ops);

-- Anuncios marketplace
CREATE INDEX IF NOT EXISTS "anuncios_titulo_trgm_idx"
  ON "anuncios" USING gin ("titulo" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "anuncios_descripcion_trgm_idx"
  ON "anuncios" USING gin ("descripcion" gin_trgm_ops);
