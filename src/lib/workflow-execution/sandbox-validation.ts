/**
 * Validates custom code for security issues.
 * Kept separate from sandbox.ts to avoid pulling vm2 into API routes at build time
 * (vm2 causes ENOENT bridge.js errors during Vercel page data collection).
 */

/**
 * Validates custom code for security issues
 */
export function validateCustomCode(
  code: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const dangerousPatterns = [
    { pattern: /require\s*\(/g, message: 'require() is not allowed' },
    { pattern: /import\s+/g, message: 'import statements are not allowed' },
    { pattern: /process\./g, message: 'process object is not allowed' },
    { pattern: /eval\s*\(/g, message: 'eval() is not allowed' },
    { pattern: /Function\s*\(/g, message: 'Function constructor is not allowed' },
    { pattern: /__dirname/g, message: '__dirname is not allowed' },
    { pattern: /__filename/g, message: '__filename is not allowed' },
    { pattern: /global\./g, message: 'global object is not allowed' },
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push(message);
    }
  }

  if (!code || code.trim().length === 0) {
    errors.push('Code cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
