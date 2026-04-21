"use client";

import { V2 } from "@/components/v2/tokens";

// ── Shared primitives ─────────────────────────────────────────────

const pickerLabelStyle = {
  fontFamily: V2.ui,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: V2.inkMute,
  display: "block",
  marginBottom: 10,
};

const swatchCaption = (active: boolean) => ({
  fontFamily: V2.ui,
  fontSize: 10,
  letterSpacing: "0.04em",
  color: active ? V2.ink : V2.inkMute,
  fontWeight: active ? 500 : 400,
  fontStyle: active ? "italic" as const : "normal" as const,
  marginTop: 6,
  textAlign: "center" as const,
});

function Swatch({
  color,
  active,
  label,
  onClick,
  bordered,
}: {
  color: string;
  active: boolean;
  label: string;
  onClick: () => void;
  bordered?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        background: "transparent",
        border: "none",
        padding: 4,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          display: "block",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: color,
          border: active
            ? `1px solid ${V2.ink}`
            : bordered
              ? `1px solid ${V2.paperShade}`
              : "1px solid transparent",
          boxShadow: active ? `0 0 0 2px ${V2.paper}, 0 0 0 3px ${V2.ink}` : "none",
          transition: "box-shadow .15s",
        }}
      />
      <span style={swatchCaption(active)}>{label}</span>
    </button>
  );
}

// ── Hair Color Picker ─────────────────────────────────────────────

const HAIR_COLORS = [
  { value: "blond", color: "#F5DEB3", label: "Blond" },
  { value: "lichtbruin", color: "#C4A36D", label: "Lichtbruin" },
  { value: "donkerbruin", color: "#5C3A1E", label: "Donkerbruin" },
  { value: "zwart", color: "#1A1A1A", label: "Zwart" },
  { value: "rood", color: "#B5432A", label: "Rood" },
  { value: "rossig", color: "#D4742C", label: "Rossig" },
];

