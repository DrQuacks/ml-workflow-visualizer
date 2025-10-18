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
  sourceVar: string;
  trainPercent: number;
  validationPercent: number;
  testPercent: number;
  includeValidation: boolean;
  splitOrder: string[];
}

/**
 * Generate split Python code from parameters
 */
export function generateSplitCode(params: SplitParams): string {
  const { sourceVar, trainPercent, validationPercent, testPercent, includeValidation, splitOrder } = params;
  
  const lines = ['import pandas as pd', ''];
  
  // Get the total rows
  lines.push(`# Split ${sourceVar} into train/test sets`);
  lines.push(`total_rows = len(${sourceVar})`);
  lines.push('');
  
  const splits = includeValidation ? ['train', 'validation', 'test'] : ['train', 'test'];
  const percents: Record<string, number> = {
    train: trainPercent,
    validation: validationPercent,
    test: testPercent,
  };
  
  const order = splitOrder.filter(s => splits.includes(s));
  
  // Generate split sizes
  lines.push('# Calculate split sizes');
  order.forEach((splitName, idx) => {
    if (idx < order.length - 1) {
      const percent = percents[splitName];
      lines.push(`${splitName}_size = int(total_rows * ${(percent / 100).toFixed(2)})`);
    }
  });
  lines.push('');
  
  // Generate split indices
  lines.push('# Calculate split indices');
  order.forEach((splitName, idx) => {
    if (idx === 0) {
      lines.push(`${splitName}_end = ${splitName}_size`);
    } else if (idx < order.length - 1) {
      const prevSplit = order[idx - 1];
      lines.push(`${splitName}_end = ${prevSplit}_end + ${splitName}_size`);
    }
  });
  lines.push('');
  
  // Generate dataframe splits
  lines.push('# Create split dataframes');
  order.forEach((splitName, idx) => {
    if (idx === 0) {
      lines.push(`${splitName}_df = ${sourceVar}.iloc[0:${splitName}_end]`);
    } else if (idx === order.length - 1) {
      const prevSplit = order[idx - 1];
      lines.push(`${splitName}_df = ${sourceVar}.iloc[${prevSplit}_end:]`);
    } else {
      const prevSplit = order[idx - 1];
      lines.push(`${splitName}_df = ${sourceVar}.iloc[${prevSplit}_end:${splitName}_end]`);
    }
  });
  
  return lines.join('\n');
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
      params.trainPercent = Math.round(parseFloat(trainMatch[1]) * 100);
    }

    const valMatch = code.match(/validation_size\s*=\s*int\(total_rows\s*\*\s*([\d.]+)\)/);
    if (valMatch) {
      params.validationPercent = Math.round(parseFloat(valMatch[1]) * 100);
      params.includeValidation = true;
    } else {
      params.validationPercent = 0;
      params.includeValidation = false;
    }

    const testMatch = code.match(/test_size\s*=\s*int\(total_rows\s*\*\s*([\d.]+)\)/);
    if (testMatch) {
      params.testPercent = Math.round(parseFloat(testMatch[1]) * 100);
    }

    // Extract split order from the order of _df assignments
    const dfAssignments = [...code.matchAll(/(\w+)_df\s*=/g)];
    if (dfAssignments.length > 0) {
      params.splitOrder = dfAssignments.map(m => m[1]);
    }

    return params;
  } catch (error) {
    console.error('Failed to parse split code:', error);
    return null;
  }
}

export interface FeaturesTargetParams {
  sourceVar: string;
  targetColumn: string;
  featureColumns: string[];
  featuresVarName: string;
  targetVarName: string;
}

/**
 * Generate features/target split Python code from parameters
 */
export function generateFeaturesTargetCode(params: FeaturesTargetParams): string {
  const { sourceVar, targetColumn, featureColumns, featuresVarName, targetVarName } = params;
  
  const lines = ['import pandas as pd', ''];
  
  lines.push(`# Split ${sourceVar} into features and target`);
  
  if (featureColumns.length > 0) {
    const featureList = featureColumns.map(c => `'${c}'`).join(', ');
    lines.push(`feature_cols = [${featureList}]`);
    lines.push(`${featuresVarName} = ${sourceVar}[feature_cols]`);
  } else {
    lines.push(`${featuresVarName} = ${sourceVar}[[]]  # No features selected`);
  }
  
  if (targetColumn) {
    // Single brackets to return Series (standard for target variable)
    lines.push(`${targetVarName} = ${sourceVar}['${targetColumn}']`);
  }
  
  return lines.join('\n');
}

/**
 * Parse features/target code to extract parameters
 */
export function parseFeaturesTargetCode(code: string): Partial<FeaturesTargetParams> | null {
  try {
    const params: Partial<FeaturesTargetParams> = {};

    // Extract source variable from feature assignment
    const sourceMatch = code.match(/=\s*(\w+)\[/);
    if (sourceMatch) {
      params.sourceVar = sourceMatch[1];
    }

    // Extract feature columns from list
    const featureMatch = code.match(/feature_cols\s*=\s*\[(.*?)\]/s);
    if (featureMatch) {
      const colsStr = featureMatch[1];
      const cols = [...colsStr.matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
      params.featureColumns = cols;
    }

    // Extract features variable name
    const featuresVarMatch = code.match(/^(\w+)\s*=\s*\w+\[feature_cols\]/m);
    if (featuresVarMatch) {
      params.featuresVarName = featuresVarMatch[1];
    }

    // Extract target column and variable name (single brackets for Series)
    const targetMatch = code.match(/^(\w+)\s*=\s*\w+\[['"]([^'"]+)['"]\]/m);
    if (targetMatch) {
      params.targetVarName = targetMatch[1];
      params.targetColumn = targetMatch[2];
    }

    return params;
  } catch (error) {
    console.error('Failed to parse features/target code:', error);
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

