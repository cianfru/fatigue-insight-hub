import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Lock, 
  Brain, 
  Clock, 
  AlertTriangle, 
  Shield, 
  BarChart3, 
  Plane, 
  UserCheck, 
  Building2, 
  Search,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Zap,
  Eye,
  FileText,
  GraduationCap
} from 'lucide-react';
import heroCockpit from '@/assets/hero-cockpit.jpg';
import logoDark from '@/assets/logo-dark.png';

interface LandingPageProps {
  onEnter: () => void;
}

const ACCESS_PASSWORD = 'Admin123';

export function LandingPage({ onEnter }: LandingPageProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ACCESS_PASSWORD) {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  const scrollToCta = () => {
    ctaRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen w-full bg-[#000408] text-white overflow-x-hidden">
      {/* ─── HERO SECTION ─── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img 
            src={heroCockpit} 
            alt="Cockpit at twilight" 
            className="h-full w-full object-cover"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#000408]/70 via-[#000408]/40 to-[#000408]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#000408]/80 via-transparent to-transparent" />
        </div>

        {/* Nav bar */}
        <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5 md:px-12">
          <img src={logoDark} alt="Aerowake" className="h-8 md:h-10 w-auto" />
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span>v2.1.2</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">EASA ORO.FTL</span>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 max-w-4xl px-6 md:px-12 text-center md:text-left w-full">
          <div className="space-y-6">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95]">
              <span className="block">See what your</span>
              <span className="block text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, hsl(199 89% 48%), hsl(199 89% 68%))' }}>
                body sees.
              </span>
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/60 max-w-2xl font-light">
              Not what your roster says. Biomathematical fatigue prediction 
              built on 30+ years of peer-reviewed sleep science.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white/10 text-white/70 border-white/20 hover:bg-white/15">Borbély Two-Process Model</Badge>
              <Badge className="bg-white/10 text-white/70 border-white/20 hover:bg-white/15">EASA ORO.FTL Compliant</Badge>
              <Badge className="bg-white/10 text-white/70 border-white/20 hover:bg-white/15">Professional Grade</Badge>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button 
          onClick={scrollToCta}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 hover:text-white/60 transition-colors animate-bounce"
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">Discover</span>
          <ChevronDown className="h-5 w-5" />
        </button>
      </section>

      {/* ─── PROBLEM → SOLUTION ─── */}
      <section className="relative py-24 md:py-32 px-6 md:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#000408] via-[#000408] to-[#0a0f1a]" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
            {/* Problem */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1.5 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4" />
                The Problem
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Your roster says you're legal.
                <span className="block text-white/40 mt-1">Your biology disagrees.</span>
              </h2>
              <p className="text-white/50 leading-relaxed">
                Flight time limitations protect schedules, not people. A pilot can be fully FTL-compliant 
                and still land with cognitive performance equivalent to a 0.05% BAC — all while the roster 
                says everything is fine.
              </p>
              <div className="space-y-3 text-sm text-white/40">
                <div className="flex items-start gap-3">
                  <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <span>FTL limits don't account for circadian phase or sleep debt</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <span>Most pilots have no access to FRMS-grade fatigue tools</span>
                </div>
                <div className="flex items-start gap-3">
                  <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <span>Subjective fatigue reports lack objective evidence</span>
                </div>
              </div>
            </div>

            {/* Solution */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                The Solution
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Aerowake quantifies
                <span className="block mt-1" style={{ color: 'hsl(199 89% 58%)' }}>what you actually feel.</span>
              </h2>
              <p className="text-white/50 leading-relaxed">
                Using the same biomathematical models employed by airline FRMS programs, Aerowake provides 
                minute-by-minute performance predictions for every duty in your roster.
              </p>
              <div className="space-y-3 text-sm text-white/40">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Objective, science-backed performance scores (0–100)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <span>Circadian phase, sleep debt, and inertia — all modeled</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <span>SMS-ready reports with EASA regulatory references</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="absolute inset-0 bg-[#0a0f1a]" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-white/50 max-w-2xl mx-auto">Five steps from roster upload to actionable fatigue insights</p>
          </div>
          <div className="grid md:grid-cols-5 gap-6">
            {[
              { step: '01', icon: FileText, title: 'Upload Roster', desc: 'CSV or manual entry with duty times and routes' },
              { step: '02', icon: Brain, title: 'Sleep Estimation', desc: 'AI-driven sleep opportunity modeling' },
              { step: '03', icon: Zap, title: 'Bio-Math Engine', desc: 'Process S + C + W computed per-minute' },
              { step: '04', icon: BarChart3, title: 'Performance Scores', desc: '0–100 scale for every duty moment' },
              { step: '05', icon: Eye, title: 'Visual Insights', desc: 'Chronograms, heatmaps, pinch alerts' },
            ].map((item) => (
              <div key={item.step} className="group text-center space-y-4">
                <div className="relative mx-auto w-16 h-16 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center transition-all group-hover:border-white/20 group-hover:bg-white/10">
                  <item.icon className="h-7 w-7 text-white/60 group-hover:text-white/80 transition-colors" />
                  <span className="absolute -top-2 -right-2 text-[10px] font-mono font-bold text-white/30 bg-white/5 rounded-full w-6 h-6 flex items-center justify-center border border-white/10">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── KEY FEATURES ─── */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a] to-[#000408]" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Platform Capabilities</h2>
            <p className="text-white/50 max-w-2xl mx-auto">Everything you need for evidence-based fatigue risk management</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Clock, title: 'Monthly Chronogram', desc: 'Visual heatmap of every duty, sleep period, and performance score across your entire month.' },
              { icon: Brain, title: 'Borbély Two-Process Model', desc: 'Sleep homeostasis (Process S) and circadian rhythm (Process C) computed for accurate predictions.' },
              { icon: AlertTriangle, title: 'Pinch Event Detection', desc: 'Automatic identification of duty periods where multiple fatigue factors converge dangerously.' },
              { icon: BarChart3, title: 'Performance Timeline', desc: 'Minute-by-minute cognitive performance tracking across all flight segments.' },
              { icon: Shield, title: 'EASA ORO.FTL Compliance', desc: 'Built-in regulatory references and SMS-ready documentation for fatigue reports.' },
              { icon: GraduationCap, title: 'Fully Transparent Science', desc: 'Every formula, parameter, and assumption is documented. Nothing is a black box.' },
            ].map((feature) => (
              <div key={feature.title} className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4 transition-all hover:border-white/15 hover:bg-white/[0.06]">
                <feature.icon className="h-6 w-6 text-white/50 group-hover:text-white/70 transition-colors" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SCIENCE CREDIBILITY ─── */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="absolute inset-0 bg-[#000408]" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built on Proven Science</h2>
            <p className="text-white/50 max-w-2xl mx-auto">30+ years of peer-reviewed research in sleep science and aviation fatigue</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { stat: '30+', label: 'Years of Research', cite: 'Borbély & Achermann, 1999' },
              { stat: '3', label: 'Biological Processes', cite: 'Homeostatic · Circadian · Inertia' },
              { stat: '0–100', label: 'Performance Scale', cite: 'Validated scoring methodology' },
              { stat: '24/7', label: 'Minute-by-Minute', cite: 'Per-minute temporal resolution' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 text-center space-y-2">
                <div className="text-3xl md:text-4xl font-bold" style={{ color: 'hsl(199 89% 58%)' }}>{item.stat}</div>
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs text-white/30">{item.cite}</div>
              </div>
            ))}
          </div>

          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            {[
              { title: 'Borbély & Achermann (1999)', desc: 'Sleep homeostasis and models of sleep regulation. Journal of Biological Rhythms.' },
              { title: 'EASA Moebus Report (2008–2013)', desc: 'Scientific and medical evaluation of flight time limitations.' },
              { title: 'NASA Gander et al. (1994)', desc: 'Aviation fatigue modeling for commercial air carrier operations.' },
              { title: 'Signal et al. (2009)', desc: 'Operational validation of biomathematical fatigue models.' },
            ].map((ref) => (
              <div key={ref.title} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="font-medium text-sm">{ref.title}</p>
                <p className="text-xs text-white/30 mt-1">{ref.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHO IS IT FOR ─── */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="absolute inset-0 bg-gradient-to-b from-[#000408] to-[#0a0f1a]" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Who Is It For?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Plane, title: 'Pilots', desc: 'Identify risky duties before they happen. Build evidence-based fatigue reports.' },
              { icon: UserCheck, title: 'Safety Managers', desc: 'Test roster patterns, investigate incidents, track trends across operations.' },
              { icon: Building2, title: 'Pilot Unions', desc: 'Data-driven collective bargaining. Validate member fatigue concerns.' },
              { icon: Search, title: 'Researchers', desc: 'Learn biomathematical modeling. Compare predictions with operational data.' },
            ].map((user) => (
              <div key={user.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-3">
                <user.icon className="h-6 w-6 text-white/50" />
                <h3 className="font-semibold">{user.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{user.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── IS / IS NOT ─── */}
      <section className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="absolute inset-0 bg-[#0a0f1a]" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-green-500/10 bg-green-500/[0.03] p-8 space-y-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
                <h3 className="text-xl font-bold">What This Tool IS</h3>
              </div>
              <ul className="space-y-3 text-sm text-white/50">
                {['Educational — learn fatigue science', 'Analytical — understand your roster', 'Predictive — model likely fatigue levels', 'Evidence-based — grounded in research', 'Advocacy tool — support safety conversations', 'Professional-grade — extensive domain expertise'].map(t => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-8 space-y-5">
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-400" />
                <h3 className="text-xl font-bold">What This Tool IS NOT</h3>
              </div>
              <ul className="space-y-3 text-sm text-white/50">
                {['Not certified — not for regulatory compliance', 'Not operational — not for go/no-go decisions', 'Not medical — not a fitness-for-duty assessment', 'Not a replacement for airline FRMS', 'Not validated for individual variation', 'Not guaranteed — no warranty for predictions'].map(t => (
                  <li key={t} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA + PASSWORD GATE ─── */}
      <section ref={ctaRef} className="relative py-24 md:py-32 px-6 md:px-12">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a] to-[#000408]" />
        <div className="relative z-10 max-w-xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to See the Truth?</h2>
          <p className="text-white/50">
            Enter the access password to begin analyzing your roster.
          </p>

          {!isAuthenticated ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    type="password"
                    placeholder="Enter access password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(false); }}
                    className={`pl-10 bg-white/5 border-white/15 text-white placeholder:text-white/30 w-full sm:w-72 h-12 ${
                      error ? 'border-red-500 animate-shake' : ''
                    }`}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg"
                  className="h-12 px-8 bg-[hsl(199,89%,48%)] hover:bg-[hsl(199,89%,42%)] text-white font-medium"
                >
                  Unlock Access
                </Button>
              </div>
              {error && (
                <p className="text-sm text-red-400">Incorrect password. Please try again.</p>
              )}
            </form>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Access Granted
              </div>
              <div>
                <Button 
                  onClick={onEnter}
                  size="lg"
                  className="group h-14 px-10 text-lg bg-[hsl(199,89%,48%)] hover:bg-[hsl(199,89%,42%)] text-white font-medium"
                >
                  Enter Platform
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/[0.06] py-8 px-6 md:px-12 text-center">
        <p className="text-xs text-white/20">
          Aerowake v2.1.2 · Borbély Two-Process Model · EASA ORO.FTL Compliant
        </p>
        <p className="text-[10px] text-white/10 mt-2">
          Borbély & Achermann (1999) · Van Dongen et al. (2003) · Dinges et al. (1997)
        </p>
      </footer>
    </div>
  );
}
