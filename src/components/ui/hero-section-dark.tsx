"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"
import GradientText from "./GradientText"
import FadeContent from "./FadeContent"

interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: {
    regular: string
    gradient: string
  }
  description?: string
  ctaText?: string
  ctaHref?: string
  gridOptions?: {
    angle?: number
    cellSize?: number
    opacity?: number
    lightLineColor?: string
    darkLineColor?: string
  }
}

const RetroGrid = ({
  angle = 65,
  cellSize = 60,
  opacity = 0.5,
  lightLineColor = "gray",
  darkLineColor = "gray",
}) => {
  const gridStyles = {
    "--grid-angle": `${angle}deg`,
    "--cell-size": `${cellSize}px`,
    "--opacity": opacity,
    "--light-line": lightLineColor,
    "--dark-line": darkLineColor,
  } as React.CSSProperties

  return (
    <div
      className={cn(
        "pointer-events-none absolute size-full overflow-hidden [perspective:200px]",
        `opacity-[var(--opacity)]`,
      )}
      style={gridStyles}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div className="animate-grid [background-image:linear-gradient(to_right,var(--light-line)_1px,transparent_0),linear-gradient(to_bottom,var(--light-line)_1px,transparent_0)] [background-repeat:repeat] [background-size:var(--cell-size)_var(--cell-size)] [height:300vh] [inset:0%_0px] [margin-left:-200%] [transform-origin:100%_0_0] [width:600vw] dark:[background-image:linear-gradient(to_right,var(--dark-line)_1px,transparent_0),linear-gradient(to_bottom,var(--dark-line)_1px,transparent_0)]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent to-90% dark:from-black" />
    </div>
  )
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      className,
      title = "Build products for everyone",
      subtitle = {
        regular: "Designing your projects faster with ",
        gradient: "the largest figma UI kit.",
      },
      description = "Sed ut perspiciatis unde omnis iste natus voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae.",
      ctaText = "Browse courses",
      ctaHref = "#",
      gridOptions,
      ...props
    },
    ref,
  ) => {
    const [isDarkMode, setIsDarkMode] = React.useState(false)
    const [isClient, setIsClient] = React.useState(false)

    React.useEffect(() => {
      setIsClient(true)
      const checkDarkMode = () => {
        setIsDarkMode(document.documentElement.classList.contains('dark'))
      }
      
      checkDarkMode()
      
      const observer = new MutationObserver(checkDarkMode)
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
      
      return () => observer.disconnect()
    }, [])
    return (
      <div className={cn("relative bg-background xl:-mt-[100px]", className)} ref={ref} suppressHydrationWarning={true} {...props}>
        {/* Extended background to cover the top area above header - adjust values below to control where background ends */}
        <div className="absolute -top-[100vh] -left-[50vw] -right-[50vw] z-[0] h-[calc(100vh+700px)] sm:h-[calc(100vh+720px)] md:h-[calc(100vh+740px)] lg:h-[calc(100vh+760px)] xl:h-[calc(100vh+780px)] 2xl:h-[calc(100vh+800px)] w-[200vw] bg-gradient-to-br from-background via-purple-900/20 to-background" suppressHydrationWarning={true} />
        <div className="absolute -top-[100vh] -left-[50vw] -right-[50vw] z-[0] h-[calc(100vh+700px)] sm:h-[calc(100vh+720px)] md:h-[calc(100vh+740px)] lg:h-[calc(100vh+760px)] xl:h-[calc(100vh+780px)] 2xl:h-[calc(100vh+800px)] w-[200vw] bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" suppressHydrationWarning={true} />
        <section className="relative max-w-full mx-auto z-1" suppressHydrationWarning={true}>
          <RetroGrid {...gridOptions} />
               <div className="max-w-7xl z-10 mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28 xl:py-32" suppressHydrationWarning={true}>
                 <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto text-center" suppressHydrationWarning={true}>
                   <FadeContent delay={100} duration={800}>
                     <h1 className="text-sm text-muted-foreground group font-geist mx-auto px-5 py-2 bg-gradient-to-tr from-muted/20 via-muted-foreground/20 to-transparent border-[2px] border-border rounded-3xl w-fit">
                       {title}
                     </h1>
                   </FadeContent>
                   
                  <FadeContent delay={200} duration={1000}>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-[4.75rem] tracking-tighter font-geist text-foreground mx-auto leading-tight whitespace-pre-line overflow-visible pb-2">
                      {subtitle.regular}
                      <GradientText 
                        colors={['#a855f7', '#ec4899', '#a855f7', '#ec4899', '#a855f7']}
                        animationSpeed={6}
                        className="inline overflow-visible"
                      >
                        {subtitle.gradient}
                      </GradientText>
                    </h2>
                  </FadeContent>
                   
                   <FadeContent delay={300} duration={800}>
                     <p className="max-w-4xl mx-auto text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">
                       {description}
                     </p>
                   </FadeContent>
                   
                   <FadeContent delay={400} duration={1000}>
                     <div className="items-center justify-center gap-x-3 space-y-3 sm:flex sm:space-y-0">
                       <span className="relative inline-block overflow-hidden rounded-full p-[1.5px]">
                         <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                         <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-background text-xs font-medium backdrop-blur-3xl">
                           <a
                             href={ctaHref}
                             className="inline-flex rounded-full text-center group items-center w-full justify-center bg-gradient-to-tr from-muted/20 via-purple-400/30 to-transparent text-foreground border-border border-[1px] hover:bg-gradient-to-tr hover:from-muted/30 hover:via-purple-400/40 hover:to-transparent transition-all sm:w-auto py-4 px-10"
                           >
                             {ctaText}
                           </a>
                         </div>
                       </span>
                     </div>
                   </FadeContent>
                   
                   <FadeContent delay={500} duration={1000}>
                     {/* Integration Logos */}
                     <div className="mt-16 sm:mt-20 lg:mt-24 xl:mt-28 flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 lg:gap-x-10 gap-y-4 sm:gap-y-6 opacity-60">
                    <img 
                      className="h-5 w-fit" 
                      src="https://cdn.simpleicons.org/slack/black" 
                      alt="Slack Logo" 
                      height="20" 
                      width="auto"
                      suppressHydrationWarning={true}
                      style={{
                        filter: isClient && isDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)'
                      }}
                    />
                    <img 
                      className="h-5 w-fit" 
                      src="https://cdn.simpleicons.org/github/black" 
                      alt="GitHub Logo" 
                      height="20" 
                      width="auto"
                      suppressHydrationWarning={true}
                      style={{
                        filter: isClient && isDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)'
                      }}
                    />
                    <img 
                      className="h-5 w-fit" 
                      src="https://cdn.simpleicons.org/googlesheets/black" 
                      alt="Google Sheets Logo" 
                      height="20" 
                      width="auto"
                      suppressHydrationWarning={true}
                      style={{
                        filter: isClient && isDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)'
                      }}
                    />
                    <img 
                      className="h-5 w-fit" 
                      src="https://cdn.simpleicons.org/googledrive/black" 
                      alt="Google Drive Logo" 
                      height="20" 
                      width="auto"
                      suppressHydrationWarning={true}
                      style={{
                        filter: isClient && isDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)'
                      }}
                    />
                    <img 
                      className="h-5 w-fit" 
                      src="https://cdn.simpleicons.org/trello/black" 
                      alt="Trello Logo" 
                      height="20" 
                      width="auto"
                      suppressHydrationWarning={true}
                      style={{
                        filter: isClient && isDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)'
                      }}
                    />
                    <img 
                      className="h-5 w-fit" 
                      src="https://cdn.simpleicons.org/notion/black" 
                      alt="Notion Logo" 
                      height="20" 
                      width="auto"
                      suppressHydrationWarning={true}
                      style={{
                        filter: isClient && isDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)'
                      }}
                    />
                    <img 
                      className="h-5 w-fit" 
                      src="https://cdn.simpleicons.org/asana/black" 
                      alt="Asana Logo" 
                      height="20" 
                      width="auto"
                      suppressHydrationWarning={true}
                      style={{
                        filter: isClient && isDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)'
                      }}
                    />
                    <img 
                      className="h-5 w-fit" 
                      src="https://cdn.simpleicons.org/zapier/black" 
                      alt="Zapier Logo" 
                      height="20" 
                      width="auto"
                      suppressHydrationWarning={true}
                      style={{
                        filter: isClient && isDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)'
                      }}
                    />
                    <img 
                      className="h-5 w-fit" 
                      src="https://cdn.simpleicons.org/airtable/black" 
                      alt="Airtable Logo" 
                      height="20" 
                      width="auto"
                      suppressHydrationWarning={true}
                      style={{
                        filter: isClient && isDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)'
                      }}
                    />
                    <img 
                      className="h-5 w-fit" 
                      src="https://cdn.simpleicons.org/dropbox/black" 
                      alt="Dropbox Logo" 
                      height="20" 
                      width="auto"
                      suppressHydrationWarning={true}
                      style={{
                        filter: isClient && isDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)'
                      }}
                    />
                    <img 
                      className="h-5 w-fit" 
                      src="https://cdn.simpleicons.org/salesforce/black" 
                      alt="Salesforce Logo" 
                      height="20" 
                      width="auto"
                      suppressHydrationWarning={true}
                      style={{
                        filter: isClient && isDarkMode ? 'brightness(0) invert(1)' : 'brightness(0)'
                      }}
                    />
                  </div>
                   </FadeContent>
            </div>
          </div>
        </section>
      </div>
    )
  },
)
HeroSection.displayName = "HeroSection"

export { HeroSection }
