import { useState } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GraphVisualization } from './components/GraphVisualization';
import { parseGradleDependencies } from './parser/gradleParser';
import type { ParsedGraph } from './types/dependency';

function App() {
  const [parsedData, setParsedData] = useState<ParsedGraph | null>(null);

  const handleParse = (text: string) => {
    try {
      const data = parseGradleDependencies(text);
      setParsedData(data);
    } catch (err) {
      console.error('Parse error:', err);
      alert('Failed to parse dependencies. Please check your input format.');
    }
  };

  const handleReset = () => {
    setParsedData(null);
  };

  return (
    <div className="App">
      {parsedData ? (
        <GraphVisualization data={parsedData} onReset={handleReset} />
      ) : (
        <WelcomeScreen onParse={handleParse} />
      )}
    </div>
  );
}

export default App;
