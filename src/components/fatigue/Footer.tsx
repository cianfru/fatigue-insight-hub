export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 px-6 py-4">
      <div className="text-center text-xs text-muted-foreground">
        <p className="font-medium">EASA Fatigue Analysis Tool v2.1.2</p>
        <p className="mt-1">
          Based on Borbély Two-Process Model • EASA ORO.FTL Compliant
        </p>
        <p className="mt-1 opacity-70">
          Scientific references: Borbély & Achermann (1999), Van Dongen et al. (2003), Dinges et al. (1997)
        </p>
      </div>
    </footer>
  );
}
