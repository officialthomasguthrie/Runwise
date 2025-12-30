# Canonical Nodes Missing from Runwise

This document lists essential workflow automation nodes that are currently missing from the Runwise node library. These are canonical nodes that any comprehensive workflow editor should have.

## Implementation Status Legend

- ✅ **Ready to Implement** - Works with current infrastructure (HTTP, logger, JavaScript APIs)
- ⚠️ **Needs Executor Changes** - Requires modifications to workflow executor (branching, loops, variables)
- ❌ **Needs Infrastructure** - Requires new backend services/libraries (file system, database, image processing, etc.)
- 🔧 **Needs UI Components** - Requires new UI components (date picker, file upload, boolean toggle, etc.)
- 🔌 **Needs External Service** - Requires integration with external APIs (TTS, STT, image generation, etc.)

## Current Nodes Summary

**Triggers:** Scheduled Time, Webhook, New Form Submission, New Email Received, New Row in Google Sheet, New Message in Slack, New Discord Message, New GitHub Issue, Payment Completed, File Uploaded

**Actions:** Send Email, Create Notion Page, Post to Slack Channel, Send Discord Message, Create Trello Card, Update Airtable Record, Create Calendar Event, Send SMS via Twilio, Upload File to Google Drive, Post to X

**Transforms:** Delay Execution, Generate Summary with AI, Generate AI Content

---

## 1. TRIGGERS

### 1.1 Manual Trigger / Button Trigger
**Status:** ✅ **Ready to Implement**

**Description:** Allows users to manually trigger a workflow execution via a button or API call. This is essential for on-demand workflow execution.

**How it works:** Creates a unique endpoint or button that, when activated, starts the workflow execution with optional input data.

**Implementation Notes:**
- Requires API route: `/api/workflows/[id]/trigger`
- Store trigger paths in database (similar to webhook trigger)
- Use existing webhook infrastructure

**Configuration Schema:**
```typescript
{
  triggerName: { 
    type: 'string', 
    label: 'Trigger Name', 
    description: 'Unique name for this trigger', 
    required: true 
  },
  requireAuth: { 
    type: 'select', 
    label: 'Require Authentication', 
    description: 'Require user authentication to trigger', 
    required: false, 
    default: 'true',
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' }
    ]
  }
}
```

**Outputs:**
- `triggeredAt`: Timestamp of trigger
- `inputData`: Optional input data passed to trigger

---

## 2. ACTIONS

### 2.1 HTTP Request
**Status:** ✅ **Ready to Implement**

**Description:** Makes HTTP requests (GET, POST, PUT, DELETE, PATCH) to any URL. Essential for integrating with REST APIs.

**How it works:** Uses `context.http` methods already available in execution context. Sends HTTP request with configurable method, headers, body, and query parameters. Returns response data.

**Implementation Notes:**
- Execution context already has `http.get/post/put/delete/patch` methods
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  method: { 
    type: 'select', 
    label: 'Method', 
    description: 'HTTP method', 
    required: true, 
    options: [
      { label: 'GET', value: 'GET' },
      { label: 'POST', value: 'POST' },
      { label: 'PUT', value: 'PUT' },
      { label: 'DELETE', value: 'DELETE' },
      { label: 'PATCH', value: 'PATCH' }
    ]
  },
  url: { 
    type: 'string', 
    label: 'URL', 
    description: 'Request URL', 
    required: true 
  },
  headers: { 
    type: 'object', 
    label: 'Headers', 
    description: 'HTTP headers (JSON object, e.g., {"Authorization": "Bearer token"})', 
    required: false 
  },
  body: { 
    type: 'textarea', 
    label: 'Body', 
    description: 'Request body (JSON, form-data, or raw text)', 
    required: false 
  },
  queryParams: { 
    type: 'object', 
    label: 'Query Parameters', 
    description: 'URL query parameters (JSON object)', 
    required: false 
  },
  timeout: { 
    type: 'number', 
    label: 'Timeout (ms)', 
    description: 'Request timeout in milliseconds', 
    required: false, 
    default: 30000 
  }
}
```

**Outputs:**
- `status`: HTTP status code
- `headers`: Response headers
- `body`: Response body
- `success`: Boolean indicating success

---

### 2.2 If / Conditional Logic
**Status:** ⚠️ **Needs Executor Changes**

**Description:** Executes different paths based on a condition. Essential for branching logic in workflows.

**How it works:** Evaluates a condition and routes execution to "true" or "false" path based on the result.

**Implementation Notes:**
- ⚠️ **Requires Executor Changes:** Executor needs to support conditional branching (multiple output edges)
- Currently executor executes all connected nodes sequentially
- Need to add edge conditions: `{ source: 'node-1', target: 'node-2', condition: 'true' }`
- Edge data should include: `{ condition: 'true' | 'false' | null }`
- Executor should only execute edges where condition matches or is null

**Configuration Schema:**
```typescript
{
  condition: { 
    type: 'object', 
    label: 'Condition', 
    description: 'Condition object with operator and values', 
    required: true 
  },
  // Condition structure: { field: 'value', operator: 'equals|contains|greaterThan|lessThan|exists|isEmpty', value: 'comparisonValue' }
  field: { 
    type: 'string', 
    label: 'Field', 
    description: 'Field name from input data to evaluate (e.g., "status" or leave empty to evaluate entire input)', 
    required: false 
  },
  operator: { 
    type: 'select', 
    label: 'Operator', 
    description: 'Comparison operator', 
    required: true, 
    options: [
      { label: 'Equals', value: 'equals' },
      { label: 'Not Equals', value: 'notEquals' },
      { label: 'Contains', value: 'contains' },
      { label: 'Greater Than', value: 'greaterThan' },
      { label: 'Less Than', value: 'lessThan' },
      { label: 'Greater Than or Equal', value: 'greaterThanOrEqual' },
      { label: 'Less Than or Equal', value: 'lessThanOrEqual' },
      { label: 'Exists', value: 'exists' },
      { label: 'Is Empty', value: 'isEmpty' },
      { label: 'Matches Regex', value: 'matchesRegex' }
    ]
  },
  value: { 
    type: 'string', 
    label: 'Value', 
    description: 'Value to compare against', 
    required: false 
  }
}
```

**Outputs:**
- `result`: Boolean result of condition
- `data`: Original input data (passed through)

---

### 2.3 Loop / Iterator
**Status:** ⚠️ **Needs Executor Changes**

**Description:** Iterates over an array and executes subsequent nodes for each item. Essential for batch processing.

**How it works:** Takes an array input, loops through each item, and executes connected nodes with each item as input.

**Implementation Notes:**
- ⚠️ **Requires Executor Changes:** Executor needs to support iteration
- Need to detect loop nodes and execute connected nodes in a loop
- Each iteration should pass current item as inputData
- Need to collect outputs from all iterations
- Consider adding `maxIterations` limit to prevent infinite loops

**Configuration Schema:**
```typescript
{
  arrayField: { 
    type: 'string', 
    label: 'Array Field', 
    description: 'Field name containing array to iterate (leave empty to use input directly if it is an array)', 
    required: false 
  },
  limit: { 
    type: 'number', 
    label: 'Limit', 
    description: 'Maximum number of iterations (optional)', 
    required: false 
  },
  startIndex: { 
    type: 'number', 
    label: 'Start Index', 
    description: 'Index to start iteration from (default: 0)', 
    required: false, 
    default: 0 
  }
}
```

**Outputs:**
- `item`: Current item in iteration
- `index`: Current index (0-based)
- `isFirst`: Boolean indicating first iteration
- `isLast`: Boolean indicating last iteration
- `total`: Total number of items

---

### 2.4 Switch / Case
**Status:** ⚠️ **Needs Executor Changes**

**Description:** Routes execution to different paths based on a value matching specific cases. Like a switch statement in programming.

**How it works:** Compares input value against multiple cases and routes to matching path, with optional default path.

**Implementation Notes:**
- ⚠️ **Requires Executor Changes:** Similar to If node, needs conditional branching
- Edge data should include: `{ case: 'case1' | 'case2' | 'default' }`
- Executor should only execute edge matching the case value

**Configuration Schema:**
```typescript
{
  field: { 
    type: 'string', 
    label: 'Field', 
    description: 'Field name to evaluate (leave empty to use entire input)', 
    required: false 
  },
  cases: { 
    type: 'array', 
    label: 'Cases', 
    description: 'Array of case objects: [{value: "case1", label: "Case 1"}, ...]', 
    required: true 
  },
  defaultCase: { 
    type: 'string', 
    label: 'Default Case', 
    description: 'Label for default case (if no match)', 
    required: false 
  }
}
```

**Outputs:**
- `matchedCase`: Label of matched case
- `matchedValue`: Value that matched
- `data`: Original input data

---

### 2.5 Set Variable
**Status:** ⚠️ **Needs Executor Changes**

**Description:** Stores a value in a variable that can be accessed later in the workflow. Essential for state management.

**How it works:** Stores a value with a variable name. Variables persist for the duration of workflow execution and can be accessed by subsequent nodes.

**Implementation Notes:**
- ⚠️ **Requires Executor Changes:** Need to add variable storage to execution context
- Add `variables: Map<string, any>` to ExecutionContext
- Variables should be accessible to all nodes via `context.variables.get(name)`
- Variables persist for entire workflow execution

**Configuration Schema:**
```typescript
{
  variableName: { 
    type: 'string', 
    label: 'Variable Name', 
    description: 'Name of the variable', 
    required: true 
  },
  value: { 
    type: 'string', 
    label: 'Value', 
    description: 'Value to store (can reference other variables with {{variableName}})', 
    required: true 
  },
  scope: { 
    type: 'select', 
    label: 'Scope', 
    description: 'Variable scope', 
    required: false, 
    default: 'workflow', 
    options: [
      { label: 'Workflow', value: 'workflow' },
      { label: 'Node', value: 'node' }
    ]
  }
}
```

**Outputs:**
- `variableName`: Name of variable set
- `value`: Value that was set
- `data`: Original input data

---

### 2.6 Get Variable
**Status:** ⚠️ **Needs Executor Changes**

**Description:** Retrieves a previously set variable value. Used to access stored variables.

**How it works:** Looks up a variable by name and returns its value, or returns default if variable doesn't exist.

**Implementation Notes:**
- ⚠️ **Requires Executor Changes:** Depends on Set Variable implementation
- Uses `context.variables.get(name)` to retrieve value

**Configuration Schema:**
```typescript
{
  variableName: { 
    type: 'string', 
    label: 'Variable Name', 
    description: 'Name of the variable to retrieve', 
    required: true 
  },
  defaultValue: { 
    type: 'string', 
    label: 'Default Value', 
    description: 'Default value if variable does not exist', 
    required: false 
  }
}
```

**Outputs:**
- `value`: Retrieved variable value
- `exists`: Boolean indicating if variable existed

---

### 2.7 Stop / Abort Workflow
**Status:** ✅ **Ready to Implement**

**Description:** Stops workflow execution immediately. Useful for error handling or conditional stops.

**How it works:** Immediately terminates workflow execution when this node is reached.

**Implementation Notes:**
- Can throw a special error that executor catches and treats as "stop" signal
- Or add `context.stop()` method to execution context

**Configuration Schema:**
```typescript
{
  reason: { 
    type: 'string', 
    label: 'Reason', 
    description: 'Reason for stopping workflow', 
    required: false 
  }
}
```

**Outputs:**
- None (workflow stops)

---

### 2.8 Continue / Skip Iteration
**Status:** ⚠️ **Needs Executor Changes**

**Description:** Skips current iteration in a loop and continues with next item. Used within Loop nodes.

**How it works:** When used inside a Loop, skips remaining nodes in current iteration and moves to next item.

**Implementation Notes:**
- ⚠️ **Requires Executor Changes:** Depends on Loop implementation
- Need to detect when node throws "continue" signal
- Executor should skip remaining nodes in current iteration

**Configuration Schema:**
```typescript
{
  // No configuration needed
}
```

**Outputs:**
- None (iteration skipped)

---

## 3. TRANSFORMS

### 3.1 Map / Transform Data
**Status:** ✅ **Ready to Implement**

**Description:** Transforms each item in an array or object using a mapping function. Essential for data transformation.

**How it works:** Applies a transformation function to input data, allowing field renaming, value transformation, and structure changes. Uses JavaScript object/array manipulation.

**Implementation Notes:**
- Can use JavaScript object manipulation and template string replacement
- Mapping can be done with simple object transformation logic

**Configuration Schema:**
```typescript
{
  mapping: { 
    type: 'object', 
    label: 'Field Mapping', 
    description: 'Object mapping input fields to output fields (e.g., {"newField": "oldField", "fullName": "{{firstName}} {{lastName}}"})', 
    required: true 
  },
  inputType: { 
    type: 'select', 
    label: 'Input Type', 
    description: 'Type of input data', 
    required: false, 
    default: 'object', 
    options: [
      { label: 'Object', value: 'object' },
      { label: 'Array', value: 'array' }
    ]
  }
}
```

**Outputs:**
- `mapped`: Transformed data
- `original`: Original input data

---

### 3.2 Sort Data
**Status:** ✅ **Ready to Implement**

**Description:** Sorts an array by a specified field in ascending or descending order.

**How it works:** Takes an array input, sorts by specified field or value, and returns sorted array. Uses JavaScript Array.sort().

**Implementation Notes:**
- Uses native JavaScript Array.sort() method
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  field: { 
    type: 'string', 
    label: 'Field', 
    description: 'Field name to sort by (leave empty to sort array of primitives)', 
    required: false 
  },
  order: { 
    type: 'select', 
    label: 'Order', 
    description: 'Sort order', 
    required: false, 
    default: 'asc', 
    options: [
      { label: 'Ascending', value: 'asc' },
      { label: 'Descending', value: 'desc' }
    ]
  },
  dataType: { 
    type: 'select', 
    label: 'Data Type', 
    description: 'Data type for comparison', 
    required: false, 
    default: 'auto', 
    options: [
      { label: 'Auto Detect', value: 'auto' },
      { label: 'String', value: 'string' },
      { label: 'Number', value: 'number' },
      { label: 'Date', value: 'date' }
    ]
  }
}
```

