// Utilities for bidirectional sync between GUI parameters and Python code

export interface ReadCsvParams {
  varName: string;
  filename: string;
  delimiter: string;
  header: boolean;
  encoding: string;
}

/**
 * Parse pd.read_csv() code to extract parameters
 */
export function parseReadCsvCode(code: string): ReadCsvParams | null {
  try {
    // Extract variable name from assignment
    const varMatch = code.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/m);
    if (!varMatch) return null;
    const varName = varMatch[1];

    // Extract filename (first positional argument)
    const filenameMatch = code.match(/pd\.read_csv\s*\(\s*["']([^"']+)["']/);
    if (!filenameMatch) return null;
    const filename = filenameMatch[1];

    // Extract delimiter
    const delimiterMatch = code.match(/delimiter\s*=\s*["']([^"']*)["']/);
    const delimiter = delimiterMatch ? delimiterMatch[1] : ',';

    // Extract header (can be 0, None, or a number)
    // In pandas: header=0 means first row is header (True)
    //           header=None means no header (False)
    const headerMatch = code.match(/header\s*=\s*(\w+|None|\d+)/);
    let header = true;
    if (headerMatch) {
      const headerValue = headerMatch[1];
      header = headerValue === 'None' ? false : true;
    }

    // Extract encoding
    const encodingMatch = code.match(/encoding\s*=\s*["']([^"']*)["']/);
    const encoding = encodingMatch ? encodingMatch[1] : 'utf-8';

    return {
      varName,
      filename,
      delimiter,
      header,
      encoding,
    };
  } catch (error) {
    console.error('Failed to parse read_csv code:', error);
    return null;
  }
}

/**
 * Generate pd.read_csv() Python code from parameters
 */
export function generateReadCsvCode(params: ReadCsvParams): string {
  const { varName, filename, delimiter, header, encoding } = params;
  
  const lines = [
    'import pandas as pd',
    `${varName} = pd.read_csv("${filename}", delimiter="${delimiter}", header=${header ? '0' : 'None'}, encoding="${encoding}")`
  ];
  
  return lines.join('\n');
}

export interface SplitParams {
  varName?: string; // Optional: for when split creates multiple vars
  sourceVar: string;
  trainPercent: number;
  validationPercent: number;
  testPercent: number;
  includeValidation: boolean;
  splitOrder: string[];
}

/**
 * Parse split code to extract parameters
 */
export function parseSplitCode(code: string): Partial<SplitParams> | null {
  try {
    const params: Partial<SplitParams> = {};

    // Extract source variable (the df being split)
    const sourceMatch = code.match(/total_rows\s*=\s*len\((\w+)\)/);
    if (sourceMatch) {
      params.sourceVar = sourceMatch[1];
    }

    // Extract split percentages from size calculations
    const trainMatch = code.match(/train_size\s*=\s*int\(total_rows\s*\*\s*([\d.]+)\)/);
    if (trainMatch) {
      params.trainPercent = parseFloat(trainMatch[1]) * 100;
    }

    const valMatch = code.match(/validation_size\s*=\s*int\(total_rows\s*\*\s*([\d.]+)\)/);
    if (valMatch) {
      params.validationPercent = parseFloat(valMatch[1]) * 100;
      params.includeValidation = true;
    } else {
      params.validationPercent = 0;
      params.includeValidation = false;
    }

    const testMatch = code.match(/test_size\s*=\s*int\(total_rows\s*\*\s*([\d.]+)\)/);
    if (testMatch) {
      params.testPercent = parseFloat(testMatch[1]) * 100;
    }

    // Extract split order from the order of _df assignments
    const dfAssignments = code.match(/(\w+)_df\s*=/g);
    if (dfAssignments) {
      params.splitOrder = dfAssignments.map(m => m.match(/(\w+)_df/)![1]);
    }

    return params;
  } catch (error) {
    console.error('Failed to parse split code:', error);
    return null;
  }
}

/**
 * Helper: Format Python boolean value
 */
export function formatPythonBool(value: boolean): string {
  return value ? '0' : 'None';
}

/**
 * Helper: Parse Python boolean value
 */
export function parsePythonBool(value: string): boolean {
  return value === '0' || value === 'True' || value === 'true';
}

/**
 * Helper: Extract string argument value from Python code
 */
export function extractStringArg(code: string, argName: string): string | null {
  const match = code.match(new RegExp(`${argName}\\s*=\\s*["']([^"']*)["']`));
  return match ? match[1] : null;
}

/**
 * Helper: Extract boolean argument value from Python code
 */
export function extractBoolArg(code: string, argName: string): boolean | null {
  const match = code.match(new RegExp(`${argName}\\s*=\\s*(\\w+|None|\\d+)`));
  if (!match) return null;
  return parsePythonBool(match[1]);
}

