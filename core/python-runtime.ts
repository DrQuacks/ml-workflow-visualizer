type PyodideInterface = any;

let pyodideInstance: PyodideInterface | null = null;
let isInitializing = false;
let initPromise: Promise<PyodideInterface> | null = null;

// Load Pyodide script from CDN
function loadPyodideScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Pyodide can only be loaded in browser'));
      return;
    }

    // Check if already loaded
    if ((window as any).loadPyodide) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Pyodide script'));
    document.head.appendChild(script);
  });
}

export async function initPyodide(): Promise<PyodideInterface> {
  // If already initialized, return the instance
  if (pyodideInstance) {
    return pyodideInstance;
  }

  // If currently initializing, wait for that to complete
  if (isInitializing && initPromise) {
    return initPromise;
  }

  // Start initialization
  isInitializing = true;
  initPromise = (async () => {
    try {
      console.log('[Pyodide] Loading script from CDN...');
      
      // Load Pyodide script from CDN
      await loadPyodideScript();
      
      console.log('[Pyodide] Initializing...');
      const pyodide = await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
      });

      console.log('[Pyodide] Loading packages: pandas, numpy...');
      await pyodide.loadPackage(['pandas', 'numpy']);
      
      pyodideInstance = pyodide;
      console.log('[Pyodide] Ready!');
      return pyodide;
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      throw new Error(`Failed to initialize Pyodide: ${error}`);
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

export function isPyodideLoading(): boolean {
  return isInitializing;
}

export function isPyodideReady(): boolean {
  return pyodideInstance !== null;
}

interface ExecuteCodeOptions {
  code: string;
  csvData?: string;
  filename?: string;
}

export async function executeCode(options: ExecuteCodeOptions): Promise<any> {
  const { code, csvData, filename = 'data.csv' } = options;
  
  const pyodide = await initPyodide();

  try {
    // If CSV data is provided, write it to Pyodide's virtual filesystem
    if (csvData && filename) {
      // Write the CSV file to Pyodide's filesystem so pd.read_csv() works
      pyodide.FS.writeFile(filename, csvData);
      console.log(`[Pyodide] Wrote ${csvData.length} bytes to ${filename}`);
    }

    // Parse code to find variable assignments before execution
    // This allows us to only show variables that were assigned in this code
    const parseAssignments = (code: string): string[] => {
      // Regex to match variable assignments: "variable_name = ..."
      // Matches start of line (with optional whitespace), valid Python identifier, then =
      const assignmentRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gm;
      const assignments = new Set<string>();
      let match;
      
      while ((match = assignmentRegex.exec(code)) !== null) {
        assignments.add(match[1]);
      }
      
      return Array.from(assignments);
    };

    console.log('[Pyodide] Code to execute:', code);
    const assignedVars = parseAssignments(code);
    console.log('[Pyodide] Variables assigned in code:', assignedVars);

    // Execute the user's code - pd.read_csv() will now work!
    await pyodide.runPythonAsync(code);

    // Extract dataframes from Python namespace, filtered by assignments
    const extractionCode = `
import json
import pandas as pd
import numpy as np

# Variables that were assigned in the user's code
_assigned_vars = ${JSON.stringify(assignedVars)}

_results = {}
_namespace = globals().copy()

print(f"[Debug] Looking for variables: {_assigned_vars}")
print(f"[Debug] Available in namespace: {list(_namespace.keys())}")

for _key in _assigned_vars:
    if _key in _namespace:
        _value = _namespace[_key]
        print(f"[Debug] Checking {_key}, type: {type(_value)}")
        
        # Only process DataFrames
        if isinstance(_value, pd.DataFrame):
            print(f"[Debug] {_key} is a DataFrame with shape {_value.shape}")
            # Convert DataFrame to dict with 'split' orientation for easier JS consumption
            # Replace NaN with None (converts to null in JSON)
            _df_clean = _value.head(100).replace({np.nan: None})
            _df_dict = _df_clean.to_dict('split')
            _results[_key] = {
                'type': 'dataframe',
                'columns': _df_dict['columns'],
                'data': _df_dict['data'],
                'shape': list(_value.shape)
            }
        else:
            print(f"[Debug] {_key} is not a DataFrame")
    else:
        print(f"[Debug] {_key} not found in namespace")

print(f"[Debug] Final results: {list(_results.keys())}")
json.dumps(_results)
`;

    const resultsJson = await pyodide.runPythonAsync(extractionCode);
    const results = JSON.parse(resultsJson);
    
    return results;
  } catch (error: any) {
    // Format Python error for display
    const errorMessage = error.message || String(error);
    throw new Error(errorMessage);
  }
}

export function resetPyodide() {
  pyodideInstance = null;
  isInitializing = false;
  initPromise = null;
}