**Outputs:**
- `sorted`: Sorted array
- `original`: Original array

---

### 3.3 Group Data
**Status:** ✅ **Ready to Implement**

**Description:** Groups array items by a specified field value. Creates an object with keys as group values and arrays as grouped items.

**How it works:** Takes an array, groups items by a field value, and returns an object where keys are unique field values and values are arrays of items with that value. Uses JavaScript reduce/groupBy logic.

**Implementation Notes:**
- Can be implemented with JavaScript Array.reduce() or Object.groupBy()
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  field: { 
    type: 'string', 
    label: 'Group By Field', 
    description: 'Field name to group by', 
    required: true 
  }
}
```

**Outputs:**
- `grouped`: Object with grouped data (e.g., {"group1": [...], "group2": [...]})
- `groups`: Array of group keys
- `count`: Number of groups

---

### 3.4 Aggregate Data
**Status:** ✅ **Ready to Implement**

**Description:** Performs aggregation operations (sum, average, count, min, max) on array data.

**How it works:** Takes an array and calculates aggregate statistics based on specified field and operation. Uses JavaScript Math and Array methods.

**Implementation Notes:**
- Uses JavaScript Math methods and Array.reduce()
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  operation: { 
    type: 'select', 
    label: 'Operation', 
    description: 'Aggregation operation', 
    required: true, 
    options: [
      { label: 'Sum', value: 'sum' },
      { label: 'Average', value: 'average' },
      { label: 'Count', value: 'count' },
      { label: 'Min', value: 'min' },
      { label: 'Max', value: 'max' },
      { label: 'Count Distinct', value: 'countDistinct' }
    ]
  },
  field: { 
    type: 'string', 
    label: 'Field', 
    description: 'Field name to aggregate (leave empty for count operations)', 
    required: false 
  }
}
```

**Outputs:**
- `result`: Aggregation result
- `operation`: Operation performed
- `count`: Number of items processed

---

### 3.5 Find and Replace Text
**Status:** ✅ **Ready to Implement**

**Description:** Finds and replaces text patterns in a string using plain text or regex.

**How it works:** Searches for a pattern in input text and replaces all occurrences with replacement text. Uses JavaScript String.replace().

**Implementation Notes:**
- Uses JavaScript String.replace() and RegExp
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  text: { 
    type: 'textarea', 
    label: 'Text', 
    description: 'Text to search in (leave empty to use input from previous node)', 
    required: false 
  },
  find: { 
    type: 'string', 
    label: 'Find', 
    description: 'Text or regex pattern to find', 
    required: true 
  },
  replace: { 
    type: 'string', 
    label: 'Replace', 
    description: 'Replacement text', 
    required: true 
  },
  useRegex: { 
    type: 'select', 
    label: 'Use Regex', 
    description: 'Treat find pattern as regular expression', 
    required: false, 
    default: 'false',
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' }
    ]
  },
  caseSensitive: { 
    type: 'select', 
    label: 'Case Sensitive', 
    description: 'Case-sensitive matching', 
    required: false, 
    default: 'false',
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' }
    ]
  }
}
```

**Outputs:**
- `result`: Text with replacements applied
- `replacements`: Number of replacements made
- `original`: Original text

---

### 3.6 Encode / Decode
**Status:** ✅ **Ready to Implement**

**Description:** Encodes or decodes text using Base64, URL encoding, HTML entities, or other encoding schemes.

**How it works:** Applies encoding/decoding transformation to input text based on selected encoding type. Uses JavaScript built-in functions.

**Implementation Notes:**
- Base64: Uses `btoa()` / `atob()` (Node.js: Buffer.from().toString('base64'))
- URL: Uses `encodeURIComponent()` / `decodeURIComponent()`
- HTML: Can use simple string replacement or library
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  operation: { 
    type: 'select', 
    label: 'Operation', 
    description: 'Encode or decode', 
    required: true, 
    options: [
      { label: 'Encode', value: 'encode' },
      { label: 'Decode', value: 'decode' }
    ]
  },
  encoding: { 
    type: 'select', 
    label: 'Encoding Type', 
    description: 'Type of encoding', 
    required: true, 
    options: [
      { label: 'Base64', value: 'base64' },
      { label: 'URL', value: 'url' },
      { label: 'HTML Entities', value: 'html' },
      { label: 'Hex', value: 'hex' }
    ]
  },
  text: { 
    type: 'textarea', 
    label: 'Text', 
    description: 'Text to encode/decode (leave empty to use input from previous node)', 
    required: false 
  }
}
```

