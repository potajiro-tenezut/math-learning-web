import { useCallback, useEffect, useMemo, useState } from "react";
import { loadContentBaseUrl } from "../config";
import {
  BrowserContentCache,
  CachedContentRepository,
  ContentError,
  HttpContentRepository,
  type ContentRepository,
} from "../data/contentRepository";
import type { AvailableContent } from "../domain/content";

interface ContentState {
  status: "loading" | "ready" | "error";
  content?: AvailableContent;
  repository?: ContentRepository;
  message?: string;
  diagnostic?: string;
}

export function useContent() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ContentState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void (async () => {
      try {
        const baseUrl = await loadContentBaseUrl();
        const repository = new CachedContentRepository(
          new HttpContentRepository(baseUrl),
          new BrowserContentCache(),
        );
        const content = await repository.loadAvailableContent();
        if (active) setState({ status: "ready", content, repository });
      } catch (error) {
        console.error("Content startup failed", error);
        if (!active) return;
        setState({
          status: "error",
          message:
            error instanceof ContentError
              ? error.userMessage
              : "問題データを読み込めませんでした。",
          diagnostic: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  return useMemo(() => ({ ...state, retry }), [state, retry]);
}
