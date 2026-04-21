import type { InputHTMLAttributes, ReactNode } from "react";
import { V2 } from "@/components/v2/tokens";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** optional slot on the right of the label (e.g. "Wachtwoord vergeten?") */
  labelAside?: ReactNode;
};

/**
 * v2 auth input: uppercase label on top, underline-only input.
 */
export function AuthField({ label, labelAside, id, ...inputProps }: Props) {
  const inputId = id ?? inputProps.name;
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          alignItems: "baseline",
        }}
      >
        <label
          htmlFor={inputId}
          style={{
            fontFamily: V2.ui,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: V2.inkMute,
          }}
        >
          {label}
        </label>
        {labelAside && (
          <span
            style={{
              fontFamily: V2.ui,
              fontSize: 12,
              color: V2.goldDeep,
            }}
          >
            {labelAside}
          </span>
        )}
      </div>
      <input
        id={inputId}
        {...inputProps}
        style={{
          width: "100%",
          padding: "12px 0",
          border: "none",
          borderBottom: `1px solid ${V2.ink}`,
          background: "transparent",
          fontSize: 16,
          fontFamily: V2.body,
          color: V2.ink,
          outline: "none",
          ...inputProps.style,
        }}
      />
    </div>
  );
}