**Outputs:**
- `result`: Encoded/decoded text
- `original`: Original text

---

### 3.7 Date / Time Manipulation
**Status:** ✅ **Ready to Implement** (🔧 **Needs UI Components** for date picker)

**Description:** Performs date/time operations like parsing, formatting, adding/subtracting time, extracting parts, and timezone conversion.

**How it works:** Takes a date/time input and performs specified operation (format, parse, add/subtract, extract parts, convert timezone). Uses JavaScript Date API and date-fns or similar.

**Implementation Notes:**
- Uses JavaScript Date API
- For timezone conversion, can use date-fns-tz or similar library
- 🔧 **UI Note:** Date input fields should use text input with ISO format, or add date picker component
- No backend infrastructure needed

**Configuration Schema:**
```typescript
{
  operation: { 
    type: 'select', 
    label: 'Operation', 
    description: 'Date/time operation', 
    required: true, 
    options: [
      { label: 'Format', value: 'format' },
      { label: 'Parse', value: 'parse' },
      { label: 'Add Time', value: 'add' },
      { label: 'Subtract Time', value: 'subtract' },
      { label: 'Extract Part', value: 'extract' },
      { label: 'Convert Timezone', value: 'convertTimezone' },
      { label: 'Get Current Time', value: 'now' }
    ]
  },
  inputDate: { 
    type: 'string', 
    label: 'Input Date', 
    description: 'Input date/time (ISO format or leave empty to use input from previous node)', 
    required: false 
  },
  format: { 
    type: 'string', 
    label: 'Format', 
    description: 'Output format (e.g., "YYYY-MM-DD HH:mm:ss" for format, or input format for parse)', 
    required: false 
  },
  amount: { 
    type: 'number', 
    label: 'Amount', 
    description: 'Amount to add/subtract (for add/subtract operations)', 
    required: false 
  },
  unit: { 
    type: 'select', 
    label: 'Unit', 
    description: 'Time unit (for add/subtract operations)', 
    required: false, 
    options: [
      { label: 'Milliseconds', value: 'milliseconds' },
      { label: 'Seconds', value: 'seconds' },
      { label: 'Minutes', value: 'minutes' },
      { label: 'Hours', value: 'hours' },
      { label: 'Days', value: 'days' },
      { label: 'Weeks', value: 'weeks' },
      { label: 'Months', value: 'months' },
      { label: 'Years', value: 'years' }
    ]
  },
  extractPart: { 
    type: 'select', 
    label: 'Extract Part', 
    description: 'Part to extract (for extract operation)', 
    required: false, 
    options: [
      { label: 'Year', value: 'year' },
      { label: 'Month', value: 'month' },
      { label: 'Day', value: 'day' },
      { label: 'Hour', value: 'hour' },
      { label: 'Minute', value: 'minute' },
      { label: 'Second', value: 'second' },
      { label: 'Day of Week', value: 'dayOfWeek' },
      { label: 'Unix Timestamp', value: 'timestamp' }
    ]
  },
  timezone: { 
    type: 'string', 
    label: 'Timezone', 
    description: 'Target timezone (e.g., "America/New_York") for convertTimezone operation', 
    required: false 
  }
}
```

**Outputs:**
- `result`: Result of date/time operation
- `original`: Original input date/time

---

### 3.8 Math Operations
**Status:** ✅ **Ready to Implement**

**Description:** Performs mathematical operations (add, subtract, multiply, divide, modulo, power, round, etc.) on numeric values.

**How it works:** Takes numeric inputs and performs specified mathematical operation, returning the result. Uses JavaScript Math API.

**Implementation Notes:**
- Uses JavaScript Math object and operators
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  operation: { 
    type: 'select', 
    label: 'Operation', 
    description: 'Mathematical operation', 
    required: true, 
    options: [
      { label: 'Add', value: 'add' },
      { label: 'Subtract', value: 'subtract' },
      { label: 'Multiply', value: 'multiply' },
      { label: 'Divide', value: 'divide' },
      { label: 'Modulo', value: 'modulo' },
      { label: 'Power', value: 'power' },
      { label: 'Round', value: 'round' },
      { label: 'Floor', value: 'floor' },
      { label: 'Ceil', value: 'ceil' },
      { label: 'Absolute', value: 'abs' },
      { label: 'Square Root', value: 'sqrt' }
    ]
  },
  value1: { 
    type: 'number', 
    label: 'Value 1', 
    description: 'First value (or leave empty to use input from previous node)', 
    required: false 
  },
  value2: { 
    type: 'number', 
    label: 'Value 2', 
    description: 'Second value (for binary operations)', 
    required: false 
  },
  precision: { 
    type: 'number', 
    label: 'Precision', 
    description: 'Decimal places for round operation', 
    required: false, 
    default: 2 
  }
}
```

**Outputs:**
- `result`: Mathematical operation result
- `operation`: Operation performed

---

### 3.9 String Operations
**Status:** ✅ **Ready to Implement**

**Description:** Performs string manipulation operations (uppercase, lowercase, trim, substring, length, etc.).

**How it works:** Takes string input and applies specified string operation. Uses JavaScript String methods.

**Implementation Notes:**
- Uses JavaScript String methods (toUpperCase, toLowerCase, trim, substring, etc.)
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  operation: { 
    type: 'select', 
    label: 'Operation', 
    description: 'String operation', 
    required: true, 
    options: [
      { label: 'Uppercase', value: 'uppercase' },
      { label: 'Lowercase', value: 'lowercase' },
      { label: 'Trim', value: 'trim' },
      { label: 'Substring', value: 'substring' },
      { label: 'Length', value: 'length' },
      { label: 'Replace', value: 'replace' },
      { label: 'Pad Start', value: 'padStart' },
      { label: 'Pad End', value: 'padEnd' },
      { label: 'Reverse', value: 'reverse' },
      { label: 'Capitalize', value: 'capitalize' },
      { label: 'Camel Case', value: 'camelCase' },
      { label: 'Snake Case', value: 'snakeCase' },
      { label: 'Kebab Case', value: 'kebabCase' }
    ]
  },
  text: { 
    type: 'textarea', 
    label: 'Text', 
    description: 'Input text (leave empty to use input from previous node)', 
    required: false 
  },
  start: { 
    type: 'number', 
    label: 'Start Index', 
    description: 'Start index for substring operation', 
    required: false 
  },
  end: { 
    type: 'number', 
    label: 'End Index', 
    description: 'End index for substring operation', 
    required: false 
  },
  length: { 
    type: 'number', 
    label: 'Length', 
    description: 'Length for pad operations', 
    required: false 
  },
  padString: { 
    type: 'string', 
    label: 'Pad String', 
    description: 'String to pad with (for pad operations)', 
    required: false, 
    default: ' ' 
  }
}
```

**Outputs:**
- `result`: Result of string operation
- `original`: Original input text

---

### 3.10 Array Operations
**Status:** ✅ **Ready to Implement**

**Description:** Performs array manipulation operations (join, slice, reverse, unique, flatten, etc.).

**How it works:** Takes array input and applies specified array operation. Uses JavaScript Array methods.

**Implementation Notes:**
- Uses JavaScript Array methods (join, slice, reverse, filter for unique, flat for flatten)
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  operation: { 
    type: 'select', 
    label: 'Operation', 
    description: 'Array operation', 
    required: true, 
    options: [
      { label: 'Join', value: 'join' },
      { label: 'Slice', value: 'slice' },
      { label: 'Reverse', value: 'reverse' },
      { label: 'Unique', value: 'unique' },
      { label: 'Flatten', value: 'flatten' },
      { label: 'Shuffle', value: 'shuffle' },
      { label: 'Length', value: 'length' },
      { label: 'First', value: 'first' },
      { label: 'Last', value: 'last' },
      { label: 'Concat', value: 'concat' }
    ]
  },
  array: { 
    type: 'array', 
    label: 'Array', 
    description: 'Input array (leave empty to use input from previous node)', 
    required: false 
  },
  separator: { 
    type: 'string', 
    label: 'Separator', 
    description: 'Separator for join operation', 
    required: false, 
    default: ',' 
  },
  start: { 
    type: 'number', 
    label: 'Start Index', 
    description: 'Start index for slice operation', 
    required: false 
  },
  end: { 
    type: 'number', 
    label: 'End Index', 
    description: 'End index for slice operation', 
    required: false 
  },
  depth: { 
    type: 'number', 
    label: 'Depth', 
    description: 'Flattening depth (for flatten operation)', 
    required: false, 
    default: 1 
  },
  array2: { 
    type: 'array', 
    label: 'Second Array', 
    description: 'Second array for concat operation', 
    required: false 
  }
}
```

**Outputs:**
- `result`: Result of array operation
- `original`: Original input array
- `length`: Length of result (for applicable operations)

---

### 3.11 Object Operations
**Status:** ✅ **Ready to Implement**

**Description:** Performs object manipulation operations (get keys, get values, get entries, merge, pick, omit, etc.).

**How it works:** Takes object input and applies specified object operation. Uses JavaScript Object methods.

**Implementation Notes:**
- Uses JavaScript Object methods (Object.keys, Object.values, Object.entries, Object.assign)
- For pick/omit, can use lodash or implement custom logic
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  operation: { 
    type: 'select', 
    label: 'Operation', 
    description: 'Object operation', 
    required: true, 
    options: [
      { label: 'Get Keys', value: 'keys' },
      { label: 'Get Values', value: 'values' },
      { label: 'Get Entries', value: 'entries' },
      { label: 'Pick Fields', value: 'pick' },
      { label: 'Omit Fields', value: 'omit' },
      { label: 'Get Nested Value', value: 'get' },
      { label: 'Set Nested Value', value: 'set' },
      { label: 'Has Property', value: 'has' }
    ]
  },
  object: { 
    type: 'object', 
    label: 'Object', 
    description: 'Input object (leave empty to use input from previous node)', 
    required: false 
  },
  fields: { 
    type: 'array', 
    label: 'Fields', 
    description: 'Field names for pick/omit operations (e.g., ["name", "email"])', 
    required: false 
  },
  path: { 
    type: 'string', 
    label: 'Path', 
    description: 'Dot-notation path for get/set operations (e.g., "user.profile.name")', 
    required: false 
  },
  value: { 
    type: 'string', 
    label: 'Value', 
    description: 'Value to set (for set operation)', 
    required: false 
  },
  property: { 
    type: 'string', 
    label: 'Property', 
    description: 'Property name to check (for has operation)', 
    required: false 
  }
}
```

