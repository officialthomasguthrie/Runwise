# SEO Implementation Guide

## ✅ What Has Been Implemented

### 1. Enhanced Metadata (`src/app/layout.tsx`)
- **Title**: Optimized with target keywords: "Runwise AI - No-Code Automation & Workflow Builder"
- **Description**: Keyword-rich description targeting "automation", "workflows", "no-code"
- **Keywords**: Comprehensive list including:
  - Runwise, Runwise AI
  - automation, no code automation, simple automation
  - workflows, workflow automation, workflow builder
  - AI automation, no-code platform
  - business automation, process automation
- **Open Graph Tags**: For social media sharing (images commented out - add later)
- **Twitter Cards**: Optimized for Twitter sharing
- **Canonical URL**: Set to `https://runwiseai.app`
- **Robots Meta**: Configured for optimal indexing

### 2. Structured Data (JSON-LD) (`src/app/page.tsx`)
Added three types of structured data:
- **SoftwareApplication**: Describes Runwise as a software application
- **Organization**: Company information
- **WebSite**: Website schema with search action

### 3. Dynamic Sitemap (`src/app/sitemap.ts`)
- Automatically generates XML sitemap
- Includes all important pages with priorities
- Accessible at: `https://runwiseai.app/sitemap.xml`

### 4. Robots.txt (`src/app/robots.ts`)
- Allows search engines to crawl public pages
- Blocks private pages (workspace, settings, API routes)
- Points to sitemap
- Accessible at: `https://runwiseai.app/robots.txt`

### 5. Optimized Hero Content (`src/app/components/Hero.tsx`)
- **H1**: "Runwise AI: Simple No-Code Automation & Workflow Builder"
  - Includes target keywords: "Runwise AI", "No-Code Automation", "Workflow Builder"
- **Description**: Enhanced with keywords:
  - "automation workflows"
  - "no coding"
  - "simple automation"
  - "workflows"
  - "automate your business processes"

### 6. Semantic HTML & Accessibility
- Added proper alt text to images
- Added `aria-hidden` to decorative elements
- Proper heading hierarchy

---

## 📝 Next Steps (What You Need to Do)

### 1. Add Open Graph Image (Required)
1. Create an Open Graph image:
   - **Size**: 1200x630 pixels
   - **Format**: PNG or JPG
   - **Content**: Should include "Runwise AI" branding and key message
   - **Save as**: `/public/og-image.png`

2. Uncomment the image references in `src/app/layout.tsx`:
   ```typescript
   openGraph: {
     // ... existing code ...
     images: [
       {
         url: "/og-image.png",
         width: 1200,
         height: 630,
         alt: "Runwise AI - No-Code Automation Platform",
       },
     ],
   },
   twitter: {
     // ... existing code ...
     images: ["/og-image.png"],
   },
   ```

### 2. Update Social Media Handles (Optional)
In `src/app/layout.tsx`, update the Twitter creator if you have a Twitter account:
```typescript
twitter: {
  creator: "@your-twitter-handle", // Update this
}
```

In `src/app/page.tsx`, add your social media URLs to the Organization schema:
```typescript
"sameAs": [
  "https://twitter.com/runwiseai",
  "https://linkedin.com/company/runwise",
  // Add other social profiles
],
```

### 3. Submit to Search Engines

#### Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://runwiseai.app`
3. Verify ownership (DNS or HTML file)
4. Submit sitemap: `https://runwiseai.app/sitemap.xml`

#### Bing Webmaster Tools
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Add site: `https://runwiseai.app`
3. Verify ownership
4. Submit sitemap: `https://runwiseai.app/sitemap.xml`

### 4. Content Strategy (Long-term SEO)

#### Blog/Content Pages
Create content targeting your keywords:
- "How to build automation workflows"
- "No-code automation guide"
- "Simple automation ideas"
- "Workflow automation best practices"

