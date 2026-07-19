import { useEffect } from "react";

interface DocumentMeta {
  title?: string;
  description?: string;
}

function setMetaTag(name: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/** Set document title/description per route. Restores nothing — routes own their meta. */
export function useDocumentMeta({ title, description }: DocumentMeta) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) setMetaTag("description", description);
  }, [title, description]);
}
