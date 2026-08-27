-- Hashtags indexados y preferencias de notificacion.

CREATE TABLE "hashtags" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hashtags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hashtags_universityId_tag_key" ON "hashtags"("universityId", "tag");
CREATE INDEX "hashtags_universityId_lastUsedAt_idx" ON "hashtags"("universityId", "lastUsedAt" DESC);

ALTER TABLE "hashtags" ADD CONSTRAINT "hashtags_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "post_hashtags" (
    "postId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_hashtags_pkey" PRIMARY KEY ("postId","hashtagId")
);

CREATE INDEX "post_hashtags_hashtagId_createdAt_idx" ON "post_hashtags"("hashtagId", "createdAt" DESC);

ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "hashtags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "preferencias_notificacion" (
    "userId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "preferencias_notificacion_pkey" PRIMARY KEY ("userId","tipo")
);

ALTER TABLE "preferencias_notificacion" ADD CONSTRAINT "preferencias_notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
