"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, useMotionValue, animate } from "framer-motion";

const ITEM_HEIGHT = 48;
const VISIBLE = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE;

function calcY(v: number, minVal: number) {
  return -(v - minVal) * ITEM_HEIGHT + CONTAINER_HEIGHT / 2 - ITEM_HEIGHT / 2;
}

interface NumberPickerProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}

export default function NumberPicker({ value, min = 0, max = 99, onChange }: NumberPickerProps) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const y = useMotionValue(calcY(value, min));
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    animate(y, calcY(value, min), { type: "spring", stiffness: 300, damping: 30 });
    setSelected(value);
  }, [value, min]); // eslint-disable-line react-hooks/exhaustive-deps

  const snapToNearest = useCallback(() => {
    const currentY = y.get();
    const offset = -(currentY - CONTAINER_HEIGHT / 2 + ITEM_HEIGHT / 2);
    const idx = Math.round(offset / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(numbers.length - 1, idx));
    animate(y, calcY(numbers[clamped], min), { type: "spring", stiffness: 300, damping: 30 });
    setSelected(numbers[clamped]);
    onChange(numbers[clamped]);
  }, [y, numbers, min, onChange]);

  return (
    <div
      className="number-picker-container relative select-none"
      style={{ height: CONTAINER_HEIGHT, width: 80, overflow: "hidden" }}
    >
      {/* Selection highlight band */}
      <div
        className="absolute inset-x-1 z-20 pointer-events-none rounded-lg"
        style={{
          top: CONTAINER_HEIGHT / 2 - ITEM_HEIGHT / 2,
          height: ITEM_HEIGHT,
          background: "rgba(96,165,250,0.08)",
          border: "1px solid rgba(96,165,250,0.3)",
        }}
      />
      <motion.div
        style={{ y }}
        drag="y"
        dragConstraints={{
          top: calcY(numbers[numbers.length - 1], min),
          bottom: calcY(numbers[0], min),
        }}
        dragElastic={0.08}
        onDragEnd={snapToNearest}
        className="cursor-grab active:cursor-grabbing"
      >
        {numbers.map((n) => (
          <motion.div
            key={n}
            style={{ height: ITEM_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}
            animate={{ opacity: n === selected ? 1 : 0.3, scale: n === selected ? 1.2 : 0.85 }}
            transition={{ duration: 0.12 }}
            className="font-bold text-white text-xl"
          >
            {n}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
