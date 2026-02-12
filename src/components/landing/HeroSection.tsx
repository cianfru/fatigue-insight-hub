import { useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { LandingGlobe } from './LandingGlobe';
import { useScrollProgress } from './useScrollProgress';
import logoDark from '@/assets/logo-dark.png';

interface HeroSectionProps {
  onScrollToContent: () => void;
}

export function HeroSection({ onScrollToContent }: HeroSectionProps) {
  const heroRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(heroRef);

  // Fade out hero content as user scrolls down
  const contentOpacity = Math.max(0, 1 - progress * 2.5);
  const contentTranslate = progress * 40;

  return (
    <section ref={heroRef} className="relative h-screen overflow-hidden bg-[#000408]">
      {/* Mapbox Globe Background */}
      <LandingGlobe />

      {/* Sticky Nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <img src={logoDark} alt="Aerowake" className="h-7 md:h-8" />
          <span className="hidden sm:inline text-[10px] font-mono text-white/30 tracking-wider uppercase">
            v2.1.2
          </span>
        </div>
        <div className="text-[10px] font-mono text-white/25 tracking-wider uppercase">
          EASA ORO.FTL
        </div>
      </nav>

      {/* Hero Content */}
      <div
        className="relative z-10 flex h-full items-center px-6 md:px-10 lg:px-16"
        style={{
          opacity: contentOpacity,
          transform: `translateY(${contentTranslate}px)`,
        }}
      >
        <div className="max-w-2xl">
          {/* Badges */}
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium tracking-wider text-white/50 uppercase backdrop-blur-sm">
              Borbely Two-Process Model
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium tracking-wider text-white/50 uppercase backdrop-blur-sm">
              EASA ORO.FTL Compliant
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            See what your
            <br />
            <span className="bg-gradient-to-r from-[hsl(199,89%,48%)] to-[hsl(199,89%,68%)] bg-clip-text text-transparent">
              body sees.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/45 md:text-lg">
            Not what your roster says. Biomathematical fatigue prediction built on
            30+ years of peer-reviewed sleep science.
          </p>

          {/* Globe annotation */}
          <div className="mt-8 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(199,89%,48%)] animate-pulse" />
            <span className="text-xs text-white/25 font-mono">
              Live route network &middot; DOH hub &middot; 12 destinations &middot; 23 sectors
            </span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={onScrollToContent}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 transition-colors hover:text-white/50"
        style={{ opacity: contentOpacity }}
      >
        <span className="text-[10px] uppercase tracking-widest font-mono">Scroll</span>
        <ChevronDown className="h-4 w-4 animate-bounce" />
      </button>
    </section>
  );
}
