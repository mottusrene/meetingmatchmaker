"use client";

import { getApiUrl } from '@/lib/api';

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Clock, Copy, Users, CheckCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function HostDashboard() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const accessCode = params.access_code as string;
  const passcode = searchParams.get("passcode");

  const [event, setEvent] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [timeslots, setTimeslots] = useState<any[]>([]);
  
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editEventStatus, setEditEventStatus] = useState("");
  
  const [newLocation, setNewLocation] = useState("");
  const [newCapacity, setNewCapacity] = useState("1");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newSlotDuration, setNewSlotDuration] = useState("15");
  const [copied, setCopied] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState("");
  const [attendeeCount, setAttendeeCount] = useState(0);

  const [attendees, setAttendees] = useState<any[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [suspendModal, setSuspendModal] = useState<{ user: any; action: "suspend" | "unsuspend" } | null>(null);
  const [suspendStatus, setSuspendStatus] = useState("");

  useEffect(() => {
    fetchEventAndUsers();
    fetchLocations();
    fetchTimeslots();
  }, [accessCode]);

  const fetchEventAndUsers = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/events/${accessCode}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        
        // Also fetch users to check for attendee count
        try {
          const uRes = await fetch(`${getApiUrl()}/users/`);
          if (uRes.ok) {
            const allUsers = await uRes.json();
            const attendees = allUsers.filter((u: any) => u.event_id === data.id && !u.is_host);
            setAttendeeCount(attendees.length);
            setAttendees(attendees);
          }
        } catch (e) {
          console.error(e);
        }

        setEditTitle(data.title || "");
        setEditDescription(data.description || "");
        setEditLocation(data.location || "");
        setEditLogoUrl(data.logo_url || "");
        // Format date correctly for the input type="date" (YYYY-MM-DD)
        if (data.start_date) {
            const dateObj = new Date(data.start_date);
            setEditStartDate(new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
        }
        if (data.end_date) {
            const dateObj = new Date(data.end_date);
            setEditEndDate(new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLocations = async () => {
    const res = await fetch(`${getApiUrl()}/events/${accessCode}/locations/`);
    if (res.ok) setLocations(await res.json());
  };

  const fetchTimeslots = async () => {
    const res = await fetch(`${getApiUrl()}/events/${accessCode}/timeslots/`);
    if (res.ok) setTimeslots(await res.json());
  };

  const removeTimeslot = async (id: number) => {
    const res = await fetch(`${getApiUrl()}/events/${accessCode}/timeslots/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      fetchTimeslots();
    }
  };

  const addLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation) return;
    const res = await fetch(`${getApiUrl()}/events/${accessCode}/locations/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLocation, capacity: parseInt(newCapacity) || 1 }),
    });
    if (res.ok) {
      setNewLocation("");
      setNewCapacity("1");
      fetchLocations();
    }
  };

  const removeLocation = async (id: number) => {
    const res = await fetch(`${getApiUrl()}/events/${accessCode}/locations/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      fetchLocations();
    }
  };

  const addTimeslot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStartTime || !newEndTime) return;
    
    const start = new Date(newStartTime);
    const [hours, minutes] = newEndTime.split(':');
    const end = new Date(start);
    end.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    if (end <= start) {
        alert("End time must be after start time.");
        return;
    }

    if (event.start_date && event.end_date) {
        const eventStart = new Date(event.start_date);
        eventStart.setHours(0, 0, 0, 0);
        const eventEnd = new Date(event.end_date);
        eventEnd.setHours(23, 59, 59, 999);

        if (start < eventStart || end > eventEnd) {
            alert(`Timeslots must be within event dates: ${eventStart.toLocaleDateString()} - ${eventEnd.toLocaleDateString()}`);
            return;
        }
    }

    const durationMs = parseInt(newSlotDuration) * 60000;
    
    if (durationMs <= 0) {
        alert("Duration must be a positive number.");
        return;
    }
    
    const requests = [];
    let current = start.getTime();
    while (current + durationMs <= end.getTime()) {
        const slotEnd = current + durationMs;
        requests.push(
            fetch(`${getApiUrl()}/events/${accessCode}/timeslots/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ start_time: new Date(current).toISOString(), end_time: new Date(slotEnd).toISOString() }),
            })
        );
        current = slotEnd;
    }
    
    await Promise.all(requests);
    setNewStartTime("");
    setNewEndTime("");
    setNewSlotDuration("15");
    fetchTimeslots();
  };

  const copyLink = () => {
    const url = `${window.location.origin}/event/${accessCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAdminLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedAdmin(true);
    setTimeout(() => setCopiedAdmin(false), 2000);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditEventStatus("Updating...");
    
    // Passcode validation check before issuing PUT.
    // In our backend, we pass the raw admin_code in `authorization` header
    // But since the frontend URL token param *is* the admin code, we use it directly.
    const urlAdminCode = searchParams.get("token") || passcode;

    const res = await fetch(`${getApiUrl()}/events/${accessCode}`, {
        method: "PUT",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": urlAdminCode || ""
        },
        body: JSON.stringify({
            title: editTitle,
            description: editDescription,
            location: editLocation || null,
            logo_url: editLogoUrl,
            start_date: editStartDate ? new Date(editStartDate).toISOString() : null,
            end_date: editEndDate ? new Date(editEndDate).toISOString() : null
        })
    });
    
    if (res.ok) {
        setEditEventStatus("Event updated successfully!");
        fetchEventAndUsers();
        setTimeout(() => setIsEditingEvent(false), 1500);
    } else {
        setEditEventStatus("Error: Not authorized or invalid admin link.");
    }
  };

  const handleDeleteEvent = async () => {
    setDeleteStatus("Deleting event...");
    const urlAdminCode = searchParams.get("token") || passcode;

    const res = await fetch(`${getApiUrl()}/events/${accessCode}`, {
        method: "DELETE",
        headers: { 
            "Authorization": urlAdminCode || ""
        }
    });
    
    if (res.ok) {
        setDeleteStatus("Event deleted successfully. Redirecting...");
        setTimeout(() => {
            window.location.href = "/"; // Redirect to home page
        }, 1500);
    } else {
        setDeleteStatus("Error: Failed to delete. Not authorized or valid admin link required.");
    }
  };

  const handleSuspendAction = async () => {
    if (!suspendModal) return;
    setSuspendStatus("...");
    const urlAdminCode = searchParams.get("token") || passcode;
    const action = suspendModal.action;
    const res = await fetch(
      `${getApiUrl()}/events/${accessCode}/users/${suspendModal.user.id}/${action}`,
      { method: "PUT", headers: { "Authorization": urlAdminCode || "" } }
    );
    if (res.ok) {
      const successKey = action === "suspend"
        ? t('hostDashboard.attendees.suspendModal.success')
        : t('hostDashboard.attendees.unsuspendModal.success');
      setSuspendStatus(successKey);
      fetchEventAndUsers();
      setTimeout(() => { setSuspendModal(null); setSuspendStatus(""); }, 1200);
    } else {
      setSuspendStatus("Error: action failed.");
    }
  };

  if (!event) return <div className="p-12 text-center">{t('global.loading')}</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-indigo-900 text-white shadow-md py-4 sm:py-6 px-4 sm:px-8 relative">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-4">
            {event.logo_url && (
              <img src={event.logo_url} alt="Event Logo" className="w-16 h-16 rounded-lg object-contain bg-white/10 p-1" />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-indigo-200 font-medium">
                {event.start_date && event.end_date && (
                  <span className="flex items-center"><Clock size={14} className="mr-1" /> {
                    (() => {
                      const s = new Date(event.start_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                      const e = new Date(event.end_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                      return s === e ? s : `${s} to ${e}`;
                    })()
                  }</span>
                )}
                {event.location && (
                  <span className="flex items-center"><MapPin size={14} className="mr-1" /> {event.location}</span>
                )}
              </div>
              <p className="text-indigo-100 mt-2">{t('hostDashboard.title')} &bull; {event.description}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => { setEditEventStatus(""); setIsEditingEvent(true); }} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-medium transition-colors">
              {t('hostDashboard.editEventBtn')}
            </button>
            <Link href="/" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-medium transition-colors hidden sm:block">
              {t('hostDashboard.exitDashboardBtn')}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full p-4 sm:p-8 flex flex-col gap-6 sm:gap-8">
        
        {/* Quick Actions / Info Cards */}
        <div className="flex flex-col gap-4 mb-4">
          {/* Attendee Info Card */}
          <section className="bg-white shadow-sm border border-gray-200 rounded-2xl p-5 sm:p-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">{t('hostDashboard.quickActions.attendeeTitle')}</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={copyLink}
                title={`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${accessCode}`}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 font-medium py-3 px-6 rounded-xl border transition-colors ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
              >
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                {copied ? t('hostDashboard.quickActions.copied') : t('hostDashboard.quickActions.copyAttendeeLink')}
              </button>
              
              <Link
                href={`/event/${accessCode}`}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 font-medium py-3 px-6 rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Users size={18} />
                {t('hostDashboard.quickActions.previewAttendee')}
              </Link>
              
              <p className="text-sm text-gray-500 mt-2 sm:mt-0 sm:ml-4 flex-1 text-center sm:text-left">
                {t('hostDashboard.quickActions.attendeeDesc')}
              </p>
            </div>
          </section>

          {/* Admin Info Card */}
          <section className="bg-indigo-50 shadow-sm border border-indigo-100 rounded-2xl p-5 sm:p-6">
             <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">{t('hostDashboard.quickActions.hostTitle')}</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={copyAdminLink}
                title="Your private host admin link — keep this safe"
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 font-medium py-3 px-6 rounded-xl border transition-colors ${copiedAdmin ? 'bg-green-50 border-green-300 text-green-700' : 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700'}`}
              >
                {copiedAdmin ? <CheckCircle size={18} /> : <Copy size={18} />}
                {copiedAdmin ? t('hostDashboard.quickActions.adminCopied') : t('hostDashboard.quickActions.copyAdminLink')}
              </button>
              
              <p className="text-sm text-indigo-700 mt-2 sm:mt-0 sm:ml-4 flex-1 text-center sm:text-left">
                <strong>{t('hostDashboard.quickActions.adminDesc').split('.')[0]}.</strong> {t('hostDashboard.quickActions.adminDesc').split('.').slice(1).join('.').trim()}
              </p>
            </div>
          </section>
        </div>

        {/* Locations Manager */}
        <section className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="bg-blue-50 border-b border-blue-100 p-6 flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
              <MapPin size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">{t('hostDashboard.meetingAreas.title')}</h2>
          </div>
          
          <div className="p-6 flex-grow flex flex-col">
            <form onSubmit={addLocation} className="flex flex-wrap items-center gap-2 mb-6">
              <div className="flex flex-col flex-grow min-w-[200px]">
                <input 
                  type="text" 
                  value={newLocation} 
                  onChange={e => setNewLocation(e.target.value)}
                  placeholder={t('hostDashboard.meetingAreas.inputPlaceholder')} 
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-gray-500 mt-1 pl-1 leading-tight">{t('hostDashboard.meetingAreas.inputTooltip')}</span>
              </div>
              <div className="flex flex-col">
                <input 
                  type="number" 
                  min="1"
                  value={newCapacity} 
                  onChange={e => setNewCapacity(e.target.value)}
                  placeholder={t('hostDashboard.meetingAreas.tablesPlaceholder')} 
                  title={t('hostDashboard.meetingAreas.tablesTooltip')}
                  className="w-32 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-gray-500 mt-1 pl-1 leading-tight w-32">{t('hostDashboard.meetingAreas.tablesTooltip')}</span>
              </div>
              <button className="bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap self-start">{t('hostDashboard.meetingAreas.addButton')}</button>
            </form>

            <div className="space-y-2 flex-grow overflow-auto">
              {locations.length === 0 ? (
                <p className="text-gray-400 text-center italic py-8">{t('hostDashboard.meetingAreas.empty')}</p>
              ) : (
                locations.map(loc => (
                  <div key={loc.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-lg">
                    <div className="flex items-center">
                        <MapPin size={16} className="text-gray-400 mr-3" />
                        <span className="font-medium text-gray-700 mr-4">{loc.name}</span>
                        <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-full whitespace-nowrap">{t('hostDashboard.meetingAreas.tablesLabel')} {loc.capacity || 1}</span>
                    </div>
                    <button 
                      onClick={() => removeLocation(loc.id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                      title={t('hostDashboard.meetingAreas.removeTitle')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Timeslots Manager */}
        <section className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden flex flex-col lg:col-span-2">
          <div className="bg-purple-50 border-b border-purple-100 p-6 flex items-center gap-3">
            <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
              <Clock size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">{t('hostDashboard.timeslots.title')}</h2>
          </div>
          
          <div className="p-6 flex-grow flex flex-col">
            <form onSubmit={addTimeslot} className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('hostDashboard.timeslots.startLabel')}</label>
                <input 
                  type="datetime-local" 
                  value={newStartTime} 
                  required
                  onChange={e => setNewStartTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('hostDashboard.timeslots.endLabel')}</label>
                <input 
                  type="time" 
                  value={newEndTime} 
                  required
                  title={t('hostDashboard.timeslots.endTooltip')}
                  onChange={e => setNewEndTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('hostDashboard.timeslots.durationLabel')}</label>
                <input 
                  type="number" 
                  value={newSlotDuration} 
                  required
                  min="5"
                  onChange={e => setNewSlotDuration(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-1">
                <button className="w-full bg-purple-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-purple-700 h-[42px] mb-0.5">{t('hostDashboard.timeslots.generateButton')}</button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow overflow-auto">
              {timeslots.length === 0 ? (
                <p className="text-gray-400 text-center italic py-8 col-span-full">{t('hostDashboard.timeslots.empty')}</p>
              ) : (
                timeslots.map(slot => (
                  <div key={slot.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-lg border-l-4 border-l-purple-400">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">{t('hostDashboard.timeslots.starts')}</span>
                      <span className="font-medium text-gray-900">{new Date(slot.start_time).toLocaleString()}</span>
                      <span className="text-sm text-gray-500 mt-2">{t('hostDashboard.timeslots.ends')}</span>
                      <span className="font-medium text-gray-900">{new Date(slot.end_time).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-full whitespace-nowrap hidden sm:inline-block">
                        {t('hostDashboard.timeslots.totalTables')} {locations.reduce((sum, loc) => sum + (loc.capacity || 1), 0)}
                      </span>
                      <button
                        onClick={() => removeTimeslot(slot.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title={t('hostDashboard.timeslots.removeTitle')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Attendees Section */}
        <section className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
          <div className="bg-green-50 border-b border-green-100 p-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                <Users size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">{t('hostDashboard.attendees.title')}</h2>
              <span className="text-sm font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{attendees.length}</span>
            </div>
            <input
              type="text"
              placeholder={t('hostDashboard.attendees.searchPlaceholder')}
              value={attendeeSearch}
              onChange={e => setAttendeeSearch(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 w-56"
            />
          </div>
          <div className="p-6">
            {attendees.length === 0 ? (
              <p className="text-gray-400 text-center italic py-8">No attendees yet.</p>
            ) : (
              <div className="space-y-3">
                {attendees
                  .filter(a =>
                    a.name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
                    (a.email || "").toLowerCase().includes(attendeeSearch.toLowerCase())
                  )
                  .map(attendee => (
                    <div key={attendee.id} className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${attendee.is_suspended ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        {attendee.avatar_url ? (
                          <img src={attendee.avatar_url} alt={attendee.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
                            {attendee.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 truncate">{attendee.name}</span>
                            {attendee.is_suspended && (
                              <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">{t('hostDashboard.attendees.suspendedBadge')}</span>
                            )}
                            {attendee.is_flagged && (
                              <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full" title={t('hostDashboard.attendees.flagTooltip')}>{t('hostDashboard.attendees.flaggedBadge')}</span>
                            )}
                          </div>
                          {attendee.company && <p className="text-sm text-gray-500 truncate">{attendee.company}</p>}
                          <p className="text-xs text-gray-400 truncate">{attendee.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSuspendModal({ user: attendee, action: attendee.is_suspended ? "unsuspend" : "suspend" }); setSuspendStatus(""); }}
                        className={`flex-shrink-0 text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${attendee.is_suspended ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}
                      >
                        {attendee.is_suspended ? t('hostDashboard.attendees.unsuspendBtn') : t('hostDashboard.attendees.suspendBtn')}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-50 rounded-3xl p-6 sm:p-10 shadow-sm border border-red-100">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-900 border-b border-red-200 pb-2">{t('hostDashboard.dangerZone.title')}</h2>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-red-800">{t('hostDashboard.dangerZone.deleteTitle')}</h3>
              <p className="text-sm text-red-700 mt-1 max-w-lg">
                {t('hostDashboard.dangerZone.deleteDesc')}
              </p>
            </div>
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="bg-red-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-red-700 transition"
            >
              {t('hostDashboard.dangerZone.deleteButton')}
            </button>
          </div>
        </section>

      </main>
      {/* Edit Event Profile Modal */}
      {isEditingEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900">{event.title}</h3>
            {event.start_date && event.end_date && (
              <p className="text-sm text-indigo-600 font-medium mt-1 mb-6">
                {
                  (() => {
                    const s = new Date(event.start_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                    const e = new Date(event.end_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                    return s === e ? s : `${s} – ${e}`;
                  })()
                }
                {event.location && <span className="text-gray-400"> · {event.location}</span>}
              </p>
            )}
            {!event.start_date && <div className="mb-6" />}
            
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('hostDashboard.editModal.eventTitleLabel')}</label>
                <input type="text" required value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('hostDashboard.editModal.descriptionLabel')}</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" rows={3} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('hostDashboard.editModal.locationLabel')}</label>
                <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="e.g. Grand Hotel" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('hostDashboard.editModal.startDateLabel')}</label>
                  <input 
                    type="date" 
                    required 
                    value={editStartDate} 
                    onChange={e => setEditStartDate(e.target.value)} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('hostDashboard.editModal.endDateLabel')}</label>
                  <input 
                    type="date" 
                    required 
                    value={editEndDate} 
                    onChange={e => setEditEndDate(e.target.value)} 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('hostDashboard.editModal.logoUrlLabel')}</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditLogoUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                  />
                  {editLogoUrl && (
                    <img src={editLogoUrl} alt="Preview" className="w-10 h-10 rounded-lg border border-gray-200 object-contain flex-shrink-0" />
                  )}
                </div>
              </div>

              {editEventStatus && <div className={`text-sm font-bold mt-2 ${editEventStatus.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{editEventStatus}</div>}

              <div className="flex gap-3 pt-4 border-t mt-6">
                <button 
                  type="button"
                  onClick={() => setIsEditingEvent(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50"
                >
                  {t('hostDashboard.editModal.cancelBtn')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md"
                >
                  {editEventStatus === "Updating..." ? t('hostDashboard.editModal.savingBtn') : t('hostDashboard.editModal.saveBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend / Unsuspend Confirmation Modal */}
      {suspendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-orange-600 mb-4">
              {suspendModal.action === "suspend"
                ? t('hostDashboard.attendees.suspendModal.title')
                : t('hostDashboard.attendees.unsuspendModal.title')}
            </h3>
            <p className="text-gray-700 mb-6">
              {(suspendModal.action === "suspend"
                ? t('hostDashboard.attendees.suspendModal.description')
                : t('hostDashboard.attendees.unsuspendModal.description')
              ).replace("{{name}}", suspendModal.user.name)}
            </p>
            {suspendStatus && (
              <div className={`text-sm font-bold mb-4 ${suspendStatus.startsWith("Error") ? 'text-red-600' : 'text-green-600'}`}>
                {suspendStatus}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setSuspendModal(null); setSuspendStatus(""); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50"
              >
                {suspendModal.action === "suspend"
                  ? t('hostDashboard.attendees.suspendModal.cancelBtn')
                  : t('hostDashboard.attendees.unsuspendModal.cancelBtn')}
              </button>
              <button
                onClick={handleSuspendAction}
                className={`flex-1 px-4 py-2 text-white font-bold rounded-xl shadow-md ${suspendModal.action === "suspend" ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {suspendModal.action === "suspend"
                  ? t('hostDashboard.attendees.suspendModal.confirmBtn')
                  : t('hostDashboard.attendees.unsuspendModal.confirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-red-600 mb-4">{t('hostDashboard.deleteModal.title')}</h3>
            
            <p className="text-gray-700 mb-4">
              {t('hostDashboard.deleteModal.confirmQuestion')} <strong>{event.title}</strong>? 
              {t('hostDashboard.deleteModal.undoneWarning')}
            </p>

            {attendeeCount > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-4 text-sm font-medium">
                {t('hostDashboard.deleteModal.attendeesWarningPrefix')} <strong>{attendeeCount}</strong> {t('hostDashboard.deleteModal.attendeesWarningSuffix')}
              </div>
            )}

            {deleteStatus && (
              <div className={`text-sm font-bold mb-4 ${deleteStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {deleteStatus}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => { setIsDeleteModalOpen(false); setDeleteStatus(""); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50"
              >
                {t('hostDashboard.deleteModal.cancelBtn')}
              </button>
              <button 
                onClick={handleDeleteEvent}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md"
              >
                {t('hostDashboard.deleteModal.confirmBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
