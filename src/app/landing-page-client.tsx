'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function LandingPageClient() {
  const [bodyContent, setBodyContent] = useState<string>('');
  const [styles, setStyles] = useState<string>('');
  const [scripts, setScripts] = useState<string[]>([]);

  useEffect(() => {
    const loadHTML = async () => {
      try {
        const response = await fetch('/landing/radison-landing.html');
        const html = await response.text();
        
        // Extract body content
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyMatch) {
          const body = bodyMatch[1];
          // Remove scripts from body (we'll load them separately)
          const bodyWithoutScripts = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
          setBodyContent(bodyWithoutScripts);
          
          // Extract scripts from body
          const bodyScriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
          const bodyScripts: string[] = [];
          let match;
          while ((match = bodyScriptRegex.exec(body)) !== null) {
            bodyScripts.push(match[0]);
          }
          
          // Extract styles from head
          const headMatch = html.match(/<head[^>]*>([\s\S]*)<\/head>/i);
          if (headMatch) {
            const headContent = headMatch[1];
            const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
            let styleMatch;
            let allStyles = '';
            while ((styleMatch = styleRegex.exec(headContent)) !== null) {
              allStyles += styleMatch[1] + '\n';
            }
            setStyles(allStyles);
            
            // Extract scripts from head
            const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
            const headScripts: string[] = [];
            while ((match = scriptRegex.exec(headContent)) !== null) {
              headScripts.push(match[0]);
            }
            
            setScripts([...headScripts, ...bodyScripts]);
          }
        }
      } catch (error) {
        console.error('Error loading landing page:', error);
      }
    };

    loadHTML();
  }, []);

  return (
    <>
      {/* Inject all styles */}
      {styles && <style dangerouslySetInnerHTML={{ __html: styles }} />}
      
      {/* Render body content */}
      {bodyContent && (
        <div id="main" dangerouslySetInnerHTML={{ __html: bodyContent }} />
      )}
      
      {/* Load scripts */}
      {scripts.map((script, index) => {
        // Extract script attributes and content
        const srcMatch = script.match(/src=["']([^"']+)["']/i);
        const typeMatch = script.match(/type=["']([^"']+)["']/i);
        const scriptContentMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        const scriptContent = scriptContentMatch ? scriptContentMatch[1] : '';
        const isModule = typeMatch && typeMatch[1] === 'module';
        const hasAsync = script.includes('async');
        const hasDefer = script.includes('defer');
        const dataFramerBundle = script.match(/data-framer-bundle=["']([^"']+)["']/i);
        const fetchPriority = script.match(/fetchpriority=["']([^"']+)["']/i);
        
        if (srcMatch) {
          // External script
          return (
            <Script
              key={`script-${index}`}
              src={srcMatch[1]}
              strategy={isModule ? 'beforeInteractive' : 'lazyOnload'}
              async={hasAsync}
              defer={hasDefer}
              {...(dataFramerBundle && { 'data-framer-bundle': dataFramerBundle[1] })}
              {...(fetchPriority && { fetchPriority: fetchPriority[1] as 'auto' | 'high' | 'low' })}
            />
          );
        } else if (scriptContent) {
          // Inline script
          return (
            <Script
              key={`script-${index}`}
              id={`inline-script-${index}`}
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{ __html: scriptContent }}
            />
          );
        }
        return null;
      })}
    </>
  );
}

