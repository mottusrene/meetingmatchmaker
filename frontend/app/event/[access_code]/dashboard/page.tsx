"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Clock, MapPin, ExternalLink, MessageSquare, Calendar, Copy } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function AttendeeDashboard() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const accessCode = params.access_code as string;
  const [userId, setUserId] = useState<string | null>(null);

  const [event, setEvent] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [timeslots, setTimeslots] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection state for meeting request modal
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedTimeslot, setSelectedTimeslot] = useState("");
  const [requestStatus, setRequestStatus] = useState("");

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editProfileLink, setEditProfileLink] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editAvailableTimeslots, setEditAvailableTimeslots] = useState<number[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [copiedMagicLink, setCopiedMagicLink] = useState(false);

  // Report state
  const [reportedUserIds, setReportedUserIds] = useState<Set<number>>(new Set());

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatMeeting, setActiveChatMeeting] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [chatPollingInterval, setChatPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

  // Polling unread messages
  useEffect(() => {
    if (!meetings || meetings.length === 0 || !userId) return;
    const acceptedMeetings = meetings.filter(m => m.status === 'accepted');
    if (acceptedMeetings.length === 0) return;
    
    const token = localStorage.getItem(`session_token_${accessCode}`);
    if (!token) return;

    const pollUnread = async () => {
      const newCounts = { ...unreadCounts };
      await Promise.all(acceptedMeetings.map(async m => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/meetings/${m.id}/messages`, {
          headers: { "Authorization": token }
        });
        if (res.ok) {
          const msgs = await res.json();
          const lastSeenAtStr = localStorage.getItem(`last_seen_msg_${m.id}`);
          const lastSeenAt = lastSeenAtStr ? new Date(lastSeenAtStr).getTime() : 0;
          
          const unreadMsgs = msgs.filter((msg: any) => 
            msg.sender_id !== parseInt(userId) && 
            new Date(msg.timestamp).getTime() > lastSeenAt
          );
          newCounts[m.id] = unreadMsgs.length;
        }
      }));
      setUnreadCounts(newCounts);
    };

    pollUnread();
    const interval = setInterval(pollUnread, 10000);
    return () => clearInterval(interval);
  }, [meetings, userId, accessCode]);

  useEffect(() => {
    const token = localStorage.getItem(`session_token_${accessCode}`);
    if (!token) {
      router.push(`/event/${accessCode}`);
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/me`, {
      headers: { "Authorization": token }
    })
    .then(r => {
      if (!r.ok) {
        localStorage.removeItem(`session_token_${accessCode}`);
        router.push(`/event/${accessCode}`);
        throw new Error(t('attendeeDashboard.invalidToken'));
      }
      return r.json();
    })
    .then(userData => {
      setUserId(userData.id.toString());
      setMe(userData);
      
      Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/events/${accessCode}`).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/`).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/events/${accessCode}/locations/`).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/events/${accessCode}/timeslots/`).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/${userData.id}/meetings/`).then(r => r.json())
      ]).then(([evtData, usersData, locsData, slotsData, mtgsData]) => {
        setEvent(evtData);
        setUsers(usersData.filter((u: any) => u.id !== userData.id && !u.is_host && !u.is_suspended));
        setLocations(locsData);
        setTimeslots(slotsData);
        setMeetings(mtgsData);
      });
    })
    .catch(console.error);
  }, [accessCode, router]);

  const sendRequest = async () => {
    if (!selectedLocation || !selectedTimeslot) {
      setRequestStatus(t('attendeeDashboard.requestModal.errorMissing'));
      return;
    }
    
    setRequestStatus(t('attendeeDashboard.requestModal.sendingBtn'));
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/events/${accessCode}/meetings/?requester_id=${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiver_id: selectedUser.id,
        location_id: parseInt(selectedLocation),
        timeslot_id: parseInt(selectedTimeslot)
      }),
    });
    
    if (res.ok) {
      setRequestStatus(t('attendeeDashboard.requestModal.sentBtn'));
      setTimeout(() => {
        setSelectedUser(null);
        setRequestStatus("");
        // Refresh meetings
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/${userId}/meetings/`)
          .then(r => r.json())
          .then(setMeetings);
      }, 1500);
    } else {
      const err = await res.json().catch(() => null);
      setRequestStatus(err?.detail || "Failed to send request.");
    }
  };

  const updateMeeting = async (meetingId: number, status: string) => {
    const token = localStorage.getItem(`session_token_${accessCode}`);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/meetings/${meetingId}/status?status=${status}`, {
      method: "PUT",
      headers: { "Authorization": token || "" }
    });
    if (res.ok) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/${userId}/meetings/`)
          .then(r => r.json())
          .then(setMeetings);
    } else {
      const err = await res.json().catch(() => null);
      if (err?.detail) {
        alert(err.detail);
      } else {
        alert("Failed to update meeting status.");
      }
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");
    
    const token = localStorage.getItem(`session_token_${accessCode}`);
    if (!token) return;

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/${userId}`, {
            method: "PUT",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": token
            },
            body: JSON.stringify({ 
                name: editName, 
                company: editCompany, 
                bio: editBio, 
                profile_link: editProfileLink, 
                avatar_url: editAvatarUrl || null,
                available_timeslot_ids: editAvailableTimeslots 
            }),
        });
        
        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.detail || "Failed to update profile");
        }
        
        const updatedUser = await res.json();
        setMe(updatedUser);
        setIsEditingProfile(false);
    } catch (err: any) {
        setEditError(err.message);
    } finally {
        setEditLoading(false);
    }
  };

  const openEditProfile = () => {
      setEditName(me?.name || "");
      setEditCompany(me?.company || "");
      setEditBio(me?.bio || "");
      setEditProfileLink(me?.profile_link || "");
      setEditAvatarUrl(me?.avatar_url || "");
      setEditAvailableTimeslots(me?.available_timeslots ? me.available_timeslots.map((t: any) => t.id) : []);
      setDeleteConfirm(false);
      setIsEditingProfile(true);
  };

  const handleDeleteProfile = async () => {
    const token = localStorage.getItem(`session_token_${accessCode}`);
    if (!token) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/${userId}`, {
      method: "DELETE",
      headers: { "Authorization": token }
    });
    if (res.ok) {
      localStorage.removeItem(`session_token_${accessCode}`);
      router.push(`/event/${accessCode}`);
    } else {
      const err = await res.json().catch(() => null);
      setEditError(err?.detail || "Failed to remove profile.");
    }
  };

  const fetchChatMessages = async (meetingId: number) => {
    const token = localStorage.getItem(`session_token_${accessCode}`);
    if (!token) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/meetings/${meetingId}/messages`, {
        headers: { "Authorization": token }
    });
    if (res.ok) {
        setChatMessages(await res.json());
    }
  };

  const openChat = (meeting: any) => {
      setActiveChatMeeting(meeting);
      setIsChatOpen(true);
      fetchChatMessages(meeting.id);
      
      localStorage.setItem(`last_seen_msg_${meeting.id}`, new Date().toISOString());
      setUnreadCounts(prev => ({...prev, [meeting.id]: 0}));
      
      if (chatPollingInterval) clearInterval(chatPollingInterval);
      const interval = setInterval(() => {
          fetchChatMessages(meeting.id);
          localStorage.setItem(`last_seen_msg_${meeting.id}`, new Date().toISOString());
      }, 5000); // Poll every 5s
      setChatPollingInterval(interval);
  };

  const closeChat = () => {
      setIsChatOpen(false);
      setActiveChatMeeting(null);
      if (chatPollingInterval) {
          clearInterval(chatPollingInterval);
          setChatPollingInterval(null);
      }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newChatMessage.trim() || !activeChatMeeting) return;
      
      const token = localStorage.getItem(`session_token_${accessCode}`);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/meetings/${activeChatMeeting.id}/messages`, {
          method: "POST",
          headers: { 
              "Content-Type": "application/json",
              "Authorization": token || ""
          },
          body: JSON.stringify({ content: newChatMessage })
      });
      if (res.ok) {
          setNewChatMessage("");
          fetchChatMessages(activeChatMeeting.id);
      }
  };

  const reportUser = async (targetUserId: number) => {
    const token = localStorage.getItem(`session_token_${accessCode}`);
    if (!token) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/${targetUserId}/report`, {
      method: "POST",
      headers: { "Authorization": token }
    });
    if (res.ok) {
      setReportedUserIds(prev => new Set(prev).add(targetUserId));
    }
  };

  if (!event || !me) return <div className="p-12 text-center">{t('attendeeDashboard.loading')}</div>;

  if (me.is_suspended) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg border border-orange-200 p-10 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle size={32} className="text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('attendeeDashboard.suspended.title')}</h2>
          <p className="text-gray-600 mb-8">{t('attendeeDashboard.suspended.message')}</p>
          <button
            onClick={() => {
              localStorage.removeItem(`session_token_${accessCode}`);
              router.push(`/event/${accessCode}`);
            }}
            className="bg-gray-800 text-white font-bold px-8 py-3 rounded-xl hover:bg-gray-900 transition-colors"
          >
            {t('attendeeDashboard.suspended.logoutBtn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-blue-700 text-white shadow-md py-4 sm:py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          
          <div className="flex flex-col gap-4 flex-grow">
            <div className="flex items-center gap-4">
              {me.avatar_url ? (
                  <img src={me.avatar_url} alt={me.name} className="w-14 h-14 rounded-full border-2 border-blue-400 object-cover" />
              ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center font-bold text-xl shadow-sm">
                      {me.name.charAt(0).toUpperCase()}
                  </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold">{event.title}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-blue-200 font-medium">
                  {event.start_date && event.end_date && (
                    <span className="flex items-center"><Calendar size={14} className="mr-1" /> {
                      (() => {
                        const s = new Date(event.start_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                        const e = new Date(event.end_date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                        return s === e ? s : `${s} - ${e}`;
                      })()
                    }</span>
                  )}
                  {event.location && (
                    <span className="flex items-center"><MapPin size={14} className="mr-1" /> {event.location}</span>
                  )}
                </div>
                <p className="text-blue-100 mt-2 text-sm max-w-xl">{event.description}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <p className="text-blue-200">{t('attendeeDashboard.header.welcomeUser', { name: me.name })}</p>
                  <button onClick={openEditProfile} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors">
                      {t('attendeeDashboard.header.editProfileBtn')}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/event/${accessCode}?token=${me.session_token}`);
                      setCopiedMagicLink(true);
                      setTimeout(() => setCopiedMagicLink(false), 2000);
                    }}
                    title="Copy your personal login link to share or bookmark"
                    className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${copiedMagicLink ? 'bg-green-500 text-white' : 'bg-white/15 hover:bg-white/25 text-blue-100'}`}
                  >
                    <Copy size={11} />
                    {copiedMagicLink ? t('attendeeDashboard.header.copiedLink') : t('attendeeDashboard.header.myLoginLink')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              localStorage.removeItem(`session_token_${accessCode}`);
              router.push(`/event/${accessCode}`);
            }}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg font-medium transition-colors h-fit self-end sm:ml-4 sm:shrink-0"
          >
            {t('attendeeDashboard.header.logoutBtn')}
          </button>

        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full p-4 sm:p-8 grid lg:grid-cols-3 gap-6 sm:gap-8 relative">
        
        {/* My Meetings — first in DOM so it appears first on mobile */}
        <section className="lg:col-span-1 lg:col-start-3 bg-gray-100 rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-inner">
          <div className="border-b border-gray-300 pb-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{t('attendeeDashboard.myMeetings.title')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('attendeeDashboard.myMeetings.subtitle')}</p>
          </div>
          <div className="space-y-4">
            {meetings.length === 0 ? (
              <p className="text-gray-500 italic p-6 bg-white rounded-2xl border border-gray-200 text-center">{t('attendeeDashboard.myMeetings.empty')}</p>
            ) : (
              meetings.map(m => {
                const isReceiver = m.receiver_id === parseInt(userId || "0");
                const otherPerson = isReceiver ? m.requester : m.receiver;
                
                return (
                  <div key={m.id} className={`bg-white border rounded-2xl p-5 shadow-sm ${m.status === 'accepted' ? 'border-green-300' : (m.status === 'declined' || m.status === 'cancelled') ? 'border-red-300 opacity-70' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-900">{otherPerson.name}</h4>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${
                        m.status === 'accepted' ? 'bg-green-100 text-green-700' : 
                        (m.status === 'declined' || m.status === 'cancelled') ? 'bg-red-100 text-red-700' : 
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center"><MapPin size={14} className="mr-2" /> {m.location.name}</div>
                      <div className="flex items-center"><Clock size={14} className="mr-2" /> 
                        {new Date(m.timeslot.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(m.timeslot.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>

                    {isReceiver && m.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => updateMeeting(m.id, 'accepted')} className="flex-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-medium py-2 rounded-lg transition-colors flex justify-center items-center">
                          <CheckCircle size={16} className="mr-1" /> {t('attendeeDashboard.myMeetings.acceptBtn')}
                        </button>
                        <button onClick={() => updateMeeting(m.id, 'declined')} className="flex-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-medium py-2 rounded-lg transition-colors flex justify-center items-center">
                          <XCircle size={16} className="mr-1" /> {t('attendeeDashboard.myMeetings.declineBtn')}
                        </button>
                      </div>
                    )}
                    {!isReceiver && m.status === 'pending' && (
                       <p className="text-xs text-center font-medium text-gray-500 bg-gray-50 py-2 rounded-lg border border-gray-100">{t('attendeeDashboard.myMeetings.waitingResponse')}</p>
                    )}
                    {m.status === 'accepted' && (
                      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
                        <button onClick={() => openChat(m)} className="relative text-sm text-indigo-600 hover:text-indigo-800 font-medium py-1 px-3 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex items-center">
                          <MessageSquare size={14} className="mr-1" /> {t('attendeeDashboard.myMeetings.chatBtn')}
                          {(unreadCounts[m.id] || 0) > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 flex items-center justify-center min-w-[20px] h-[20px]">
                              {unreadCounts[m.id]}
                            </span>
                          )}
                        </button>
                        <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/meetings/${m.id}/calendar`} download className="text-sm text-blue-600 hover:text-blue-800 font-medium py-1 px-3 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center">
                          <Calendar size={14} className="mr-1" /> {t('attendeeDashboard.myMeetings.addCalendarBtn')}
                        </a>
                        <button onClick={() => updateMeeting(m.id, 'cancelled')} className="text-sm text-red-600 hover:text-red-800 font-medium py-1 px-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center">
                          <XCircle size={14} className="mr-1" /> {t('attendeeDashboard.myMeetings.cancelBtn')}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Attendee Directory — second in DOM so it appears below My Meetings on mobile */}
        <section className="lg:col-span-2 lg:col-start-1 lg:row-start-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-bold text-gray-800">{t('attendeeDashboard.directory.title')}</h2>
            <input
              type="text"
              placeholder={t('attendeeDashboard.directory.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <p className="text-gray-500 italic p-6">{t('attendeeDashboard.directory.empty')}</p>
            ) : (
              users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                <div key={user.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <div className="flex items-center gap-3 w-full">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-12 h-12 rounded-full shadow-sm border border-gray-100 object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <h3 className="text-xl font-bold text-gray-900 truncate">{user.name}</h3>
                        {user.company && <p className="text-sm font-medium text-blue-600 truncate">{user.company}</p>}
                      </div>
                    </div>
                    {user.profile_link && (
                      <a href={user.profile_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex-shrink-0" title="View Profile">
                        <ExternalLink size={20} />
                      </a>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-6 line-clamp-3">{user.bio}</p>

                  <button
                    onClick={() => { setSelectedUser(user); setSelectedLocation(""); setSelectedTimeslot(""); setRequestStatus(""); }}
                    className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 font-bold py-2 rounded-lg border border-blue-200 transition-colors"
                  >
                    {t('attendeeDashboard.directory.requestMeetingBtn')}
                  </button>
                  <button
                    onClick={() => reportUser(user.id)}
                    disabled={reportedUserIds.has(user.id)}
                    className={`w-full mt-2 text-sm font-medium py-1.5 rounded-lg border transition-colors ${reportedUserIds.has(user.id) ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-default' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'}`}
                  >
                    {reportedUserIds.has(user.id) ? t('attendeeDashboard.directory.reportedSuccess') : t('attendeeDashboard.directory.reportBtn')}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

      </main>

      {/* Meeting Request Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('attendeeDashboard.requestModal.title')}</h3>
            <p className="text-gray-600 mb-6">{t('attendeeDashboard.requestModal.withPrefix')} <span className="font-bold text-gray-800">{selectedUser.name}</span></p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendeeDashboard.requestModal.selectLocation')}</label>
                <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="">{t('attendeeDashboard.requestModal.chooseLocation')}</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendeeDashboard.requestModal.selectTime')}</label>
                <select value={selectedTimeslot} onChange={e => setSelectedTimeslot(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="">{t('attendeeDashboard.requestModal.chooseTime')}</option>
                  {timeslots
                    .filter(t => {
                      if (!me?.available_timeslots || !selectedUser?.available_timeslots) return false;
                      const mySlotIds = me.available_timeslots.map((ts: any) => ts.id);
                      const theirSlotIds = selectedUser.available_timeslots.map((ts: any) => ts.id);
                      return mySlotIds.includes(t.id) && theirSlotIds.includes(t.id);
                    })
                    .map(t => (
                    <option key={t.id} value={t.id}>
                      {new Date(t.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(t.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </option>
                  ))}
                </select>
                {timeslots.filter(t => {
                      if (!me?.available_timeslots || !selectedUser?.available_timeslots) return false;
                      const mySlotIds = me.available_timeslots.map((ts: any) => ts.id);
                      const theirSlotIds = selectedUser.available_timeslots.map((ts: any) => ts.id);
                      return mySlotIds.includes(t.id) && theirSlotIds.includes(t.id);
                }).length === 0 && (
                  <p className="text-xs text-red-500 mt-2 font-medium">{t('attendeeDashboard.requestModal.noOverlapError')}</p>
                )}
              </div>
              {requestStatus && <div className={`text-sm font-bold ${requestStatus.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{requestStatus}</div>}
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setSelectedUser(null)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50"
              >
                {t('attendeeDashboard.requestModal.cancelBtn')}
              </button>
              <button 
                onClick={sendRequest}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md"
              >
                {t('attendeeDashboard.requestModal.sendBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl my-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">{t('attendeeDashboard.editModal.title')}</h3>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {editError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{editError}</div>}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendeeDashboard.editModal.nameLabel')}</label>
                <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendeeDashboard.editModal.companyLabel')}</label>
                <input type="text" value={editCompany} onChange={e => setEditCompany(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendeeDashboard.editModal.bioLabel')}</label>
                <textarea required value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" rows={2} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendeeDashboard.editModal.profileLinkLabel')}</label>
                <input type="url" value={editProfileLink} onChange={e => setEditProfileLink(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('attendeeDashboard.editModal.avatarLabel')}</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditAvatarUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                  />
                  {editAvatarUrl && (
                    <img src={editAvatarUrl} alt="Preview" className="w-10 h-10 rounded-full border border-gray-200 object-cover flex-shrink-0" />
                  )}
                </div>
              </div>

              {timeslots.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-800 mb-2">{t('attendeeDashboard.editModal.availabilityLabel')}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-2 border rounded-lg p-3 bg-gray-50">
                    {timeslots.map((slot) => {
                      const dateObj = new Date(slot.start_time);
                      const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                      const timeStr = `${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                      const isSelected = editAvailableTimeslots.includes(slot.id);
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
                              if (e.target.checked) setEditAvailableTimeslots([...editAvailableTimeslots, slot.id]);
                              else setEditAvailableTimeslots(editAvailableTimeslots.filter(id => id !== slot.id));
                            }}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">{dateStr}</span>
                          <span className="text-sm font-medium text-center">{timeStr}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                >
                  {t('attendeeDashboard.editModal.cancelBtn')}
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className={`flex-1 py-3 text-white font-bold rounded-xl shadow-md ${editLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {editLoading ? t('attendeeDashboard.editModal.savingBtn') : t('attendeeDashboard.editModal.saveBtn')}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100">
              {!deleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="w-full py-2 text-sm text-red-500 hover:text-red-700 font-medium rounded-xl hover:bg-red-50 transition-colors"
                >
                  {t('attendeeDashboard.editModal.removeProfileBtn')}
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700 font-medium mb-3 text-center">{t('attendeeDashboard.editModal.removeConfirmWarning')}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-sm"
                    >
                      {t('attendeeDashboard.editModal.keepProfileBtn')}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteProfile}
                      className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-sm"
                    >
                      {t('attendeeDashboard.editModal.confirmRemoveBtn')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {isChatOpen && activeChatMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <MessageSquare className="mr-2 text-indigo-600" /> 
                {t('attendeeDashboard.chatModal.titlePrefix')} {activeChatMeeting.receiver_id === parseInt(userId || "0") ? activeChatMeeting.requester.name : activeChatMeeting.receiver.name}
              </h3>
              <button onClick={closeChat} className="text-gray-400 hover:text-gray-600 p-1">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto max-h-[60vh] mb-4 space-y-3 p-2 bg-gray-50 rounded-xl border border-gray-100 flex flex-col">
              {chatMessages.length === 0 ? (
                <p className="text-gray-400 text-center italic py-4 m-auto">{t('attendeeDashboard.chatModal.empty')}</p>
              ) : (
                chatMessages.map(msg => {
                    const isMe = msg.sender_id === parseInt(userId || "0");
                    return (
                        <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                            <div className={`px-4 py-2 rounded-2xl ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                                {msg.content}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    );
                })
              )}
            </div>

            <form onSubmit={sendChatMessage} className="flex gap-2">
                <input 
                    type="text" 
                    value={newChatMessage} 
                    onChange={e => setNewChatMessage(e.target.value)}
                    placeholder={t('attendeeDashboard.chatModal.inputPlaceholder')} 
                    className="flex-grow border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" disabled={!newChatMessage.trim()} className="bg-indigo-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {t('attendeeDashboard.chatModal.sendBtn')}
                </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
