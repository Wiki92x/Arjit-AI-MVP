// src/app/onboarding/claude/page.tsx

'use client';

import { useState } from 'react';

const questions = [
  'What’s your name?',
  'What’s your profession or field of interest?',
  'What do you want help with today?',
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const handleNext = () => {
    if (!input.trim()) return;

    const updated = [...answers];
    updated[step] = input;
    setAnswers(updated);
    setInput('');

    if (step + 1 < questions.length) {
      setStep(step + 1);
    } else {
      console.log('Submitted:', updated); // Or route to chat screen
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold mb-8 text-center">Let’s get to know you</h1>
      <div className="w-full max-w-xl bg-gray-800 rounded-xl p-6 space-y-4 shadow-lg">
        <p className="text-lg">{questions[step]}</p>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNext()}
          className="w-full p-3 rounded bg-gray-700 text-white outline-none"
          placeholder="Type your answer..."
        />
        <button
          onClick={handleNext}
          className="px-6 py-3 rounded bg-blue-600 hover:bg-blue-700 font-semibold"
        >
          {step + 1 < questions.length ? 'Next' : 'Start Chat'}
        </button>
      </div>
    </main>
  );
}