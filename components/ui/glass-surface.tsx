"use client";

import * as React from "react";
import type { GlassSurfaceVariantProps } from "@/components/ui/glass-surface.styles";
import { glassSurfaceVariants } from "@/components/ui/glass-surface.styles";
import { cn } from "@/lib/utils";

type SurfaceMotionOptions = {
  disabled?: boolean;
};

const motionMediaQuery =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
        return;
      }
      (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}

function callAll<E>(
  ...handlers: Array<((event: E) => void) | undefined>
): (event: E) => void {
  return (event) => {
    handlers.forEach((handler) => handler?.(event));
  };
}

export function useInteractiveSurface<T extends HTMLElement>({
  disabled = false,
}: SurfaceMotionOptions = {}) {
  const ref = React.useRef<T | null>(null);
  const canTrackRef = React.useRef(false);

  const reset = React.useCallback(() => {
    const node = ref.current;
    if (!node) return;

    node.dataset.surface = "idle";
    node.dataset.pressed = "false";
    node.style.setProperty("--pointer-x", "50%");
    node.style.setProperty("--pointer-y", "18%");
  }, []);

  const updateFromPointer = React.useCallback(
    (clientX: number, clientY: number) => {
      const node = ref.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const pointerX = (clientX - rect.left) / rect.width;
      const pointerY = (clientY - rect.top) / rect.height;
      const clampedX = Math.min(Math.max(pointerX, 0), 1);
      const clampedY = Math.min(Math.max(pointerY, 0), 1);

      node.dataset.surface = "active";
      node.style.setProperty("--pointer-x", `${(clampedX * 100).toFixed(2)}%`);
      node.style.setProperty("--pointer-y", `${(clampedY * 100).toFixed(2)}%`);
    },
    []
  );

  React.useEffect(() => {
    reset();
  }, [reset]);

  React.useEffect(() => {
    if (disabled || typeof window === "undefined") {
      canTrackRef.current = false;
      reset();
      return;
    }

    const media = window.matchMedia(motionMediaQuery);
    const updateMediaState = () => {
      canTrackRef.current = media.matches;
      if (!media.matches) reset();
    };

    updateMediaState();
    media.addEventListener("change", updateMediaState);
    return () => media.removeEventListener("change", updateMediaState);
  }, [disabled, reset]);

  const handlePointerEnter = React.useCallback(
    (event: React.PointerEvent<T>) => {
      if (disabled || !canTrackRef.current) return;
      updateFromPointer(event.clientX, event.clientY);
    },
    [disabled, updateFromPointer]
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<T>) => {
      if (disabled || !canTrackRef.current) return;
      updateFromPointer(event.clientX, event.clientY);
    },
    [disabled, updateFromPointer]
  );

  const handlePointerLeave = React.useCallback(() => {
    if (disabled) return;
    reset();
  }, [disabled, reset]);

  const handlePointerDown = React.useCallback(() => {
    const node = ref.current;
    if (!node || disabled) return;
    node.dataset.pressed = "true";
  }, [disabled]);

  const handlePointerUp = React.useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.dataset.pressed = "false";
  }, []);

  return {
    ref,
    onPointerEnter: handlePointerEnter,
    onPointerMove: handlePointerMove,
    onPointerLeave: handlePointerLeave,
    onPointerCancel: handlePointerLeave,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onBlur: handlePointerLeave,
  };
}

type GlassSurfaceProps = React.HTMLAttributes<HTMLDivElement> &
  GlassSurfaceVariantProps & {
    motionStrength?: number;
  };

export const GlassSurface = React.forwardRef<HTMLDivElement, GlassSurfaceProps>(
  function GlassSurface(
    {
      className,
      variant,
      interactive = true,
      motionStrength = 1,
      onPointerEnter,
      onPointerMove,
      onPointerLeave,
      onPointerCancel,
      onPointerDown,
      onPointerUp,
      onBlur,
      ...props
    },
    forwardedRef
  ) {
    void motionStrength;

    const surfaceMotion = useInteractiveSurface<HTMLDivElement>({
      disabled: !interactive,
    });

    return (
      <div
        ref={composeRefs(surfaceMotion.ref, forwardedRef)}
        className={cn(glassSurfaceVariants({ variant, interactive }), className)}
        data-surface={interactive ? "idle" : undefined}
        onPointerEnter={callAll(onPointerEnter, surfaceMotion.onPointerEnter)}
        onPointerMove={callAll(onPointerMove, surfaceMotion.onPointerMove)}
        onPointerLeave={callAll(onPointerLeave, surfaceMotion.onPointerLeave)}
        onPointerCancel={callAll(onPointerCancel, surfaceMotion.onPointerCancel)}
        onPointerDown={callAll(onPointerDown, surfaceMotion.onPointerDown)}
        onPointerUp={callAll(onPointerUp, surfaceMotion.onPointerUp)}
        onBlur={callAll(onBlur, surfaceMotion.onBlur)}
        {...props}
      />
    );
  }
);
