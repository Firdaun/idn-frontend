export default function SentimentCard({ sentiment, isLoading = false }) {
    if (isLoading) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-5 w-40 bg-zinc-800 rounded"></div>
                    <div className="h-5 w-24 bg-zinc-800 rounded-full"></div>
                </div>
                <div className="h-3.5 bg-zinc-800 rounded-full w-full"></div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 bg-zinc-800/50 rounded-lg"></div>
                    <div className="h-16 bg-zinc-800/50 rounded-lg"></div>
                    <div className="h-16 bg-zinc-800/50 rounded-lg"></div>
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
        positive,
        neutral,
        negative,
        positivePercentage: positivePct,
        neutralPercentage: neutralPct,
        negativePercentage: negativePct
    } = sentiment;

    // Mood highlight logic
    let moodBadge = {
        label: 'Respon Santai & Netral',
        color: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        icon: '⚪'
    };

    if (negativePct >= 15 && negative >= 10) {
        moodBadge = {
            label: 'Terdeteksi Kendala Teknis / Komplain',
            color: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
            icon: '🔴'
        };
    } else if (positivePct >= 50) {
        moodBadge = {
            label: 'Audiens Sangat Positif & Antusias',
            color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            icon: '🟢'
        };
    } else if (positivePct > neutralPct && positivePct > negativePct) {
        moodBadge = {
            label: 'Didominasi Respon Ceria',
            color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            icon: '✨'
        };
    }

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-4">
            {/* Header */}
            <div className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-2">
                <span>💬 Analisis Sentimen Obrolan</span>
            </div>


            {/* Multi-Segment Sentiment Bar */}
            <div className="space-y-1.5">
                <div className="h-3 w-full bg-zinc-800/80 rounded-full overflow-hidden flex shadow-inner">
                    {positivePct > 0 && (
                        <div
                            style={{ width: `${positivePct}%` }}
                            className="bg-emerald-500 hover:brightness-110 transition-all duration-500 relative group cursor-pointer"
                            title={`Positif: ${positive.toLocaleString()} (${positivePct}%)`}
                        />
                    )}
                    {neutralPct > 0 && (
                        <div
                            style={{ width: `${neutralPct}%` }}
                            className="bg-zinc-400 hover:brightness-110 transition-all duration-500 relative group cursor-pointer"
                            title={`Netral: ${neutral.toLocaleString()} (${neutralPct}%)`}
                        />
                    )}
                    {negativePct > 0 && (
                        <div
                            style={{ width: `${negativePct}%` }}
                            className="bg-rose-500 hover:brightness-110 transition-all duration-500 relative group cursor-pointer"
                            title={`Komplain / Negatif: ${negative.toLocaleString()} (${negativePct}%)`}
                        />
                    )}
                </div>

                <div className="flex justify-between items-center text-[11px] text-zinc-400 px-0.5">
                    <span className="text-emerald-400 font-medium">{positivePct}% Positif</span>
                    <span className="text-zinc-300 font-medium">{neutralPct}% Netral</span>
                    <span className="text-rose-400 font-medium">{negativePct}% Komplain</span>
                </div>
            </div>

            {/* Metric Detail Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {/* Positif */}
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3 hover:border-emerald-500/40 transition">
                    <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Pujian & Tawa
                        </span>
                        <span className="text-xs font-semibold">{positivePct}%</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-zinc-100 mt-1">
                        {positive.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        Pujian, tawa (wkwk), antusiasme
                    </p>
                </div>

                {/* Netral */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3 hover:border-zinc-700 transition">
                    <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
                            Obrolan Umum
                        </span>
                        <span className="text-xs font-semibold">{neutralPct}%</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-zinc-100 mt-1">
                        {neutral.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        Sapaan & obrolan santai penonton
                    </p>
                </div>

                {/* Negatif / Kendala */}
                <div className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-3 hover:border-rose-500/40 transition">
                    <div className="flex items-center justify-between text-rose-400 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            Keluhan Teknis
                        </span>
                        <span className="text-xs font-semibold">{negativePct}%</span>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-zinc-100 mt-1">
                        {negative.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        Lag, buffering, patah, muter
                    </p>
                </div>
            </div>
        </div>
    );
}
