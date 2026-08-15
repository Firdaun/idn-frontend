import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { getLiveStreams, getStreamDetail } from "../utils/backend-api";
import { parseIdnChatMessage } from "../utils/chatParser";

export default function App() {
    const [streams, setStreams] = useState([]);
    const [activeSlug, setActiveSlug] = useState("");
    const [streamData, setStreamData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State untuk komentar
    const [comments, setComments] = useState([
        { id: 1, user: { name: "Sistem", avatar: "" }, message: "Selamat datang di live streaming!", type: "system", time: "Baru saja" },
    ]);
    const [inputChat, setInputChat] = useState("");

    const videoRef = useRef(null);
    const chatEndRef = useRef(null);

    // 1. Ambil list semua live yang sedang aktif saat pertama load
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                setLoading(true);
                const data = await getLiveStreams();
                setStreams(data);
                if (data.length > 0) {
                    setActiveSlug(data[0].slug);
                } else {
                    setError("Sedang tidak ada live yang aktif.");
                }
            } catch (err) {
                setError("Gagal terhubung ke backend: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, []);

    // 2. Ambil detail stream saat activeSlug berganti
    useEffect(() => {
        if (!activeSlug) return;

        const fetchDetail = async () => {
            try {
                const detail = await getStreamDetail(activeSlug);
                setStreamData(detail);
            } catch (err) {
                console.error("Gagal load detail stream:", err);
            }
        };

        fetchDetail();
    }, [activeSlug]);

    useEffect(() => {
        if (!streamData?.chat_room_id) return;

        const socket = new WebSocket("wss://chat.idn.app/");
        const guestUuid = crypto.randomUUID();

        socket.onopen = () => {
            const randomGuestId = Math.random().toString(36).substring(2, 9);
            const guestUser = `idn-web-${randomGuestId}`;

            // 1. Kirim handshake identitas saja di awal
            socket.send(`NICK ${guestUser}\r\n`);
            socket.send(`USER ${guestUser} 0 * :${guestUser}\r\n`);
        };

        socket.onmessage = (event) => {
            const message = event.data;

            // Balas heartbeat PING
            if (message.startsWith("PING")) {
                socket.send(message.replace("PING", "PONG\r\n"));
                return;
            }

            // 2. Kirim JOIN hanya setelah server selesai mendaftarkan user (kode 001 / 376)
            if (message.includes(" 001 ") || message.includes(" 376 ")) {
                // Masuk ke room
                socket.send(`JOIN #${streamData.chat_room_id}\r\n`);

                // Notifikasi ke bot IDNHeimdall
                const heimdallPayload = {
                    room_identifier: streamData.chat_room_id,
                    user_identifier: guestUuid,
                    join_at: Date.now(),
                    created_at: Date.now(),
                    extra_user_identifier: guestUuid,
                    is_login: false,
                };
                socket.send(`PRIVMSG IDNHeimdall :JOINED ${JSON.stringify(heimdallPayload)}\r\n`);
                return;
            }

            // 3. Parsing pesan komentar masuk
            const parsed = parseIdnChatMessage(message);
            if (parsed && parsed.type === "chat") {
                setComments((prev) => {
                    const updated = [...prev, parsed];
                    return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
                });
            }
        };

        return () => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
        };
    }, [streamData?.chat_room_id]);


    // 3. Putar stream HLS (.m3u8) ke HTML5 video tag
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !streamData?.playback_url) return;

        let hls;

        if (Hls.isSupported()) {
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
            });

            hls.loadSource(streamData.playback_url);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {
                    // Autoplay fallback jika browser mewajibkan muted
                    video.muted = true;
                    video.play();
                });
            });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            // Fallback Safari / iOS
            video.src = streamData.playback_url;
            video.addEventListener("loadedmetadata", () => {
                video.play();
            });
        }

        return () => {
            if (hls) {
                hls.destroy();
            }
        };
    }, [streamData?.playback_url]);

    // 4. Auto scroll chat ke paling bawah saat ada pesan baru
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [comments]);

    // Kirim chat lokal / preview
    const handleSendChat = (e) => {
        e.preventDefault();
        if (!inputChat.trim()) return;

        const newComment = {
            id: Date.now(),
            user: "Kamu",
            message: inputChat,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setComments((prev) => [...prev, newComment]);
        setInputChat("");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-sans">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Memuat live stream...</span>
                </div>
            </div>
        );
    }

    if (error && streams.length === 0) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-sans">
                <div className="text-center">
                    <p className="text-zinc-200 text-lg font-medium mb-2">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl transition"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
            {/* Top Bar / Room Switcher */}
            <header className="h-16 px-6 bg-zinc-900/40 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                    <h1 className="font-bold tracking-wide text-lg text-zinc-100">IDN Live Player</h1>
                </div>

                {/* Horizontal Room Pills */}
                <div className="flex items-center gap-2 overflow-x-auto max-w-xl py-1">
                    {streams.map((s) => (
                        <button
                            key={s.slug}
                            onClick={() => setActiveSlug(s.slug)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-2 shrink-0 ${activeSlug === s.slug
                                ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                                : "bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-green-400"></span>
                            {s.creator?.name || s.title}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Layout */}
            <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] w-full mx-auto">
                {/* Kolom Kiri: Video & Stream Info */}
                <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
                    {/* Video Container */}
                    <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl relative">
                        <video
                            ref={videoRef}
                            controls
                            playsInline
                            poster={streamData?.image_url}
                            className="w-full h-full object-contain"
                        />
                    </div>

                    {/* Info Banner Streamer */}
                    {streamData && (
                        <div className="bg-zinc-900/40 backdrop-blur-md p-5 rounded-3xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                <img
                                    src={streamData.creator?.avatar}
                                    alt={streamData.creator?.name}
                                    className="w-14 h-14 rounded-2xl object-cover bg-zinc-800 shrink-0 ring-2 ring-zinc-800/80"
                                />
                                <div className="min-w-0">
                                    <h2 className="text-xl font-bold text-zinc-100 truncate">{streamData.title}</h2>
                                    <p className="text-sm text-zinc-400 font-medium">{streamData.creator?.name}</p>
                                </div>
                            </div>

                            {/* Viewers Metric */}
                            <div className="flex items-center gap-2 bg-zinc-800/60 px-4 py-2 rounded-2xl shrink-0">
                                <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path
                                        fillRule="evenodd"
                                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span className="text-sm font-bold text-zinc-200">
                                    {Number(streamData.view_count || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </section>

                {/* Kolom Kanan: Live Chat */}
                <aside className="lg:col-span-4 xl:col-span-3 bg-zinc-900/40 backdrop-blur-md rounded-3xl flex flex-col h-[600px] lg:h-[calc(100vh-8rem)] max-h-[850px] overflow-hidden">
                    {/* Chat Header */}
                    <div className="px-5 py-4 border-b border-zinc-800/30 flex items-center justify-between">
                        <span className="text-sm font-bold uppercase tracking-wider text-zinc-400">Live Chat</span>
                        <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2.5 py-1 rounded-full">Real-time</span>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar">
                        {comments.map((c) => (
                            <div key={c.id} className="flex items-start gap-2.5 text-sm">
                                <img
                                    src={c.user.avatar}
                                    alt={c.user.name}
                                    className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                                />
                                <div className="min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-semibold text-xs text-zinc-300 truncate">{c.user.name}</span>
                                        <span className="text-[10px] text-zinc-500">{c.time}</span>
                                    </div>
                                    <p className="text-zinc-100 break-words leading-relaxed">{c.message}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input Bar */}
                    <form onSubmit={handleSendChat} className="p-3.5 bg-zinc-900/70">
                        <div className="flex items-center gap-2 bg-zinc-950/60 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-red-500/50 transition">
                            <input
                                type="text"
                                value={inputChat}
                                onChange={(e) => setInputChat(e.target.value)}
                                placeholder="Kirim pesan..."
                                className="flex-1 bg-transparent px-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </div>
                    </form>
                </aside>
            </main>
        </div>
    );
}