#### Internal Linking
- Link between related pages
- Use descriptive anchor text with keywords
- Create a blog/resources section

#### Backlinks
- Reach out to automation/workflow blogs
- Guest posting opportunities
- Product Hunt launch
- Hacker News, Reddit (r/automation, r/nocode)
- Integration partner pages

### 5. Monitor & Optimize

#### Tools to Use
- **Google Search Console**: Track rankings, impressions, clicks
- **Google Analytics**: User behavior, traffic sources
- **Ahrefs/SEMrush**: Keyword rankings, backlinks (paid tools)

#### Key Metrics to Track
- Organic search traffic
- Keyword rankings for target terms
- Click-through rate (CTR) from search
- Bounce rate
- Time on site

---

## 🎯 Target Keywords Implemented

### Primary Keywords
- ✅ Runwise
- ✅ Runwise AI
- ✅ automation
- ✅ no code automation
- ✅ simple automation
- ✅ workflows
- ✅ workflow automation
- ✅ workflow builder

### Secondary Keywords
- ✅ AI automation
- ✅ no-code platform
- ✅ business automation
- ✅ process automation
- ✅ automation tools
- ✅ workflow software
- ✅ automation platform
- ✅ AI workflows
- ✅ natural language automation
- ✅ automation builder
- ✅ workflow creator
- ✅ automation software

---

## 📊 Expected Timeline

**Important**: SEO takes time. Don't expect immediate results.

- **Weeks 1-2**: Search engines discover and index your site
- **Months 1-3**: Initial rankings may appear for long-tail keywords
- **Months 3-6**: Rankings improve for target keywords
- **Months 6-12**: Strong rankings for competitive terms (with consistent effort)

**Factors Affecting Speed**:
- Domain age and authority
- Competition level
- Content quality and freshness
- Backlinks quantity and quality
- User engagement metrics

---

## 🔍 Testing Your SEO

### 1. Check Meta Tags
Visit: `https://runwiseai.app` and view page source
- Look for `<title>` tag
- Look for `<meta name="description">`
- Look for Open Graph tags

### 2. Test Structured Data
- Use [Google Rich Results Test](https://search.google.com/test/rich-results)
- Enter: `https://runwiseai.app`
- Should show SoftwareApplication, Organization, and WebSite schemas

### 3. Check Sitemap
- Visit: `https://runwiseai.app/sitemap.xml`
- Should show all your pages

### 4. Check Robots.txt
- Visit: `https://runwiseai.app/robots.txt`
- Should show allowed/disallowed paths

### 5. Mobile-Friendly Test
- Use [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- Enter: `https://runwiseai.app`

---

## ⚠️ Important Notes

1. **Keywords in Content**: The Hero section now includes target keywords naturally. Make sure other sections (Benefits, Features, etc.) also mention these terms naturally.

2. **Content Freshness**: Regularly update content to signal to search engines that your site is active.

3. **Page Speed**: Fast loading times help SEO. Monitor with Google PageSpeed Insights.

4. **Mobile Experience**: Ensure your site is fully responsive and mobile-friendly (already done).

5. **User Experience**: Good UX signals (low bounce rate, high engagement) help rankings.

6. **Local SEO** (if applicable): If you serve specific regions, add location-based keywords.

---

## 🚀 Quick Wins

1. **Add FAQ Schema**: Your FAQ section could use FAQPage structured data
2. **Add Breadcrumbs**: Help users and search engines navigate
3. **Create Blog**: Regular content helps with rankings
4. **Optimize Images**: Add descriptive alt text to all images
5. **Internal Linking**: Link between related pages with keyword-rich anchor text

---

## 📞 Need Help?

If you need to add more SEO features:
- FAQ structured data
- Breadcrumb navigation
- Blog post templates with SEO
- Additional page-specific metadata
- Analytics integration

Just ask!

---

**Last Updated**: After SEO implementation
**Domain**: runwiseai.app

