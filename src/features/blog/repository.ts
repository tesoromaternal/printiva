import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "../../db/client";
import { posts } from "../../db/schema";
import type { PostInput } from "../admin/schemas";
import { deleteImages } from "../admin/storage";
import { sanitizePostHtml } from "./sanitize";

export type Post = typeof posts.$inferSelect;

export class PostSlugTakenError extends Error {}

const isPublished = eq(posts.status, "published");

// ── Público ─────────────────────────────────────────────────
export const getPublishedPosts = (): Promise<Post[]> =>
  db.select().from(posts).where(isPublished).orderBy(desc(posts.publishedAt));

export async function getPublishedPost(slug: string): Promise<Post | null> {
  const [post] = await db.select().from(posts).where(and(isPublished, eq(posts.slug, slug))).limit(1);
  return post ?? null;
}

// ── Admin ───────────────────────────────────────────────────
export const listPosts = (): Promise<Post[]> => db.select().from(posts).orderBy(desc(posts.updatedAt));

export async function getPost(id: number): Promise<Post | null> {
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return post ?? null;
}

async function assertSlugFree(slug: string, exceptId?: number): Promise<void> {
  const [clash] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(exceptId ? and(eq(posts.slug, slug), ne(posts.id, exceptId)) : eq(posts.slug, slug))
    .limit(1);
  if (clash) throw new PostSlugTakenError(slug);
}

const now = () => new Date().toISOString();

export async function createPost(input: PostInput): Promise<number> {
  await assertSlugFree(input.slug);
  const [created] = await db
    .insert(posts)
    .values({
      ...input,
      contentHtml: sanitizePostHtml(input.contentHtml),
      publishedAt: input.status === "published" ? now() : null,
      updatedAt: now(),
    })
    .returning({ id: posts.id });
  if (!created) throw new Error("No se pudo crear el post");
  return created.id;
}

export async function updatePost(id: number, input: PostInput): Promise<void> {
  const current = await getPost(id);
  if (!current) throw new Error("Post no encontrado");
  await assertSlugFree(input.slug, id);

  await db
    .update(posts)
    .set({
      ...input,
      contentHtml: sanitizePostHtml(input.contentHtml),
      // La fecha de publicación se fija la PRIMERA vez que se publica.
      publishedAt: input.status === "published" ? (current.publishedAt ?? now()) : current.publishedAt,
      updatedAt: now(),
    })
    .where(eq(posts.id, id));

  if (current.coverUrl && current.coverUrl !== input.coverUrl) await deleteImages([current.coverUrl]);
}

export async function deletePost(id: number): Promise<void> {
  const current = await getPost(id);
  if (!current) return;
  await db.delete(posts).where(eq(posts.id, id));
  // Portada + imágenes insertadas en el cuerpo.
  const inline = [...current.contentHtml.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1] ?? "");
  await deleteImages([current.coverUrl, ...inline].filter((url): url is string => Boolean(url)));
}
