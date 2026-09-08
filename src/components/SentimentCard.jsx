export default function SentimentCard({ sentiment, isLoading = false }) {
    if (isLoading) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-5 w-40 bg-zinc-800 rounded"></div>
                    <div className="h-5 w-24 bg-zinc-800 rounded-full"></div>
                </div>
                <div className="flex justify-center items-center py-2">
                    <div className="w-32 h-32 rounded-full border-8 border-zinc-800"></div>
                </div>
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

    // Kalkulasi Donut Chart Lingkaran Persentase
    const totalMessages = positive + neutral + negative;
    const radius = 46;
    const circumference = 2 * Math.PI * radius;

    const posLen = totalMessages > 0 ? (positive / totalMessages) * circumference : 0;
    const neuLen = totalMessages > 0 ? (neutral / totalMessages) * circumference : 0;
    const negLen = totalMessages > 0 ? (negative / totalMessages) * circumference : 0;

    const posOffset = 0;
    const neuOffset = -posLen;
    const negOffset = -(posLen + neuLen);

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800/80 pb-3">
                <div className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-2">
                    <span>💬 Analisis Sentimen Obrolan</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${moodBadge.color}`}>
                    <span>{moodBadge.icon}</span>
                    <span>{moodBadge.label}</span>
                </span>
            </div>

            {/* Lingkaran Persentase (Donut Chart) & Legenda */}
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-around gap-4 py-1">
                {/* Donut Ring Chart */}
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        {/* Background track circle */}
                        <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            className="stroke-zinc-800/80"
                            strokeWidth="11"
                            fill="none"
                        />
                        {/* Arc Positif (Hijau Emerald) */}
                        {posLen > 0 && (
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                stroke="#10b981"
                                strokeWidth="11"
                                strokeDasharray={`${posLen} ${circumference}`}
                                strokeDashoffset={posOffset}
                                fill="none"
                                className="transition-all duration-700 hover:brightness-125 cursor-pointer"
                            >
                                <title>{`Positif: ${positive.toLocaleString()} (${positivePct}%)`}</title>
                            </circle>
                        )}
                        {/* Arc Netral (Biru Sky Menonjol) */}
                        {neuLen > 0 && (
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                stroke="#38bdf8"
                                strokeWidth="11"
                                strokeDasharray={`${neuLen} ${circumference}`}
                                strokeDashoffset={neuOffset}
                                fill="none"
                                className="transition-all duration-700 hover:brightness-125 cursor-pointer"
                            >
                                <title>{`Netral: ${neutral.toLocaleString()} (${neutralPct}%)`}</title>
                            </circle>
                        )}
                        {/* Arc Negatif (Merah Rose) */}
                        {negLen > 0 && (
                            <circle
                                cx="60"
                                cy="60"
                                r={radius}
                                stroke="#f43f5e"
                                strokeWidth="11"
                                strokeDasharray={`${negLen} ${circumference}`}
                                strokeDashoffset={negOffset}
                                fill="none"
                                className="transition-all duration-700 hover:brightness-125 cursor-pointer"
                            >
                                <title>{`Keluhan / Negatif: ${negative.toLocaleString()} (${negativePct}%)`}</title>
                            </circle>
                        )}
                    </svg>

                    {/* Teks Tengah Lingkaran */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                        <span className="text-base sm:text-lg font-bold text-zinc-100">
                            {totalMessages > 0 ? totalMessages.toLocaleString() : '0'}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">
                            Total Pesan
                        </span>
                    </div>
                </div>

                {/* Legenda & Rincian Persentase */}
                <div className="flex flex-col justify-center gap-2 w-full sm:w-auto flex-1 sm:max-w-xs">
                    {/* Positif */}
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50"></span>
                            <span className="text-zinc-200 font-medium">Positif</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">{positivePct}%</span>
                            <span className="text-zinc-400 text-[11px]">({positive.toLocaleString()})</span>
                        </div>
                    </div>

                    {/* Netral (Sky Blue Menonjol) */}
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-xs shadow-sky-400/50"></span>
                            <span className="text-zinc-200 font-medium">Netral</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sky-400 font-bold">{neutralPct}%</span>
                            <span className="text-zinc-400 text-[11px]">({neutral.toLocaleString()})</span>
                        </div>
                    </div>

                    {/* Negatif */}
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-xs shadow-rose-400/50"></span>
                            <span className="text-zinc-200 font-medium">Keluhan</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-rose-400 font-bold">{negativePct}%</span>
                            <span className="text-zinc-400 text-[11px]">({negative.toLocaleString()})</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metric Detail Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
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

                {/* Netral (Warna Sky Blue Menonjol) */}
                <div className="bg-sky-950/20 border border-sky-500/20 rounded-lg p-3 hover:border-sky-500/40 transition">
                    <div className="flex items-center justify-between text-sky-400 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
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