**Outputs:**
- `result`: Result of object operation
- `original`: Original input object

---

## 4. FILE & BINARY DATA

### 4.1 Read File
**Status:** ❌ **Needs Infrastructure**

**Description:** Reads content from a file. Supports text files, binary files, and various formats.

**How it works:** Reads file from specified path (local or URL) and returns file content as text or base64-encoded binary.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Need file system access (Node.js `fs` module)
- Execution context runs in API route, but needs `fs` access
- For URL sources, can use `context.http.get()` instead
- Need to add `fs` module to execution context or create API route wrapper

**Configuration Schema:**
```typescript
{
  source: { 
    type: 'select', 
    label: 'Source', 
    description: 'File source type', 
    required: true, 
    options: [
      { label: 'URL', value: 'url' },
      { label: 'Base64', value: 'base64' },
      { label: 'Previous Node Output', value: 'input' }
    ]
  },
  filePath: { 
    type: 'string', 
    label: 'File Path / URL', 
    description: 'File path or URL (for URL source)', 
    required: false 
  },
  base64Data: { 
    type: 'textarea', 
    label: 'Base64 Data', 
    description: 'Base64-encoded file data (for base64 source)', 
    required: false 
  },
  encoding: { 
    type: 'select', 
    label: 'Encoding', 
    description: 'File encoding', 
    required: false, 
    default: 'utf8', 
    options: [
      { label: 'UTF-8', value: 'utf8' },
      { label: 'Base64', value: 'base64' },
      { label: 'Binary', value: 'binary' }
    ]
  }
}
```

**Outputs:**
- `content`: File content (text or base64)
- `size`: File size in bytes
- `mimeType`: Detected MIME type
- `encoding`: Encoding used

---

### 4.2 Write File
**Status:** ❌ **Needs Infrastructure**

**Description:** Writes content to a file. Can create new files or overwrite existing ones.

**How it works:** Writes data to a file at specified path. Supports text and binary data.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Need file system access (Node.js `fs` module)
- For URL uploads, can use `context.http.post()` instead
- Need to add `fs` module to execution context or create API route wrapper

**Configuration Schema:**
```typescript
{
  destination: { 
    type: 'select', 
    label: 'Destination', 
    description: 'File destination type', 
    required: true, 
    options: [
      { label: 'Local Path', value: 'local' },
      { label: 'Upload to URL', value: 'url' },
      { label: 'Return as Base64', value: 'base64' }
    ]
  },
  filePath: { 
    type: 'string', 
    label: 'File Path', 
    description: 'File path (for local destination)', 
    required: false 
  },
  uploadUrl: { 
    type: 'string', 
    label: 'Upload URL', 
    description: 'URL to upload file to (for URL destination)', 
    required: false 
  },
  content: { 
    type: 'textarea', 
    label: 'Content', 
    description: 'File content (text or base64, leave empty to use input from previous node)', 
    required: false 
  },
  encoding: { 
    type: 'select', 
    label: 'Encoding', 
    description: 'File encoding', 
    required: false, 
    default: 'utf8', 
    options: [
      { label: 'UTF-8', value: 'utf8' },
      { label: 'Base64', value: 'base64' },
      { label: 'Binary', value: 'binary' }
    ]
  },
  mimeType: { 
    type: 'string', 
    label: 'MIME Type', 
    description: 'File MIME type (e.g., "text/plain", "application/json")', 
    required: false 
  }
}
```

**Outputs:**
- `filePath`: Path/URL where file was written
- `size`: File size in bytes
- `success`: Boolean indicating success

---

### 4.3 Delete File
**Status:** ❌ **Needs Infrastructure**

**Description:** Deletes a file from local filesystem or remote location.

**How it works:** Removes file at specified path or URL.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Need file system access (Node.js `fs` module)
- For remote URLs, can use `context.http.delete()` instead
- Need to add `fs` module to execution context

**Configuration Schema:**
```typescript
{
  filePath: { 
    type: 'string', 
    label: 'File Path / URL', 
    description: 'Path or URL of file to delete', 
    required: true 
  },
  requireAuth: { 
    type: 'select', 
    label: 'Require Authentication', 
    description: 'Require authentication for remote deletion', 
    required: false, 
    default: 'false',
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' }
    ]
  }
}
```

**Outputs:**
- `success`: Boolean indicating success
- `filePath`: Path/URL of deleted file

---

### 4.4 List Files
**Status:** ❌ **Needs Infrastructure**

**Description:** Lists files in a directory or folder. Supports local filesystem and remote storage.

**How it works:** Scans directory at specified path and returns array of file information.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Need file system access (Node.js `fs.readdir()`)
- For remote storage, would need API integration (S3, Google Drive, etc.)
- Need to add `fs` module to execution context

**Configuration Schema:**
```typescript
{
  directoryPath: { 
    type: 'string', 
    label: 'Directory Path', 
    description: 'Path to directory to list', 
    required: true 
  },
  recursive: { 
    type: 'select', 
    label: 'Recursive', 
    description: 'Include subdirectories', 
    required: false, 
    default: 'false',
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' }
    ]
  },
  filter: { 
    type: 'string', 
    label: 'Filter', 
    description: 'File pattern filter (e.g., "*.txt", "*.pdf")', 
    required: false 
  },
  includeDirectories: { 
    type: 'select', 
    label: 'Include Directories', 
    description: 'Include directories in results', 
    required: false, 
    default: 'false',
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' }
    ]
  }
}
```

**Outputs:**
- `files`: Array of file objects with properties: name, path, size, mimeType, modifiedAt
- `count`: Number of files found

---

### 4.5 Download File
**Status:** ✅ **Ready to Implement**

**Description:** Downloads a file from a URL and returns its content.

**How it works:** Fetches file from URL via HTTP GET request and returns file data. Uses `context.http.get()`.

