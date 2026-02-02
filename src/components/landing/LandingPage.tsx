import { Suspense } from 'react';
import { EarthScene } from './EarthScene';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronDown } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#000408]">
      {/* 3D Earth Background */}
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }>
        <EarthScene />
      </Suspense>
      
      {/* Gradient overlay for text readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000408]/80" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#000408]/60 via-transparent to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-start justify-center px-8 md:px-16 lg:px-24">
        <div className="max-w-2xl space-y-8">
          {/* Logo / Title */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl">
              Aerowake
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary/0" />
          </div>
          
          {/* Tagline */}
          <div className="space-y-1">
            <p className="text-2xl font-light text-white/90 md:text-3xl lg:text-4xl">
              See what your body sees,
            </p>
            <p className="text-2xl font-light text-white/70 md:text-3xl lg:text-4xl">
              not what your roster says.
            </p>
          </div>
          
          {/* Subtitle */}
          <p className="max-w-lg text-base text-white/50 md:text-lg">
            Biomathematical fatigue prediction for aviation professionals. 
            Built on 30+ years of peer-reviewed sleep science.
          </p>
          
          {/* CTA Button */}
          <Button 
            onClick={onEnter}
            size="lg"
            className="group mt-4 gap-2 bg-primary/90 backdrop-blur-sm hover:bg-primary text-primary-foreground px-8 py-6 text-lg"
          >
            Enter Platform
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <button 
          onClick={onEnter}
          className="flex flex-col items-center gap-2 text-white/40 transition-colors hover:text-white/70"
        >
          <span className="text-xs uppercase tracking-widest">Explore</span>
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
      
      {/* Version badge */}
      <div className="absolute right-8 top-8 flex items-center gap-3 text-xs text-white/30">
        <span>v2.1.2</span>
        <span className="h-1 w-1 rounded-full bg-white/30" />
        <span>EASA ORO.FTL</span>
      </div>
    </div>
  );
}
