import { getRecentNotifications } from "@/lib/notifications/queries"

export async function GET() {
  const items = await getRecentNotifications()
  return Response.json({ items })
}
