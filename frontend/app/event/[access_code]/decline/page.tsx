"use client";

import { getApiUrl } from '@/lib/api';
import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export default function DeclinePage() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const accessCode = params.access_code as string;
  const token = searchParams.get("token");
  // Start on an explicit confirmation step. The deletion is NEVER fired
  // automatically on page load: email security scanners and link-prefetchers
  // (Safe Links, Proton, antivirus) open every URL in an email, and an
  // auto-delete here would wipe pending registrations before the real
  // recipient ever clicks. The DELETE only runs on a real button click.
  const [status, setStatus] = useState<"confirm" | "deleting" | "success" | "error">(
    token ? "confirm" : "error"
  );

  const handleDecline = async () => {
    if (!token) { setStatus("error"); return; }
    setStatus("deleting");
    try {
      const res = await fetch(`${getApiUrl()}/invitations/decline?token=${encodeURIComponent(token)}`, { method: "DELETE" });
      if (res.ok) {
        localStorage.removeItem(`session_token_${accessCode}`);
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        {(status === "confirm" || status === "deleting") && (
          <>
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{t('declinePage.confirmTitle')}</h1>
            <p className="text-gray-600 mb-6">{t('declinePage.confirmMessage')}</p>
            <button
              onClick={handleDecline}
              disabled={status === "deleting"}
              className="w-full bg-red-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mb-3"
            >
              {status === "deleting" ? t('declinePage.deleting') : t('declinePage.confirmBtn')}
            </button>
            <Link href="/" className="block text-sm text-gray-500 hover:text-gray-700">
              {t('declinePage.cancelBtn')}
            </Link>
          </>
        )}
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
