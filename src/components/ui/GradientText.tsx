import './GradientText.css';
import { ReactNode } from 'react';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
  style?: React.CSSProperties;
}

export default function GradientText({
  children,
  className = '',
  colors = ['#40ffaa', '#4079ff', '#40ffaa', '#4079ff', '#40ffaa'],
  animationSpeed = 8,
  showBorder = false,
  style
}: GradientTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(to right, ${colors.join(', ')})`,
    animationDuration: `${animationSpeed}s`
  };

  return (
    <span className={`animated-gradient-text ${className}`} style={style} suppressHydrationWarning={true}>
      {showBorder && <span className="gradient-overlay" style={gradientStyle} suppressHydrationWarning={true}></span>}
      <span className="text-content" style={gradientStyle} suppressHydrationWarning={true}>
        {children}
      </span>
    </span>
  );
}
