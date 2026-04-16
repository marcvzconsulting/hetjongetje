"use client";

// —— Hair Color Picker ——————————————————————————————————————————

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
      <label className="block text-xs font-medium mb-2">Haarkleur</label>
      <div className="flex gap-2 flex-wrap">
        {HAIR_COLORS.map((hc) => (
          <button
            key={hc.value}
            type="button"
            onClick={() => onChange(hc.value)}
            className={`flex flex-col items-center gap-1 transition-all ${
              value === hc.value ? "scale-110" : "hover:scale-105"
            }`}
            title={hc.label}
          >
            <div
              className={`w-9 h-9 rounded-full border-2 transition-all ${
                value === hc.value ? "border-primary ring-2 ring-primary/30" : "border-transparent"
              }`}
              style={{ background: hc.color }}
            />
            <span className={`text-[0.6rem] ${value === hc.value ? "font-bold text-primary" : "text-muted-foreground"}`}>
              {hc.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// —— Skin Color Picker ——————————————————————————————————————————

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
      <label className="block text-xs font-medium mb-2">Huidskleur</label>
      <div className="flex gap-2 flex-wrap">
        {SKIN_COLORS.map((sc) => (
          <button
            key={sc.value}
            type="button"
            onClick={() => onChange(sc.value)}
            className={`flex flex-col items-center gap-1 transition-all ${
              value === sc.value ? "scale-110" : "hover:scale-105"
            }`}
            title={sc.label}
          >
            <div
              className={`w-9 h-9 rounded-full border-2 transition-all ${
                value === sc.value ? "border-primary ring-2 ring-primary/30" : "border-gray-200"
              }`}
              style={{ background: sc.color }}
            />
            <span className={`text-[0.6rem] ${value === sc.value ? "font-bold text-primary" : "text-muted-foreground"}`}>
              {sc.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// —— Eye Color Picker ——————————————————————————————————————————

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
      <label className="block text-xs font-medium mb-2">Oogkleur</label>
      <div className="flex gap-2 flex-wrap">
        {EYE_COLORS.map((ec) => (
          <button
            key={ec.value}
            type="button"
            onClick={() => onChange(ec.value)}
            className={`flex flex-col items-center gap-1 transition-all ${
              value === ec.value ? "scale-110" : "hover:scale-105"
            }`}
            title={ec.label}
          >
            <div
              className={`w-9 h-9 rounded-full border-2 transition-all ${
                value === ec.value ? "border-primary ring-2 ring-primary/30" : "border-transparent"
              }`}
              style={{ background: ec.color }}
            />
            <span className={`text-[0.6rem] ${value === ec.value ? "font-bold text-primary" : "text-muted-foreground"}`}>
              {ec.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// —— Hair Style Picker ——————————————————————————————————————————

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
      <HairSVG className="w-full h-full">
        <path d="M10 20 Q10 10 20 9 Q30 10 30 20 Q28 14 20 13 Q12 14 10 20Z" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
  {
    value: "halflang",
    label: "Halflang",
    svg: (
      <HairSVG className="w-full h-full">
        <path d="M10 20 Q10 10 20 8 Q30 10 30 20 L31 26 Q28 14 20 12 Q12 14 9 26 L10 20Z" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
  {
    value: "lang",
    label: "Lang",
    svg: (
      <HairSVG className="w-full h-full">
        <path d="M10 20 Q10 10 20 8 Q30 10 30 20 L32 34 Q28 14 20 12 Q12 14 8 34 L10 20Z" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
  {
    value: "krullen",
    label: "Krullen",
    svg: (
      <HairSVG className="w-full h-full">
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
      <HairSVG className="w-full h-full">
        <path d="M10 20 Q10 10 20 8 Q30 10 30 20 L31 26 L28 26 Q28 14 20 12 Q12 14 12 26 L9 26 L10 20Z" fill="#5C3A1E" />
        <path d="M12 18 Q12 14 20 12 Q28 14 28 18 L26 16 Q25 13 20 13 Q15 13 14 16Z" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
  {
    value: "staartjes",
    label: "Staartjes",
    svg: (
      <HairSVG className="w-full h-full">
        <path d="M10 20 Q10 10 20 9 Q30 10 30 20 Q28 14 20 13 Q12 14 10 20Z" fill="#5C3A1E" />
        <ellipse cx="6" cy="18" rx="3" ry="5" fill="#5C3A1E" />
        <circle cx="6" cy="13" r="1.5" fill="#E8734A" />
        <ellipse cx="34" cy="18" rx="3" ry="5" fill="#5C3A1E" />
        <circle cx="34" cy="13" r="1.5" fill="#E8734A" />
      </HairSVG>
    ),
  },
  {
    value: "vlechtjes",
    label: "Vlechtjes",
    svg: (
      <HairSVG className="w-full h-full">
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
      <HairSVG className="w-full h-full">
        <path d="M10 20 Q10 10 20 9 Q30 10 30 20 Q28 14 20 13 Q12 14 10 20Z" fill="#5C3A1E" />
        <circle cx="20" cy="8" r="5" fill="#5C3A1E" />
      </HairSVG>
    ),
  },
  {
    value: "afro",
    label: "Afro",
    svg: (
      <HairSVG className="w-full h-full">
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
      <label className="block text-xs font-medium mb-2">Haarstijl</label>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {HAIR_STYLES.map((hs) => (
          <button
            key={hs.value}
            type="button"
            onClick={() => onChange(hs.value)}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all ${
              value === hs.value
                ? "border-primary bg-primary/5 scale-105"
                : "border-muted hover:border-primary/30"
            }`}
            title={hs.label}
          >
            <div className="w-10 h-10">{hs.svg}</div>
            <span className={`text-[0.6rem] ${value === hs.value ? "font-bold text-primary" : "text-muted-foreground"}`}>
              {hs.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
