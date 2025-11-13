import { GridBackground } from "@/components/ui/grid-background";

export default function GridBackgroundDemo() {
  return (
    <div className="min-h-screen w-full space-y-8 p-8">
      {/* Light Grid Background */}
      <div className="relative h-64 w-full rounded-lg overflow-hidden">
        <GridBackground variant="light" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Light Grid</h2>
            <p className="text-gray-600">Clean white background with subtle grid lines</p>
          </div>
        </div>
      </div>

      {/* Dark Grid Background */}
      <div className="relative h-64 w-full rounded-lg overflow-hidden">
        <GridBackground variant="dark" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Dark Grid</h2>
            <p className="text-gray-300">Black background with visible grid lines</p>
          </div>
        </div>
      </div>

      {/* Magenta Grid Background */}
      <div className="relative h-64 w-full rounded-lg overflow-hidden">
        <GridBackground variant="magenta" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Magenta Grid</h2>
            <p className="text-gray-600">White background with magenta orb and grid lines</p>
          </div>
        </div>
      </div>

      {/* Auto Grid Background (Theme-aware) */}
      <div className="relative h-64 w-full rounded-lg overflow-hidden">
        <GridBackground variant="auto" />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Auto Grid</h2>
            <p className="text-muted-foreground">Automatically switches between light and dark themes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