**Implementation Notes:**
- Uses existing `context.http.get()` method
- Can return response as base64 or binary
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  url: { 
    type: 'string', 
    label: 'URL', 
    description: 'URL of file to download', 
    required: true 
  },
  headers: { 
    type: 'object', 
    label: 'Headers', 
    description: 'HTTP headers (JSON object)', 
    required: false 
  },
  encoding: { 
    type: 'select', 
    label: 'Encoding', 
    description: 'Response encoding', 
    required: false, 
    default: 'base64', 
    options: [
      { label: 'Base64', value: 'base64' },
      { label: 'Binary', value: 'binary' },
      { label: 'Text', value: 'text' }
    ]
  },
  timeout: { 
    type: 'number', 
    label: 'Timeout (ms)', 
    description: 'Download timeout', 
    required: false, 
    default: 30000 
  }
}
```

**Outputs:**
- `content`: File content (base64, binary, or text)
- `size`: File size in bytes
- `mimeType`: Content type from response headers
- `filename`: Filename from Content-Disposition header (if available)

---

### 4.6 Upload File
**Status:** ✅ **Ready to Implement** (🔧 **Needs UI Components** for file upload)

**Description:** Uploads a file to a URL via HTTP POST/PUT request.

**How it works:** Sends file data to specified URL using multipart/form-data or raw body. Uses `context.http.post()` or `context.http.put()`.

**Implementation Notes:**
- Uses existing `context.http.post()` or `context.http.put()` methods
- 🔧 **UI Note:** Need file upload component for selecting files
- File content can be passed as base64 string from previous node
- No additional backend infrastructure needed

**Configuration Schema:**
```typescript
{
  url: { 
    type: 'string', 
    label: 'Upload URL', 
    description: 'URL to upload file to', 
    required: true 
  },
  method: { 
    type: 'select', 
    label: 'Method', 
    description: 'HTTP method', 
    required: false, 
    default: 'POST', 
    options: [
      { label: 'POST', value: 'POST' },
      { label: 'PUT', value: 'PUT' }
    ]
  },
  fileContent: { 
    type: 'textarea', 
    label: 'File Content', 
    description: 'File content (base64 or text, leave empty to use input from previous node)', 
    required: false 
  },
  fileName: { 
    type: 'string', 
    label: 'File Name', 
    description: 'Name of file to upload', 
    required: true 
  },
  fieldName: { 
    type: 'string', 
    label: 'Field Name', 
    description: 'Form field name for multipart upload (default: "file")', 
    required: false, 
    default: 'file' 
  },
  mimeType: { 
    type: 'string', 
    label: 'MIME Type', 
    description: 'File MIME type', 
    required: false 
  },
  headers: { 
    type: 'object', 
    label: 'Headers', 
    description: 'Additional HTTP headers', 
    required: false 
  }
}
```

**Outputs:**
- `success`: Boolean indicating success
- `response`: Upload response data
- `url`: Final URL of uploaded file (if returned by server)

---

### 4.7 Convert File Format
**Status:** ❌ **Needs Infrastructure**

**Description:** Converts files between different formats (e.g., PDF to text, image format conversion, etc.).

**How it works:** Takes file input, converts to specified format, and returns converted file data.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Need file processing libraries
- PDF to text: Need `pdf-parse` or similar
- Image conversion: Need `sharp` or `jimp`
- Text formats: Can use simple string manipulation
- Need to add processing libraries to execution context or create API route wrapper

**Configuration Schema:**
```typescript
{
  inputFormat: { 
    type: 'select', 
    label: 'Input Format', 
    description: 'Input file format', 
    required: true, 
    options: [
      { label: 'Auto Detect', value: 'auto' },
      { label: 'PDF', value: 'pdf' },
      { label: 'Image (PNG)', value: 'png' },
      { label: 'Image (JPEG)', value: 'jpeg' },
      { label: 'Image (GIF)', value: 'gif' },
      { label: 'Image (WebP)', value: 'webp' },
      { label: 'Text', value: 'text' },
      { label: 'Markdown', value: 'markdown' },
      { label: 'HTML', value: 'html' },
      { label: 'JSON', value: 'json' },
      { label: 'CSV', value: 'csv' }
    ]
  },
  outputFormat: { 
    type: 'select', 
    label: 'Output Format', 
    description: 'Output file format', 
    required: true, 
    options: [
      { label: 'PDF', value: 'pdf' },
      { label: 'Image (PNG)', value: 'png' },
      { label: 'Image (JPEG)', value: 'jpeg' },
      { label: 'Image (GIF)', value: 'gif' },
      { label: 'Image (WebP)', value: 'webp' },
      { label: 'Text', value: 'text' },
      { label: 'Markdown', value: 'markdown' },
      { label: 'HTML', value: 'html' },
      { label: 'JSON', value: 'json' },
      { label: 'CSV', value: 'csv' }
    ]
  },
  fileContent: { 
    type: 'textarea', 
    label: 'File Content', 
    description: 'Input file content (base64, leave empty to use input from previous node)', 
    required: false 
  },
  options: { 
    type: 'object', 
    label: 'Conversion Options', 
    description: 'Format-specific options (JSON object, e.g., {"quality": 90} for images)', 
    required: false 
  }
}
```

**Outputs:**
- `content`: Converted file content (base64)
- `mimeType`: Output MIME type
- `size`: Output file size in bytes

---

### 4.8 Compress / Decompress
**Status:** ❌ **Needs Infrastructure**

**Description:** Compresses files to ZIP/GZIP format or decompresses compressed files.

**How it works:** Takes file(s) and compresses to archive format, or extracts files from archive.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Need compression libraries
- ZIP: Need `archiver` and `unzipper` or `adm-zip`
- GZIP: Need Node.js `zlib` module
- Need to add compression libraries to execution context or create API route wrapper

**Configuration Schema:**
```typescript
{
  operation: { 
    type: 'select', 
    label: 'Operation', 
    description: 'Compress or decompress', 
    required: true, 
    options: [
      { label: 'Compress', value: 'compress' },
      { label: 'Decompress', value: 'decompress' }
    ]
  },
  format: { 
    type: 'select', 
    label: 'Format', 
    description: 'Archive format', 
    required: true, 
    options: [
      { label: 'ZIP', value: 'zip' },
      { label: 'GZIP', value: 'gzip' },
      { label: 'TAR', value: 'tar' },
      { label: 'TAR.GZ', value: 'targz' }
    ]
  },
  files: { 
    type: 'array', 
    label: 'Files', 
    description: 'Array of files to compress (for compress operation) or archive content (for decompress)', 
    required: false 
  },
  archiveContent: { 
    type: 'textarea', 
    label: 'Archive Content', 
    description: 'Compressed archive content (base64, for decompress operation)', 
    required: false 
  },
  outputFileName: { 
    type: 'string', 
    label: 'Output File Name', 
    description: 'Name for output archive (for compress operation)', 
    required: false 
  }
}
```

**Outputs:**
- `content`: Compressed/decompressed content
- `files`: Array of extracted files (for decompress)
- `size`: Output size in bytes

---

### 4.9 Extract Archive
**Status:** ❌ **Needs Infrastructure**

**Description:** Extracts files from compressed archives (ZIP, TAR, etc.).

**How it works:** Takes archive file, extracts all files, and returns array of extracted file data.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Need archive extraction libraries
- ZIP: Need `unzipper` or `adm-zip`
- TAR: Need `tar` module
- Need to add extraction libraries to execution context or create API route wrapper

**Configuration Schema:**
```typescript
{
  archiveContent: { 
    type: 'textarea', 
    label: 'Archive Content', 
    description: 'Archive file content (base64, leave empty to use input from previous node)', 
    required: false 
  },
  format: { 
    type: 'select', 
    label: 'Format', 
    description: 'Archive format', 
    required: true, 
    options: [
      { label: 'Auto Detect', value: 'auto' },
      { label: 'ZIP', value: 'zip' },
      { label: 'TAR', value: 'tar' },
      { label: 'TAR.GZ', value: 'targz' },
      { label: 'RAR', value: 'rar' },
      { label: '7Z', value: '7z' }
    ]
  },
  extractPath: { 
    type: 'string', 
    label: 'Extract Path', 
    description: 'Specific file/folder to extract (optional, extracts all if empty)', 
    required: false 
  }
}
```

**Outputs:**
- `files`: Array of extracted files with properties: name, content (base64), size, path
- `count`: Number of files extracted

---

### 4.10 Image Manipulation
**Status:** ❌ **Needs Infrastructure**

**Description:** Performs image operations like resize, crop, rotate, apply filters, convert format, etc.

**How it works:** Takes image data, applies specified transformation, and returns modified image.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Need image processing library
- Recommended: `sharp` (fast, supports many formats)
- Alternatives: `jimp` (pure JS, slower), `canvas` (for advanced features)
- Need to add image processing library to execution context or create API route wrapper

**Configuration Schema:**
```typescript
{
  operation: { 
    type: 'select', 
    label: 'Operation', 
    description: 'Image operation', 
    required: true, 
    options: [
      { label: 'Resize', value: 'resize' },
      { label: 'Crop', value: 'crop' },
      { label: 'Rotate', value: 'rotate' },
      { label: 'Flip', value: 'flip' },
      { label: 'Convert Format', value: 'convert' },
      { label: 'Apply Filter', value: 'filter' },
      { label: 'Add Watermark', value: 'watermark' },
      { label: 'Get Metadata', value: 'metadata' }
    ]
  },
  imageContent: { 
    type: 'textarea', 
    label: 'Image Content', 
    description: 'Image content (base64, leave empty to use input from previous node)', 
    required: false 
  },
  width: { 
    type: 'number', 
    label: 'Width', 
    description: 'Target width in pixels (for resize/crop)', 
    required: false 
  },
  height: { 
    type: 'number', 
    label: 'Height', 
    description: 'Target height in pixels (for resize/crop)', 
    required: false 
  },
  maintainAspectRatio: { 
    type: 'select', 
    label: 'Maintain Aspect Ratio', 
    description: 'Maintain aspect ratio when resizing', 
    required: false, 
    default: 'true',
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' }
    ]
  },
  x: { 
    type: 'number', 
    label: 'X Position', 
    description: 'X position for crop operation', 
    required: false 
  },
  y: { 
    type: 'number', 
    label: 'Y Position', 
    description: 'Y position for crop operation', 
    required: false 
  },
  angle: { 
    type: 'number', 
    label: 'Angle', 
    description: 'Rotation angle in degrees (for rotate operation)', 
    required: false 
  },
  direction: { 
    type: 'select', 
    label: 'Direction', 
    description: 'Flip direction (for flip operation)', 
    required: false, 
    options: [
      { label: 'Horizontal', value: 'horizontal' },
      { label: 'Vertical', value: 'vertical' }
    ]
  },
  outputFormat: { 
    type: 'select', 
    label: 'Output Format', 
    description: 'Output image format (for convert operation)', 
    required: false, 
    options: [
      { label: 'PNG', value: 'png' },
      { label: 'JPEG', value: 'jpeg' },
      { label: 'WebP', value: 'webp' },
      { label: 'GIF', value: 'gif' }
    ]
  },
  filter: { 
    type: 'select', 
    label: 'Filter', 
    description: 'Filter to apply (for filter operation)', 
    required: false, 
    options: [
      { label: 'Grayscale', value: 'grayscale' },
      { label: 'Sepia', value: 'sepia' },
      { label: 'Blur', value: 'blur' },
      { label: 'Sharpen', value: 'sharpen' },
      { label: 'Brighten', value: 'brighten' },
      { label: 'Darken', value: 'darken' }
    ]
  },
  quality: { 
    type: 'number', 
    label: 'Quality', 
    description: 'Image quality (1-100, for JPEG/WebP)', 
    required: false, 
    default: 90 
  }
}
```

**Outputs:**
- `image`: Modified image content (base64)
- `width`: Image width in pixels
- `height`: Image height in pixels
- `format`: Image format
- `size`: Image size in bytes
- `metadata`: Image metadata (for metadata operation)

---

## 5. AI/ML

### 5.1 Classify Text
**Status:** ✅ **Ready to Implement**

**Description:** Classifies text into predefined categories using AI. Useful for content moderation, categorization, etc.

**How it works:** Sends text to AI model with classification prompt and returns category/label. Uses OpenAI API (already integrated).

**Implementation Notes:**
- Uses existing OpenAI integration
- Can use `generateAiContentExecute` with classification prompt
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  text: { 
    type: 'textarea', 
    label: 'Text', 
    description: 'Text to classify (leave empty to use input from previous node)', 
    required: false 
  },
  categories: { 
    type: 'array', 
    label: 'Categories', 
    description: 'Array of category labels (e.g., ["positive", "negative", "neutral"])', 
    required: true 
  },
  prompt: { 
    type: 'textarea', 
    label: 'Custom Prompt', 
    description: 'Optional custom classification prompt', 
    required: false 
  }
}
```

