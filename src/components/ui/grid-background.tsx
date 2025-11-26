import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface GridBackgroundProps {
  className?: string;
  variant?: "light" | "dark" | "magenta" | "auto";
}

export const GridBackground = ({ 
  className, 
  variant = "auto" 
}: GridBackgroundProps) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const getBackgroundStyle = () => {
    // If variant is auto, use theme to determine style
    const currentVariant = variant === "auto" ? (mounted && theme === "dark" ? "dark" : "magenta") : variant;
    
    switch (currentVariant) {
      case "dark":
        return {
          background: "hsl(0, 0%, 4%)",
          backgroundImage: `
            linear-gradient(to right, rgba(75, 85, 99, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(75, 85, 99, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        };
      case "magenta":
        return {
          background: "white",
          backgroundImage: `
            linear-gradient(to right, rgba(71,85,105,0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(71,85,105,0.15) 1px, transparent 1px),
            radial-gradient(circle at 50% 60%, rgba(236,72,153,0.15) 0%, rgba(168,85,247,0.05) 40%, transparent 70%)
          `,
          backgroundSize: "40px 40px, 40px 40px, 100% 100%",
        };
      case "light":
        return {
          background: "white",
          backgroundImage: `
            linear-gradient(to right, rgba(71,85,105,0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(71,85,105,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        };
      default: // auto - theme-aware
        if (mounted && theme === "dark") {
          return {
            background: "hsl(0, 0%, 4%)",
            backgroundImage: `
              linear-gradient(to right, rgba(75, 85, 99, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(75, 85, 99, 0.4) 1px, transparent 1px),
              radial-gradient(circle at 50% 60%, rgba(236,72,153,0.1) 0%, rgba(168,85,247,0.05) 40%, transparent 70%)
            `,
            backgroundSize: "40px 40px, 40px 40px, 100% 100%",
          };
        } else {
          return {
            background: "white",
            backgroundImage: `
              linear-gradient(to right, rgba(71,85,105,0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(71,85,105,0.15) 1px, transparent 1px),
              radial-gradient(circle at 50% 60%, rgba(236,72,153,0.15) 0%, rgba(168,85,247,0.05) 40%, transparent 70%)
            `,
            backgroundSize: "40px 40px, 40px 40px, 100% 100%",
          };
        }
    }
  };

  return (
    <div
      className={cn("absolute inset-0 z-0", className)}
      style={getBackgroundStyle()}
    >
      {/* Fade-out gradient overlay */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, ${
            mounted && theme === "dark" ? "rgba(10,10,10,0.3)" : "rgba(255,255,255,0.3)"
          } 30%, ${
            mounted && theme === "dark" ? "rgba(10,10,10,0.6)" : "rgba(255,255,255,0.6)"
          } 60%, ${
            mounted && theme === "dark" ? "rgba(10,10,10,0.9)" : "rgba(255,255,255,0.9)"
          } 85%, ${
            mounted && theme === "dark" ? "hsl(0, 0%, 4%)" : "rgba(255,255,255,1)"
          } 100%)`
        }}
      />
    </div>
  );
};
