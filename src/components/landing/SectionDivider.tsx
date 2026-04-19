import { StarOrnament } from "./StarOrnament";
import { AMBER, INK } from "./tokens";

export function SectionDivider() {
  return (
    <div className="relative z-10 flex items-center justify-center gap-5 py-10 md:py-14">
      <div
        className="h-px w-12 md:w-16"
        style={{ backgroundColor: INK, opacity: 0.18 }}
      />
      <StarOrnament className="h-5 w-5" stroke={AMBER} />
      <div
        className="h-px w-12 md:w-16"
        style={{ backgroundColor: INK, opacity: 0.18 }}
      />
    </div>
  );
}
