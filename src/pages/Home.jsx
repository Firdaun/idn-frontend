import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { getLiveStreams, getMultiLiveData } from "../../utils/backend-api";
import { useQuery } from "@tanstack/react-query";
export const formatDurationIndo = (durationStr) => {
    if (!durationStr) return "-";
    return durationStr
        .replace(/Hours?/gi, "Jam")
        .replace(/Minutes?/gi, "Menit")
        .replace(/Seconds?/gi, "Detik");
};

export default function Home() {
    const navigate = useNavigate();

    const {
        data: streams = [],
        isLoading: isStreamsLoading,
        isFetching: isStreamsFetching,
        refetch: refetchStream
    } = useQuery({
        queryKey: ['livestream'],
        queryFn: getLiveStreams,
        refetchInterval: 30000,
    })

    const {
        data: analyticsData = null,
        isLoading: isAnalyticsLoading,
        isFetching: isAnalyticsFetching,
        refetch: refetchAnalytics
    } = useQuery({
        queryKey: ['multiLiveSummary'],
        queryFn: getMultiLiveData,
        staleTime: 1000 * 60 * 15,
        gcTime: 1000 * 60 * 30
    })

    const loading = isStreamsLoading && streams.length === 0
    const refreshing = isStreamsFetching || isAnalyticsFetching

    const handleRefresh = () => {
        refetchStream()
        refetchAnalytics()
    }

    const streamersList = useMemo(() => {
        const raw = analyticsData?.streamers || [];
        return raw.map(s => {
            const sessions = s.sessions || [];
            const bestSession = sessions.length > 0
                ? [...sessions].sort((a, b) => (Number(b.peakViewers) || 0) - (Number(a.peakViewers) || 0))[0]
                : null;
            const maxSessionPeakViewers = bestSession ? (Number(bestSession.peakViewers) || 0) : 0;
            const maxSessionPeakChat = sessions.length > 0
                ? Math.max(...sessions.map(sess => Number(sess.peakChat) || 0))
                : 0;
            const totalSessionChat = sessions.length > 0
                ? sessions.reduce((acc, sess) => acc + (Number(sess.totalChat) || 0), 0)
                : (Number(s.totalChat) || 0);

            return {
                ...s,
                ...(bestSession ? {
                    duration: bestSession.duration || s.duration,
                    avgViewers: bestSession.avgViewers || s.avgViewers,
                    totalSnapshots: bestSession.totalSnapshots || s.totalSnapshots,
                    liveAt: bestSession.liveAt || s.liveAt,
                    endAt: bestSession.endAt || s.endAt
                } : {}),
                peakViewers: Math.max(Number(s.peakViewers) || 0, maxSessionPeakViewers),
                peakChat: Math.max(Number(s.peakChat) || 0, maxSessionPeakChat),
                totalChat: s.totalChat !== undefined ? Math.max(Number(s.totalChat) || 0, totalSessionChat) : totalSessionChat
            };
        });
    }, [analyticsData?.streamers]);

    const totalPeakViewers = useMemo(() => {
        return streamersList.reduce((max, s) => Math.max(max, s.peakViewers || 0), 0);
    }, [streamersList]);

    const topStreamer = useMemo(() => {
        if (!streamersList.length || totalPeakViewers === 0) return null;
        return [...streamersList].sort((a, b) => (b.peakViewers || 0) - (a.peakViewers || 0))[0];
    }, [streamersList, totalPeakViewers]);

    const liveStreams = streams.filter(s => s.status !== "scheduled")
    const scheduledStreams = streams.filter(s => s.status === "scheduled")

    return (
        <div className="space-y-14 pb-20">
            {/* HERO SECTION */}
            <section className="pt-8 sm:pt-14">
                <div className="space-y-5 max-w-3xl">
                    <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/40 text-sm text-zinc-300">
                        <span className={`w-2 h-2 rounded-full ${liveStreams.length > 0 ? "bg-red-500" : scheduledStreams.length > 0 ? "bg-zinc-500" : "bg-zinc-600"}`}></span>
                        <span>
                            {liveStreams.length > 0
                                ? `${liveStreams.length} stream live${scheduledStreams.length > 0 ? ` · ${scheduledStreams.length} dijadwalkan` : ""}`
                                : scheduledStreams.length > 0
                                    ? `${scheduledStreams.length} stream dijadwalkan`
                                    : "Tidak ada live saat ini"}
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-zinc-100 leading-tight">
                        Live Streaming & Analytics
                    </h1>

                    <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl">
                        Pantau live stream IDN secara langsung, pantau interaksi chat secara real-time, dan lihat perbandingan grafik penonton antar member.
                    </p>

                    <div className="flex flex-wrap items-center gap-3.5 pt-3">
                        <Link
                            to="/streaming"
                            className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-sm transition"
                        >
                            Buka Streaming
                        </Link>
                        <Link
                            to="/analytics"
                            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-sm font-medium transition"
                        >
                            Lihat Analytics
                        </Link>
                    </div>
                </div>

                {/* Quick Numbers Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10">
                    <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/40">
                        <span className="text-sm text-zinc-400 font-medium">Stream Aktif</span>
                        <p className="text-2xl sm:text-3xl font-semibold text-zinc-100 mt-1">
                            {liveStreams.length} {scheduledStreams.length > 0 && <span className="text-sm font-normal text-zinc-500">(+{scheduledStreams.length} Jadwal)</span>}
                        </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/40">
                        <span className="text-sm text-zinc-400 font-medium">Peak Viewers Tertinggi</span>
                        {isAnalyticsLoading ? (
                            <div className="space-y-2.5 animate-pulse">
                                <div className="h-6 w-32 bg-zinc-800/60 rounded-lg"></div>
                                <div className="h-4 w-36 bg-zinc-800/40 rounded-md"></div>
                            </div>
                        ) : (
                            <p className="text-2xl sm:text-3xl font-semibold text-zinc-100 mt-1">
                                {totalPeakViewers > 0 ? totalPeakViewers.toLocaleString() : "-"}
                            </p>
                        )}
                    </div>
                    <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/40">
                        <span className="text-sm text-zinc-400 font-medium">Interval Sinkronisasi</span>
                        <p className="text-2xl sm:text-3xl font-semibold text-zinc-100 mt-1">30 Detik</p>
                    </div>
                </div>
            </section>

            {/* LIVE & SCHEDULED STREAMS SECTION */}
            <section className="space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100">Live & Jadwal Streaming</h2>
                        <p className="text-sm text-zinc-400 mt-0.5">Daftar live streaming yang sedang berlangsung dan terjadwal</p>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm text-zinc-300 hover:text-white transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{refreshing ? "Memuat..." : "Refresh"}</span>
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-64 rounded-2xl bg-zinc-900/30 border border-zinc-800/30 animate-pulse p-4 space-y-3">
                                <div className="h-36 bg-zinc-800/40 rounded-xl"></div>
                                <div className="h-4 w-3/4 bg-zinc-800/40 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : streams.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {streams.map((stream) => {
                            const isScheduled = stream.status === "scheduled";
                            return (
                                <div
                                    key={stream.slug || stream.id}
                                    onClick={() => navigate(`/streaming?slug=${stream.slug}`)}
                                    className="group bg-zinc-900/30 hover:bg-zinc-900/70 border border-zinc-800/40 hover:border-zinc-700/60 rounded-2xl p-4 transition duration-200 cursor-pointer flex flex-col justify-between"
                                >
                                    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-950 mb-4">
                                        <img
                                            src={stream.image_url || stream.creator?.avatar || "https://cdn.idn.media/idnaccount/avatar/default.png"}
                                            alt={stream.title}
                                            className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                                        />
                                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 text-xs font-semibold text-zinc-200">
                                            <span className={`w-1.5 h-1.5 rounded-full ${isScheduled ? "bg-zinc-500" : "bg-red-500"}`}></span>
                                            {isScheduled ? "DIJADWALKAN" : "LIVE"}
                                        </div>
                                        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/80 text-xs text-zinc-300 font-medium">
                                            {isScheduled
                                                ? (stream.live_at ? new Date(stream.live_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB" : "Jadwal")
                                                : `${Number(stream.view_count || 0).toLocaleString()} penonton`}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <img
                                            src={stream.creator?.avatar || "https://cdn.idn.media/idnaccount/avatar/default.png"}
                                            alt={stream.creator?.name || "Creator"}
                                            className="w-10 h-10 rounded-xl object-cover bg-zinc-800 shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-zinc-100 font-semibold text-base truncate group-hover:text-white">
                                                {stream.title}
                                            </h3>
                                            <p className="text-zinc-400 text-sm truncate mt-0.5">
                                                {stream.creator?.name || "Member"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-zinc-800/30 flex items-center justify-between text-sm text-zinc-400">
                                        <span>{isScheduled ? "Lihat Jadwal" : "Tonton Stream"}</span>
                                        <span className="text-zinc-300 font-medium">→</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-10 rounded-2xl bg-zinc-900/20 border border-zinc-800/30 text-center max-w-lg mx-auto space-y-2">
                        <p className="text-base font-semibold text-zinc-200">Belum ada live stream aktif</p>
                        <p className="text-sm text-zinc-400">
                            Saat ini belum ada member yang memulai live stream di IDN App.
                        </p>
                    </div>
                )}
            </section>

            {/* ANALYTICS PREVIEW SECTION */}
            <section className="space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100">Ringkasan Analytics</h2>
                        <p className="text-sm text-zinc-400 mt-0.5">Informasi performa live analytics</p>
                    </div>
                    <Link
                        to="/analytics"
                        className="text-sm text-zinc-300 hover:text-white font-medium transition"
                    >
                        Buka grafik lengkap →
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/40 space-y-3">
                        <span className="text-sm text-zinc-400 font-medium">Top Streamer</span>
                        {isAnalyticsLoading ? (
                            <div className="space-y-2.5 animate-pulse">
                                <div className="h-6 w-32 bg-zinc-800/60 rounded-lg"></div>
                                <div className="h-4 w-36 bg-zinc-800/40 rounded-md"></div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-lg font-semibold text-zinc-100">
                                    {topStreamer?.fullName || "-"}
                                </p>
                                <p className="text-sm text-zinc-400 mt-1">
                                    Durasi: {formatDurationIndo(topStreamer?.duration)}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/40 space-y-3">
                        <span className="text-sm text-zinc-400 font-medium">Peak Viewers</span>
                        {isAnalyticsLoading ? (
                            <div className="space-y-2.5 animate-pulse">
                                <div className="h-6 w-32 bg-zinc-800/60 rounded-lg"></div>
                                <div className="h-4 w-36 bg-zinc-800/40 rounded-md"></div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-lg font-semibold text-zinc-100">
                                    {totalPeakViewers > 0 ? `${totalPeakViewers.toLocaleString()} penonton` : "-"}
                                </p>
                                <p className="text-sm text-zinc-400 mt-1">
                                    {streamersList.length} member tercatat
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/40 space-y-3">
                        <span className="text-sm text-zinc-400 font-medium">Rata-rata Penonton (Avg)</span>
                        {isAnalyticsLoading ? (
                            <div className="space-y-2.5 animate-pulse">
                                <div className="h-6 w-32 bg-zinc-800/60 rounded-lg"></div>
                                <div className="h-4 w-36 bg-zinc-800/40 rounded-md"></div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-lg font-semibold text-zinc-100">
                                    {topStreamer?.avgViewers !== undefined ? `${Math.round(topStreamer.avgViewers).toLocaleString()} penonton` : "-"}
                                </p>
                                <p className="text-sm text-zinc-400 mt-1">
                                    {topStreamer?.totalSnapshots ? `${topStreamer.totalSnapshots} snapshot tercatat` : "Rata-rata top streamer"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* FEATURES OVERVIEW */}
            <section className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-zinc-900/20 border border-zinc-800/30 space-y-2">
                        <h3 className="text-base font-semibold text-zinc-200">Video Player HLS</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Pemutaran live stream ringan dengan sinkronisasi langsung dan latency rendah.
                        </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-zinc-900/20 border border-zinc-800/30 space-y-2">
                        <h3 className="text-base font-semibold text-zinc-200">Live Chat IRC</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Terhubung langsung ke WebSocket server IDN untuk membaca pesan real-time.
                        </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-zinc-900/20 border border-zinc-800/30 space-y-2">
                        <h3 className="text-base font-semibold text-zinc-200">Multi-Live Graph</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Visualisasi grafik penonton dan durasi live per member secara komparatif.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
