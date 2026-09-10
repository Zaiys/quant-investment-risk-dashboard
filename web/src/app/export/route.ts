import { dashboard } from "@/lib/data";
export const dynamic = "force-static";
export function GET() {
  return new Response(JSON.stringify(dashboard, null, 2) + "\n", {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="dashboard.json"',
    },
  });
}
