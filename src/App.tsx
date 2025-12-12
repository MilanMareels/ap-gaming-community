import React, { useState, useEffect, useRef } from "react";
import {
  Gamepad2,
  Clock,
  MapPin,
  ThumbsUp,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Lock,
  Trash2,
  Plus,
  LogOut,
  Loader2,
  Save,
  LayoutDashboard,
  CalendarDays,
  Swords,
  User,
  Medal,
  Check,
  Ban,
} from "lucide-react";

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, addDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from "firebase/firestore";

// --- CONFIGURATIE ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIRE_BASE_API_KEY,
  authDomain: "a-gaming-117d9.firebaseapp.com",
  projectId: "a-gaming-117d9",
  storageBucket: "a-gaming-117d9.firebasestorage.app",
  messagingSenderId: "11278909090",
  appId: "1:11278909090:web:60455c35d49f3b75e661fb",
};

const app = firebaseConfig.apiKey !== "VUL_HIER_JE_API_KEY_IN" ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// --- Types & Interfaces ---
interface EventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
}

interface Player {
  name: string;
  handle: string;
  role: string;
  rank: string;
}

interface RosterData {
  [game: string]: Player[];
}

interface TimeSlot {
  start: string;
  end: string;
  label: string;
  type: "open" | "team" | "event";
}

interface DaySchedule {
  day: string;
  slots: TimeSlot[];
}

interface Highscore {
  id: string;
  game: string;
  player: string;
  score: number;
  status: "pending" | "approved";
  timestamp: any;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface SiteSettings {
  googleFormUrl: string;
}

interface SiteLists {
  rosterGames: string[];
  highscoreGames: string[];
  eventTypes: string[];
}

// --- INITIAL DEFAULT DATA (Seeds) ---
const DEFAULT_ROSTERS: RosterData = {
  Valorant: [{ name: "Senne", handle: "ViperMain", role: "Controller", rank: "Ascendant 2" }],
};

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: "Maandag", slots: [{ start: "09:00", end: "17:00", label: "Open Access", type: "open" }] },
  { day: "Dinsdag", slots: [{ start: "09:00", end: "17:00", label: "Open Access", type: "open" }] },
  { day: "Woensdag", slots: [{ start: "09:00", end: "14:00", label: "Open Access", type: "open" }] },
  { day: "Donderdag", slots: [{ start: "09:00", end: "17:00", label: "Open Access", type: "open" }] },
  { day: "Vrijdag", slots: [{ start: "09:00", end: "16:00", label: "Open Access", type: "open" }] },
];

const DEFAULT_SETTINGS: SiteSettings = {
  googleFormUrl: "https://docs.google.com/forms/d/e/YOUR_ID/viewform?embedded=true",
};

const DEFAULT_LISTS: SiteLists = {
  rosterGames: ["Valorant", "League of Legends", "Rocket League"],
  highscoreGames: ["Tetris", "Pac-Man", "Aim Lab", "Typing Test"],
  eventTypes: ["Tournament", "Casual", "Workshop", "LAN Party"],
};

// --- HELPER COMPONENTS ---

// Custom styled select wrapper
const StyledSelect = ({ children, value, onChange, className = "" }: { children: React.ReactNode; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; className?: string }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={onChange}
      className="w-full appearance-none bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-red-500 hover:border-slate-500 transition-colors cursor-pointer"
    >
      {children}
    </select>
    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
      <ChevronDown size={18} />
    </div>
  </div>
);

// Format helper
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
};

// --- 3D & Animation Components ---

const TiltCard = ({ children, className = "", perspective = 1000 }: { children: React.ReactNode; className?: string; perspective?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    setRotateX(yPct * -15);
    setRotateY(xPct * 15);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out transform-gpu ${className}`}
      style={{ transform: `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`, transformStyle: "preserve-3d" }}
    >
      <div style={{ transform: "translateZ(30px)" }}>{children}</div>
    </div>
  );
};

const ScrollReveal = ({ children, direction = "left", delay = 0 }: { children: React.ReactNode; direction?: "left" | "right" | "up"; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const getTransform = () => {
    if (isVisible) return "translate3d(0, 0, 0)";
    if (direction === "left") return "translate3d(-50px, 0, 0)";
    if (direction === "right") return "translate3d(50px, 0, 0)";
    return "translate3d(0, 30px, 0)";
  };

  return (
    <div ref={ref} style={{ transform: getTransform(), opacity: isVisible ? 1 : 0, transition: `all 0.8s cubic-bezier(0.17, 0.55, 0.55, 1) ${delay}ms` }}>
      {children}
    </div>
  );
};

const FAQItemDisplay = ({ item }: { item: FAQItem }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-800/50">
      <button className="w-full py-5 flex justify-between items-center text-left focus:outline-none group" onClick={() => setIsOpen(!isOpen)}>
        <span className="font-bold text-lg text-gray-200 group-hover:text-red-500 transition-colors">{item.question}</span>
        {isOpen ? <ChevronUp className="text-red-500" /> : <ChevronDown className="text-gray-500 group-hover:text-red-400" />}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-40 opacity-100 pb-6" : "max-h-0 opacity-0"}`}>
        <p className="text-gray-400 leading-relaxed">{item.answer}</p>
      </div>
    </div>
  );
};

