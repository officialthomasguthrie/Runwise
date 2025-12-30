/**
 * Template Resolver
 * Resolves template syntax in config values using inputData and previous node outputs
 */

/**
 * Resolves template syntax like {{inputData.field}} or {{nodeId.field}}
 * Supports nested paths like {{inputData.user.email}}
 */
export function resolveTemplate(
  value: string,
  inputData: any,
  previousOutputs?: Record<string, any>
): string {
  if (typeof value !== 'string' || !value.includes('{{')) {
    return value;
  }

  const templateRegex = /\{\{([^}]+)\}\}/g;
  
  return value.replace(templateRegex, (match, path) => {
    const trimmedPath = path.trim();
    const keys = trimmedPath.split('.');
    
    let result: any;
    
    // Check if it starts with inputData
    if (keys[0] === 'inputData') {
      result = inputData;
      // Skip 'inputData' and process remaining keys
      for (let i = 1; i < keys.length; i++) {
        result = result?.[keys[i]];
      }
    } else if (previousOutputs && keys.length > 1) {
      // Try to find by node ID (first key might be node ID)
      const nodeId = keys[0];
      if (previousOutputs[nodeId]) {
        result = previousOutputs[nodeId];
        // Process remaining keys
        for (let i = 1; i < keys.length; i++) {
          result = result?.[keys[i]];
        }
      } else {
        // Try as direct inputData path
        result = inputData;
        for (const key of keys) {
          result = result?.[key];
        }
      }
    } else {
      // Try as direct inputData path
      result = inputData;
      for (const key of keys) {
        result = result?.[key];
      }
    }
    
    // Return resolved value or keep template if not found
    if (result !== undefined && result !== null) {
      // Handle objects and arrays by stringifying
      if (typeof result === 'object') {
        return JSON.stringify(result);
      }
      return String(result);
    }
    
    // Return original template if not found (allows for partial resolution)
    return match;
  });
}

/**
 * Resolves all templates in a config object
 */
export function resolveConfigTemplates(
  config: Record<string, any>,
  inputData: any,
  previousOutputs?: Record<string, any>
): Record<string, any> {
  const resolved: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && value.includes('{{')) {
      resolved[key] = resolveTemplate(value, inputData, previousOutputs);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively resolve nested objects
      resolved[key] = resolveConfigTemplates(value, inputData, previousOutputs);
    } else {
      resolved[key] = value;
    }
  }
  
  return resolved;
}

/**
 * Extracts template variables from a string
 */
export function extractTemplateVariables(value: string): string[] {
  if (typeof value !== 'string' || !value.includes('{{')) {
    return [];
  }
  
  const templateRegex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = templateRegex.exec(value)) !== null) {
    variables.push(match[1].trim());
  }
  
  return [...new Set(variables)]; // Remove duplicates
}

/**
 * Checks if a value contains template syntax
 */
export function isTemplate(value: any): boolean {
  return typeof value === 'string' && value.includes('{{') && value.includes('}}');
}

