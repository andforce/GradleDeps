import React, { useState, useCallback } from 'react';

interface WelcomeScreenProps {
  onParse: (text: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onParse }) => {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onParse(content);
    };
    reader.readAsText(file);
  }, [onParse]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (text.trim()) {
      onParse(text);
    }
  }, [text, onParse]);

  const sampleText = `+--- androidx.core:core-ktx:1.9.0
|    +--- androidx.annotation:annotation:1.3.0
|    |    \\--- org.jetbrains.kotlin:kotlin-stdlib:1.7.10
|    \\--- androidx.core:core:1.9.0
+--- com.google.android.material:material:1.8.0
|    +--- androidx.core:core:1.6.0 -> 1.9.0
|    \\--- androidx.annotation:annotation:1.2.0 -> 1.3.0
\\--- org.jetbrains.kotlin:kotlin-stdlib:1.8.0`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full">
        <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
          Gradle Dependency Visualizer
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Visualize your Android project dependencies as an interactive graph
        </p>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            How to use:
          </h2>
          <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-6">
            <li>Run in your Android project:</li>
            <code className="block bg-gray-100 p-3 rounded text-sm font-mono text-gray-800">
              ./gradlew :app:dependencies &gt; deps.txt
            </code>
            <li>Upload the file or paste the content below</li>
          </ol>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
            `}
          >
            <p className="text-gray-600 mb-2">
              Drop file here or click to upload
            </p>
            <input
              type="file"
              accept=".txt,.gradle"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
            >
              Choose File
            </label>
          </div>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Or paste gradle dependencies output here..."
              className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setText(sampleText)}
              className="absolute bottom-4 right-4 text-xs text-blue-500 hover:text-blue-600"
            >
              Load sample
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="w-full py-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Generate Dependency Graph
        </button>
      </div>
    </div>
  );
};
