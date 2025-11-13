import { cn } from "@/lib/utils"
import { Avatar, AvatarImage } from "@/components/ui/avatar"

export interface TestimonialAuthor {
  name: string
  handle: string
  avatar: string
}

export interface TestimonialCardProps {
  author: TestimonialAuthor
  text: string
  href?: string
  className?: string
}

export function TestimonialCard({ 
  author,
  text,
  href,
  className
}: TestimonialCardProps) {
  const Card = href ? 'a' : 'div'
  
  return (
           <Card
             {...(href ? { href } : {})}
             className={cn(
               "flex flex-col rounded-lg border border-border",
               "bg-card shadow-lg",
               "p-4 text-start sm:p-6",
               "hover:shadow-xl hover:border-primary/20",
               "max-w-[280px] sm:max-w-[300px] md:max-w-[320px]",
               "transition-all duration-300",
               className
             )}
             suppressHydrationWarning={true}
           >
      <div className="flex items-center gap-3" suppressHydrationWarning={true}>
        <Avatar className="h-12 w-12">
          <AvatarImage src={author.avatar} alt={author.name} />
        </Avatar>
        <div className="flex flex-col items-start" suppressHydrationWarning={true}>
          <h3 className="text-md font-semibold leading-none text-card-foreground font-geist">
            {author.name}
          </h3>
          <p className="text-sm text-muted-foreground font-geist">
            {author.handle}
          </p>
        </div>
      </div>
      <p className="sm:text-md mt-4 text-sm text-muted-foreground font-geist">
        {text}
      </p>
    </Card>
  )
}
