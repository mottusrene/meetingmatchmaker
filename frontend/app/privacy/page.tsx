import React from 'react';
import ReactMarkdown from 'react-markdown';
import fs from 'fs';
import path from 'path';
import enTranslations from '@/content/en.json';

export default function PrivacyPolicyPage() {
  const filePath = path.join(process.cwd(), 'content', 'privacy-policy.md');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  return (
    <div className="max-w-3xl mx-auto py-12 px-6 bg-white min-h-screen">
      <div className="prose prose-blue prose-lg">
        <ReactMarkdown>{fileContent}</ReactMarkdown>
      </div>
      <div className="mt-8 pt-8 border-t border-gray-200">
        <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">
          {enTranslations.privacyPage.backToHome}
        </a>
      </div>
    </div>
  );
}
