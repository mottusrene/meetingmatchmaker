"use client";

import { getApiUrl, parseDate, copyToClipboard } from '@/lib/api';

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function EventAccess() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const accessCode = params.access_code as string;
  const urlToken = searchParams.get("token");
  
  const [event, setEvent] = useState<any>(null);
  const [timeslots, setTimeslots] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [linkedin_url, setLinkedin] = useState("");
  const [consent, setConsent] = useState(false);
  const [bio, setBio] = useState("");
  const [profileLink, setProfileLink] = useState("");
  const [availableTimeslots, setAvailableTimeslots] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if coming from a magic link
    if (urlToken) {
      localStorage.setItem(`session_token_${accessCode}`, urlToken);
      router.push(`/event/${accessCode}/dashboard`);
    }

    // Check if already logged in for this event
    const savedToken = localStorage.getItem(`session_token_${accessCode}`);
    if (savedToken && !urlToken) {
      router.push(`/event/${accessCode}/dashboard`);
    }

    fetch(`${getApiUrl()}/events/${accessCode}`)
      .then(res => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then(data => setEvent(data))
      .catch(err => setError(err.message));

    fetch(`${getApiUrl()}/events/${accessCode}/timeslots/`)
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => setTimeslots(data));
  }, [accessCode, urlToken, router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${getApiUrl()}/events/${accessCode}/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          email, 
          company, 
          bio, 
          profile_link: profileLink, 
          is_host: false,
          available_timeslot_ids: availableTimeslots 
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.detail && data.detail.includes("Email already registered")) {
          throw new Error(t('eventJoin.alreadyRegisteredError'));
        }
        throw new Error(data.detail || t('eventJoin.registrationFailedError'));
      }
      
      // Successfully registered. Save token to local storage and proceed.
      localStorage.setItem(`session_token_${accessCode}`, data.session_token);
      router.push(`/event/${accessCode}/dashboard`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{t('eventJoin.errorTitle')}</h1>
        <p className="text-gray-600 mb-8">{t('eventJoin.errorDesc', { accessCode })}</p>
        <Link href="/" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700">
          {t('eventJoin.goHomeBtn')}
        </Link>
      </div>
    );
  }

  if (!event) return <div className="p-12 text-center">{t('eventJoin.loading')}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-8 font-medium">
          <ArrowLeft size={20} className="mr-2" />
          {t('eventJoin.backToHome')}
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 px-8 py-6 text-white text-center flex flex-col items-center justify-center">
            {event.logo_url && (
              <img src={event.logo_url} alt="Event Logo" className="w-20 h-20 rounded-xl object-contain bg-white/10 p-2 mb-4" />
            )}
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2 mb-3 text-sm text-blue-200 font-medium">
              {event.start_date && event.end_date && (
                <span className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {
                  (() => {
                    const s = parseDate(event.start_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                    const e = parseDate(event.end_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                    return s === e ? s : `${s} - ${e}`;
                  })()
                }</span>
              )}
              {event.location && (
                <span className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> {event.location}</span>
              )}
            </div>
            <p className="text-blue-100 text-sm max-w-sm mx-auto">{event.description}</p>
          </div>

          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              {t('eventJoin.formTitle')}
            </h2>

            <form onSubmit={handleJoin} className="space-y-5">
              {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('eventJoin.emailLabel')}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('eventJoin.emailPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('eventJoin.nameLabel')}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('eventJoin.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('eventJoin.companyLabel')}</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('eventJoin.companyPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('eventJoin.profileLinkLabel')}</label>
                <input
                  type="url"
                  value={profileLink}
                  onChange={(e) => setProfileLink(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('eventJoin.profileLinkPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('eventJoin.bioLabel')}</label>
                <textarea
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('eventJoin.bioPlaceholder')}
                  rows={3}
                />
              </div>
              
              {timeslots.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-800 mb-3">{t('eventJoin.timeslotsLabel')}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2">
                    {timeslots.map((slot) => {
                      const dateObj = parseDate(slot.start_time);
                      const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                      const timeStr = `${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${parseDate(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                      const isSelected = availableTimeslots.includes(slot.id);
                      return (
                        <label 
                          key={slot.id} 
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setAvailableTimeslots([...availableTimeslots, slot.id]);
                              else setAvailableTimeslots(availableTimeslots.filter(id => id !== slot.id));
                            }}
                          />
                          <span className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">{dateStr}</span>
                          <span className="text-sm font-medium text-center">{timeStr}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-blue-100">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    name="consent" 
                    id="consent" 
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm border-gray-100 text-left text-gray-600">
                    {t('eventJoin.consentCheckbox')}<Link href="/privacy" className="text-blue-600 hover:text-blue-500 hover:underline">{t('eventJoin.privacyPolicy')}</Link>{t('eventJoin.consentSuffix')}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !consent}
                className={`w-full font-bold py-4 px-6 rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 mt-2
                  ${loading || !consent ? "bg-gray-400 cursor-not-allowed text-white" : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"}`}
              >
                {loading ? t('eventJoin.processingBtn') : t('eventJoin.submitBtn')}
              </button>
              <div className="text-center mt-4">
                 <p className="text-xs text-gray-500 italic">{t('eventJoin.loginHint')}</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
