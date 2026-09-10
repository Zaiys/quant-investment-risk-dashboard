import snapshot from "@/data/dashboard.json";
import { parseDashboard } from "./validate";
export const dashboard = parseDashboard(snapshot);
