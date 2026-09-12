import { snapshotText } from "@/lib/data";
export const dynamic = "force-static";
export function GET() {
  return new Response(snapshotText, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="research-snapshot.json"',
    },
  });
}
