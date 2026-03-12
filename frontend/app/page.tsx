"use client";

import { useTranslation } from "@/hooks/useTranslation";
import Link from 'next/link';
import { Calendar, Users } from 'lucide-react';
import Logo from '@/components/Logo';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.trim()) {
      router.push(`/event/${accessCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex flex-col font-sans">
      <nav className="container mx-auto px-6 py-5">
        <Logo className="text-xl text-indigo-600 hover:text-indigo-800" />
      </nav>
      <main className="flex-grow container mx-auto px-6 pb-16 flex flex-col items-center justify-center text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-indigo-900 mb-6 tracking-tight">
          {t('landing.heroTitle')} <span className="text-blue-600">{t('landing.heroHighlight')}</span>
        </h1>
        <p className="text-xl text-gray-700 mb-12 max-w-2xl">
          {t('landing.heroSubtitle')}
        </p>

        <div className="flex flex-col gap-6 mb-20 w-full max-w-sm justify-center mx-auto">
          <Link href="/host/create" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 text-center">
            {t('landing.createEventBtn')}
          </Link>
          <form onSubmit={handleJoin} className="bg-white border-2 border-indigo-200 rounded-full flex overflow-hidden shadow-lg pl-2">
            <input 
              type="text" 
              placeholder={t('landing.eventCodePlaceholder')}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="px-4 py-4 w-full outline-none text-gray-700 font-medium bg-transparent uppercase"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-4 transition-colors">
              {t('landing.joinBtn')}
            </button>
          </form>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl w-full text-left">
          <div className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-md border border-white">
            <div className="bg-purple-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
              <Users size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{t('landing.features.network.title')}</h3>
            <p className="text-gray-600 leading-relaxed">{t('landing.features.network.desc')}</p>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-md border border-white">
            <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
              <Calendar size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{t('landing.features.time.title')}</h3>
            <p className="text-gray-600 leading-relaxed">{t('landing.features.time.desc')}</p>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-2xl p-8 shadow-md border border-white">
            <div className="bg-green-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{t('landing.features.secure.title')}</h3>
            <p className="text-gray-600 leading-relaxed">{t('landing.features.secure.desc')}</p>
          </div>
        </div>
      </main>

      <footer className="bg-white py-8 border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 mb-4 md:mb-0">{t('landing.footer.copyright')}</p>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-gray-500 hover:text-indigo-600 transition-colors">{t('landing.footer.privacy')}</Link>
            <a href="#" className="text-gray-500 hover:text-indigo-600 transition-colors">{t('landing.footer.hostGuidelines')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
