import { countMemberSnapshots, formatLiveTime, calculateDurationAtTime } from '../../../utils/analyticsHelpers';

export default function StreamStatsCard({
    isLoading = false,
    isCurrentSessionLive = false,
    filteredChartData = [],
    selectedStreamer = null,
    setSelectedStreamer,
    activeSession = null,
    activeSentiment = null,
    isSnapshotHighlight = false
}) {
    if (isLoading) {
        return (
            <div id="analytics-stats-card" className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-3 lg:space-y-5 flex-1 animate-pulse">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 lg:pb-5">
                    <div className="h-5 sm:h-6 w-36 bg-zinc-800 rounded" />
                    <div className="h-4 w-20 bg-zinc-800/80 rounded" />
                </div>

                {/* 8 Grid Metrik Skeleton */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 lg:gap-3">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-2.5 space-y-2">
                            <div className="h-3.5 w-24 bg-zinc-800/80 rounded" />
                            <div className="h-5 sm:h-6 w-16 bg-zinc-800/90 rounded" />
                        </div>
                    ))}
                </div>

                {/* Snapshot Inspector Skeleton */}
                <div className="bg-zinc-950/30 border border-zinc-800/60 rounded-lg p-3 flex flex-col justify-center items-center h-[90.3px] space-y-2">
                    <div className="h-3.5 w-36 bg-zinc-800/80 rounded" />
                    <div className="h-3 w-52 sm:w-64 bg-zinc-800/50 rounded" />
                </div>
            </div>
        );
    }

    const handleCloseSnapshot = () => {
        if (typeof setSelectedStreamer === 'function') {
            setSelectedStreamer(prev => prev ? ({
                ...prev,
                clickedTime: null,
                clickedViewers: null,
                clickedChat: null,
                clickedPos: null,
                clickedNeu: null,
                clickedNeg: null
            }) : null);
        }
    };

    const metrics = [
        {
            label: 'Total Nilai Rupiah',
            value: (
                <span className="text-emerald-400 font-bold truncate block">
                    Rp {activeSession?.totalIdr?.toLocaleString('id-ID')}
                </span>
            )
        },
        {
            label: 'Total Donasi Gold',
            value: (
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <img
                        className="w-4 h-4 object-contain shrink-0"
                        src="https://cdn.idntimes.com/content-images/icons/virtual-gifts/icons-db4c48e5772bbb084699019e4903ed5c.png"
                        alt="GOLD"
                    />
                    <span>{activeSession?.totalGold?.toLocaleString('id-ID')}</span>
                    <span className="text-[11px] font-normal text-amber-400/80">Gold</span>
                </div>
            )
        },
        { label: 'Puncak Penonton', value: activeSession?.peakViewers?.toLocaleString('id-ID') },
        { label: 'Rata-rata Penonton', value: Math.round(activeSession?.avgViewers || 0).toLocaleString('id-ID') },
        { label: 'Total Pesan', value: activeSentiment?.totalChat?.toLocaleString('id-ID') },
        { label: 'Puncak Pesan / 30 dtk', value: activeSession?.peakChat },
        { label: 'Rata-rata Pesan / 30 dtk', value: activeSession?.avgChat },
        { label: 'Sentimen Positif', value: activeSentiment?.positivePercentage }
    ];

    return (
        <div id="analytics-stats-card" className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-3 lg:space-y-5 flex-1">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 lg:pb-5">
                <span className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-2">
                    <span>📊 Statistik Siaran</span>
                </span>
                <span className="text-xs text-zinc-400">
                    {`${countMemberSnapshots(filteredChartData, selectedStreamer?.name, activeSession?.slug)}x cuplikan`}
                </span>
            </div>

            {/* Ringkasan Metrik / Pemberitahuan Siaran Sedang Berlangsung */}
            {isCurrentSessionLive ? (
                <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-5 text-center space-y-2">
                    <p className="text-zinc-200 font-medium text-sm">🔴 Siaran Sedang Berlangsung</p>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        Ringkasan statistik siaran (puncak & rata-rata penonton serta pesan) sedang dikumpulkan dan akan otomatis tersedia setelah sesi siaran ini selesai.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 lg:gap-3">
                    {metrics.map((metric) => (
                        <div key={metric.label} className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-2.5">
                            <span className="text-xs text-zinc-400 font-medium block truncate">{metric.label}</span>
                            <div className="font-bold text-zinc-100 text-base sm:text-lg mt-0.5">
                                {metric.value}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Snapshot Inspector (Titik Cuplikan Terpilih) */}
            {selectedStreamer?.clickedTime ? (
                <div
                    className={`border rounded-lg p-3 space-y-2 transition-all duration-500 ease-out ${isSnapshotHighlight
                        ? 'bg-indigo-950/40 border-indigo-400/80 shadow-[0_0_24px_rgba(99,102,241,0.25)] animate-snapshot-pop'
                        : 'bg-indigo-950/20 border-indigo-500/30 shadow-none'
                        }`}
                >
                    <div className="flex items-center justify-between text-xs border-b border-indigo-500/20 pb-1.5">
                        <span className={`font-semibold flex items-center gap-1.5 transition-colors duration-300 ${isSnapshotHighlight ? 'text-indigo-200' : 'text-indigo-300'
                            }`}>
                            <span>📍</span>
                            <span>Titik Cuplikan Terpilih</span>
                        </span>
                        <div className="flex items-center">
                            <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold transition-all duration-300 ${isSnapshotHighlight
                                ? 'bg-indigo-500/30 text-indigo-100 animate-flash-badge'
                                : 'text-zinc-400 bg-transparent'
                                }`}>
                                {formatLiveTime(selectedStreamer.clickedTime)}
                            </span>
                            <button
                                type="button"
                                onClick={handleCloseSnapshot}
                                className="text-zinc-400 hover:text-zinc-200 transition text-[11px] px-1 rounded hover:bg-indigo-500/20 cursor-pointer"
                                title="Tutup cuplikan titik"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
                        <div>
                            <span className="text-[11px] text-zinc-400 block">Durasi Saat Itu</span>
                            <span className={`font-semibold text-zinc-200 block ${isSnapshotHighlight ? 'animate-number-flip' : ''}`}>
                                {calculateDurationAtTime(activeSession?.liveAt, selectedStreamer.clickedTime)}
                            </span>
                        </div>
                        <div>
                            <span className="text-[11px] text-zinc-400 block">Penonton</span>
                            <span className={`font-bold block transition-colors duration-300 ${isSnapshotHighlight ? 'animate-number-flip text-white' : 'text-zinc-100'}`}>
                                👥 {selectedStreamer.clickedViewers}
                            </span>
                        </div>
                        <div>
                            <span className="text-[11px] text-zinc-400 block">Pesan / 30 dtk</span>
                            <span className={`font-bold block transition-colors duration-300 ${isSnapshotHighlight ? 'animate-number-flip text-white' : 'text-zinc-100'}`}>
                                💬 {selectedStreamer.clickedChat}
                            </span>
                        </div>
                        <div>
                            <span className="text-[11px] text-zinc-400 block">Sentimen</span>
                            <span className={`font-semibold text-[11px] text-zinc-200 flex items-center gap-1 ${isSnapshotHighlight ? 'animate-number-flip' : ''}`}>
                                <span className="text-emerald-400">🟢 {selectedStreamer.clickedPos}</span>
                                <span className="text-sky-400">🔵 {selectedStreamer.clickedNeu}</span>
                                <span className="text-rose-400">🔴 {selectedStreamer.clickedNeg}</span>
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-zinc-950/30 border border-dashed border-zinc-800/80 rounded-lg p-3 flex flex-col justify-center text-center h-[90.3px] space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-400">
                        <span>📍</span>
                        <span>Titik Cuplikan Terpilih</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed max-w-lg mx-auto">
                        Nilai pada bagian ini akan terisi jika kamu mengklik salah satu titik pada garis grafik di bawah.
                    </p>
                </div>
            )}
        </div>
    );
}
