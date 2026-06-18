import { getDb } from "./client";

export const Collections = {
  USERS: "users",
  RESUMES: "resumes",
  JDS: "jds",
  GREETINGS: "greetings",
  INTERVIEWS: "interviews",
  INTERVIEW_SESSIONS: "interview_sessions",
  APPLICATIONS: "applications",
} as const;

export async function insertOne<T extends Record<string, unknown>>(
  collection: string,
  doc: T
): Promise<string> {
  const db = getDb();
  const now = new Date();
  const result = await db
    .collection(collection)
    .add({
      ...doc,
      createdAt: now,
      updatedAt: now,
    });
  return result.id || "";
}

export async function findOne<T>(
  collection: string,
  query: Record<string, unknown>
): Promise<T | null> {
  const db = getDb();
  const result = await db.collection(collection).where(query).get();
  if (result.data.length === 0) {
    return null;
  }
  return result.data[0] as T;
}

export async function findMany<T>(
  collection: string,
  query: Record<string, unknown>,
  options?: { limit?: number; orderBy?: { field: string; direction: "asc" | "desc" } }
): Promise<T[]> {
  const db = getDb();
  let cmd = db.collection(collection).where(query);
  if (options?.orderBy) {
    cmd = cmd.orderBy(options.orderBy.field, options.orderBy.direction);
  }
  if (options?.limit) {
    cmd = cmd.limit(options.limit);
  }
  const result = await cmd.get();
  return result.data as T[];
}

export async function updateOne(
  collection: string,
  id: string,
  update: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  await db
    .collection(collection)
    .doc(id)
    .update({
      ...update,
      updatedAt: new Date(),
    });
}

export async function deleteOne(
  collection: string,
  id: string
): Promise<void> {
  const db = getDb();
  await db.collection(collection).doc(id).remove();
}
