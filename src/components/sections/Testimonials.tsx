import { TestimonialsSection } from "@/components/ui/testimonials-with-marquee"
import FadeContent from "@/components/ui/FadeContent"

const testimonials = [
  {
    author: {
      name: "Sarah Chen",
      handle: "@sarahai",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face"
    },
    text: "Runwise has revolutionized how we build workflows. The natural language processing is incredibly intuitive and accurate.",
    href: "https://twitter.com/sarahai"
  },
  {
    author: {
      name: "Marcus Johnson",
      handle: "@marcusdev",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    },
    text: "The API integration is seamless. We've reduced our development time by 70% since implementing Runwise workflows.",
    href: "https://twitter.com/marcusdev"
  },
  {
    author: {
      name: "Elena Rodriguez",
      handle: "@elenaml",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
    },
    text: "Finally, an AI platform that truly understands context! The workflow automation capabilities are game-changing."
  },
  {
    author: {
      name: "David Kim",
      handle: "@davidtech",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    text: "The speed and accuracy of Runwise's AI is unmatched. It's like having a senior developer available 24/7."
  },
  {
    author: {
      name: "Lisa Wang",
      handle: "@lisaworkflow",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    },
    text: "Runwise transformed our entire development process. Complex workflows that used to take days now take minutes."
  }
]

export default function Testimonials() {
  return (
    <FadeContent delay={500} duration={1000}>
      <TestimonialsSection
        title="Trusted by developers worldwide"
        description="Join thousands of developers who are already building the future with Runwise AI workflows"
        testimonials={testimonials}
      />
    </FadeContent>
  )
}
