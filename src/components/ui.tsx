"use client";

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
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
  /** Enables swipe up/down to nudge the value; called once with the new value on release. */
  onNudge?: (value: number) => void;
}

const NUDGE_START_PX = 32;
const NUDGE_STEP_PX = 48;

/**
 * Vertical swipe on a rolled Gig: up increases, down decreases, one step per NUDGE_STEP_PX.
 * The value previews while dragging and commits once on release (one undo step per swipe).
 * "Up" is relative to the player: on Player 2's flipped panel, screen directions are reversed.
 */
function useNudgeDrag(die: Die, onNudge?: (value: number) => void) {
  const [steps, setSteps] = useState(0);
  const drag = useRef<{ pointerId: number; startY: number; invert: boolean; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  const enabled = !!onNudge && die.value != null;

  const clampSteps = (n: number) => Math.max(1 - die.value!, Math.min(die.sides - die.value!, n));

  const handlers = enabled
    ? {
        onPointerDown(e: PointerEvent<HTMLButtonElement>) {
          const section = e.currentTarget.closest("section");
          const invert = !!section && getComputedStyle(section).rotate === "180deg";
          drag.current = { pointerId: e.pointerId, startY: e.clientY, invert, moved: false };
          swallowClick.current = false;
          e.currentTarget.setPointerCapture(e.pointerId);
        },
        onPointerMove(e: PointerEvent<HTMLButtonElement>) {
          const d = drag.current;
          if (!d || e.pointerId !== d.pointerId) return;
          const up = (d.startY - e.clientY) * (d.invert ? -1 : 1);
          if (!d.moved && Math.abs(up) < NUDGE_START_PX) return;
          d.moved = true;
          const raw = Math.sign(up) * Math.floor((Math.abs(up) - NUDGE_START_PX) / NUDGE_STEP_PX + 1);
          const next = clampSteps(raw);
          setSteps((prev) => {
            if (prev !== next) {
              try {
                navigator.vibrate?.(8);
              } catch {}
            }
            return next;
          });
        },
        onPointerUp(e: PointerEvent<HTMLButtonElement>) {
          const d = drag.current;
          if (!d || e.pointerId !== d.pointerId) return;
          drag.current = null;
          if (d.moved) {
            swallowClick.current = true;
            if (steps !== 0) onNudge!(die.value! + steps);
          }
          setSteps(0);
        },
        onPointerCancel() {
          drag.current = null;
          setSteps(0);
        },
      }
    : {};

  /** True if the click that follows a swipe should be ignored. */
  const consumeSwipeClick = () => {
    const swallow = swallowClick.current;
    swallowClick.current = false;
    return swallow;
  };

  return { steps, handlers, enabled, consumeSwipeClick };
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
  onNudge,
}: DieButtonProps) {
  const nudge = useNudgeDrag(die, disabled ? undefined : onNudge);
  const value = face !== undefined ? face : die.value != null ? die.value + nudge.steps : null;
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
      onClick={() => {
        if (!nudge.consumeSwipeClick()) onClick?.();
      }}
      {...nudge.handlers}
      disabled={disabled}
      aria-label={`D${die.sides}${value != null ? `, value ${value}` : ", not rolled"}${tags ? `, ${tags.toLowerCase().replaceAll("·", ", ")}` : ""}`}
      aria-pressed={selected || undefined}
      style={{ color }}
      className={cx(
        "group relative flex flex-col items-center transition duration-200 disabled:cursor-default",
        dimmed && "opacity-25",
        selected && "-translate-y-1",
        // Claim vertical drags for nudging instead of scrolling the page.
        nudge.enabled && "touch-none select-none",
        nudge.steps !== 0 && "scale-110",
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
      {nudge.steps !== 0 && (
        <span
          aria-hidden
          className="glow-text absolute -top-3 -right-2 font-display text-xs font-bold text-white lg:text-sm"
        >
          {nudge.steps > 0 ? `+${nudge.steps}` : nudge.steps}
        </span>
      )}
    </button>
  );
}
