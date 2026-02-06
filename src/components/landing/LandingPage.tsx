import { Suspense, useState } from 'react';
import { EarthScene } from './EarthScene';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ChevronDown, Lock } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

const ACCESS_PASSWORD = 'Admin123';

export function LandingPage({ onEnter }: LandingPageProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ACCESS_PASSWORD) {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleEnter = () => {
    if (isAuthenticated) {
      onEnter();
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#000408]">
      {/* 3D Earth Background */}
      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 md:h-16 md:w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }>
        <EarthScene />
      </Suspense>
      
      {/* Gradient overlay for text readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#000408]/80" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#000408]/60 via-transparent to-transparent" />
      
      {/* Aurora blobs on landing */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: 0.7 }}>
        <div className="absolute rounded-full" style={{ mixBlendMode: 'screen', top: '-10%', left: '-5%', width: '60vw', height: '60vh', background: 'radial-gradient(circle, hsl(199 89% 48% / 0.5) 0%, transparent 60%)', filter: 'blur(80px)', animation: 'aurora-drift-1 18s ease-in-out infinite' }} />
        <div className="absolute rounded-full" style={{ mixBlendMode: 'screen', top: '25%', right: '-10%', width: '55vw', height: '55vh', background: 'radial-gradient(circle, hsl(280 65% 60% / 0.4) 0%, transparent 60%)', filter: 'blur(80px)', animation: 'aurora-drift-2 22s ease-in-out infinite' }} />
        <div className="absolute rounded-full" style={{ mixBlendMode: 'screen', bottom: '-5%', left: '15%', width: '50vw', height: '50vh', background: 'radial-gradient(circle, hsl(160 70% 50% / 0.3) 0%, transparent 60%)', filter: 'blur(80px)', animation: 'aurora-drift-3 25s ease-in-out infinite' }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-start justify-center px-4 sm:px-8 md:px-16 lg:px-24">
        <div className="max-w-2xl space-y-4 md:space-y-8 rounded-2xl border border-white/[0.12] p-6 md:p-10" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
          {/* Logo / Title */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-white">
              Aerowake
            </h1>
            <div className="h-0.5 md:h-1 w-16 md:w-24 bg-gradient-to-r from-primary to-primary/0" />
          </div>
          
          {/* Tagline */}
          <div className="space-y-1">
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-light text-white/90">
              See what your body sees,
            </p>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-light text-white/70">
              not what your roster says.
            </p>
          </div>
          
          {/* Subtitle */}
          <p className="max-w-lg text-sm md:text-base lg:text-lg text-white/50">
            Biomathematical fatigue prediction for aviation professionals. 
            Built on 30+ years of peer-reviewed sleep science.
          </p>
          
          {/* CTA Button */}
          {!isAuthenticated ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <Input
                    type="password"
                    placeholder="Enter access password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(false);
                    }}
                    className={`pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 w-full sm:w-64 ${
                      error ? 'border-red-500 animate-shake' : ''
                    }`}
                  />
                </div>
                <Button 
                  type="submit"
                  size="default"
                  className="gap-2 bg-primary/90 backdrop-blur-sm hover:bg-primary text-primary-foreground"
                >
                  Unlock
                </Button>
              </div>
              {error && (
                <p className="text-sm text-red-400">Incorrect password. Please try again.</p>
              )}
            </form>
          ) : (
            <Button 
              onClick={handleEnter}
              size="lg"
              className="group mt-4 gap-2 bg-primary/90 backdrop-blur-sm hover:bg-primary text-primary-foreground px-6 py-4 md:px-8 md:py-6 text-base md:text-lg"
            >
              Enter Platform
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Scroll indicator */}
      {isAuthenticated && (
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <button 
            onClick={handleEnter}
            className="flex flex-col items-center gap-1 md:gap-2 text-white/40 transition-colors hover:text-white/70"
          >
            <span className="text-[10px] md:text-xs uppercase tracking-widest">Explore</span>
            <ChevronDown className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>
      )}
      
      {/* Version badge */}
      <div className="absolute right-4 top-4 md:right-8 md:top-8 flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-white/30">
        <span>v2.1.2</span>
        <span className="h-1 w-1 rounded-full bg-white/30" />
        <span className="hidden sm:inline">EASA ORO.FTL</span>
      </div>
    </div>
  );
}
