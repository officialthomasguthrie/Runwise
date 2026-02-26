'use client'

import * as React from "react"
import Link from 'next/link'
import FadeContent from "@/components/ui/FadeContent"

import { ChevronDown } from "lucide-react";
export default function PricingFAQ() {
    const [openItems, setOpenItems] = React.useState<string[]>([])

    const toggleItem = (id: string) => {
        setOpenItems(prev => 
            prev.includes(id) 
                ? prev.filter(item => item !== id)
                : [...prev, id]
        )
    }

    const faqItems = [
        {
            id: 'item-1',
            question: 'Can I change my plan at any time?',
            answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we&apos;ll prorate any billing differences.',
        },
        {
            id: 'item-2',
            question: 'What happens to my workflows if I cancel?',
            answer: 'Your workflows will remain accessible for 30 days after cancellation. You can export your workflow configurations during this period. After 30 days, inactive workflows will be archived.',
        },
        {
            id: 'item-3',
            question: 'Do you offer refunds?',
            answer: 'If Runwise Pro isn&apos;t the right fit, contact us within 14 days of purchase and we&apos;ll issue a full refund—no questions asked.',
        },
        {
            id: 'item-4',
            question: 'Is there a setup fee for Enterprise plans?',
            answer: 'No setup fees for Enterprise plans. We include onboarding, training, and initial configuration as part of your subscription.',
        },
        {
            id: 'item-5',
            question: 'Can I get a custom integration built?',
            answer: 'Yes! Professional and Enterprise plans include custom integration support. We&apos;ll work with you to build integrations for your specific tools and requirements.',
        },
        {
            id: 'item-6',
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for Enterprise customers.',
        },
        {
            id: 'item-7',
            question: 'How does the free trial work?',
            answer: 'We no longer offer a free trial. Instead, you get immediate access to all Professional features, and our 14-day refund guarantee ensures you can buy with confidence.',
        },
        {
            id: 'item-8',
            question: 'Do you offer educational discounts?',
            answer: 'Yes! We offer special pricing for educational institutions and students. Contact our sales team to learn about our education program.',
        },
    ]

    return (
        <section className="py-16 md:py-24 bg-background">
            <div className="mx-auto max-w-4xl px-6">
                {/* Section Header */}
                <FadeContent delay={100} duration={800}>
                    <div className="text-center mb-12">
                        <h2 className="text-foreground text-4xl font-semibold font-geist">FAQs</h2>
                        <p className="text-muted-foreground mt-4 text-balance text-lg font-geist">Your questions answered</p>
                    </div>
                </FadeContent>

                {/* FAQ Cards */}
                <FadeContent delay={200} duration={1000}>
                    <div className="space-y-4">
                    {faqItems.map((item) => (
                        <div key={item.id} className="border border-border rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleItem(item.id)}
                                className="w-full px-4 py-4 text-left bg-card hover:bg-accent transition-colors flex items-center justify-between"
                            >
                                <h3 className="text-base font-medium text-foreground font-geist pr-4">
                                    {item.question}
                                </h3>
                                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
                                                                        openItems.includes(item.id) ? 'rotate-180' : ''
                                                                    }`} />
                            </button>
                            
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                openItems.includes(item.id) 
                                    ? 'max-h-96 opacity-100' 
                                    : 'max-h-0 opacity-0'
                            }`}>
                                <div className="px-4 pt-4 pb-4 bg-card/50">
                                    <p className="text-base font-geist text-muted-foreground">
                                        {item.answer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    </div>
                </FadeContent>

                {/* Bottom Contact */}
                <FadeContent delay={300} duration={800}>
                    <div className="text-center mt-8">
                    <p className="text-muted-foreground font-geist">
                        Can&apos;t find what you&apos;re looking for? Contact our{' '}
                        <Link
                            href="mailto:support@runwise.ai"
                            className="text-primary font-medium hover:underline">
                            customer support team
                        </Link>
                    </p>
                    </div>
                </FadeContent>
            </div>
        </section>
    )
}