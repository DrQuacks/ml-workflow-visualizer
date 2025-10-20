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
 * Returns complete params object with defaults for missing fields
 */
export function parseSplitCode(code: string, currentParams?: SplitParams): SplitParams | null {
  try {
    // Start with current params as defaults, or use defaults if not provided
    const params: SplitParams = currentParams ? { ...currentParams } : {
      sourceVar: 'df',
      trainPercent: 80,
      validationPercent: 0,
      testPercent: 20,
      includeValidation: false,
      splitOrder: ['train', 'test'],
    };

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
 * Returns complete params object with defaults for missing fields
 */
export function parseFeaturesTargetCode(code: string): FeaturesTargetParams | null {
  try {
    // Start with defaults
    const params: FeaturesTargetParams = {
      sourceVar: 'df',
      targetColumn: '',
      featureColumns: [],
      featuresVarName: 'X',
      targetVarName: 'y',
    };

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

export interface LinearRegressionParams {
  featuresVar: string;
  targetVar: string;
  modelVar: string;
  fitIntercept: boolean;
}

/**
 * Generate linear regression training code from parameters
 */
export function generateLinearRegressionCode(params: LinearRegressionParams): string {
  const { featuresVar, targetVar, modelVar, fitIntercept } = params;
  
  const lines = [
    'from sklearn.linear_model import LinearRegression',
    'from sklearn.metrics import r2_score',
    'import numpy as np',
    '',
    '# Train linear regression model',
    `${modelVar} = LinearRegression(fit_intercept=${fitIntercept ? 'True' : 'False'})`,
    `${modelVar}.fit(${featuresVar}, ${targetVar})`,
    '',
    '# Model coefficients and intercept',
    `coefficients = ${modelVar}.coef_`,
    `intercept = ${modelVar}.intercept_ if ${fitIntercept ? 'True' : 'False'} else 0`,
    '',
    '# Make predictions on training data',
    `predictions = ${modelVar}.predict(${featuresVar})`,
    '',
    '# Calculate R² score',
    `r2 = r2_score(${targetVar}, predictions)`
  ];
  
  return lines.join('\n');
}

/**
 * Parse linear regression code to extract parameters
 * Returns complete params object with defaults for missing fields
 */
export function parseLinearRegressionCode(code: string): LinearRegressionParams | null {
  try {
    // Start with defaults
    const params: LinearRegressionParams = {
      featuresVar: 'X',
      targetVar: 'y',
      modelVar: 'model',
      fitIntercept: true,
    };

    // Extract model variable name
    const modelMatch = code.match(/^(\w+)\s*=\s*LinearRegression\(/m);
    if (modelMatch) {
      params.modelVar = modelMatch[1];
    }

    // Extract fit_intercept parameter
    const fitInterceptMatch = code.match(/fit_intercept\s*=\s*(True|False)/);
    if (fitInterceptMatch) {
      params.fitIntercept = fitInterceptMatch[1] === 'True';
    }

    // Extract features variable from .fit() call
    const fitMatch = code.match(/\.fit\((\w+),\s*(\w+)\)/);
    if (fitMatch) {
      params.featuresVar = fitMatch[1];
      params.targetVar = fitMatch[2];
    }

    return params;
  } catch (error) {
    console.error('Failed to parse linear regression code:', error);
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

/**
 * Inspection parameters for data exploration
 */
export interface InspectionParams {
  sourceVar: string;
  showDescribe: boolean;
  showHead: boolean;
  showDtypes: boolean;
  headRows: number;
}

/**
 * Generate inspection code for viewing data details
 */
export function generateInspectionCode(params: InspectionParams): string {
  const { sourceVar, showDescribe, showHead, showDtypes, headRows } = params;
  const lines = ['import pandas as pd', ''];
  
  if (showDtypes) {
    lines.push('# Data types');
    lines.push(`dtypes = ${sourceVar}.dtypes`);
    lines.push('');
  }
  
  if (showHead) {
    lines.push('# First rows');
    lines.push(`head = ${sourceVar}.head(${headRows})`);
    lines.push('');
  }
  
  if (showDescribe) {
    lines.push('# Statistical summary');
    lines.push(`describe = ${sourceVar}.describe()`);
  }
  
  return lines.join('\n');
}

/**
 * Parse inspection code to extract parameters
 */
export function parseInspectionCode(code: string): InspectionParams | null {
  try {
    const params: InspectionParams = {
      sourceVar: 'df',
      showDescribe: false,
      showHead: false,
      showDtypes: false,
      headRows: 5,
    };

    // Check for dtypes
    const dtypesMatch = code.match(/dtypes\s*=\s*(\w+)\.dtypes/);
    if (dtypesMatch) {
      params.showDtypes = true;
      params.sourceVar = dtypesMatch[1];
    }

    // Check for head
    const headMatch = code.match(/head\s*=\s*(\w+)\.head\((\d+)\)/);
    if (headMatch) {
      params.showHead = true;
      params.sourceVar = headMatch[1];
      params.headRows = parseInt(headMatch[2]);
    }

    // Check for describe
    const describeMatch = code.match(/describe\s*=\s*(\w+)\.describe\(\)/);
    if (describeMatch) {
      params.showDescribe = true;
      params.sourceVar = describeMatch[1];
    }

    return params;
  } catch (error) {
    console.error('Failed to parse inspection code:', error);
    return null;
  }
}

/**
 * Clean data parameters
 */
export interface CleanDataParams {
  sourceVar: string;
  column: string;
  operation: 'dtype' | 'fill' | 'drop';
  targetDtype?: string;
  fillStrategy?: 'mean' | 'median' | 'mode' | 'ffill' | 'bfill' | 'constant';
  fillValue?: string;
  outputVar: string;
}

/**
 * Generate cleaning code based on operation
 */
export function generateCleanDataCode(params: CleanDataParams): string {
  const { sourceVar, column, operation, targetDtype, fillStrategy, fillValue, outputVar } = params;
  
  const lines = ['import pandas as pd', 'import numpy as np', ''];
  lines.push(`# Clean data: ${operation} on column '${column}'`);
  lines.push(`${outputVar} = ${sourceVar}.copy()`);
  lines.push('');
  
  if (operation === 'dtype' && targetDtype) {
    lines.push(`# Convert column '${column}' to ${targetDtype}`);
    lines.push(`${outputVar}['${column}'] = ${outputVar}['${column}'].astype('${targetDtype}')`);
  } else if (operation === 'fill' && fillStrategy) {
    lines.push(`# Fill missing values in '${column}' using ${fillStrategy}`);
    if (fillStrategy === 'mean') {
      lines.push(`${outputVar}['${column}'].fillna(${outputVar}['${column}'].mean(), inplace=True)`);
    } else if (fillStrategy === 'median') {
      lines.push(`${outputVar}['${column}'].fillna(${outputVar}['${column}'].median(), inplace=True)`);
    } else if (fillStrategy === 'mode') {
      lines.push(`${outputVar}['${column}'].fillna(${outputVar}['${column}'].mode()[0], inplace=True)`);
    } else if (fillStrategy === 'ffill') {
      lines.push(`${outputVar}['${column}'].fillna(method='ffill', inplace=True)`);
    } else if (fillStrategy === 'bfill') {
      lines.push(`${outputVar}['${column}'].fillna(method='bfill', inplace=True)`);
    } else if (fillStrategy === 'constant' && fillValue) {
      lines.push(`${outputVar}['${column}'].fillna(${fillValue}, inplace=True)`);
    }
  } else if (operation === 'drop') {
    lines.push(`# Drop rows with missing values in '${column}'`);
    lines.push(`${outputVar} = ${outputVar}.dropna(subset=['${column}'])`);
  }
  
  return lines.join('\n');
}

/**
 * Parse cleaning code to extract parameters
 */
export function parseCleanDataCode(code: string): CleanDataParams | null {
  try {
    const params: CleanDataParams = {
      sourceVar: 'df',
      column: '',
      operation: 'dtype',
      outputVar: 'df_clean',
    };

    // Extract output var
    const outputMatch = code.match(/^(\w+)\s*=\s*(\w+)\.copy\(\)/m);
    if (outputMatch) {
      params.outputVar = outputMatch[1];
      params.sourceVar = outputMatch[2];
    }

    // Check operation type
    if (code.includes('.astype(')) {
      params.operation = 'dtype';
      const dtypeMatch = code.match(/\['([^']+)'\]\.astype\('([^']+)'\)/);
      if (dtypeMatch) {
        params.column = dtypeMatch[1];
        params.targetDtype = dtypeMatch[2];
      }
    } else if (code.includes('.fillna(')) {
      params.operation = 'fill';
      const colMatch = code.match(/\['([^']+)'\]\.fillna\(/);
      if (colMatch) {
        params.column = colMatch[1];
      }
      
      if (code.includes('.mean()')) {
        params.fillStrategy = 'mean';
      } else if (code.includes('.median()')) {
        params.fillStrategy = 'median';
      } else if (code.includes('.mode()')) {
        params.fillStrategy = 'mode';
      } else if (code.includes("method='ffill'")) {
        params.fillStrategy = 'ffill';
      } else if (code.includes("method='bfill'")) {
        params.fillStrategy = 'bfill';
      }
    } else if (code.includes('.dropna(')) {
      params.operation = 'drop';
      const dropMatch = code.match(/\.dropna\(subset=\['([^']+)'\]\)/);
      if (dropMatch) {
        params.column = dropMatch[1];
      }
    }

    return params;
  } catch (error) {
    console.error('Failed to parse clean data code:', error);
    return null;
  }
}
