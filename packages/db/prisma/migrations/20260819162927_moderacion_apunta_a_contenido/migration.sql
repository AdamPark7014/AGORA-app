-- AlterEnum
ALTER TYPE "AccionModeracion" ADD VALUE 'MARCAR_REVISION';

-- AlterTable
ALTER TABLE "moderation_actions" ADD COLUMN     "commentId" TEXT,
ADD COLUMN     "postId" TEXT;

-- CreateIndex
CREATE INDEX "moderation_actions_postId_idx" ON "moderation_actions"("postId");

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
