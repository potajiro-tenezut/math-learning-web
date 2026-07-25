import type { ContentTrack } from "./domain/content";

interface RuntimeConfig {
  contentBaseUrl?: string;
  contentBaseUrls?: Partial<Record<ContentTrack, string>>;
}

export async function loadContentBaseUrl(track: ContentTrack = "high-school"): Promise<URL> {
  let runtimeValue: string | undefined;
  try {
    const response = await fetch(new URL("runtime-config.json", document.baseURI), {
      cache: "no-store",
    });
    if (response.ok) {
      const config = (await response.json()) as RuntimeConfig;
      runtimeValue =
        config.contentBaseUrls?.[track] ??
        (track === "high-school" ? config.contentBaseUrl : undefined);
    }
  } catch {
    // The environment fallback below is intentional.
  }
  const configured =
    runtimeValue ||
    (track === "high-school" ? import.meta.env.VITE_CONTENT_BASE_URL : undefined) ||
    (track === "grade-3" ? "./content-grade3/" : "./content/");
  const resolved = new URL(configured, document.baseURI);
  if (!resolved.pathname.endsWith("/")) resolved.pathname += "/";
  return resolved;
}
