export default function SentimentCard({ sentiment, isLoading = false }) {
    if (isLoading) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-5 w-40 bg-zinc-800 rounded"></div>
                    <div className="h-5 w-24 bg-zinc-800 rounded-full"></div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-zinc-800 shrink-0"></div>
                    <div className="flex-1 w-full flex flex-col gap-2">
                        <div className="h-8 bg-zinc-800/50 rounded-lg"></div>
                        <div className="h-8 bg-zinc-800/50 rounded-lg"></div>
                        <div className="h-8 bg-zinc-800/50 rounded-lg"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!sentiment) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-5 text-center text-zinc-400 text-sm">
                <p className="text-zinc-300 font-medium">Belum ada data sentimen untuk siaran ini.</p>
                <p className="text-xs text-zinc-500 mt-1">Data sentimen akan dihitung secara langsung berdasarkan pesan penonton.</p>
            </div>
        );
    }

    const {
        positive = 0,
        neutral = 0,
        negative = 0,
        positivePercentage: positivePct = 0,
        neutralPercentage: neutralPct = 0,
        negativePercentage: negativePct = 0
    } = sentiment;

    // Mood highlight logic
    let moodBadge = {
        label: 'Respon Santai & Netral',
        color: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        icon: '🔵'
    };

    if (negativePct >= 15 && negative >= 10) {
        moodBadge = {
            label: 'Kendala / Komplain',
            color: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
            icon: '🔴'
        };
    } else if (positivePct >= 50) {
        moodBadge = {
            label: 'Sangat Positif & Antusias',
            color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            icon: '🟢'
        };
    } else if (positivePct > neutralPct && positivePct > negativePct) {
        moodBadge = {
            label: 'Didominasi Ceria',
            color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            icon: '✨'
        };
    }

    // Kalkulasi Full Pie Chart (Lingkaran Penuh Tanpa Lubang Donut)
    const totalMessages = positive + neutral + negative;
    const radius = 27.5;
    const strokeWidth = 55;
    const circumference = 2 * Math.PI * radius;

    const posLen = totalMessages > 0 ? (positive / totalMessages) * circumference : 0;
    const neuLen = totalMessages > 0 ? (neutral / totalMessages) * circumference : 0;
    const negLen = totalMessages > 0 ? (negative / totalMessages) * circumference : 0;

    const posOffset = 0;
    const neuOffset = -posLen;
    const negOffset = -(posLen + neuLen);

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-3.5 lg:space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800/80 pb-2.5 lg:pb-5">
                <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-1.5">
                        <span>💬 Sentimen Obrolan</span>
                    </span>
                    <span className="text-xs text-zinc-400">
                        ({totalMessages.toLocaleString()} pesan)
                    </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border flex items-center gap-1.5 ${moodBadge.color}`}>
                    <span>{moodBadge.icon}</span>
                    <span>{moodBadge.label}</span>
                </span>
            </div>

            {/* Konten Utama: Lingkaran Penuh (Full Pie Chart) & Informasi Side-by-Side */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 lg:gap-3 pt-1 max-w-125 mx-auto">
                {/* Full Pie Chart Lingkaran Penuh */}
                <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90 drop-shadow-md" viewBox="0 0 120 120">
                        {/* Background track circle */}
                        <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            className="stroke-zinc-800/90"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        {/* Slice Positif (Hijau Emerald) */}
                        {posLen > 0 && (
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                stroke="#10b981"
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${posLen} ${circumference}`}
                                strokeDashoffset={posOffset}
                                fill="none"
                                className="transition-all duration-700 hover:brightness-110 cursor-pointer"
                            >
                                <title>{`Positif: ${positive.toLocaleString()} (${positivePct}%)`}</title>
                            </circle>
                        )}
                        {/* Slice Netral (Biru Sky) */}
                        {neuLen > 0 && (
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                stroke="#38bdf8"
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${neuLen} ${circumference}`}
                                strokeDashoffset={neuOffset}
                                fill="none"
                                className="transition-all duration-700 hover:brightness-110 cursor-pointer"
                            >
                                <title>{`Netral: ${neutral.toLocaleString()} (${neutralPct}%)`}</title>
                            </circle>
                        )}
                        {/* Slice Negatif (Merah Rose) */}
                        {negLen > 0 && (
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                stroke="#f43f5e"
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${negLen} ${circumference}`}
                                strokeDashoffset={negOffset}
                                fill="none"
                                className="transition-all duration-700 hover:brightness-110 cursor-pointer"
                            >
                                <title>{`Negatif: ${negative.toLocaleString()} (${negativePct}%)`}</title>
                            </circle>
                        )}
                    </svg>
                </div>

                {/* Informasi Tambahan Kompak Bersebelahan */}
                <div className="flex-1 w-full flex flex-col gap-2 min-w-0">
                    {/* Positif */}
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 hover:border-emerald-500/40 transition">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="text-xs font-medium text-emerald-300 truncate">Positif</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 shrink-0">
                            <span className="text-xs sm:text-sm font-bold text-zinc-100">{positive.toLocaleString()}</span>
                            <span className="text-[11px] font-semibold text-emerald-400">({positivePct}%)</span>
                        </div>
                    </div>

                    {/* Netral */}
                    <div className="bg-sky-950/20 border border-sky-500/20 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 hover:border-sky-500/40 transition">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                            <span className="text-xs font-medium text-sky-300 truncate">Netral</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 shrink-0">
                            <span className="text-xs sm:text-sm font-bold text-zinc-100">{neutral.toLocaleString()}</span>
                            <span className="text-[11px] font-semibold text-sky-400">({neutralPct}%)</span>
                        </div>
                    </div>

                    {/* Negatif */}
                    <div className="bg-rose-950/20 border border-rose-500/20 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 hover:border-rose-500/40 transition">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                            <span className="text-xs font-medium text-rose-300 truncate">Negatif</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 shrink-0">
                            <span className="text-xs sm:text-sm font-bold text-zinc-100">{negative.toLocaleString()}</span>
                            <span className="text-[11px] font-semibold text-rose-400">({negativePct}%)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
