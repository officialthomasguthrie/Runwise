import { Metadata } from 'next';
import LandingPageClient from './landing-page-client';

export const metadata: Metadata = {
  title: 'Radison - AI Agency Framer Template',
  description: 'Radison is a sleek, modern AI automation agency template built on Framer. This dark agency template features responsive design, high conversion potential, and easy customization, perfect for agencies looking to elevate their online presence fast.',
  openGraph: {
    type: 'website',
    title: 'Radison - AI Agency Framer Template',
    description: 'Radison is a sleek, modern AI automation agency template built on Framer. This dark agency template features responsive design, high conversion potential, and easy customization, perfect for agencies looking to elevate their online presence fast.',
    images: ['https://framerusercontent.com/images/q3tff84GXo6jGQnVmQxR2VlYx8w.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Radison - AI Agency Framer Template',
    description: 'Radison is a sleek, modern AI automation agency template built on Framer. This dark agency template features responsive design, high conversion potential, and easy customization, perfect for agencies looking to elevate their online presence fast.',
    images: ['https://framerusercontent.com/images/q3tff84GXo6jGQnVmQxR2VlYx8w.png'],
  },
  icons: {
    icon: [
      { url: 'https://framerusercontent.com/images/9924lP0BZ8dOz37sdOymgalPqQ.png', media: '(prefers-color-scheme: light)' },
      { url: 'https://framerusercontent.com/images/cJzViFXwIJnaeyLxc7BYc8QDE.png', media: '(prefers-color-scheme: dark)' },
    ],
  },
};

export default function LandingPage() {
  return <LandingPageClient />;
}
