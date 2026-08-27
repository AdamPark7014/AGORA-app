-- Rachas diarias y badges de campus.

CREATE TABLE "user_streaks" (
    "userId" TEXT NOT NULL,
    "rachaActual" INTEGER NOT NULL DEFAULT 0,
    "rachaMaxima" INTEGER NOT NULL DEFAULT 0,
    "ultimoDiaActivo" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "otorgadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_badges_userId_codigo_key" ON "user_badges"("userId", "codigo");

CREATE INDEX "user_badges_userId_idx" ON "user_badges"("userId");

ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
