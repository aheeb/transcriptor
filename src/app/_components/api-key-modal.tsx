"use client";

import { useState, useEffect } from 'react';
import { encryptData, decryptData } from '~/utils/encryption';

interface ApiKeyModalProps {
  onApiKeySubmit: (apiKey: string) => void;
}

export function ApiKeyModal({ onApiKeySubmit }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const encryptedKey = localStorage.getItem('encrypted_openai_api_key');
    if (encryptedKey) {
      const decryptedKey = decryptData(encryptedKey);
      if (decryptedKey) {
        onApiKeySubmit(decryptedKey);
        setIsVisible(false);
      }
    }
  }, [onApiKeySubmit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const encryptedKey = encryptData(apiKey);
    localStorage.setItem('encrypted_openai_api_key', encryptedKey);
    onApiKeySubmit(apiKey);
    setIsVisible(false);
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg max-w-md w-full">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Enter OpenAI API Key</h2>
        <p className="mb-4 text-sm sm:text-base text-gray-300">
          Please enter your OpenAI API key to use the caption generation feature.
          You can find your API key in your OpenAI dashboard.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={apiKey}
            onChange={handleKeyChange}
            placeholder="sk-..."
            className="w-full p-3 rounded bg-gray-700 text-white text-base"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded py-3 text-base hover:bg-blue-700"
          >
            Save API Key
          </button>
        </form>
      </div>
    </div>
  );
} 