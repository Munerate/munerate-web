interface Props {
  /** Optional subbrand prefix, e.g. "re" renders "re · munerate" */
  prefix?: string;
  as?: "h1" | "span";
}

/**
 * The wordmark is type, not an image: `munerate` in Space Grotesk 700.
 * Subbrands (tele · munerate) use the same component.
 */
export function Wordmark({ prefix, as: Tag = "h1" }: Props) {
  return (
    <Tag className="wordmark">
      {prefix ? (
        <>
          <span className="wordmark__prefix">{prefix}</span>
          <span className="wordmark__sep" aria-hidden="true">
            {" · "}
          </span>
        </>
      ) : null}
      munerate
    </Tag>
  );
}
