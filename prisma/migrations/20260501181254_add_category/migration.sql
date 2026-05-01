-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "title" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Clip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Clip" ("content", "createdAt", "id", "source", "title", "type", "userId") SELECT "content", "createdAt", "id", "source", "title", "type", "userId" FROM "Clip";
DROP TABLE "Clip";
ALTER TABLE "new_Clip" RENAME TO "Clip";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
