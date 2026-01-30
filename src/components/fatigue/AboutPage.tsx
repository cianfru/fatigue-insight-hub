import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  GraduationCap, 
  Lightbulb, 
  FlaskConical, 
  Target, 
  Users, 
  Plane, 
  Quote,
  Github,
  Linkedin,
  BookOpen,
  Heart,
  Rocket,
  CheckCircle2,
  Globe
} from 'lucide-react';

export function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Hero Quote */}
      <Card variant="glow" className="relative overflow-hidden">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            <Quote className="h-10 w-10 text-primary/40 mb-4" />
            <blockquote className="text-xl md:text-2xl font-medium italic text-foreground/90 max-w-2xl">
              "The best safety culture is one where pilots can speak up with data, not just feelings, and be heard."
            </blockquote>
            <p className="mt-4 text-muted-foreground">— Andrea Cianfruglia, Creator of Aerowake</p>
          </div>
        </CardContent>
      </Card>

      {/* Background Section */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Background
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            <strong className="text-foreground">Andrea Cianfruglia</strong> is an airline pilot and aviation safety advocate 
            with a passion for applying scientific methodology to improve pilot wellbeing and operational safety.
          </p>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                Professional Experience
              </h4>
              <p className="text-sm font-medium">Commercial Airline Pilot</p>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>20 years of operational experience</li>
                <li>First-hand experience with fatigue challenges in modern airline operations</li>
                <li>Direct exposure to roster design impacts on crew wellbeing</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Education & Expertise
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li><strong className="text-foreground">Aviation Operations</strong> — Practical knowledge of EASA FTL regulations</li>
                <li><strong className="text-foreground">Biomathematical Modeling</strong> — Self-taught expertise in fatigue prediction</li>
                <li><strong className="text-foreground">Software Development</strong> — Full-stack aviation applications</li>
                <li><strong className="text-foreground">Data Science</strong> — Mathematical models for real-world problems</li>
              </ul>
              <p className="text-sm text-muted-foreground pt-2">
                <span className="text-foreground font-medium">Academic:</span> MSc in Air Transport Management with focus on Safety
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Why Aerowake Section */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-warning" />
            Why Aerowake?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-critical">The Problem</h4>
            <p className="text-muted-foreground">
              During my career as an airline pilot, I experienced first-hand how roster patterns can dramatically 
              impact fatigue levels—yet pilots often lack the tools to:
            </p>
            <ul className="grid gap-2 md:grid-cols-2">
              {[
                'Quantify their fatigue objectively',
                'Predict high-risk duties before they happen',
                'Advocate effectively for safer rosters',
                'Understand the science behind exhausting patterns'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-critical mt-0.5">✗</span>
                  {item}
                </li>
              ))}
            </ul>
            <Card variant="warning" className="mt-4">
              <CardContent className="py-4">
                <p className="text-sm">
                  Aviation professionals are led to believe that <strong>FTL compliance equals safety</strong>. 
                  This is a gross misconception not supported by validating data.
                </p>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground">
              Airlines have access to sophisticated FRMS costing hundreds of thousands of dollars. 
              But individual pilots? They're left to rely on subjective feelings and regulatory minimums.
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="font-semibold text-success">The Solution</h4>
            <p className="text-muted-foreground">
              Aerowake was born from a simple question:
            </p>
            <blockquote className="border-l-2 border-primary pl-4 italic text-foreground/90">
              "What if pilots had access to the same biomathematical models that airlines use for their FRMS?"
            </blockquote>
            <p className="text-sm text-muted-foreground">
              After thousands of hours of research, development, and testing, Aerowake brings professional-grade 
              fatigue analysis to the pilot community—bridging the gap between academic research and practical application.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Development Journey */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-info" />
            Development Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-6">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border hidden md:block" />
            
            {[
              {
                phase: 'Phase 1',
                title: 'Research & Foundation',
                items: [
                  'Deep dive into sleep science literature',
                  'Study of EASA Moebus Report and regulatory framework',
                  'Analysis of Borbély two-process model',
                  'Review of NASA/FAA aviation fatigue research',
                  'Consultation with sleep researchers'
                ]
              },
              {
                phase: 'Phase 2',
                title: 'Model Development',
                items: [
                  'Python implementation of Borbély model',
                  'Integration of EASA compliance rules',
                  'Sleep quality algorithm development',
                  'Workload factor calibration',
                  'Validation against published studies'
                ]
              },
              {
                phase: 'Phase 3',
                title: 'Application Development',
                items: [
                  'Backend API architecture (FastAPI)',
                  'Frontend interface (React/TypeScript)',
                  'Interactive visualization system',
                  'PDF roster parsing',
                  'SMS report generation'
                ]
              },
              {
                phase: 'Phase 4',
                title: 'Testing & Refinement',
                badge: 'Current',
                items: [
                  'Real-world roster analysis',
                  'Bug fixes and optimisation',
                  'User feedback integration',
                  'Documentation creation'
                ]
              }
            ].map((phase, idx) => (
              <div key={idx} className="relative md:pl-10">
                <div className="hidden md:flex absolute left-0 top-1 h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/30">
                  <span className="text-xs font-bold text-primary">{idx + 1}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{phase.phase}</Badge>
                    <h4 className="font-semibold">{phase.title}</h4>
                    {phase.badge && <Badge variant="success">{phase.badge}</Badge>}
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    {phase.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mission Section */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-success" />
            Mission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold">Making Fatigue Science Accessible</h4>
            <p className="text-muted-foreground">
              My goal is to <strong className="text-foreground">democratise access to fatigue analysis tools</strong> that 
              have traditionally been available only to large airlines and research institutions.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                'Understand the science behind their fatigue',
                'Predict problematic duty patterns proactively',
                'Generate evidence-based safety reports',
                'Advocate for roster changes with data',
                'Make informed decisions about wellbeing'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="font-semibold">Contributing to Aviation Safety Culture</h4>
            <p className="text-sm text-muted-foreground">By providing transparent, scientifically-validated tools, we can:</p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Shift conversations from subjective <em>("I feel tired")</em> to objective <em>("Performance predicted at 48/100")</em></li>
              <li>Enable proactive fatigue management vs. reactive reporting</li>
              <li>Support evidence-based roster design</li>
              <li>Empower pilots in safety discussions</li>
              <li>Reduce fatigue-related incidents</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Philosophy Section */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-critical" />
            Personal Philosophy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            {
              topic: 'On Fatigue Management',
              quote: 'Fatigue is not a sign of weakness—it\'s a physiological reality. Understanding it scientifically empowers us to manage it effectively.'
            },
            {
              topic: 'On Aviation Safety',
              quote: 'The best safety culture is one where pilots can speak up with data, not just feelings, and be heard.'
            },
            {
              topic: 'On Tool Development',
              quote: 'Complex science should be accessible. Transparency builds trust. Open development enables improvement.'
            }
          ].map((item, i) => (
            <div key={i} className="space-y-2">
              <h4 className="font-semibold text-sm text-primary">{item.topic}</h4>
              <blockquote className="border-l-2 border-primary/30 pl-4 italic text-muted-foreground">
                "{item.quote}"
              </blockquote>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Professional Approach */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-info" />
            Professional Approach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Scientific Rigor</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Every formula based on peer-reviewed research</li>
                <li>Transparent assumptions and limitations</li>
                <li>Honest about model boundaries</li>
                <li>Citation of all sources</li>
                <li>Open to validation and critique</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Pilot-Centric Design</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Built by a pilot, for pilots</li>
                <li>Real-world operational understanding</li>
                <li>Practical use cases prioritised</li>
                <li>SMS-ready outputs</li>
                <li>Union/association support focus</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Continuous Improvement</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Regular updates based on new research</li>
                <li>Bug fixes and optimisation</li>
                <li>User feedback integration</li>
                <li>Community-driven development</li>
                <li>Long-term commitment</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Vision */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-warning" />
            Future Vision
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Short-Term Goals</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Expand capabilities (mobile, wearables)</li>
                <li>Increase user base and gather feedback</li>
                <li>Publish validation studies</li>
                <li>Develop educational content</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Long-Term Vision</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Integration with airline FRMS systems</li>
                <li>Real-time fatigue monitoring</li>
                <li>Industry-wide data pooling (anonymous)</li>
                <li>Influence regulatory policy development</li>
                <li>Potential certification pathway</li>
              </ul>
            </div>
          </div>
          
          <Card variant="elevated" className="mt-4">
            <CardContent className="py-4">
              <h4 className="font-semibold text-sm mb-2">Ultimate Goal</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Make pilot fatigue analysis as routine as checking weather:
              </p>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium shrink-0">Before accepting a roster →</span>
                  <span className="text-muted-foreground">Run it through Aerowake</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium shrink-0">Before bidding →</span>
                  <span className="text-muted-foreground">Compare options scientifically</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium shrink-0">After a hard month →</span>
                  <span className="text-muted-foreground">Understand what happened</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium shrink-0">When advocating →</span>
                  <span className="text-muted-foreground">Have data to support requests</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Collaboration & Contact */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-info" />
            Collaboration & Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold">Open to Collaboration</h4>
            <p className="text-sm text-muted-foreground">I'm interested in connecting with:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { role: 'Sleep researchers', desc: 'For model validation and improvement' },
                { role: 'Aviation safety professionals', desc: 'For operational insights' },
                { role: 'Pilot unions/associations', desc: 'For collective use cases' },
                { role: 'Software developers', desc: 'For feature contributions' },
                { role: 'Academic institutions', desc: 'For research partnerships' }
              ].map((item, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium text-foreground">{item.role}</span>
                  <span className="text-muted-foreground"> — {item.desc}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="font-semibold">Get In Touch</h4>
            <div className="flex flex-wrap gap-3">
              <a 
                href="https://github.com/cianfru" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm font-medium"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <a 
                href="https://linkedin.com/in/andrea-cianfruglia" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm font-medium"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            Credentials & Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Aviation Credentials</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>ATPL (Airline Transport Pilot License)</li>
                <li>Type Rated Captain</li>
                <li>CRM/FRMS Training</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Technical Skills</h4>
              <div className="flex flex-wrap gap-2">
                {['Python', 'TypeScript', 'React', 'FastAPI', 'Data Science'].map((skill) => (
                  <Badge key={skill} variant="outline">{skill}</Badge>
                ))}
              </div>
            </div>
            <div className="space-y-3 md:col-span-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Languages
              </h4>
              <div className="flex flex-wrap gap-2">
                {['Italian', 'English', 'Spanish', 'Chinese'].map((lang) => (
                  <Badge key={lang} variant="secondary">{lang}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acknowledgments */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-critical" />
            Acknowledgments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Standing on Giants' Shoulders</h4>
            <p className="text-sm text-muted-foreground">Aerowake wouldn't exist without:</p>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
              <li><strong className="text-foreground">Alexander Borbély</strong> — For the foundational two-process model</li>
              <li><strong className="text-foreground">EASA Research Team</strong> — For aviation-specific validation</li>
              <li><strong className="text-foreground">NASA/FAA Researchers</strong> — For operational insights</li>
              <li><strong className="text-foreground">Open Source Community</strong> — For tools and frameworks</li>
              <li><strong className="text-foreground">Fellow Pilots</strong> — For feedback, testing, and encouragement</li>
            </ul>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Personal Thanks</h4>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>To my colleagues who shared their roster frustrations</li>
              <li>To safety managers who encouraged evidence-based approaches</li>
              <li>To researchers who made their work publicly available</li>
              <li>To the aviation community for embracing scientific tools</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Closing */}
      <Card variant="glow" className="text-center">
        <CardContent className="py-8">
          <p className="text-lg font-medium text-foreground/90">
            Thank you for supporting evidence-based aviation safety.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
