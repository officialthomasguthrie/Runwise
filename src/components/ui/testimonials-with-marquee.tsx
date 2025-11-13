import { cn } from "@/lib/utils"
import { TestimonialCard, TestimonialAuthor } from "@/components/ui/testimonial-card"

interface TestimonialsSectionProps {
  title: string
  description: string
  testimonials: Array<{
    author: TestimonialAuthor
    text: string
    href?: string
  }>
  className?: string
}

export function TestimonialsSection({ 
  title,
  description,
  testimonials,
  className 
}: TestimonialsSectionProps) {
  return (
        <section className={cn(
          "bg-background text-foreground",
          "pt-20 pb-12 sm:pt-24 sm:pb-16 lg:pt-28 lg:pb-20 px-0",
          className
        )} suppressHydrationWarning={true}>
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center sm:gap-12 lg:gap-16">
            <div className="mx-auto mb-12 sm:mb-16 lg:mb-20 max-w-4xl text-center px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tighter leading-tight text-foreground font-geist">
                {title}
              </h2>
              <p className="mt-4 text-base sm:text-lg lg:text-xl 2xl:text-lg text-muted-foreground font-geist">
                {description}
              </p>
            </div>

        <div className="relative flex w-screen flex-col items-center justify-center overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
          <div className="group flex overflow-hidden w-full">
            <div className="flex shrink-0 animate-marquee flex-row group-hover:[animation-play-state:paused] [--duration:40s]">
              {/* Multiple sets of testimonials for seamless infinite loop */}
              {testimonials.map((testimonial, i) => (
                <TestimonialCard 
                  key={`set1-${i}`}
                  {...testimonial}
                  className="mx-1 sm:mx-2"
                />
              ))}
              {testimonials.map((testimonial, i) => (
                <TestimonialCard 
                  key={`set2-${i}`}
                  {...testimonial}
                  className="mx-1 sm:mx-2"
                />
              ))}
              {testimonials.map((testimonial, i) => (
                <TestimonialCard 
                  key={`set3-${i}`}
                  {...testimonial}
                  className="mx-1 sm:mx-2"
                />
              ))}
              {testimonials.map((testimonial, i) => (
                <TestimonialCard 
                  key={`set4-${i}`}
                  {...testimonial}
                  className="mx-1 sm:mx-2"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
