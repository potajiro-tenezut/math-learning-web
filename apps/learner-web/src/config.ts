interface RuntimeConfig {
  contentBaseUrl?: string;
}

export async function loadContentBaseUrl(): Promise<URL> {
  let runtimeValue: string | undefined;
  try {
    const response = await fetch(new URL("runtime-config.json", document.baseURI), {
      cache: "no-store",
    });
    if (response.ok) {
      const config = (await response.json()) as RuntimeConfig;
      runtimeValue = config.contentBaseUrl;
    }
  } catch {
    // The environment fallback below is intentional.
  }
  const configured = runtimeValue || import.meta.env.VITE_CONTENT_BASE_URL || "./content/";
  const resolved = new URL(configured, document.baseURI);
  if (!resolved.pathname.endsWith("/")) resolved.pathname += "/";
  return resolved;
}