**Outputs:**
- `category`: Assigned category
- `confidence`: Confidence score (0-1)
- `allScores`: Object with scores for all categories

---

### 5.2 Extract Entities
**Status:** ✅ **Ready to Implement**

**Description:** Extracts named entities (people, places, organizations, dates, etc.) from text using AI.

**How it works:** Analyzes text and identifies entities, returning structured entity data. Uses OpenAI API with structured output.

**Implementation Notes:**
- Uses existing OpenAI integration
- Can use function calling or structured output to return JSON
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  text: { 
    type: 'textarea', 
    label: 'Text', 
    description: 'Text to extract entities from (leave empty to use input from previous node)', 
    required: false 
  },
  entityTypes: { 
    type: 'array', 
    label: 'Entity Types', 
    description: 'Types of entities to extract (e.g., ["person", "organization", "location", "date"])', 
    required: false 
  }
}
```

**Outputs:**
- `entities`: Array of extracted entities with properties: text, type, start, end, confidence
- `count`: Number of entities found

---

### 5.3 Sentiment Analysis
**Status:** ✅ **Ready to Implement**

**Description:** Analyzes sentiment of text (positive, negative, neutral) using AI.

**How it works:** Evaluates text sentiment and returns sentiment label and score. Uses OpenAI API with sentiment analysis prompt.

**Implementation Notes:**
- Uses existing OpenAI integration
- Can use `generateAiContentExecute` with sentiment analysis prompt
- Returns structured JSON with sentiment and score
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  text: { 
    type: 'textarea', 
    label: 'Text', 
    description: 'Text to analyze (leave empty to use input from previous node)', 
    required: false 
  },
  granularity: { 
    type: 'select', 
    label: 'Granularity', 
    description: 'Level of sentiment analysis', 
    required: false, 
    default: 'simple', 
    options: [
      { label: 'Simple (positive/negative/neutral)', value: 'simple' },
      { label: 'Detailed (emotions)', value: 'detailed' }
    ]
  }
}
```

**Outputs:**
- `sentiment`: Sentiment label (positive/negative/neutral or detailed emotions)
- `score`: Sentiment score (-1 to 1, where -1 is very negative, 1 is very positive)
- `confidence`: Confidence score (0-1)

---

### 5.4 Translate Text
**Status:** ✅ **Ready to Implement**

**Description:** Translates text from one language to another using AI.

**How it works:** Sends text to translation model and returns translated text. Uses OpenAI API with translation prompt.

