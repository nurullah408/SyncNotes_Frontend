import { useMemo } from "react";
import DOMPurify from "dompurify";

export function SanitizedHTMLMarkup({ snippet }: { snippet: string }) {
  const sanitizedHtml = useMemo(() => {
    return DOMPurify.sanitize(snippet, {
      ALLOWED_TAGS: ["mark", "b", "strong", "i", "em"],
      ALLOWED_ATTR: [],
    });
  }, [snippet]);
  return (
    <span
      className="text-sm text-muted-foreground mt-1 line-clamp-2 snippet"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
