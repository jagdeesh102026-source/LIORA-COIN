'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BRAND_CONFIG } from '@/config/brandConfig';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  href?: string | null;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showWordmark = true,
  showTagline = false,
  className = '',
  href = '/',
}) => {
  const dimensions = {
    sm: { width: 34, height: 34, text: 'text-lg', badge: 'text-[9px]' },
    md: { width: 44, height: 44, text: 'text-2xl', badge: 'text-[10px]' },
    lg: { width: 64, height: 64, text: 'text-3xl', badge: 'text-xs' },
    xl: { width: 96, height: 96, text: 'text-4xl', badge: 'text-sm' },
    hero: { width: 220, height: 220, text: 'text-5xl', badge: 'text-base' },
  };

  const dim = dimensions[size] || dimensions.md;

  const content = (
    <div className={`inline-flex items-center gap-3.5 group ${className}`}>
      <div className="relative flex items-center justify-center shrink-0">
        {/* Glowing ambient halo behind official Liora Coin medallion */}
        <div
          className="absolute rounded-full filter blur-md opacity-45 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"
          style={{
            width: dim.width * 1.15,
            height: dim.height * 1.15,
            background: 'radial-gradient(circle, rgba(217,170,74,0.45) 0%, rgba(217,170,74,0) 70%)',
          }}
        />

        {/* Official Liora Coin Logo Medallion */}
        <Image
          src={BRAND_CONFIG.assets.logo}
          alt={`${BRAND_CONFIG.displayName} Official Logo - ${BRAND_CONFIG.tagline}`}
          width={dim.width}
          height={dim.height}
          priority={size === 'md' || size === 'hero' || size === 'lg'}
          className="relative object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {showWordmark && (
        <div className="flex flex-col">
          <span className={`font-black tracking-wider text-metallic ${dim.text} leading-tight`}>
            LIORA <span className="text-amber-300">COIN</span>
          </span>
          {showTagline && (
            <span className={`tracking-[0.18em] uppercase text-secondary font-medium -mt-0.5 ${dim.badge}`}>
              {BRAND_CONFIG.tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none" aria-label={`${BRAND_CONFIG.displayName} Official Brand Home`}>
        {content}
      </Link>
    );
  }

  return content;
};