// --- PUBLIC WEBSITE COMPONENT ---
const PublicWebsite = ({
  navigateToAdmin,
  events,
  rosters,
  timetable,
  faqs,
  highscores,
  settings,
  lists,
  onSubmitScore,
}: {
  navigateToAdmin: () => void;
  events: EventItem[];
  rosters: RosterData;
  timetable: DaySchedule[];
  faqs: FAQItem[];
  highscores: Highscore[];
  settings: SiteSettings;
  lists: SiteLists;
  onSubmitScore: (data: any) => Promise<void>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRoster, setActiveRoster] = useState(lists.rosterGames[0] || "Valorant");
  const [scoreForm, setScoreForm] = useState({ player: "", score: "", game: lists.highscoreGames[0] || "Tetris" });
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreMsg, setScoreMsg] = useState("");
  const [liveStatus, setLiveStatus] = useState<{ status: "OPEN" | "CLOSED" | "BEZET"; label: string }>({ status: "CLOSED", label: "Gesloten" });

  const menuItems = ["Home", "Roster", "Timetable", "Agenda", "Highscores", "Community"];

  useEffect(() => {
    if (lists.rosterGames.length > 0 && !lists.rosterGames.includes(activeRoster)) {
      setActiveRoster(lists.rosterGames[0]);
    }
    if (lists.highscoreGames.length > 0 && !lists.highscoreGames.includes(scoreForm.game)) {
      setScoreForm((prev) => ({ ...prev, game: lists.highscoreGames[0] }));
    }
  }, [lists]);

  // LIVE STATUS LOGIC
  useEffect(() => {
    const checkStatus = () => {
      const now = new Date();
      const days = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
      const currentDay = days[now.getDay()];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const todaySchedule = timetable.find((d) => d.day === currentDay);

      if (!todaySchedule) {
        setLiveStatus({ status: "CLOSED", label: "Gesloten" });
        return;
      }

      let matchFound = false;
      for (const slot of todaySchedule.slots) {
        if (!slot.start || !slot.end) continue;
        const [startH, startM] = slot.start.split(":").map(Number);
        const [endH, endM] = slot.end.split(":").map(Number);

        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

        if (currentMinutes >= startTotal && currentMinutes < endTotal) {
          matchFound = true;
          if (slot.type === "open") {
            setLiveStatus({ status: "OPEN", label: "Open Access" });
          } else {
            setLiveStatus({ status: "BEZET", label: `Bezet (${slot.label})` });
          }
          break;
        }
      }

      if (!matchFound) {
        setLiveStatus({ status: "CLOSED", label: "Gesloten" });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [timetable]);

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingScore(true);
    await onSubmitScore({
      player: scoreForm.player,
      score: parseInt(scoreForm.score),
      game: scoreForm.game,
      status: "pending",
      timestamp: new Date().toISOString(),
    });
    setScoreForm({ player: "", score: "", game: lists.highscoreGames[0] || "Tetris" });
    setSubmittingScore(false);
    setScoreMsg("Score ingediend! Wacht op goedkeuring admin.");
    setTimeout(() => setScoreMsg(""), 5000);
  };

  return (
    <div className="bg-slate-950 min-h-screen text-gray-100 font-sans overflow-x-hidden selection:bg-red-500 selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-red-600/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <Gamepad2 className="h-8 w-8 text-red-500 relative z-10" />
              </div>
              <span className="ml-3 text-2xl font-black italic tracking-tighter text-white">
                AP<span className="text-red-500">GAMING</span>
              </span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-1">
                {menuItems.map((item) => (
                  <a key={item} href={`#${item.toLowerCase()}`} className="relative px-4 py-2 rounded-lg text-sm font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all group">
                    {item}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-red-500 transition-all group-hover:w-full"></span>
                  </a>
                ))}
              </div>
            </div>
            <div className="md:hidden">
              <button onClick={() => setIsOpen(true)} className="text-gray-300 hover:text-white p-2">
                <Menu size={28} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        <div
          className="absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, #ef4444 0%, transparent 50%), linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)",
            backgroundSize: "100% 100%, 50px 50px, 50px 50px",
          }}
        ></div>
        <div className="container mx-auto px-4 z-10 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <ScrollReveal direction="left">
              <div className="inline-block px-3 py-1 mb-4 border border-red-500/30 rounded-full bg-red-500/10 backdrop-blur-sm text-red-400 text-xs font-bold uppercase tracking-widest">
                Official AP Hogeschool Hub
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-[0.9]">
                LEVEL{" "}
                <span className="text-transparent bg-clip-text from-red-600 to-red-400" style={{ WebkitTextStroke: "2px rgba(255,255,255,0.1)" }}>
                  UP
                </span>{" "}
                <br />
                YOUR <span className="text-white">GAME</span>
              </h1>
              <p className="text-xl text-gray-400 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                De ultieme plek voor elke student. Esports, casual gaming en community events op Campus Spoor Noord.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a
                  href="#timetable"
                  className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-red-600 font-lg rounded-xl hover:bg-red-700 hover:scale-105 hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]"
                >
                  <span className="mr-2">Bekijk Rooster</span>
                  <CalendarDays size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="#highscores"
                  className="inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl hover:bg-slate-800 hover:border-red-500/50"
                >
                  Leaderboards
                </a>
              </div>
            </ScrollReveal>
          </div>
          <div className="flex-1 w-full flex justify-center perspective-container">
            <TiltCard className="w-full max-w-md" perspective={2000}>
              <div className="from-slate-800 to-slate-950 border border-slate-700/50 rounded-3xl p-1 shadow-2xl relative group overflow-hidden">
                <div className="relative bg-slate-900/90 h-full w-full rounded-[20px] p-8 flex flex-col items-center justify-center min-h-[450px] border border-white/5">
                  <div className="relative w-40 h-40 mb-8 group-hover:scale-110 transition-transform duration-500">
                    <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                    <div className="relative bg-slate-800 rounded-full w-full h-full flex items-center justify-center border border-slate-700 shadow-inner">
                      <Gamepad2 size={80} className="text-red-500" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black mb-2 tracking-tight">Esports Arena</h3>
                  <p className="text-center text-gray-400">Lokaal 3.04</p>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* --- ROSTER SECTIE --- */}
      <section id="roster" className="py-24 bg-slate-950 border-t border-slate-900">
        <div className="container mx-auto px-4">
          <ScrollReveal direction="up">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black text-white mb-4">
                TEAM <span className="text-red-500">ROSTERS</span>
              </h2>
              <p className="text-gray-400">Ontmoet de studenten die AP vertegenwoordigen.</p>
            </div>
          </ScrollReveal>

          {/* Game Tabs */}
          <div className="flex justify-center mb-12 gap-4 flex-wrap">
            {lists.rosterGames.map((game) => (
              <button
                key={game}
                onClick={() => setActiveRoster(game)}
                className={`px-6 py-3 rounded-full font-bold transition-all border ${
                  activeRoster === game
                    ? "bg-red-600 text-white border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                    : "bg-slate-900 text-gray-400 border-slate-800 hover:border-red-500/50 hover:text-white"
                }`}
              >
                {game}
              </button>
            ))}
          </div>

          {/* Player Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {(rosters[activeRoster] || []).length === 0 ? (
              <div className="col-span-full text-center text-gray-500 italic py-10">Nog geen spelers toegevoegd voor {activeRoster}.</div>
            ) : (
              rosters[activeRoster].map((player, idx) => (
                <ScrollReveal key={idx} direction="up" delay={idx * 50}>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-red-500/50 hover:-translate-y-2 transition-all duration-300 group">
                    <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-red-500/10 group-hover:text-red-500 transition-colors">
                      <User size={32} />
                    </div>
                    <h3 className="text-xl font-black text-center text-white">{player.handle}</h3>
                    <p className="text-center text-gray-500 text-sm mb-4">{player.name}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs p-2 bg-slate-950 rounded border border-slate-800/50">
                        <span className="text-gray-400">Role</span>
                        <span className="font-bold text-white">{player.role}</span>
                      </div>
                      <div className="flex justify-between text-xs p-2 bg-slate-950 rounded border border-slate-800/50">
                        <span className="text-gray-400">Rank</span>
                        <span className="font-bold text-red-500">{player.rank}</span>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))
            )}
          </div>
        </div>
      </section>

      {/* --- TIMETABLE SECTIE --- */}
      <section id="timetable" className="py-24 bg-slate-900/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-16">
            <div className="lg:w-1/3">
              <ScrollReveal direction="left">
                <h2 className="text-5xl font-black mb-6">
                  WEEK <br />
                  <span className="text-red-500">SCHEMA</span>
                </h2>
                <p className="text-gray-400 mb-8 leading-relaxed">De arena is vrij toegankelijk tijdens 'Open Access' uren. Tijdens team trainingen is de ruimte gereserveerd.</p>
                <div
                  className={`p-6 rounded-2xl border transition-colors duration-500 ${
                    liveStatus.status === "OPEN" ? "bg-green-900/20 border-green-500/50" : liveStatus.status === "BEZET" ? "bg-orange-900/20 border-orange-500/50" : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${liveStatus.status === "OPEN" ? "bg-green-500" : liveStatus.status === "BEZET" ? "bg-orange-500" : "bg-red-500"}`}></div> Live
                    Status
                  </h4>
                  <p className="text-sm text-gray-400">
                    De ruimte is momenteel:{" "}
                    <span className={`font-bold ${liveStatus.status === "OPEN" ? "text-green-400" : liveStatus.status === "BEZET" ? "text-orange-400" : "text-red-400"}`}>{liveStatus.label}</span>
                  </p>
                </div>
              </ScrollReveal>
            </div>
            <div className="lg:w-2/3">
              <div className="grid gap-4">
                {timetable.map((day, idx) => (
                  <ScrollReveal key={idx} direction="right" delay={idx * 100}>
                    <div className="flex flex-col md:flex-row bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
                      <div className="bg-slate-900/50 p-6 w-full md:w-40 flex items-center justify-center md:justify-start border-b md:border-b-0 md:border-r border-slate-800">
                        <span className="font-black text-xl text-white uppercase tracking-wider">{day.day}</span>
                      </div>
                      <div className="flex-1 p-4 grid grid-cols-1 gap-4">
                        {day.slots.map((slot, sIdx) => (
                          <div
                            key={sIdx}
                            className={`flex items-center gap-4 p-3 rounded-lg border ${
                              slot.type === "team" ? "bg-red-900/10 border-red-900/30" : slot.type === "event" ? "bg-blue-900/10 border-blue-900/30" : "bg-slate-900 border-slate-800"
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${slot.type === "team" ? "bg-red-500 text-white" : "bg-slate-800 text-gray-400"}`}>
                              {slot.type === "team" ? <Swords size={16} /> : <Clock size={16} />}
                            </div>
                            <div>
                              <span className="block text-sm font-bold text-white">{slot.label}</span>
                              <span className="block text-xs text-gray-400">
                                {slot.start} - {slot.end}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- AGENDA SECTION --- */}
      <section id="agenda" className="py-24 bg-slate-950">
        <div className="container mx-auto px-4">
          <ScrollReveal direction="up">
            <h2 className="text-5xl font-black text-center mb-12">
              UPCOMING <span className="text-red-500">EVENTS</span>
            </h2>
          </ScrollReveal>
          <div className="grid gap-6 max-w-4xl mx-auto">
            {events.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-gray-500">Geen events gepland.</div>
            ) : (
              events.map((event, index) => (
                <ScrollReveal key={event.id} direction="up" delay={index * 100}>
                  <div className="group flex flex-col md:flex-row items-center bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-red-500/50 transition-all duration-300">
                    <div className="flex items-center gap-6 w-full md:w-auto mb-4 md:mb-0 md:mr-8">
                      <div className="bg-slate-950 p-4 rounded-xl text-center min-w-[90px] border border-slate-800">
                        <span className="block text-red-500 font-black text-2xl">{formatDate(event.date).split(" ")[0]}</span>
                        <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider">{formatDate(event.date).split(" ")[1] || ""}</span>
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors">{event.title}</h3>
                      <div className="flex gap-4 text-sm text-gray-400 justify-center md:justify-start">
                        <span className="flex items-center gap-2">
                          <Clock size={16} className="text-red-500" /> {event.time}
                        </span>
                        <span className="flex items-center gap-2">
                          <Gamepad2 size={16} className="text-red-500" /> {event.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))
            )}
          </div>
        </div>
      </section>

      {/* --- HIGHSCORE SECTION --- */}
      <section id="highscores" className="py-24 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-slate-900 relative">
        <div className="absolute inset-0 from-slate-950 via-transparent to-slate-950"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal direction="up">
              <div className="text-center mb-12">
                <span className="text-yellow-500 font-bold tracking-[0.2em] uppercase text-sm animate-pulse">Arcade Mode</span>
                <h2 className="text-5xl font-black text-white mt-2 mb-6 shadow-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                  HALL OF <span className="text-transparent bg-clip-text from-yellow-400 to-orange-500">FAME</span>
                </h2>
                <button
                  onClick={() => document.getElementById("scoreForm")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-red-900/20 transition-all hover:scale-105"
                >
                  Submit Your Score
                </button>
              </div>
            </ScrollReveal>

            {/* Leaderboard */}
            <ScrollReveal direction="up" delay={200}>
              <div className="bg-slate-950/80 backdrop-blur rounded-3xl border-4 border-slate-800 p-2 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 from-blue-500 via-purple-500 to-red-500"></div>
                <div className="bg-slate-900 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-800 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="p-4 font-bold text-center w-16">#</th>
                        <th className="p-4 font-bold">Player</th>
                        <th className="p-4 font-bold">Game</th>
                        <th className="p-4 font-bold text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {highscores
                        .filter((h) => h.status === "approved")
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 10)
                        .map((score, idx) => (
                          <tr key={score.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4 text-center font-black text-xl text-slate-600 group-hover:text-white">
                              {idx === 0 ? (
                                <Medal className="text-yellow-400 inline" />
                              ) : idx === 1 ? (
                                <Medal className="text-gray-300 inline" />
                              ) : idx === 2 ? (
                                <Medal className="text-amber-600 inline" />
                              ) : (
                                idx + 1
                              )}
                            </td>
                            <td className="p-4 font-bold text-white">{score.player}</td>
                            <td className="p-4 text-gray-400 text-sm">{score.game}</td>
                            <td className="p-4 text-right font-mono font-bold text-yellow-500 text-lg">{score.score.toLocaleString()}</td>
                          </tr>
                        ))}
                      {highscores.filter((h) => h.status === "approved").length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                            Nog geen highscores. Wees de eerste!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>

            {/* Submit Form (STYLED SELECT) */}
            <div id="scoreForm" className="mt-16 bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">Submit New Highscore</h3>
              {scoreMsg && <div className="mb-4 p-3 bg-green-500/10 text-green-400 rounded text-center text-sm">{scoreMsg}</div>}
              <form onSubmit={handleScoreSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Student Naam / Gamertag</label>
                  <input
                    required
                    type="text"
                    value={scoreForm.player}
                    onChange={(e) => setScoreForm({ ...scoreForm, player: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-red-500 outline-none"
                    placeholder="Bv. PixelMaster"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Game</label>
                  <StyledSelect value={scoreForm.game} onChange={(e) => setScoreForm({ ...scoreForm, game: e.target.value })}>
                    {lists.highscoreGames.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </StyledSelect>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Score</label>
                  <input
                    required
                    type="number"
                    value={scoreForm.score}
                    onChange={(e) => setScoreForm({ ...scoreForm, score: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-red-500 outline-none font-mono"
                    placeholder="000000"
                  />
                </div>
                <button
                  disabled={submittingScore}
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex justify-center"
                >
                  {submittingScore ? <Loader2 className="animate-spin" /> : "Verstuur voor Goedkeuring"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* --- COMMUNITY POLL SECTION --- */}
      <section id="community" className="py-32 bg-slate-950">
        <div className="container mx-auto px-4">
          <ScrollReveal direction="up">
            <h2 className="text-5xl font-black text-center mb-6">
              COMMUNITY <span className="text-red-600">HUB</span>
            </h2>
            <p className="text-center text-gray-400 mb-20 text-xl">Join the conversation.</p>
          </ScrollReveal>
          <div className="max-w-4xl mx-auto">
            <ScrollReveal direction="up">
              <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 h-full flex flex-col shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-red-600/10 rounded-xl">
                    <ThumbsUp className="text-red-500 w-8 h-8" />
                  </div>
                  <h3 className="text-3xl font-bold">Game Poll</h3>
                </div>
                <div className="flex-1 w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 min-h-[400px]">
                  <iframe src={settings.googleFormUrl} width="100%" height="100%" style={{ border: 0, minHeight: "700px" }} title="AP Gaming Poll">
                    Laden…
                  </iframe>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Footer & Info */}
      <section id="info" className="py-24 bg-slate-950">
        <div className="container mx-auto px-4">
          <ScrollReveal direction="up">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2">
                <div className="relative rounded-3xl overflow-hidden h-80 border border-slate-800 group">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-110"></div>
                  <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center text-center p-6">
                    <MapPin size={40} className="text-red-500 mb-4" />
                    <h3 className="text-3xl font-black text-white">Campus Spoor Noord</h3>
                    <p className="text-gray-300">Viaduct-Dam 2A, Antwerpen</p>
                  </div>
                </div>
              </div>
              <div className="md:w-1/2 space-y-6">
                <h2 className="text-4xl font-black text-white">
                  FAQ & <span className="text-red-500">INFO</span>
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <FAQItemDisplay key={index} item={faq} />
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <footer className="bg-slate-950 border-t border-slate-900 py-12 text-center text-gray-500">
        <div className="container mx-auto px-4">
          <p className="mb-6">&copy; {new Date().getFullYear()} AP Hogeschool Gaming Community.</p>
          <button
            onClick={navigateToAdmin}
            className="text-xs px-4 py-2 rounded-full border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2 mx-auto"
          >
            <Lock size={12} /> Admin Area
          </button>
        </div>
      </footer>
    </div>
  );
};

const LoginScreen = ({ onLoginSuccess, onBack }: { onLoginSuccess: () => void; onBack: () => void }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError("Firebase Config Error");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      setError("Fout bij inloggen: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-3xl border border-white/10 shadow-2xl w-full max-w-md relative z-10">
        <h2 className="text-3xl font-black text-white text-center mb-8">Admin Access</h2>
        {error && <div className="text-red-400 text-sm mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none"
            placeholder="admin@ap.be"
            required
          />
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none"
            placeholder="••••••••"
            required
          />
          <button disabled={loading} type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl mt-4">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Login"}
          </button>
        </form>
        <button onClick={onBack} className="w-full text-gray-500 hover:text-white py-4 text-sm mt-2">
          Terug naar site
        </button>
      </div>
    </div>
  );
};

// --- ADMIN DASHBOARD ---
const AdminDashboard = ({
  onLogout,
  events,
  onAddEvent,
  onDeleteEvent,
  highscores,
  onApproveScore,
  onRejectScore,
  rosters,
  onUpdateRosters,
  timetable,
  onUpdateTimetable,
  settings,
  onUpdateSettings,
  lists,
  onUpdateLists,
}: {
  onLogout: () => void;
  events: EventItem[];
  onAddEvent: (e: Partial<EventItem>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  highscores: Highscore[];
  onApproveScore: (id: string) => Promise<void>;
  onRejectScore: (id: string) => Promise<void>;
  rosters: RosterData;
  onUpdateRosters: (data: RosterData) => Promise<void>;
  timetable: DaySchedule[];
  onUpdateTimetable: (data: DaySchedule[]) => Promise<void>;
  settings: SiteSettings;
  onUpdateSettings: (s: SiteSettings) => Promise<void>;
  lists: SiteLists;
  onUpdateLists: (l: SiteLists) => Promise<void>;
}) => {
  const [activeTab, setActiveTab] = useState<"events" | "scores" | "rosters" | "timetable" | "settings">("events");
  const [newEvent, setNewEvent] = useState<Partial<EventItem>>({ title: "", date: "", time: "", type: "Casual" });

  // Roster States
  const [rosterGame, setRosterGame] = useState(lists.rosterGames[0] || "Valorant");
  const [newPlayer, setNewPlayer] = useState<Player>({ name: "", handle: "", role: "", rank: "" });

  // Timetable States
  const [localTimetable, setLocalTimetable] = useState<DaySchedule[]>(timetable);
  const [savingTime, setSavingTime] = useState(false);

  // Settings State
  const [localSettings, setLocalSettings] = useState<SiteSettings>(settings);
  const [localLists, setLocalLists] = useState<SiteLists>(lists);
  const [savingSettings, setSavingSettings] = useState(false);

  // New list inputs
  const [newRosterGame, setNewRosterGame] = useState("");
  const [newHighscoreGame, setNewHighscoreGame] = useState("");
  const [newEventItem, setNewEventItem] = useState("");

  useEffect(() => {
    setLocalTimetable(timetable);
  }, [timetable]);
  useEffect(() => {
    setLocalSettings(settings);
    setLocalLists(lists);
  }, [settings, lists]);

  const pendingScores = highscores.filter((h) => h.status === "pending");

  const handleAddPlayer = async () => {
    if (!newPlayer.name || !newPlayer.handle) return;
    const currentList = rosters[rosterGame] || [];
    const newList = [...currentList, newPlayer];
    await onUpdateRosters({ ...rosters, [rosterGame]: newList });
    setNewPlayer({ name: "", handle: "", role: "", rank: "" });
  };

  const handleDeletePlayer = async (idx: number) => {
    const currentList = rosters[rosterGame] || [];
    const newList = currentList.filter((_, i) => i !== idx);
    await onUpdateRosters({ ...rosters, [rosterGame]: newList });
  };

  // TIMETABLE ADD/DELETE LOGIC
  const handleAddSlot = (dayIdx: number) => {
    const newTable = [...localTimetable];
    newTable[dayIdx].slots.push({ start: "12:00", end: "14:00", label: "Nieuw Slot", type: "open" });
    setLocalTimetable(newTable);
  };

  const handleRemoveSlot = (dayIdx: number, slotIdx: number) => {
    const newTable = [...localTimetable];
    newTable[dayIdx].slots = newTable[dayIdx].slots.filter((_, i) => i !== slotIdx);
    setLocalTimetable(newTable);
  };

  const handleSaveTimetable = async () => {
    setSavingTime(true);
    await onUpdateTimetable(localTimetable);
    setSavingTime(false);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    await onUpdateSettings(localSettings);
    await onUpdateLists(localLists);
    setSavingSettings(false);
  };

  const addItemToList = (listName: "rosterGames" | "highscoreGames" | "eventTypes", item: string, setter: (s: string) => void) => {
    if (!item) return;
    setLocalLists({ ...localLists, [listName]: [...localLists[listName], item] });
    setter("");
  };

  const removeItemFromList = (listName: "rosterGames" | "highscoreGames" | "eventTypes", idx: number) => {
    const newList = localLists[listName].filter((_, i) => i !== idx);
    setLocalLists({ ...localLists, [listName]: newList });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <LayoutDashboard className="text-red-500" size={24} />
            <h1 className="text-lg font-black tracking-wide text-white uppercase">Admin Console</h1>
          </div>
          <button onClick={onLogout} className="text-gray-400 hover:text-white flex gap-2 items-center font-bold text-sm">
            <LogOut size={16} /> UITLOGGEN
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {/* TAB NAVIGATION */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {["events", "scores", "rosters", "timetable", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 rounded-lg font-bold capitalize whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab ? "bg-red-600 text-white" : "bg-slate-900 text-gray-400 hover:bg-slate-800"
              }`}
            >
              {tab}
              {tab === "scores" && pendingScores.length > 0 && <span className="bg-white text-red-600 text-xs px-2 py-0.5 rounded-full">{pendingScores.length}</span>}
            </button>
          ))}
        </div>

        {/* --- EVENTS TAB --- */}
        {activeTab === "events" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 h-fit">
              <h3 className="text-xl font-bold mb-6 text-white">Nieuw Event</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Titel"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Datum</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Tijd</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Type</label>
                  <StyledSelect value={newEvent.type || lists.eventTypes[0]} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}>
                    {lists.eventTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </StyledSelect>
                </div>
                <button
                  onClick={async () => {
                    if (newEvent.title && newEvent.date) {
                      await onAddEvent(newEvent);
                      setNewEvent({ title: "", date: "", time: "", type: lists.eventTypes[0] });
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl mt-4 flex justify-center items-center gap-2"
                >
                  <Plus size={20} /> TOEVOEGEN
                </button>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-xl">
                  <div>
                    <h4 className="font-bold text-white text-lg">{event.title}</h4>
                    <div className="text-gray-400 text-sm">
                      {formatDate(event.date)} • {event.time} • {event.type}
                    </div>
                  </div>
                  <button onClick={() => onDeleteEvent(event.id)} className="text-red-500 hover:bg-red-500/10 p-3 rounded-lg">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SCORES TAB --- */}
        {activeTab === "scores" && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">Pending Approvals ({pendingScores.length})</h3>
            </div>
            {pendingScores.length === 0 ? (
              <div className="p-10 text-center text-gray-500">Geen scores wachten op goedkeuring.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="p-4">Speler</th>
                    <th className="p-4">Game</th>
                    <th className="p-4">Score</th>
                    <th className="p-4 text-right">Actie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {pendingScores.map((score) => (
                    <tr key={score.id}>
                      <td className="p-4 font-bold text-white">{score.player}</td>
                      <td className="p-4 text-gray-400">{score.game}</td>
                      <td className="p-4 font-mono text-yellow-500">{score.score}</td>
                      <td className="p-4 flex justify-end gap-2">
                        <button onClick={() => onApproveScore(score.id)} className="bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white p-2 rounded" title="Goedkeuren">
                          <Check size={18} />
                        </button>
                        <button onClick={() => onRejectScore(score.id)} className="bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white p-2 rounded" title="Weigeren">
                          <Ban size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* --- ROSTERS TAB --- */}
        {activeTab === "rosters" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 h-fit">
              <h3 className="text-xl font-bold mb-6 text-white">Speler Toevoegen</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Selecteer Game</label>
                  <StyledSelect value={rosterGame} onChange={(e) => setRosterGame(e.target.value)}>
                    {lists.rosterGames.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </StyledSelect>
                </div>
                <input
                  type="text"
                  placeholder="Naam (bv. Senne)"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none"
                />
                <input
                  type="text"
                  placeholder="Handle (bv. ViperMain)"
                  value={newPlayer.handle}
                  onChange={(e) => setNewPlayer({ ...newPlayer, handle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Role (bv. Controller)"
                    value={newPlayer.role}
                    onChange={(e) => setNewPlayer({ ...newPlayer, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Rank (bv. Ascendant)"
                    value={newPlayer.rank}
                    onChange={(e) => setNewPlayer({ ...newPlayer, rank: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none"
                  />
                </div>
                <button onClick={handleAddPlayer} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-4 flex justify-center items-center gap-2">
                  <Plus size={18} /> TOEVOEGEN AAN {rosterGame.toUpperCase()}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white">
                    Huidig Roster: <span className="text-red-500">{rosterGame}</span>
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(rosters[rosterGame] || []).map((player, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-white">{player.handle}</div>
                          <div className="text-xs text-gray-500">
                            {player.name} • {player.role}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeletePlayer(idx)} className="text-red-500 hover:bg-red-500/10 p-2 rounded transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {(rosters[rosterGame] || []).length === 0 && <p className="text-gray-500 italic">Geen spelers in dit team.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TIMETABLE TAB --- */}
        {activeTab === "timetable" && (
          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Openingstijden & Schema Bewerken</h3>
              <button
                onClick={handleSaveTimetable}
                disabled={savingTime}
                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {savingTime ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} OPSLAAN
              </button>
            </div>

            <div className="space-y-6">
              {localTimetable.map((day, dIdx) => (
                <div key={dIdx} className="border border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-950 px-4 py-2 font-bold text-gray-400 uppercase text-xs tracking-wider flex justify-between items-center">
                    <span>{day.day}</span>
                    <button onClick={() => handleAddSlot(dIdx)} className="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-white flex items-center gap-1 transition-colors">
                      <Plus size={12} /> Tijdslot Toevoegen
                    </button>
                  </div>
                  <div className="p-4 space-y-3 bg-slate-900/50">
                    {day.slots.map((slot, sIdx) => (
                      <div key={sIdx} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => {
                              const newTable = [...localTimetable];
                              newTable[dIdx].slots[sIdx].start = e.target.value;
                              setLocalTimetable(newTable);
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-2 text-white text-sm outline-none focus:border-red-500"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => {
                              const newTable = [...localTimetable];
                              newTable[dIdx].slots[sIdx].end = e.target.value;
                              setLocalTimetable(newTable);
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-2 text-white text-sm outline-none focus:border-red-500"
                          />
                        </div>
                        <input
                          type="text"
                          value={slot.label}
                          onChange={(e) => {
                            const newTable = [...localTimetable];
                            newTable[dIdx].slots[sIdx].label = e.target.value;
                            setLocalTimetable(newTable);
                          }}
                          placeholder="Label (bv. Toernooi)"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm outline-none focus:border-red-500 w-full md:w-auto"
                        />
                        <div className="w-full md:w-40">
                          <StyledSelect
                            value={slot.type}
                            onChange={(e) => {
                              const newTable = [...localTimetable];
                              newTable[dIdx].slots[sIdx].type = e.target.value as any;
                              setLocalTimetable(newTable);
                            }}
                            className="py-0"
                          >
                            <option value="open">Open Access</option>
                            <option value="team">Team Training</option>
                            <option value="event">Event / Workshop</option>
                          </StyledSelect>
                        </div>
                        <button onClick={() => handleRemoveSlot(dIdx, sIdx)} className="text-red-500 hover:bg-red-500/10 p-2 rounded self-end md:self-center">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {day.slots.length === 0 && <div className="text-center text-xs text-gray-500 italic py-2">Geen tijdsloten ingesteld voor deze dag.</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Poll Settings */}
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
              <h3 className="text-xl font-bold text-white mb-6">Algemeen</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1">Google Form Embed URL</label>
                  <input
                    type="text"
                    value={localSettings.googleFormUrl}
                    onChange={(e) => setLocalSettings({ ...localSettings, googleFormUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Lists Management */}
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
              <h3 className="text-xl font-bold text-white mb-6">Lijsten Beheren</h3>

              {/* Roster Games List */}
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Competitieve Games (Rosters)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newRosterGame}
                    onChange={(e) => setNewRosterGame(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                    placeholder="Nieuwe team game..."
                  />
                  <button onClick={() => addItemToList("rosterGames", newRosterGame, setNewRosterGame)} className="bg-blue-600 px-3 rounded-lg">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {localLists.rosterGames.map((item, idx) => (
                    <span key={idx} className="bg-slate-950 border border-slate-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {item}
                      <button onClick={() => removeItemFromList("rosterGames", idx)} className="text-red-500 hover:text-white">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Highscore Games List */}
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Arcade Games (Highscores)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newHighscoreGame}
                    onChange={(e) => setNewHighscoreGame(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                    placeholder="Nieuwe arcade game..."
                  />
                  <button onClick={() => addItemToList("highscoreGames", newHighscoreGame, setNewHighscoreGame)} className="bg-purple-600 px-3 rounded-lg">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {localLists.highscoreGames.map((item, idx) => (
                    <span key={idx} className="bg-slate-950 border border-slate-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {item}
                      <button onClick={() => removeItemFromList("highscoreGames", idx)} className="text-red-500 hover:text-white">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Events List */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1">Event Types</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newEventItem}
                    onChange={(e) => setNewEventItem(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                    placeholder="Nieuw type..."
                  />
                  <button onClick={() => addItemToList("eventTypes", newEventItem, setNewEventItem)} className="bg-orange-600 px-3 rounded-lg">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {localLists.eventTypes.map((item, idx) => (
                    <span key={idx} className="bg-slate-950 border border-slate-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {item}
                      <button onClick={() => removeItemFromList("eventTypes", idx)} className="text-red-500 hover:text-white">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {savingSettings ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} WIJZIGINGEN OPSLAAN
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- MAIN APP CONTAINER ---
export default function App() {
  const [view, setView] = useState<"public" | "login" | "admin">("public");
  const [user, setUser] = useState<FirebaseUser | null>(null);

  // Dynamic Data
  const [events, setEvents] = useState<EventItem[]>([]);
  const [highscores, setHighscores] = useState<Highscore[]>([]);
  const [rosters, setRosters] = useState<RosterData>(DEFAULT_ROSTERS);
  const [timetable, setTimetable] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [lists, setLists] = useState<SiteLists>(DEFAULT_LISTS);

  const faqs: FAQItem[] = [
    { question: "Moet ik mijn eigen controller meenemen?", answer: "Voor de PS5 hebben we controllers, maar voor PC raden we aan je eigen controller mee te nemen." },
    { question: "Wanneer zijn de try-outs?", answer: "Try-outs worden elk semester georganiseerd in de eerste twee weken." },
  ];

  // Auth Listener
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setView("admin");
      else if (view === "admin") setView("public");
    });
  }, [auth, view]);

  // Data Listeners
  useEffect(() => {
    if (!db) return;

    // 1. Events
    const unsubEvents = onSnapshot(query(collection(db, "events"), orderBy("date")), (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventItem)));
    });

    // 2. Highscores
    const unsubScores = onSnapshot(query(collection(db, "highscores"), orderBy("score", "desc")), (snap) => {
      setHighscores(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Highscore)));
    });

    // 3. Rosters (Single Document)
    const rosterRef = doc(db, "content", "rosters");
    const unsubRosters = onSnapshot(rosterRef, (docSnap) => {
      if (docSnap.exists()) {
        setRosters(docSnap.data().data as RosterData);
      } else {
        setDoc(rosterRef, { data: DEFAULT_ROSTERS });
      }
    });

    // 4. Timetable (Single Document)
    const timetableRef = doc(db, "content", "timetable");
    const unsubTimetable = onSnapshot(timetableRef, (docSnap) => {
      if (docSnap.exists()) {
        setTimetable(docSnap.data().schedule as DaySchedule[]);
      } else {
        setDoc(timetableRef, { schedule: DEFAULT_SCHEDULE });
      }
    });

    // 5. Settings & Lists (Single Document)
    const settingsRef = doc(db, "content", "settings");
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(data.settings as SiteSettings);
        // Check if older list version exists, otherwise default
        if (data.lists && data.lists.rosterGames) {
          setLists(data.lists as SiteLists);
        } else {
          // Migration for older data structure if needed
          setLists(DEFAULT_LISTS);
        }
      } else {
        setDoc(settingsRef, { settings: DEFAULT_SETTINGS, lists: DEFAULT_LISTS });
      }
    });

    return () => {
      unsubEvents();
      unsubScores();
      unsubRosters();
      unsubTimetable();
      unsubSettings();
    };
  }, [db]);

  // Actions
  const handleAddEvent = async (data: Partial<EventItem>) => {
    if (db) await addDoc(collection(db, "events"), data);
  };
  const handleDeleteEvent = async (id: string) => {
    if (db) await deleteDoc(doc(db, "events", id));
  };

  const handleSubmitScore = async (data: any) => {
    if (db) await addDoc(collection(db, "highscores"), data);
  };
  const handleApproveScore = async (id: string) => {
    if (db) await updateDoc(doc(db, "highscores", id), { status: "approved" });
  };
  const handleRejectScore = async (id: string) => {
    if (db) await deleteDoc(doc(db, "highscores", id));
  };

  const handleUpdateRosters = async (newData: RosterData) => {
    if (db) await setDoc(doc(db, "content", "rosters"), { data: newData });
  };
  const handleUpdateTimetable = async (newSchedule: DaySchedule[]) => {
    if (db) await setDoc(doc(db, "content", "timetable"), { schedule: newSchedule });
  };

  // Update both settings and lists in one document update (merging)
  const handleUpdateSettings = async (newSettings: SiteSettings) => {
    if (db) await setDoc(doc(db, "content", "settings"), { settings: newSettings, lists: lists }, { merge: true });
  };
  const handleUpdateLists = async (newLists: SiteLists) => {
    if (db) await setDoc(doc(db, "content", "settings"), { settings: settings, lists: newLists }, { merge: true });
  };

  if (view === "login") return <LoginScreen onLoginSuccess={() => {}} onBack={() => setView("public")} />;

  if (view === "admin" && user)
    return (
      <AdminDashboard
        onLogout={() => signOut(auth!)}
        events={events}
        highscores={highscores}
        rosters={rosters}
        timetable={timetable}
        settings={settings}
        lists={lists}
        onAddEvent={handleAddEvent}
        onDeleteEvent={handleDeleteEvent}
        onApproveScore={handleApproveScore}
        onRejectScore={handleRejectScore}
        onUpdateRosters={handleUpdateRosters}
        onUpdateTimetable={handleUpdateTimetable}
        onUpdateSettings={handleUpdateSettings}
        onUpdateLists={handleUpdateLists}
      />
    );

  return (
    <PublicWebsite
      navigateToAdmin={() => setView("login")}
      events={events}
      rosters={rosters}
      timetable={timetable}
      faqs={faqs}
      highscores={highscores}
      settings={settings}
      lists={lists}
      onSubmitScore={handleSubmitScore}
    />
  );
}
