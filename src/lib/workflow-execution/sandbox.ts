/**
 * Code Execution Sandbox
 * Secure execution of custom AI-generated node code using vm2
 */

import { VM } from 'vm2';
import type { ExecutionContext, LogEntry } from './types';

/**
 * Executes custom JavaScript code in a secure sandbox
 */
export async function executeCustomCode(
  code: string,
  inputData: any,
  config: Record<string, any>,
  context: ExecutionContext
): Promise<any> {
  const logs: LogEntry[] = [];

  try {
    // Create a sandboxed VM with limited permissions
    const vm = new VM({
      timeout: 30000, // 30 second timeout
      allowAsync: true, // Allow async/await
      sandbox: {
        // Provide safe globals
        console: {
          log: (...args: any[]) => logs.push({
            level: 'info',
            message: args.map(a => String(a)).join(' '),
            timestamp: new Date().toISOString()
          }),
          error: (...args: any[]) => logs.push({
            level: 'error',
            message: args.map(a => String(a)).join(' '),
            timestamp: new Date().toISOString()
          }),
          warn: (...args: any[]) => logs.push({
            level: 'warn',
            message: args.map(a => String(a)).join(' '),
            timestamp: new Date().toISOString()
          }),
        },
        // Provide execution context
        context,
        // Provide input data and config
        inputData,
        config,
        // Safe utilities
        JSON,
        Date,
        Math,
        Promise,
        Array,
        Object,
        String,
        Number,
        Boolean,
        // Helper for HTTP requests
        fetch: async (url: string, options?: any) => {
          return context.http.get(url, options);
        },
      },
    });

    // Wrap the code in an async function
    const wrappedCode = `
      (async function() {
        ${code}
      })()
    `;

    // Execute the code
    const result = await vm.run(wrappedCode);

    return {
      success: true,
      result,
      logs,
    };
  } catch (error: any) {
    logs.push({
      level: 'error',
      message: `Execution error: ${error.message}`,
      data: { error: error.toString() },
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: error.message || 'Unknown execution error',
      logs,
    };
  }
}

/**
 * Validates custom code for security issues
 */
export function validateCustomCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for dangerous patterns
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

  // Check code is not empty
  if (!code || code.trim().length === 0) {
    errors.push('Code cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extracts function from code string (handles various formats)
 */
export function extractFunction(code: string): string {
  // If code is already a function, return as-is
  if (code.includes('function') || code.includes('=>')) {
    return code;
  }

  // If code is just the body, wrap it
  return `
    return (async function(inputData, config, context) {
      ${code}
    });
  `;
}
