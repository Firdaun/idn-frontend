import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { getLiveStreams } from "../../utils/backend-api";

export default function Navbar() {
    const [liveCount, setLiveCount] = useState(0);
    const [scheduledCount, setScheduledCount] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const checkLive = async () => {
            try {
                const data = await getLiveStreams();
                const list = Array.isArray(data) ? data : [];
                setLiveCount(list.filter(s => s.status !== "scheduled").length);
                setScheduledCount(list.filter(s => s.status === "scheduled").length);
            } catch (err) {
                console.error("Gagal memeriksa live streams:", err);
            }
        };

        checkLive();
        const interval = setInterval(checkLive, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/85 backdrop-blur-md border-b border-zinc-900">
            <div className="max-w-375 w-full mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo & Brand */}
                    <Link to="/" className="flex items-center gap-3 text-zinc-200 hover:text-white transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-300">
                            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="font-semibold text-base tracking-tight text-zinc-100">
                            IDN Live
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1.5 bg-zinc-900/70 p-1.5 rounded-xl border border-zinc-800/60">
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isActive
                                        ? "bg-zinc-800 text-white shadow-sm"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                                }`
                            }
                        >
                            Home
                        </NavLink>

                        <NavLink
                            to="/streaming"
                            className={({ isActive }) =>
                                `px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                    isActive
                                        ? "bg-zinc-800 text-white shadow-sm"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                                }`
                            }
                        >
                            Streaming
                            {liveCount > 0 && (
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            )}
                        </NavLink>

                        <NavLink
                            to="/analytics"
                            className={({ isActive }) =>
                                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isActive
                                        ? "bg-zinc-800 text-white shadow-sm"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                                }`
                            }
                        >
                            Analytics
                        </NavLink>
                    </nav>

                    {/* Right Status */}
                    <div className="hidden sm:flex items-center">
                        <Link
                            to="/streaming"
                            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm text-zinc-300 hover:text-white bg-zinc-900/80 border border-zinc-800/60 hover:bg-zinc-850 transition"
                        >
                            <span className={`w-2 h-2 rounded-full ${liveCount > 0 ? "bg-red-500" : scheduledCount > 0 ? "bg-zinc-500" : "bg-zinc-600"}`}></span>
                            <span className="font-medium">
                                {liveCount > 0
                                    ? `${liveCount} Live`
                                    : scheduledCount > 0
                                    ? `${scheduledCount} Jadwal`
                                    : "Offline"}
                            </span>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex md:hidden items-center gap-2">
                        {(liveCount > 0 || scheduledCount > 0) && (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 border border-zinc-800">
                                <span className={`w-1.5 h-1.5 rounded-full ${liveCount > 0 ? "bg-red-500" : "bg-zinc-500"}`}></span>
                                {liveCount > 0 ? `${liveCount} Live` : `${scheduledCount} Jadwal`}
                            </span>
                        )}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition"
                            aria-label="Toggle menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown */}
                {isMenuOpen && (
                    <div className="md:hidden py-3.5 border-t border-zinc-900 space-y-1.5">
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                `block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                                    isActive ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                                }`
                            }
                        >
                            Home
                        </NavLink>
                        <NavLink
                            to="/streaming"
                            className={({ isActive }) =>
                                `flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                                    isActive ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                                }`
                            }
                        >
                            <span>Streaming</span>
                            {liveCount > 0 && (
                                <span className="px-2 py-0.5 rounded-md text-xs bg-zinc-800 text-zinc-300 font-semibold">
                                    {liveCount} Live
                                </span>
                            )}
                        </NavLink>
                        <NavLink
                            to="/analytics"
                            className={({ isActive }) =>
                                `block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                                    isActive ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                                }`
                            }
                        >
                            Analytics
                        </NavLink>
                    </div>
                )}
            </div>
        </header>
    );
}
