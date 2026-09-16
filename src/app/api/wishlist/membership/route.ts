import { getWishlistMembership } from "@/features/wishlist/server/wishlist-boundary";

export async function GET() {
  const membership = await getWishlistMembership();

  return Response.json(membership, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
