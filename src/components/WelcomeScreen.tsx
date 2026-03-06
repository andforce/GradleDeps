import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Terminal, Play } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-transparent">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-3xl w-full"
      >
        <h1 className="text-4xl font-bold text-slate-800 mb-3 text-center tracking-tight">
          Gradle Dependency Visualizer
        </h1>
        <p className="text-slate-500 text-center mb-10 text-lg">
          Visualize your Android project dependencies as an interactive graph
        </p>

        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Terminal className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-700">
              How to use
            </h2>
          </div>
          <ol className="list-decimal list-inside text-slate-600 space-y-3 mb-8 ml-2">
            <li>Run in your Android project:</li>
            <code className="block bg-slate-900/5 backdrop-blur-sm p-4 rounded-xl text-sm font-mono text-slate-700 border border-slate-200/50 mt-2">
              ./gradlew :app:dependencies &gt; deps.txt
            </code>
            <li className="pt-2">Upload the file or paste the content below</li>
          </ol>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative overflow-hidden border-2 border-dashed rounded-xl p-10 text-center mb-6 transition-all duration-300 ease-out
              ${isDragging ? 'border-blue-400 bg-blue-50/50 scale-[1.02]' : 'border-slate-300 bg-slate-50/30 hover:bg-slate-50/50 hover:scale-[1.01] hover:border-blue-300'}
            `}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`p-3 rounded-full transition-colors ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-slate-600 font-medium">
                Drop file here or click to upload
              </p>
            </div>
            <input
              type="file"
              accept=".txt,.gradle"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="file-upload"
            />
          </div>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Or paste gradle dependencies output here..."
              className="w-full h-64 p-5 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all outline-none"
            />
            <button
              onClick={() => setText(sampleText)}
              className="absolute bottom-4 right-4 text-sm px-3 py-1.5 rounded-md bg-slate-100/80 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors backdrop-blur-md font-medium"
            >
              Load sample
            </button>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="group w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 group-disabled:opacity-50" />
          Generate Dependency Graph
        </motion.button>
      </motion.div>
    </div>
  );
};
