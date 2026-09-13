import { formatLiveTime, calculateSessionDuration } from '../../utils/analyticsHelpers';

export default function AnalyticsDetailHeader({
    selectedStreamer,
    setSelectedStreamer,
    streamerSessions = [],
    currentSessionIndex = -1,
    activeSession = null,
    isSessionTimeLoading = false,
    streamerName = ''
}) {
    if (!selectedStreamer) return null;

    // Logic ganti sesi (Prev / Next) sekarang tinggal di sini!
    const handleSwitchSession = (direction) => {
        if (streamerSessions.length <= 1) return;
        const activeIdx = currentSessionIndex >= 0 ? currentSessionIndex : 0;
        const offset = direction === 'prev' ? -1 : 1;
        const targetIndex = (activeIdx + offset + streamerSessions.length) % streamerSessions.length;
        const target = streamerSessions[targetIndex];

        setSelectedStreamer(prev => ({
            ...prev,
            ...target,
            name: selectedStreamer.name,
            isLegendClick: false,
            clickedTime: null,
            clickedViewers: null,
            clickedChat: null,
            clickedPos: null,
            clickedNeu: null,
            clickedNeg: null
        }));
    };

    const isLive = !(activeSession ? activeSession.endAt : selectedStreamer.endAt);

    return (
        <div
            id="analytics-detail-header"
            className="scroll-mt-24 bg-zinc-900/50 border border-zinc-800/50 p-3 lg:p-5 rounded-lg lg:rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-1"
        >
            {/* Sisi Kiri: Tombol Navigasi Sesi & Info Streamer */}
            <div className="flex items-center justify-between gap-1 min-[375px]:gap-2 xl:gap-5 w-full md:w-auto">
                {streamerSessions.length > 1 && (
                    <button
                        onClick={() => handleSwitchSession('prev')}
                        title="Sesi Sebelumnya"
                        className="p-2 rounded-md lg:rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}

                <div className="min-w-0">
                    <div className="flex items-center min-[375px]:gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-base sm:text-lg text-zinc-100 truncate">
                            {streamerName || selectedStreamer.name}
                        </h3>
                        <div className="flex space-x-0.5 min-[360px]:space-x-0 min-[360px]:gap-1">
                            {isSessionTimeLoading ? (
                                <span className="inline-block h-5 w-18 bg-zinc-800/80 rounded-sm lg:rounded-md animate-pulse" />
                            ) : (
                                <span className={`px-2 py-0.5 rounded-sm lg:rounded-md text-[11px] font-medium border ${isLive
                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                    }`}>
                                    {isLive ? "Sedang Siaran" : "Selesai Siaran"}
                                </span>
                            )}
                            {/* Badge penanda sesi */}
                            {streamerSessions.length > 1 && (
                                <span className="px-2 py-0.5 rounded-sm lg:rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                                    Sesi {(currentSessionIndex >= 0 ? currentSessionIndex : 0) + 1} dari {streamerSessions.length}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-zinc-400 text-xs mt-0.5 truncate">{selectedStreamer.slug}</p>
                </div>

                {streamerSessions.length > 1 && (
                    <button
                        onClick={() => handleSwitchSession('next')}
                        title="Sesi Berikutnya"
                        className="p-2 rounded-md lg:rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Sisi Kanan: Jadwal Waktu & Tombol Reset */}
            <div className="flex items-center justify-between gap-0 md:gap-2 xl:gap-5 w-full md:w-auto flex-wrap border-t md:border-t-0 border-zinc-800/80 pt-1 md:pt-0">
                <div className={`min-w-50 w-53 min-[360px]:w-57 min-[375px]:w-60 min-[412px]:w-70 min-[440px]:w-76 ${streamerSessions.length > 1 ? 'md:w-62' : 'md:w-83'
                    } lg:w-85 overflow-x-auto pb-1`}>
                    <div className="flex items-center gap-3 text-xs sm:text-sm whitespace-nowrap">
                        <div className="shrink-0">
                            <span className="text-zinc-400 block text-xs">Mulai Siaran</span>
                            {isSessionTimeLoading ? (
                                <div className="h-4.5 sm:h-5 w-20 sm:w-24 bg-zinc-800/80 rounded-md animate-pulse mt-0.5" />
                            ) : (
                                <span className="font-semibold text-zinc-200 block">
                                    {formatLiveTime(activeSession?.liveAt || selectedStreamer.liveAt)}
                                </span>
                            )}
                        </div>
                        <div className="shrink-0">
                            <span className="text-zinc-400 block text-xs">Selesai Siaran</span>
                            {isSessionTimeLoading ? (
                                <div className="h-4.5 sm:h-5 w-20 sm:w-24 bg-zinc-800/80 rounded-md animate-pulse mt-0.5" />
                            ) : (
                                <span className="font-semibold text-zinc-200 block">
                                    {(activeSession ? activeSession.endAt : selectedStreamer.endAt) ? formatLiveTime(activeSession?.endAt || selectedStreamer.endAt) : '-'}
                                </span>
                            )}
                        </div>
                        <div className="shrink-0">
                            <span className="text-zinc-400 block text-xs">Total Durasi</span>
                            {isSessionTimeLoading ? (
                                <div className="h-4.5 sm:h-5 w-22 sm:w-26 bg-zinc-800/80 rounded-md animate-pulse mt-0.5" />
                            ) : (
                                <span className="font-semibold text-zinc-200 block">
                                    {calculateSessionDuration(activeSession?.liveAt || selectedStreamer.liveAt, activeSession?.endAt ?? selectedStreamer.endAt)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setSelectedStreamer(null)}
                    className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-md lg:rounded-lg bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer shrink-0 font-medium"
                >
                    Atur Ulang
                </button>
            </div>
        </div>
    );
}
