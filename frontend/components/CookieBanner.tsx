"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function CookieBanner() {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted the banner
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie_consent", "true");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 transform translate-y-0 transition-transform duration-300">
      <div className="max-w-4xl mx-auto bg-gray-900 border border-gray-700 shadow-2xl rounded-2xl flex flex-col sm:flex-row items-center justify-between p-4 gap-4 text-white">
        <div className="flex-1 text-sm text-gray-300">
          <strong>{t('cookieBanner.strongPrefix')}</strong> {t('cookieBanner.message')} 
          <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline ml-2">{t('cookieBanner.privacyLink')}</Link>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={acceptCookies}
            className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-medium transition-colors"
          >
            {t('cookieBanner.acceptBtn')}
          </button>
          <button 
            onClick={() => setShowBanner(false)}
            className="p-2 text-gray-400 hover:bg-gray-800 rounded-xl transition-colors sm:hidden"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
