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

    // Check if code is already a function (arrow function or function declaration)
    // AI generates: async (inputData, config, context) => { ... }
    let wrappedCode: string;
    
    const trimmedCode = code.trim();
    const isFunction = (trimmedCode.startsWith('async') && trimmedCode.includes('=>')) || 
                      trimmedCode.startsWith('function') ||
                      trimmedCode.startsWith('async function');
    
    if (isFunction) {
      // Code is already a function, we need to call it with parameters
      wrappedCode = `
        (async function() {
          const fn = ${code};
          return await fn(inputData, config, context);
        })()
      `;
    } else {
      // Code is just a body, wrap it in a function and execute
      wrappedCode = `
        (async function() {
          ${code}
        })()
      `;
    }

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

export { validateCustomCode } from './sandbox-validation';

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
