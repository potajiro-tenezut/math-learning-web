import { Fragment, useMemo } from "react";
import { splitInlineMath } from "../domain/inlineMath";
import { Latex } from "./Latex";

interface InlineMathTextProps {
  value: string;
}

export function InlineMathText({ value }: InlineMathTextProps) {
  const segments = useMemo(() => splitInlineMath(value), [value]);
  return segments.map((segment, index) => (
    <Fragment key={`${segment.kind}:${index}`}>
      {segment.kind === "math" ? <Latex value={segment.value} /> : segment.value}
    </Fragment>
  ));
}
