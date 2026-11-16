import { query } from "@/lib/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Member photos. The key is a random id, so links can't be guessed.
export async function GET(_request, { params }) {
  const { key } = await params;
  if (!UUID.test(key)) return new Response("Not found", { status: 404 });
  const { rows } = await query("SELECT photo, photo_type FROM members WHERE photo_key = $1 AND photo IS NOT NULL", [key]);
  if (!rows[0]) return new Response("Not found", { status: 404 });
  return new Response(rows[0].photo, {
    headers: {
      "Content-Type": rows[0].photo_type || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
