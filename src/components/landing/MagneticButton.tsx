'use client';

import React, { useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import Link from 'next/link';
import { usePerformance } from '@/components/shared';

interface MagneticButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  strength?: number; // Distance multiplier for magnetic attraction (default: 0.35)
}

/**
 * Magnetic interactive button with spring-physics cursor tracking.
 * Automatically bypassed on touch and low-power devices for 0% CPU overhead.
 */
export function MagneticButton({
  children,
  href,
  onClick,
  className = '',
  strength = 0.35,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { graphicsMode, isLowPowerDevice } = usePerformance();

  const enableMagnetic = graphicsMode === 'high' && !isLowPowerDevice;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = { stiffness: 220, damping: 20, mass: 0.1 };
  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!enableMagnetic || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    rawX.set(deltaX);
    rawY.set(deltaY);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (enableMagnetic) {
      rawX.set(0);
      rawY.set(0);
    }
  };

  const content = (
    <motion.div
      ref={buttonRef}
      style={{ x: enableMagnetic ? x : 0, y: enableMagnetic ? y : 0 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
    >
      {/* Subtle outer magnetic aura glow */}
      {isHovered && enableMagnetic && (
        <div
          className="absolute inset-0 -z-10 rounded-2xl bg-sky-500/20 blur-lg pointer-events-none transition-opacity duration-200"
        />
      )}
      {children}
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="inline-block">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="inline-block bg-transparent border-0 p-0 m-0">
      {content}
    </button>
  );
}

export default MagneticButton;