**Implementation Notes:**
- Uses existing OpenAI integration
- Can use `generateAiContentExecute` with translation prompt
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  text: { 
    type: 'textarea', 
    label: 'Text', 
    description: 'Text to translate (leave empty to use input from previous node)', 
    required: false 
  },
  sourceLanguage: { 
    type: 'select', 
    label: 'Source Language', 
    description: 'Source language (or auto-detect)', 
    required: false, 
    default: 'auto', 
    options: [
      { label: 'Auto Detect', value: 'auto' },
      { label: 'English', value: 'en' },
      { label: 'Spanish', value: 'es' },
      { label: 'French', value: 'fr' },
      { label: 'German', value: 'de' },
      { label: 'Chinese', value: 'zh' },
      { label: 'Japanese', value: 'ja' },
      { label: 'Korean', value: 'ko' },
      { label: 'Portuguese', value: 'pt' },
      { label: 'Russian', value: 'ru' },
      { label: 'Arabic', value: 'ar' },
      { label: 'Italian', value: 'it' }
    ]
  },
  targetLanguage: { 
    type: 'select', 
    label: 'Target Language', 
    description: 'Target language', 
    required: true, 
    options: [
      { label: 'English', value: 'en' },
      { label: 'Spanish', value: 'es' },
      { label: 'French', value: 'fr' },
      { label: 'German', value: 'de' },
      { label: 'Chinese', value: 'zh' },
      { label: 'Japanese', value: 'ja' },
      { label: 'Korean', value: 'ko' },
      { label: 'Portuguese', value: 'pt' },
      { label: 'Russian', value: 'ru' },
      { label: 'Arabic', value: 'ar' },
      { label: 'Italian', value: 'it' }
    ]
  }
}
```

**Outputs:**
- `translated`: Translated text
- `sourceLanguage`: Detected source language
- `targetLanguage`: Target language used

---

### 5.5 Generate Image
**Status:** 🔌 **Needs External Service**

**Description:** Generates images from text prompts using AI image generation models.

**How it works:** Sends text prompt to image generation API and returns generated image.

**Implementation Notes:**
- 🔌 **Requires External Service:** Need image generation API integration
- Options: OpenAI DALL-E, Stability AI, Midjourney API, etc.
- Would need to add API integration similar to OpenAI
- Can use `context.http.post()` to call external API

**Configuration Schema:**
```typescript
{
  prompt: { 
    type: 'textarea', 
    label: 'Prompt', 
    description: 'Text prompt describing image to generate', 
    required: true 
  },
  size: { 
    type: 'select', 
    label: 'Image Size', 
    description: 'Generated image dimensions', 
    required: false, 
    default: '1024x1024', 
    options: [
      { label: '256x256', value: '256x256' },
      { label: '512x512', value: '512x512' },
      { label: '1024x1024', value: '1024x1024' },
      { label: '1024x1792', value: '1024x1792' },
      { label: '1792x1024', value: '1792x1024' }
    ]
  },
  style: { 
    type: 'select', 
    label: 'Style', 
    description: 'Image generation style', 
    required: false, 
    options: [
      { label: 'Natural', value: 'natural' },
      { label: 'Vivid', value: 'vivid' }
    ]
  },
  quality: { 
    type: 'select', 
    label: 'Quality', 
    description: 'Image quality', 
    required: false, 
    default: 'standard', 
    options: [
      { label: 'Standard', value: 'standard' },
      { label: 'HD', value: 'hd' }
    ]
  }
}
```

**Outputs:**
- `image`: Generated image content (base64)
- `url`: URL of generated image (if provided by API)
- `revisedPrompt`: Revised prompt used (if API modifies prompt)

---

### 5.6 Image Recognition / Object Detection
**Status:** 🔌 **Needs External Service**

**Description:** Identifies objects, scenes, or text in images using AI vision models.

**How it works:** Analyzes image and returns detected objects, labels, or extracted text.

**Implementation Notes:**
- 🔌 **Requires External Service:** Need vision API integration
- Options: OpenAI Vision API (GPT-4 Vision), Google Cloud Vision, AWS Rekognition
- OpenAI Vision can be added using existing OpenAI integration
- For OCR, can use Tesseract.js (pure JS) but less accurate than cloud APIs

**Configuration Schema:**
```typescript
{
  imageContent: { 
    type: 'textarea', 
    label: 'Image Content', 
    description: 'Image content (base64 or URL, leave empty to use input from previous node)', 
    required: false 
  },
  imageUrl: { 
    type: 'string', 
    label: 'Image URL', 
    description: 'URL of image to analyze', 
    required: false 
  },
  task: { 
    type: 'select', 
    label: 'Task', 
    description: 'Recognition task', 
    required: true, 
    options: [
      { label: 'Object Detection', value: 'objects' },
      { label: 'Scene Recognition', value: 'scene' },
      { label: 'Text Extraction (OCR)', value: 'ocr' },
      { label: 'Face Detection', value: 'faces' },
      { label: 'Label Detection', value: 'labels' }
    ]
  },
  maxResults: { 
    type: 'number', 
    label: 'Max Results', 
    description: 'Maximum number of results to return', 
    required: false, 
    default: 10 
  }
}
```

**Outputs:**
- `results`: Array of detected objects/labels with properties: label, confidence, boundingBox (for objects)
- `text`: Extracted text (for OCR task)
- `count`: Number of detections

---

### 5.7 Text to Speech
**Status:** 🔌 **Needs External Service**

**Description:** Converts text to speech audio using AI TTS models.

**How it works:** Sends text to TTS API and returns audio file.

**Implementation Notes:**
- 🔌 **Requires External Service:** Need TTS API integration
- Options: OpenAI TTS API, Google Cloud Text-to-Speech, AWS Polly, ElevenLabs
- OpenAI TTS can be added using existing OpenAI integration
- Can use `context.http.post()` to call external API

**Configuration Schema:**
```typescript
{
  text: { 
    type: 'textarea', 
    label: 'Text', 
    description: 'Text to convert to speech (leave empty to use input from previous node)', 
    required: true 
  },
  voice: { 
    type: 'select', 
    label: 'Voice', 
    description: 'Voice to use', 
    required: false, 
    default: 'alloy', 
    options: [
      { label: 'Alloy', value: 'alloy' },
      { label: 'Echo', value: 'echo' },
      { label: 'Fable', value: 'fable' },
      { label: 'Onyx', value: 'onyx' },
      { label: 'Nova', value: 'nova' },
      { label: 'Shimmer', value: 'shimmer' }
    ]
  },
  speed: { 
    type: 'number', 
    label: 'Speed', 
    description: 'Speech speed (0.25 to 4.0)', 
    required: false, 
    default: 1.0 
  },
  format: { 
    type: 'select', 
    label: 'Format', 
    description: 'Audio format', 
    required: false, 
    default: 'mp3', 
    options: [
      { label: 'MP3', value: 'mp3' },
      { label: 'Opus', value: 'opus' },
      { label: 'AAC', value: 'aac' },
      { label: 'FLAC', value: 'flac' }
    ]
  }
}
```

**Outputs:**
- `audio`: Audio content (base64)
- `url`: URL of audio file (if provided by API)
- `duration`: Audio duration in seconds
- `format`: Audio format

---

### 5.8 Speech to Text
**Status:** 🔌 **Needs External Service**

**Description:** Converts speech/audio to text using AI speech recognition models.

**How it works:** Sends audio file to speech recognition API and returns transcribed text.

**Implementation Notes:**
- 🔌 **Requires External Service:** Need STT API integration
- Options: OpenAI Whisper API, Google Cloud Speech-to-Text, AWS Transcribe
- OpenAI Whisper can be added using existing OpenAI integration
- Can use `context.http.post()` to call external API with audio file

**Configuration Schema:**
```typescript
{
  audioContent: { 
    type: 'textarea', 
    label: 'Audio Content', 
    description: 'Audio content (base64, leave empty to use input from previous node)', 
    required: false 
  },
  audioUrl: { 
    type: 'string', 
    label: 'Audio URL', 
    description: 'URL of audio file to transcribe', 
    required: false 
  },
  language: { 
    type: 'select', 
    label: 'Language', 
    description: 'Audio language (or auto-detect)', 
    required: false, 
    default: 'auto', 
    options: [
      { label: 'Auto Detect', value: 'auto' },
      { label: 'English', value: 'en' },
      { label: 'Spanish', value: 'es' },
      { label: 'French', value: 'fr' },
      { label: 'German', value: 'de' },
      { label: 'Chinese', value: 'zh' },
      { label: 'Japanese', value: 'ja' },
      { label: 'Korean', value: 'ko' },
      { label: 'Portuguese', value: 'pt' },
      { label: 'Russian', value: 'ru' }
    ]
  },
  responseFormat: { 
    type: 'select', 
    label: 'Response Format', 
    description: 'Transcription format', 
    required: false, 
    default: 'text', 
    options: [
      { label: 'Text', value: 'text' },
      { label: 'JSON with Timestamps', value: 'json' },
      { label: 'SRT Subtitles', value: 'srt' },
      { label: 'VTT Subtitles', value: 'vtt' }
    ]
  }
}
```

**Outputs:**
- `text`: Transcribed text
- `segments`: Array of text segments with timestamps (for JSON format)
- `language`: Detected language
- `duration`: Audio duration in seconds

---

## 6. UTILITIES

### 6.1 Log / Print
**Status:** ✅ **Ready to Implement**

**Description:** Logs data to console or workflow execution logs. Useful for debugging and monitoring.

**How it works:** Outputs data to execution logs with optional log level. Uses `context.logger` methods.

**Implementation Notes:**
- Uses existing `context.logger.info/error/warn/debug` methods
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  message: { 
    type: 'textarea', 
    label: 'Message', 
    description: 'Message to log (can reference input data with {{fieldName}})', 
    required: false 
  },
  level: { 
    type: 'select', 
    label: 'Log Level', 
    description: 'Log level', 
    required: false, 
    default: 'info', 
    options: [
      { label: 'Debug', value: 'debug' },
      { label: 'Info', value: 'info' },
      { label: 'Warning', value: 'warning' },
      { label: 'Error', value: 'error' }
    ]
  },
  includeInput: { 
    type: 'select', 
    label: 'Include Input Data', 
    description: 'Include full input data in log', 
    required: false, 
    default: 'false',
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' }
    ]
  }
}
```

**Outputs:**
- `logged`: Boolean indicating log was written
- `data`: Original input data (passed through)

---

### 6.2 Comment / Note
**Status:** ✅ **Ready to Implement**

**Description:** Adds a comment or note in the workflow. Does not affect execution, purely for documentation.

**How it works:** No-op node that allows users to add documentation/notes in workflow. Simply passes input data through unchanged.

**Implementation Notes:**
- Trivial implementation - just return inputData
- No additional infrastructure needed

**Configuration Schema:**
```typescript
{
  comment: { 
    type: 'textarea', 
    label: 'Comment', 
    description: 'Comment or note text', 
    required: true 
  }
}
```

**Outputs:**
- `data`: Original input data (passed through unchanged)

---

### 6.3 Wait for Webhook
**Status:** ❌ **Needs Infrastructure**

**Description:** Pauses workflow execution and waits for a webhook call before continuing.

**How it works:** Creates a temporary webhook endpoint, waits for incoming request, then continues workflow with webhook data.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Need persistent webhook storage and workflow pause/resume
- Need to store workflow execution state in database
- Need webhook endpoint that resumes workflow execution
- Complex implementation requiring workflow state management

**Configuration Schema:**
```typescript
{
  timeout: { 
    type: 'number', 
    label: 'Timeout (seconds)', 
    description: 'Maximum time to wait for webhook', 
    required: false, 
    default: 300 
  },
  webhookPath: { 
    type: 'string', 
    label: 'Webhook Path', 
    description: 'Unique path for webhook (auto-generated if empty)', 
    required: false 
  }
}
```

**Outputs:**
- `data`: Webhook payload data
- `headers`: Webhook request headers
- `receivedAt`: Timestamp when webhook was received

---

### 6.4 Merge Workflows
**Status:** ⚠️ **Needs Executor Changes**

**Description:** Merges data from multiple workflow branches or parallel executions.

**How it works:** Waits for data from multiple input paths and merges them into single output.

**Implementation Notes:**
- ⚠️ **Requires Executor Changes:** Need to support parallel execution and merging
- Executor currently executes sequentially
- Need to track multiple input sources and merge outputs
- Can be implemented by detecting nodes with multiple input edges

**Configuration Schema:**
```typescript
{
  strategy: { 
    type: 'select', 
    label: 'Merge Strategy', 
    description: 'How to merge inputs', 
    required: false, 
    default: 'all', 
    options: [
      { label: 'Wait for All', value: 'all' },
      { label: 'Wait for Any', value: 'any' },
      { label: 'Wait for First', value: 'first' }
    ]
  },
  timeout: { 
    type: 'number', 
    label: 'Timeout (ms)', 
    description: 'Timeout for waiting for inputs', 
    required: false 
  }
}
```

**Outputs:**
- `merged`: Merged data from all inputs
- `sources`: Array indicating which inputs were received
- `count`: Number of inputs merged

---

### 6.5 Error Handler / Try Catch
**Status:** ⚠️ **Needs Executor Changes**

**Description:** Catches errors from previous nodes and handles them gracefully without stopping workflow.

**How it works:** Wraps execution of connected nodes and catches any errors, routing to error handling path.

**Implementation Notes:**
- ⚠️ **Requires Executor Changes:** Need try/catch wrapper in executor
- Executor already catches errors, but stops workflow
- Need to add error handling edges: `{ source: 'node-1', target: 'error-handler', onError: true }`
- Executor should route to error handler node instead of failing workflow

**Configuration Schema:**
```typescript
{
  continueOnError: { 
    type: 'select', 
    label: 'Continue on Error', 
    description: 'Continue workflow execution even if error occurs', 
    required: false, 
    default: 'true',
    options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' }
    ]
  },
  defaultErrorOutput: { 
    type: 'string', 
    label: 'Default Error Output', 
    description: 'Default value to output on error', 
    required: false 
  }
}
```

