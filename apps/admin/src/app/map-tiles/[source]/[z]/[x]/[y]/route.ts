import { type NextRequest, NextResponse } from "next/server";
import { API_URL, backendHeaders } from "@/lib/admin/session";

/** The sources of the map of the back office, served by the backend under `/api/admin/map`. */
const SOURCES = new Set(["stations", "countries"]);
const INTEGER = /^\d{1,5}$/;

/**
 * A vector tile of the map of the back office, relayed from the backend
 * with the session: the browser never reaches `/api/admin`. Its URL holds
 * the version of the data (`?v=`): cached by the browser until it changes.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ source: string; z: string; x: string; y: string }> }) {
  const { source, z, x, y } = await params;
  if (!SOURCES.has(source) || ![z, x, y].every((part) => INTEGER.test(part))) {
    return new NextResponse(null, { status: 404 });
  }
  const response = await fetch(`${API_URL}/api/admin/map/${source}/${z}/${x}/${y}`, {
    headers: await backendHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }
  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "application/vnd.mapbox-vector-tile",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
