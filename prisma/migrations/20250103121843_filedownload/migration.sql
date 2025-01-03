/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Video` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "DownloadStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "videoId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "outputPath" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DownloadStatus_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL
);
INSERT INTO "new_Video" ("id", "url") SELECT "id", "url" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DownloadStatus_videoId_key" ON "DownloadStatus"("videoId");
