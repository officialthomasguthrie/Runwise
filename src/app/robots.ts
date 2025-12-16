import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/workspace/',
          '/settings/',
          '/analytics/',
          '/runs/',
          '/auth/',
          '/checkout/',
          '/test/',
          '/test-connection/',
        ],
      },
    ],
    sitemap: 'https://runwiseai.app/sitemap.xml',
  }
}

