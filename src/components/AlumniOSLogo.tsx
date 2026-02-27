interface LogoProps {
  className?: string;
  nodeColor?: string;
  accentColor?: string;
}

export default function AlumniOSLogo({ className = "h-8 w-8", nodeColor = "currentColor", accentColor = "hsl(var(--accent))" }: LogoProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Triangle edges */}
      <line x1="50" y1="18" x2="22" y2="72" stroke={nodeColor} strokeWidth="7" strokeLinecap="round" />
      <line x1="50" y1="18" x2="78" y2="72" stroke={nodeColor} strokeWidth="7" strokeLinecap="round" />
      <line x1="22" y1="72" x2="78" y2="72" stroke={nodeColor} strokeWidth="7" strokeLinecap="round" />
      {/* Inner connecting lines */}
      <line x1="50" y1="18" x2="50" y2="55" stroke={nodeColor} strokeWidth="5" strokeLinecap="round" />
      <line x1="22" y1="72" x2="50" y2="55" stroke={nodeColor} strokeWidth="5" strokeLinecap="round" />
      <line x1="78" y1="72" x2="50" y2="55" stroke={nodeColor} strokeWidth="5" strokeLinecap="round" />
      {/* Nodes */}
      <circle cx="50" cy="18" r="9" fill={accentColor} />
      <circle cx="22" cy="72" r="9" fill={nodeColor} />
      <circle cx="78" cy="72" r="9" fill={nodeColor} />
    </svg>
  );
}
