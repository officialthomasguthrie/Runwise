# Runwise AI Platform

Turn natural language prompts into fully functional and integrated workflows.

## Project Structure

```
src/
├── app/                    # Next.js 13+ App Router
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── components/
│   ├── layout/            # Layout components
│   │   ├── Header.tsx     # Navigation header
│   │   ├── Footer.tsx     # Site footer
│   │   └── Layout.tsx     # Main layout wrapper
│   ├── sections/          # Page sections
│   │   └── Hero.tsx       # Hero section (ready for 21st Dev customization)
│   └── ui/                # Reusable UI components
└── lib/
    └── utils.ts           # Utility functions
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Customization with 21st Dev

The project is structured to make it easy to customize individual components using 21st Dev prompts:

- **Hero Section**: Located at `src/components/sections/Hero.tsx` - ready for customization
- **Header**: Located at `src/components/layout/Header.tsx`
- **Footer**: Located at `src/components/layout/Footer.tsx`
- **UI Components**: Add new components to `src/components/ui/`

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **ESLint** - Code linting

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint