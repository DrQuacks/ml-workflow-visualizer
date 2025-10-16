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

    // Execute the user's code - pd.read_csv() will now work!
    await pyodide.runPythonAsync(code);

    // Extract dataframes from Python namespace
    const extractionCode = `
import json
import pandas as pd
import numpy as np

_results = {}
_namespace = globals().copy()

# Check if this is a split operation (has train_df, test_df, etc.)
_is_split = any(k.endswith('_df') and k != 'df' for k in _namespace.keys())

for _key, _value in _namespace.items():
    # Skip private variables (starting with _)
    if _key.startswith('_'):
        continue
    
    if isinstance(_value, pd.DataFrame):
        # If this is a split operation, only show split results (not the source df)
        if _is_split and _key == 'df':
            continue
            
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

