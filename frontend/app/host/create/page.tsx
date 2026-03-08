"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function CreateEvent() {
  const router = useRouter();
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [passcode, setPasscode] = useState("");
  const [hostEmail, setHostEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/events/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          description, 
          location: location || null,
          passcode, 
          host_email: hostEmail || null,
          start_date: startDate ? new Date(startDate).toISOString() : null,
          end_date: endDate ? new Date(endDate).toISOString() : null
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create event");
      }

      const event = await res.json();
      // Navigate to host dashboard with admin code
      router.push(`/host/${event.access_code}?token=${event.admin_code}`);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-8 font-medium">
          <ArrowLeft size={20} className="mr-2" />
          {t('createEvent.backToHome')}
        </Link>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100">
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('createEvent.formTitle')}</h1>
            <p className="text-gray-500">{t('createEvent.formSubtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">{t('createEvent.eventTitleLabel')}</label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder={t('createEvent.eventTitlePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">{t('createEvent.descriptionLabel')}</label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder={t('createEvent.descriptionPlaceholder')}
              ></textarea>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">{t('createEvent.locationLabel')}</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder={t('createEvent.locationPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="passcode" className="block text-sm font-medium text-gray-700 mb-2">{t('createEvent.passcodeLabel')}</label>
              <p className="text-sm text-gray-500 mb-2">{t('createEvent.passcodeDesc')}</p>
              <input
                id="passcode"
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder={t('createEvent.passcodePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="hostEmail" className="block text-sm font-medium text-gray-700 mb-2">{t('createEvent.hostEmailLabel')}</label>
              <p className="text-sm text-gray-500 mb-2">{t('createEvent.hostEmailDesc')}</p>
              <input
                id="hostEmail"
                type="email"
                value={hostEmail}
                onChange={(e) => setHostEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder={t('createEvent.hostEmailPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">{t('createEvent.startDateLabel')}</label>
                <input
                  id="startDate"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">{t('createEvent.endDateLabel')}</label>
                <input
                  id="endDate"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  name="consent" 
                  id="consent" 
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm border-gray-100text-left">
                  {t('createEvent.consentCheckbox')}<Link href="/privacy" className="text-indigo-600 hover:text-indigo-500 hover:underline">{t('createEvent.privacyPolicy')}</Link>{t('createEvent.consentSuffix')}
                </span>
              </label>
            </div>
            
            <p className="text-sm text-gray-500 -mt-2">{t('createEvent.retentionNote')}</p>

            <button
              type="submit"
              disabled={loading || !consent}
              className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transform transition-all 
                ${(!loading && consent) ? 'bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 hover:-translate-y-1' : 'bg-gray-400 cursor-not-allowed'}`}
            >
              {loading ? t('createEvent.submittingButton') : t('createEvent.submitButton')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
