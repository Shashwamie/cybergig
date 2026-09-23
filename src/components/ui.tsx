"use client";

import { useEffect, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { DieIcon } from "@/components/DieIcon";
import { MAX_COLOR, MIN_COLOR, type Die } from "@/lib/game";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Neon color; defaults to the inherited text color. */
  color?: string;
  /** Filled "primary" style. */
  solid?: boolean;
  size?: "sm" | "md" | "lg";
}

export function NeonButton({ color, solid, size = "md", className, style, children, ...rest }: NeonButtonProps) {
  const s: CSSProperties = { ...style, ...(color ? { color } : null) };
  return (
    <button
      type="button"
      {...rest}
      style={s}
      className={cx(
        "relative inline-flex select-none items-center justify-center gap-2 border border-current font-semibold uppercase transition",
        "active:scale-[0.97] disabled:opacity-30 disabled:active:scale-100",
        size === "sm" && "min-h-9 px-3 text-[11px] tracking-[0.18em] lg:min-h-12 lg:px-5 lg:text-sm",
        size === "md" && "min-h-11 px-4 text-xs tracking-[0.2em]",
        size === "lg" && "min-h-14 px-6 text-sm tracking-[0.3em]",
        solid ? "glow-box bg-current/15 enabled:hover:bg-current/25" : "enabled:hover:bg-current/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

interface ModalProps {
  children: ReactNode;
  onClose?: () => void;
  /** Rotate the dialog 180° on tabletop screens so Player 2 can read it. */
  flipped?: boolean;
  color?: string;
  label: string;
}

export function Modal({ children, onClose, flipped, color = "#00f0ff", label }: ModalProps) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cx("w-full max-w-md", flipped && "tabletop:rotate-180")}
        onClick={(e) => e.stopPropagation()}
        style={{ color }}
      >
        <div className="glow-box max-h-[85dvh] overflow-y-auto border border-current bg-panel p-5">{children}</div>
      </div>
    </div>
  );
}

interface DieButtonProps {
  die: Die;
  color: string;
  /** Overrides the shown number (used while rolling). */
  face?: number | null;
  variant: "gig" | "fixer";
  paired?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  ready?: boolean;
  rolling?: boolean;
  pop?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function DieButton({
  die,
  color,
  face,
  variant,
  paired,
  selected,
  dimmed,
  ready,
  rolling,
  pop,
  disabled,
  onClick,
}: DieButtonProps) {
  const value = face !== undefined ? face : die.value;
  const inGig = variant === "gig" && value != null;
  const max = inGig && value === die.sides;
  const min = inGig && value === 1;
  // Min/max only recolor the number and label; the outline keeps the owner's color.
  const tone = max ? MAX_COLOR : min ? MIN_COLOR : undefined;
  const tags = [max && "MAX", min && "MIN", paired && "PAIR"].filter(Boolean).join("·");
  const fixer = variant === "fixer" && !rolling;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`D${die.sides}${value != null ? `, value ${value}` : ", not rolled"}${tags ? `, ${tags.toLowerCase().replaceAll("·", ", ")}` : ""}`}
      aria-pressed={selected || undefined}
      style={{ color }}
      className={cx(
        "group relative flex flex-col items-center transition duration-200 disabled:cursor-default",
        dimmed && "opacity-25",
        selected && "-translate-y-1",
      )}
    >
      <span
        className={cx(
          "block",
          variant === "gig"
            ? "size-[clamp(3.25rem,min(17vw,10.5dvh),8.5rem)] landscape:size-[clamp(3.25rem,min(9vw,16dvh),10rem)]"
            : "size-[clamp(2.25rem,min(10vw,6dvh),4.5rem)] landscape:size-[clamp(2.25rem,min(5vw,9dvh),5rem)]",
          rolling && "animate-die-roll",
          pop && "animate-die-pop",
          ready && !rolling && "animate-ready",
        )}
      >
        <DieIcon
          sides={die.sides}
          value={value}
          dashed={fixer}
          doubled={paired}
          fillOpacity={fixer ? 0 : 0.06}
          textColor={tone}
          className={cx("size-full", !fixer || ready ? "glow" : "opacity-60")}
        />
      </span>
      {variant === "gig" && (
        <span
          style={{ color: tone }}
          className="mt-0.5 font-display text-[9px] tracking-[0.08em] whitespace-nowrap opacity-80 lg:mt-1 lg:text-xs lg:tracking-[0.15em]"
        >
          D{die.sides}
          {tags && `·${tags}`}
        </span>
      )}
      {selected && (
        <span className="absolute -inset-1.5 border border-dashed border-white/90" aria-hidden />
      )}
    </button>
  );
}
