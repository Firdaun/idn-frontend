import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import Hls from "hls.js";
import { getLiveStreams, getStreamDetail } from "../../utils/backend-api";
import { parseIdnChatMessage } from "../../utils/chatParser";

export default function Streaming() {
    const [searchParams, setSearchParams] = useSearchParams();
    const slugFromUrl = searchParams.get("slug");

    const [streams, setStreams] = useState([]);
    const [activeSlug, setActiveSlug] = useState(slugFromUrl || "");
    const [streamData, setStreamData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [streamLoading, setStreamLoading] = useState(false);
    const [error, setError] = useState(null);

    const [comments, setComments] = useState([]);
    const [isChatConnected, setIsChatConnected] = useState(true);

    const videoRef = useRef(null);
    const chatContainerRef = useRef(null);

    // 1. Ambil list semua live yang sedang aktif saat pertama load
    useEffect(() => {
        const fetchRooms = async () => {
            try {
                setLoading(true);
                const data = await getLiveStreams();
                const streamList = Array.isArray(data) ? data : [];
                setStreams(streamList);

                if (streamList.length > 0) {
                    const found = streamList.find(s => s.slug === slugFromUrl);
                    if (found) {
                        setActiveSlug(found.slug);
                    } else if (!activeSlug) {
                        setActiveSlug(streamList[0].slug);
                    }
                } else {
                    setError("Sedang tidak ada live yang aktif.");
                }
            } catch (err) {
                setError("Gagal terhubung ke backend: " + err.message);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, [slugFromUrl]);

    const handleSelectStream = (slug) => {
        setActiveSlug(slug);
        setSearchParams({ slug });
    };

    // 2. Ambil detail stream saat activeSlug berganti
    useEffect(() => {
        if (!activeSlug) return;

        setComments([]);

        const fetchDetail = async () => {
            try {
                setStreamLoading(true);
                const detail = await getStreamDetail(activeSlug);
                setStreamData(detail);
            } catch (err) {
                console.error("Gagal load detail stream:", err);
            } finally {
                setStreamLoading(false);
            }
        };

        fetchDetail();
    }, [activeSlug]);

    // 3. IDN WebSocket IRC Chat
    useEffect(() => {
        if (!streamData?.chat_room_id || !isChatConnected) return;

        let isSubscribed = true;
        const socket = new WebSocket("wss://chat.idn.app/");
        const guestUuid = crypto.randomUUID();

        socket.onopen = () => {
            const randomGuestId = Math.random().toString(36).substring(2, 9);
            const guestUser = `idn-web-${randomGuestId}`;

            socket.send(`NICK ${guestUser}\r\n`);
            socket.send(`USER ${guestUser} 0 * :${guestUser}\r\n`);
        };

        socket.onmessage = (event) => {
            if (!isSubscribed) return;
            const message = event.data;

            if (message.startsWith("PING")) {
                socket.send(message.replace("PING", "PONG\r\n"));
                return;
            }

            if (message.includes(" 001 ") || message.includes(" 376 ")) {
                socket.send(`JOIN #${streamData.chat_room_id}\r\n`);

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

            const parsed = parseIdnChatMessage(message);
            if (parsed && parsed.type === "chat") {
                setComments((prev) => [...prev, parsed].slice(-100));
            }
        };

        return () => {
            isSubscribed = false;
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close();
            }
        };
    }, [streamData?.chat_room_id, isChatConnected]);

    // 4. Putar stream HLS
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !streamData?.playback_url || streamData?.status === "scheduled") return;

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
                    video.muted = true;
                    video.play();
                });
            });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
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
    }, [streamData?.playback_url, streamData?.status]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [comments]);

    const isScheduled = streamData?.status === "scheduled" || (!streamData?.playback_url && streamData);

    return (
        <div className="space-y-5 pb-16">
            {/* Stream Selector Bar */}
            <div className="bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800/40 flex items-center justify-between gap-4 overflow-x-auto">
                <span className="text-sm text-zinc-400 font-medium shrink-0">Pilih Room:</span>

                <div className="flex items-center gap-2 overflow-x-auto">
                    {streams.map((s) => {
                        const isStreamScheduled = s.status === "scheduled";
                        return (
                            <button
                                key={s.slug}
                                onClick={() => handleSelectStream(s.slug)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 shrink-0 cursor-pointer ${
                                    activeSlug === s.slug
                                        ? "bg-zinc-800 text-white shadow-sm"
                                        : "bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 border border-transparent hover:border-zinc-800"
                                }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${isStreamScheduled ? "bg-zinc-500" : "bg-red-500"}`}></span>
                                <span>{s.creator?.name || s.title}</span>
                                {isStreamScheduled && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-normal">
                                        Jadwal
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    {streams.length === 0 && !loading && (
                        <span className="text-sm text-zinc-500">Tidak ada live aktif</span>
                    )}
                </div>
            </div>

            {/* Main Player & Chat Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Kolom Kiri: Video & Stream Info */}
                <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
                    <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden relative flex items-center justify-center border border-zinc-800/40 shadow-xl">
                        {loading || streamLoading ? (
                            <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                                <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm font-medium">Memuat stream...</span>
                            </div>
                        ) : error && streams.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400 max-w-md">
                                <p className="text-sm text-zinc-300 mb-4">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 text-sm font-medium rounded-xl transition"
                                >
                                    Coba Lagi
                                </button>
                            </div>
                        ) : isScheduled ? (
                            <div className="w-full h-full relative flex items-center justify-center p-6 text-center bg-zinc-950 overflow-hidden">
                                {streamData?.image_url && (
                                    <img
                                        src={streamData.image_url}
                                        alt={streamData.title}
                                        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
                                    />
                                )}
                                <div className="relative z-10 max-w-md space-y-3 p-6 sm:p-8 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800/60 shadow-2xl">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300">
                                        <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Live Dijadwalkan
                                    </div>
                                    <h3 className="text-base sm:text-lg font-semibold text-zinc-100">{streamData.title}</h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        Streaming ini telah dijadwalkan dan belum dimulai. Halaman akan otomatis memutar video saat siaran langsung aktif.
                                    </p>
                                    {streamData.live_at && (
                                        <p className="text-xs text-zinc-500 font-mono">
                                            Waktu Jadwal: {new Date(streamData.live_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <video
                                ref={videoRef}
                                controls
                                playsInline
                                poster={streamData?.image_url}
                                className="w-full h-full object-contain"
                            />
                        )}
                    </div>

                    {/* Info Banner Streamer */}
                    {streamData && (
                        <div className="bg-zinc-900/40 p-4 sm:p-5 rounded-2xl border border-zinc-800/40 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                <img
                                    src={streamData.creator?.avatar || "https://cdn.idn.media/idnaccount/avatar/default.png"}
                                    alt={streamData.creator?.name}
                                    className="w-12 h-12 rounded-xl object-cover bg-zinc-800 shrink-0"
                                />
                                <div className="min-w-0">
                                    <h2 className="text-base sm:text-lg font-semibold text-zinc-100 truncate">{streamData.title}</h2>
                                    <p className="text-sm text-zinc-400 mt-0.5">{streamData.creator?.name}</p>
                                </div>
                            </div>

                            <div className="px-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800/50 text-sm font-medium text-zinc-200 shrink-0 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isScheduled ? "bg-zinc-500" : "bg-red-500"}`}></span>
                                <span>{isScheduled ? "Dijadwalkan" : `${Number(streamData.view_count || 0).toLocaleString()} penonton`}</span>
                            </div>
                        </div>
                    )}
                </section>

                {/* Kolom Kanan: Live Chat (Hanya Komentar dari WebSocket) */}
                <aside className="lg:col-span-4 xl:col-span-3 bg-zinc-900/40 rounded-3xl border border-zinc-800/40 flex flex-col h-137.5 lg:h-[calc(100vh-14rem)] max-h-212.5 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-zinc-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-200">Live Chat</span>
                            <span className={`w-2 h-2 rounded-full ${isChatConnected ? "bg-emerald-400" : "bg-zinc-600"}`}></span>
                        </div>

                        <button
                            onClick={() => setIsChatConnected((prev) => !prev)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                                isChatConnected
                                    ? "bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border-zinc-800"
                                    : "bg-zinc-800 hover:bg-zinc-750 text-emerald-400 border-zinc-700"
                            }`}
                            title={isChatConnected ? "Hentikan koneksi live chat" : "Hubungkan kembali live chat"}
                        >
                            {isChatConnected ? (
                                <>
                                    <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Hentikan Chat</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Lanjutkan Chat</span>
                                </>
                            )}
                        </button>
                    </div>

                    {!isChatConnected && (
                        <div className="bg-zinc-900/90 border-b border-zinc-800/80 px-4 py-2 text-center text-xs text-zinc-400 flex items-center justify-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                            Koneksi chat dihentikan manual
                        </div>
                    )}

                    {/* Messages Area - Full Height tanpa form chat */}
                    <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar">
                        {comments.length === 0 && (
                            <div className="h-full flex items-center justify-center text-center p-6 text-zinc-500 text-sm">
                                Menunggu live chat masuk...
                            </div>
                        )}
                        {comments.map((c) => (
                            <div key={c.id} className="flex items-start gap-3 text-sm">
                                <img
                                    src={c.user?.avatar || "https://cdn.idn.media/idnaccount/avatar/default.png"}
                                    alt={typeof c.user === "object" ? c.user?.name : c.user || "User"}
                                    className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-medium text-zinc-300 truncate text-sm">
                                            {typeof c.user === "object" ? c.user?.name : c.user || "User"}
                                        </span>
                                        <span className="text-xs text-zinc-500">{c.time}</span>
                                    </div>
                                    <p className={`text-sm wrap-break-word mt-0.5 leading-relaxed ${
                                        c.type === "gift" ? "text-amber-300 font-medium" : c.type === "system" ? "text-zinc-400 italic text-xs" : "text-zinc-200"
                                    }`}>
                                        {c.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
}
