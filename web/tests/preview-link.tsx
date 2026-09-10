import type { ComponentProps } from "react";

// The isolated Vite preview has no Next.js router. Preserve ordinary link semantics.
export default function PreviewLink(props: ComponentProps<"a">) {
  return <a {...props} />;
}
