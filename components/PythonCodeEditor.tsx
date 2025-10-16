'use client';

import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

interface PythonCodeEditorProps {
  code: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
}

export default function PythonCodeEditor({
  code,
  onChange,
  readOnly = false,
  height = '300px',
}: PythonCodeEditorProps) {
  return (
    <CodeMirror
      value={code}
      height={height}
      extensions={[python()]}
      theme={vscodeDark}
      onChange={onChange}
      editable={!readOnly}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightActiveLine: true,
        foldGutter: true,
      }}
    />
  );
}

