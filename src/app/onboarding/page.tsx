'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { questions } from './questions';

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const router = useRouter();

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      console.log('Submitted:', answers);
      router.push('/'); // Redirect to chat
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnswers({ ...answers, [questions[step].id]: e.target.value });
  };

  const current = questions[step];

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">{current.question}</h2>
        <input
          type="text"
          value={answers[current.id] || ''}
          onChange={handleChange}
          placeholder={current.placeholder}
          className="w-full p-3 rounded bg-gray-700 text-white focus:outline-none"
        />
        <button
          onClick={handleNext}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded"
        >
          {step === questions.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </main>
  );
}