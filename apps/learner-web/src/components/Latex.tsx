import { BlockMath, InlineMath } from "react-katex";

interface LatexProps {
  value: string;
  block?: boolean;
}

export function Latex({ value, block = false }: LatexProps) {
  if (!value) return null;
  return block ? (
    <BlockMath math={value} renderError={() => <code className="latex-fallback">{value}</code>} />
  ) : (
    <InlineMath math={value} renderError={() => <code className="latex-fallback">{value}</code>} />
  );
}
