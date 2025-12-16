import {
  BellIcon,
  CalendarIcon,
  FileTextIcon,
  GlobeIcon,
  InputIcon,
} from "@radix-ui/react-icons";

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";

const features = [
  {
    Icon: FileTextIcon,
    name: "Natural Language Processing",
    description: "Transform your ideas into functional workflows using simple, conversational prompts.",
    href: "#",
    cta: "Learn more",
    background: <div className="absolute -right-20 -top-20 opacity-20 bg-gradient-to-br from-purple-500 to-pink-500 w-40 h-40 rounded-full blur-3xl" />,
    className: "lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3",
  },
  {
    Icon: InputIcon,
    name: "AI-Powered Automation",
    description: "Intelligent workflow generation that understands context and adapts to your needs.",
    href: "#",
    cta: "Learn more",
    background: <div className="absolute -right-20 -top-20 opacity-20 bg-gradient-to-br from-blue-500 to-purple-500 w-40 h-40 rounded-full blur-3xl" />,
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
  },
  {
    Icon: GlobeIcon,
    name: "Multi-Platform Integration",
    description: "Connect with 100+ tools and services to create comprehensive workflows.",
    href: "#",
    cta: "Learn more",
    background: <div className="absolute -right-20 -top-20 opacity-20 bg-gradient-to-br from-green-500 to-blue-500 w-40 h-40 rounded-full blur-3xl" />,
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
  },
  {
    Icon: CalendarIcon,
    name: "Real-Time Execution",
    description: "Watch your workflows come to life instantly with live progress tracking.",
    href: "#",
    cta: "Learn more",
    background: <div className="absolute -right-20 -top-20 opacity-20 bg-gradient-to-br from-orange-500 to-red-500 w-40 h-40 rounded-full blur-3xl" />,
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2",
  },
  {
    Icon: BellIcon,
    name: "Smart Notifications",
    description: "Stay informed with intelligent alerts and progress updates for all your workflows.",
    href: "#",
    cta: "Learn more",
    background: <div className="absolute -right-20 -top-20 opacity-20 bg-gradient-to-br from-pink-500 to-purple-500 w-40 h-40 rounded-full blur-3xl" />,
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-2 lg:row-end-4",
  },
];

export default function Features() {
  return (
    <section className="bg-gray-900 py-12 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8" suppressHydrationWarning={true}>
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tighter font-geist leading-tight text-white mb-4">
            Powerful Features for
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> Modern Workflows</span>
          </h2>
          <p className="text-md max-w-[600px] font-medium text-gray-300 sm:text-xl font-geist mx-auto">
            Discover the capabilities that make Runwise the ultimate AI workflow platform
          </p>
        </div>
        
        <BentoGrid className="lg:grid-rows-3">
          {features.map((feature) => (
            <BentoCard key={feature.name} {...feature} />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
