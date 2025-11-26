import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const requestRef = useRef<number>();

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutQuart)
      const ease = 1 - Math.pow(1 - percentage, 4);
      
      const current = startValueRef.current + (value - startValueRef.current) * ease;
      setDisplayValue(current);

      if (percentage < 1) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue = new Intl.NumberFormat('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(displayValue);

  return (
    <span className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};
