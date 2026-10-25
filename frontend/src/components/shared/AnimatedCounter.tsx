import React, { useEffect, useState, useRef } from 'react';
import { animate } from 'framer-motion';

interface AnimatedCounterProps {
  value: number | string | null | undefined;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 0.45,
  suffix = '',
  prefix = '',
  className = '',
}) => {
  const numericVal = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  const isInvalid = value === null || value === undefined || isNaN(numericVal);
  const [display, setDisplay] = useState<number>(isInvalid ? 0 : numericVal);
  const prevValRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(false);

  useEffect(() => {
    if (isInvalid) return;

    // If value didn't change and already mounted, do nothing
    if (isMountedRef.current && prevValRef.current === numericVal) {
      return;
    }

    const startVal = isMountedRef.current ? prevValRef.current : 0;
    prevValRef.current = numericVal;
    isMountedRef.current = true;

    // If start equals target, set immediately without RAF loop
    if (startVal === numericVal) {
      setDisplay(numericVal);
      return;
    }

    let lastReported = startVal;
    const controls = animate(startVal, numericVal, {
      duration: Math.min(duration, 0.5),
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        const rounded = Math.round(latest);
        if (rounded !== lastReported) {
          lastReported = rounded;
          setDisplay(rounded);
        }
      },
    });

    return () => controls.stop();
  }, [numericVal, isInvalid, duration]);

  if (isInvalid) {
    return <span className={className}>—</span>;
  }

  return (
    <span className={className}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
};
