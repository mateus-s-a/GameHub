import { useState } from "react";
import { PanInfo } from "framer-motion";
import { CAROUSEL_GESTURE_CONFIG } from "@gamehub/core";

export const useCarouselDrag = (onNext: () => void, onPrev: () => void) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDragStart = () => setIsDragging(true);

  const onDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    const { offset, velocity } = info;
    const { SWIPE_THRESHOLD, VELOCITY_THRESHOLD } = CAROUSEL_GESTURE_CONFIG;

    // Detect direction based on offset distance OR high velocity "flick"
    const isSwipeLeft = offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD;
    const isSwipeRight = offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD;

    if (isSwipeLeft) {
      onNext();
    } else if (isSwipeRight) {
      onPrev();
    }
  };

  return {
    isDragging,
    dragProps: {
      drag: "x" as const,
      dragConstraints: { left: 0, right: 0 },
      dragElastic: CAROUSEL_GESTURE_CONFIG.DRAG_ELASTIC,
      dragDirectionLock: true,
      onDragStart,
      onDragEnd,
    },
  };
};
