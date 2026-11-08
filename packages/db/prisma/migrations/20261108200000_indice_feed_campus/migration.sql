-- Feed del campus: sin comunidad concreta, ordena por (createdAt desc, id desc).
CREATE INDEX "posts_createdAt_id_idx" ON "posts"("createdAt" DESC, "id" DESC);
