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
          {!isAuthenticated ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="flex gap-2">
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
                    className={`pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 w-64 ${
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
              className="group mt-4 gap-2 bg-primary/90 backdrop-blur-sm hover:bg-primary text-primary-foreground px-8 py-6 text-lg"
            >
              Enter Platform
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Scroll indicator */}
      {isAuthenticated && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <button 
            onClick={handleEnter}
            className="flex flex-col items-center gap-2 text-white/40 transition-colors hover:text-white/70"
          >
            <span className="text-xs uppercase tracking-widest">Explore</span>
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Version badge */}
      <div className="absolute right-8 top-8 flex items-center gap-3 text-xs text-white/30">
        <span>v2.1.2</span>
        <span className="h-1 w-1 rounded-full bg-white/30" />
        <span>EASA ORO.FTL</span>
      </div>
    </div>
  );
}