**Outputs:**
- `success`: Boolean indicating if execution succeeded
- `data`: Output data (or error data if failed)
- `error`: Error object (if error occurred)
- `errorMessage`: Error message (if error occurred)

---

## 7. DATABASE OPERATIONS

### 7.1 Database Query
**Status:** ❌ **Needs Infrastructure**

**Description:** Executes SQL queries against a database. Supports PostgreSQL, MySQL, SQLite, etc.

**How it works:** Connects to database using credentials and executes SQL query, returning results.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Need database connection libraries
- PostgreSQL: Need `pg` module
- MySQL: Need `mysql2` module
- SQLite: Need `better-sqlite3` or `sql.js`
- MongoDB: Need `mongodb` module
- Need to add database connection to execution context or create API route wrapper
- Security: Must validate SQL queries to prevent injection

**Configuration Schema:**
```typescript
{
  databaseType: { 
    type: 'select', 
    label: 'Database Type', 
    description: 'Database type', 
    required: true, 
    options: [
      { label: 'PostgreSQL', value: 'postgresql' },
      { label: 'MySQL', value: 'mysql' },
      { label: 'SQLite', value: 'sqlite' },
      { label: 'MongoDB', value: 'mongodb' }
    ]
  },
  connectionString: { 
    type: 'string', 
    label: 'Connection String', 
    description: 'Database connection string', 
    required: true 
  },
  query: { 
    type: 'textarea', 
    label: 'SQL Query', 
    description: 'SQL query to execute (can reference variables with {{variableName}})', 
    required: true 
  },
  parameters: { 
    type: 'array', 
    label: 'Parameters', 
    description: 'Query parameters array (for parameterized queries)', 
    required: false 
  }
}
```

**Outputs:**
- `results`: Query results (array of objects for SELECT, affected rows count for INSERT/UPDATE/DELETE)
- `rowCount`: Number of rows returned/affected
- `columns`: Column names (for SELECT queries)

---

### 7.2 Insert Database Record
**Status:** ❌ **Needs Infrastructure**

**Description:** Inserts a new record into a database table.

**How it works:** Connects to database and inserts record with specified values.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Same as Database Query
- Need database connection libraries
- Can reuse database connection logic from Query node

**Configuration Schema:**
```typescript
{
  databaseType: { 
    type: 'select', 
    label: 'Database Type', 
    description: 'Database type', 
    required: true, 
    options: [
      { label: 'PostgreSQL', value: 'postgresql' },
      { label: 'MySQL', value: 'mysql' },
      { label: 'SQLite', value: 'sqlite' },
      { label: 'MongoDB', value: 'mongodb' }
    ]
  },
  connectionString: { 
    type: 'string', 
    label: 'Connection String', 
    description: 'Database connection string', 
    required: true 
  },
  table: { 
    type: 'string', 
    label: 'Table Name', 
    description: 'Table name to insert into', 
    required: true 
  },
  data: { 
    type: 'object', 
    label: 'Data', 
    description: 'Record data (JSON object, e.g., {"name": "John", "email": "john@example.com"})', 
    required: true 
  }
}
```

**Outputs:**
- `id`: Inserted record ID
- `success`: Boolean indicating success
- `affectedRows`: Number of rows affected

---

### 7.3 Update Database Record
**Status:** ❌ **Needs Infrastructure**

**Description:** Updates existing records in a database table.

**How it works:** Connects to database and updates records matching specified conditions.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Same as Database Query
- Need database connection libraries
- Can reuse database connection logic from Query node

**Configuration Schema:**
```typescript
{
  databaseType: { 
    type: 'select', 
    label: 'Database Type', 
    description: 'Database type', 
    required: true, 
    options: [
      { label: 'PostgreSQL', value: 'postgresql' },
      { label: 'MySQL', value: 'mysql' },
      { label: 'SQLite', value: 'sqlite' },
      { label: 'MongoDB', value: 'mongodb' }
    ]
  },
  connectionString: { 
    type: 'string', 
    label: 'Connection String', 
    description: 'Database connection string', 
    required: true 
  },
  table: { 
    type: 'string', 
    label: 'Table Name', 
    description: 'Table name to update', 
    required: true 
  },
  where: { 
    type: 'object', 
    label: 'Where Clause', 
    description: 'Conditions for which records to update (e.g., {"id": 123})', 
    required: true 
  },
  data: { 
    type: 'object', 
    label: 'Update Data', 
    description: 'Fields to update (JSON object)', 
    required: true 
  }
}
```

**Outputs:**
- `affectedRows`: Number of rows updated
- `success`: Boolean indicating success

---

### 7.4 Delete Database Record
**Status:** ❌ **Needs Infrastructure**

**Description:** Deletes records from a database table.

**How it works:** Connects to database and deletes records matching specified conditions.

**Implementation Notes:**
- ❌ **Requires Infrastructure:** Same as Database Query
- Need database connection libraries
- Can reuse database connection logic from Query node

**Configuration Schema:**
```typescript
{
  databaseType: { 
    type: 'select', 
    label: 'Database Type', 
    description: 'Database type', 
    required: true, 
    options: [
      { label: 'PostgreSQL', value: 'postgresql' },
      { label: 'MySQL', value: 'mysql' },
      { label: 'SQLite', value: 'sqlite' },
      { label: 'MongoDB', value: 'mongodb' }
    ]
  },
  connectionString: { 
    type: 'string', 
    label: 'Connection String', 
    description: 'Database connection string', 
    required: true 
  },
  table: { 
    type: 'string', 
    label: 'Table Name', 
    description: 'Table name to delete from', 
    required: true 
  },
  where: { 
    type: 'object', 
    label: 'Where Clause', 
    description: 'Conditions for which records to delete (e.g., {"id": 123})', 
    required: true 
  }
}
```

**Outputs:**
- `affectedRows`: Number of rows deleted
- `success`: Boolean indicating success

---

## Summary

This document lists **60+ essential canonical nodes** that are missing from the current Runwise node library, organized into 7 categories:

1. **Triggers** (1 node): Manual/Button Trigger
2. **Actions** (8 nodes): HTTP Request, Conditional Logic, Loop, Switch, Set/Get Variable, Stop, Continue
3. **Transforms** (11 nodes): Map, Sort, Group, Aggregate, Find/Replace, Encode/Decode, Date/Time, Math, String Ops, Array Ops, Object Ops
4. **File & Binary Data** (10 nodes): Read, Write, Delete, List, Download, Upload, Convert Format, Compress/Decompress, Extract Archive, Image Manipulation
5. **AI/ML** (8 nodes): Classify, Extract Entities, Sentiment Analysis, Translate, Generate Image, Image Recognition, Text to Speech, Speech to Text
6. **Utilities** (5 nodes): Log, Comment, Wait for Webhook, Merge Workflows, Error Handler
7. **Database Operations** (4 nodes): Query, Insert, Update, Delete

### Implementation Status Breakdown

**✅ Ready to Implement (25 nodes):**
- Manual Trigger, HTTP Request, Stop, Map, Sort, Group, Aggregate, Find/Replace, Encode/Decode, Date/Time, Math, String Ops, Array Ops, Object Ops, Download File, Upload File, Classify Text, Extract Entities, Sentiment Analysis, Translate Text, Log, Comment

**⚠️ Needs Executor Changes (7 nodes):**
- If/Conditional Logic, Loop/Iterator, Switch/Case, Set Variable, Get Variable, Continue, Merge Workflows, Error Handler

**❌ Needs Infrastructure (15 nodes):**
- Read File, Write File, Delete File, List Files, Convert File Format, Compress/Decompress, Extract Archive, Image Manipulation, Wait for Webhook, Database Query, Insert Record, Update Record, Delete Record

**🔌 Needs External Service (4 nodes):**
- Generate Image, Image Recognition, Text to Speech, Speech to Text

**🔧 Needs UI Components (2 nodes):**
- Date/Time Manipulation (date picker), Upload File (file upload component)

### Configuration Schema Notes

- All `boolean` fields have been converted to `select` fields with Yes/No options (UI doesn't support boolean yet)
- `array` and `object` fields are rendered as JSON textareas (users input JSON strings)
- All field types match what's currently supported in the UI: `string`, `textarea`, `number`, `select`, `object`, `array`, `integration`

### Implementation Priority Recommendation

1. **Phase 1 - Quick Wins:** Implement all "Ready to Implement" nodes (25 nodes)
2. **Phase 2 - Executor Enhancements:** Add support for branching, loops, and variables (7 nodes)
3. **Phase 3 - Infrastructure:** Add file system access, database connections, image processing (15 nodes)
4. **Phase 4 - External Services:** Integrate TTS, STT, image generation APIs (4 nodes)
5. **Phase 5 - UI Polish:** Add date picker and file upload components (2 nodes)

Each node includes:
- Clear description of functionality
- Explanation of how it works
- Implementation status and notes
- Complete configuration schema with field types, labels, descriptions, and requirements
- Output structure

These nodes represent the core functionality that any comprehensive workflow automation platform should provide.

