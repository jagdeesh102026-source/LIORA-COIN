import React from 'react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false }) => {
  const iconSizes = {
    sm: 32,
    md: 40,
    lg: 56,
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const s = iconSizes[size];

  return (
    <Link href="/" className="inline-flex items-center gap-3 group focus:outline-none" aria-label="OXENIQ Home">
      <div className="relative flex items-center justify-center">
        {/* Glowing aura */}
        <div 
          className="absolute rounded-full filter blur-md opacity-70 group-hover:opacity-100 transition-opacity"
          style={{
            width: s + 12,
            height: s + 12,
            background: 'radial-gradient(circle, rgba(57,123,255,0.4) 0%, rgba(99,179,255,0) 70%)',
          }}
        />
        {/* Emblem SVG */}
        <svg
          width={s}
          height={s}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            <linearGradient id="oxeniqGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#63B3FF" />
              <stop offset="50%" stopColor="#397BFF" />
              <stop offset="100%" stopColor="#1742A8" />
            </linearGradient>
            <linearGradient id="oxeniqGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#C7D2E2" />
              <stop offset="100%" stopColor="#6B7C96" />
            </linearGradient>
            <filter id="shadowGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#397BFF" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Outer Hex Shield */}
          <polygon
            points="50,6 88,28 88,72 50,94 12,72 12,28"
            stroke="url(#oxeniqGrad1)"
            strokeWidth="4"
            fill="#0E1626"
            filter="url(#shadowGlow)"
          />

          {/* Inner Geometric "O" with Central Energy Ray */}
          <polygon
            points="50,18 78,35 78,65 50,82 22,65 22,35"
            stroke="url(#oxeniqGrad2)"
            strokeWidth="2.5"
            fill="none"
            opacity="0.8"
          />

          {/* Central Power Diamond Core */}
          <polygon
            points="50,32 64,50 50,68 36,50"
            fill="url(#oxeniqGrad1)"
          />
          <circle cx="50" cy="50" r="5" fill="#FFFFFF" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span className={`font-extrabold tracking-wider text-metallic ${textSizes[size]}`}>
          OXEN<span className="text-gradient-blue">IQ</span>
        </span>
        {showTagline && (
          <span className="text-[10px] tracking-[0.16em] uppercase text-secondary font-medium -mt-1">
            Powering the Next Digital Era
          </span>
        )}
      </div>
    </Link>
  );
};