export function HairColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={pickerLabelStyle}>Haarkleur</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {HAIR_COLORS.map((hc) => (
          <Swatch
            key={hc.value}
            color={hc.color}
            label={hc.label}
            active={value === hc.value}
            onClick={() => onChange(hc.value)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Skin Color Picker ─────────────────────────────────────────────

const SKIN_COLORS = [
  { value: "licht", color: "#FDEBD0", label: "Licht" },
  { value: "licht getint", color: "#F0C8A0", label: "Licht getint" },
  { value: "getint", color: "#D4A574", label: "Getint" },
  { value: "donker getint", color: "#A0714E", label: "Donker getint" },
  { value: "donker", color: "#6B4226", label: "Donker" },
];

export function SkinColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={pickerLabelStyle}>Huidskleur</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {SKIN_COLORS.map((sc) => (
          <Swatch
            key={sc.value}
            color={sc.color}
            label={sc.label}
            active={value === sc.value}
            onClick={() => onChange(sc.value)}
            bordered
          />
        ))}
      </div>
    </div>
  );
}

// ── Eye Color Picker ──────────────────────────────────────────────

const EYE_COLORS = [
  { value: "blauw", color: "#4A90D9", label: "Blauw" },
  { value: "bruin", color: "#6B4226", label: "Bruin" },
  { value: "groen", color: "#4A8C5C", label: "Groen" },
  { value: "grijs", color: "#8E9EAB", label: "Grijs" },
  { value: "hazelnoot", color: "#8B7355", label: "Hazelnoot" },
];

export function EyeColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={pickerLabelStyle}>Oogkleur</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {EYE_COLORS.map((ec) => (
          <Swatch
            key={ec.value}
            color={ec.color}
            label={ec.label}
            active={value === ec.value}
            onClick={() => onChange(ec.value)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Hair Style Picker ─────────────────────────────────────────────

interface HairStyleOption {
  value: string;
  label: string;
  svg: React.ReactNode;
}

function HairSVG({ children, ...props }: React.SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="20" cy="22" r="10" fill="#FDEBD0" stroke="#E0C8A0" strokeWidth="0.5" />
      {children}
    </svg>
  );
}

const HAIR_STYLES: HairStyleOption[] = [
  {
    value: "kort",
    label: "Kort",
    svg: (
      <HairSVG style={{ width: "100%", height: "100%" }}>
        <path d="M10 20 Q10 10 20 9 Q30 10 30 20 Q28 14 20 13 Q12 14 10 20Z" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
  {
    value: "halflang",
    label: "Halflang",
    svg: (
      <HairSVG style={{ width: "100%", height: "100%" }}>
        <path d="M10 20 Q10 10 20 8 Q30 10 30 20 L31 26 Q28 14 20 12 Q12 14 9 26 L10 20Z" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
  {
    value: "lang",
    label: "Lang",
    svg: (
      <HairSVG style={{ width: "100%", height: "100%" }}>
        <path d="M10 20 Q10 10 20 8 Q30 10 30 20 L32 34 Q28 14 20 12 Q12 14 8 34 L10 20Z" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
  {
    value: "krullen",
    label: "Krullen",
    svg: (
      <HairSVG style={{ width: "100%", height: "100%" }}>
        <path d="M10 20 Q10 10 20 8 Q30 10 30 20" fill="#5C3A1E" />
        <circle cx="9" cy="22" r="3" fill="#5C3A1E" />
        <circle cx="31" cy="22" r="3" fill="#5C3A1E" />
        <circle cx="8" cy="27" r="2.5" fill="#5C3A1E" />
        <circle cx="32" cy="27" r="2.5" fill="#5C3A1E" />
        <circle cx="12" cy="13" r="2.5" fill="#5C3A1E" />
        <circle cx="28" cy="13" r="2.5" fill="#5C3A1E" />
        <circle cx="20" cy="10" r="3" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
  {
    value: "bob",
    label: "Bob",
    svg: (
      <HairSVG style={{ width: "100%", height: "100%" }}>
        <path d="M10 20 Q10 10 20 8 Q30 10 30 20 L31 26 L28 26 Q28 14 20 12 Q12 14 12 26 L9 26 L10 20Z" fill="#5C3A1E" />
        <path d="M12 18 Q12 14 20 12 Q28 14 28 18 L26 16 Q25 13 20 13 Q15 13 14 16Z" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
  {
    value: "staartjes",
    label: "Staartjes",
    svg: (
      <HairSVG style={{ width: "100%", height: "100%" }}>
        <path d="M10 20 Q10 10 20 9 Q30 10 30 20 Q28 14 20 13 Q12 14 10 20Z" fill="#5C3A1E" />
        <ellipse cx="6" cy="18" rx="3" ry="5" fill="#5C3A1E" />
        <circle cx="6" cy="13" r="1.5" fill={V2.gold} />
        <ellipse cx="34" cy="18" rx="3" ry="5" fill="#5C3A1E" />
        <circle cx="34" cy="13" r="1.5" fill={V2.gold} />
      </HairSVG>
    ),
  },
  {
    value: "vlechtjes",
    label: "Vlechtjes",
    svg: (
      <HairSVG style={{ width: "100%", height: "100%" }}>
        <path d="M10 20 Q10 10 20 9 Q30 10 30 20 Q28 14 20 13 Q12 14 10 20Z" fill="#5C3A1E" />
        <path d="M9 20 Q7 24 9 28 Q7 30 9 34" stroke="#5C3A1E" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M31 20 Q33 24 31 28 Q33 30 31 34" stroke="#5C3A1E" strokeWidth="3" fill="none" strokeLinecap="round" />
      </HairSVG>
    ),
  },
  {
    value: "knot",
    label: "Knotje",
    svg: (
      <HairSVG style={{ width: "100%", height: "100%" }}>
        <path d="M10 20 Q10 10 20 9 Q30 10 30 20 Q28 14 20 13 Q12 14 10 20Z" fill="#5C3A1E" />
        <circle cx="20" cy="8" r="5" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
  {
    value: "afro",
    label: "Afro",
    svg: (
      <HairSVG style={{ width: "100%", height: "100%" }}>
        <circle cx="20" cy="17" r="12" fill="#5C3A1E" />
        <circle cx="10" cy="22" r="4" fill="#5C3A1E" />
        <circle cx="30" cy="22" r="4" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
];

export function HairStylePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={pickerLabelStyle}>Haarstijl</label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
          gap: 6,
        }}
      >
        {HAIR_STYLES.map((hs) => {
          const active = value === hs.value;
          return (
            <button
              key={hs.value}
              type="button"
              onClick={() => onChange(hs.value)}
              title={hs.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "10px 6px",
                background: active ? V2.ink : "transparent",
                border: `1px solid ${active ? V2.ink : V2.paperShade}`,
                cursor: "pointer",
                transition: "background .15s",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  filter: active ? "brightness(1.3) saturate(0.8)" : "none",
                }}
              >
                {hs.svg}
              </div>
              <span
                style={{
                  fontFamily: V2.ui,
                  fontSize: 10,
                  letterSpacing: "0.04em",
                  color: active ? V2.paper : V2.inkMute,
                  fontWeight: active ? 500 : 400,
                  fontStyle: active ? "italic" : "normal",
                  marginTop: 6,
                }}
              >
                {hs.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
