declare module "react-katex" {
  import type { ReactNode } from "react";

  interface MathComponentProps {
    math: string;
    renderError?: (error: Error) => ReactNode;
  }

  export function BlockMath(props: MathComponentProps): ReactNode;
  export function InlineMath(props: MathComponentProps): ReactNode;
}
