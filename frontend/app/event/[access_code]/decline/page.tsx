"use client";

import { getApiUrl } from '@/lib/api';
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export default function DeclinePage() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const accessCode = params.access_code as string;
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    fetch(`${getApiUrl()}/invitations/decline?token=${encodeURIComponent(token)}`, { method: "DELETE" })
      .then(r => {
        if (r.ok) {
          // Clear any local session for this event
          localStorage.removeItem(`session_token_${accessCode}`);
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token, accessCode]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        {status === "loading" && <p className="text-gray-500">{t('declinePage.loading')}</p>}
        {status === "success" && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t('declinePage.successTitle')}</h1>
            <p className="text-gray-600 mb-6">{t('declinePage.successMessage')}</p>
            <Link href="/" className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
              {t('declinePage.homeBtn')}
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✕</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t('declinePage.errorTitle')}</h1>
            <p className="text-gray-600 mb-6">{t('declinePage.errorMessage')}</p>
            <Link href="/" className="bg-gray-800 text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors">
              {t('declinePage.homeBtn')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
