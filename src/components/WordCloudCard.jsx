import { useState, useMemo } from 'react';

export default function WordCloudCard({ wordCloud = [], isLoading = false, streamerName = '', isLive = false }) {
    const [viewMode, setViewMode] = useState('cloud'); // 'cloud' | 'list'
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredWord, setHoveredWord] = useState(null);

    const filteredWords = useMemo(() => {
        if (!wordCloud || !wordCloud.length) return [];
        if (!searchQuery.trim()) return wordCloud;
        const query = searchQuery.toLowerCase();
        return wordCloud.filter(item => item.text.toLowerCase().includes(query));
    }, [wordCloud, searchQuery]);

    const { minVal, maxVal } = useMemo(() => {
        if (!wordCloud || !wordCloud.length) return { minVal: 0, maxVal: 0 };
        const values = wordCloud.map(w => Number(w.value || 0));
        return {
            minVal: Math.min(...values),
            maxVal: Math.max(...values)
        };
    }, [wordCloud]);

    // Color and size helpers
    const getWordStyle = (value, index) => {
        const range = maxVal - minVal || 1;
        const normalized = (value - minVal) / range; // 0 to 1

        // Font size from 12px (text-xs) to 34px (text-3xl)
        const fontSizeRem = 0.8 + normalized * 1.35; // 0.8rem to 2.15rem

        // Color palette based on rank & prominence
        let colorClass = 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/40 border-zinc-800/80';
        let glowStyle = {};

        if (index === 0) {
            colorClass = 'text-emerald-300 font-bold bg-emerald-500/15 border-emerald-500/30 shadow-emerald-500/10 shadow-lg';
            glowStyle = { textShadow: '0 0 12px rgba(52, 211, 153, 0.4)' };
        } else if (index === 1) {
            colorClass = 'text-amber-300 font-bold bg-amber-500/15 border-amber-500/30';
            glowStyle = { textShadow: '0 0 10px rgba(251, 191, 36, 0.3)' };
        } else if (index === 2) {
            colorClass = 'text-cyan-300 font-bold bg-cyan-500/15 border-cyan-500/30';
            glowStyle = { textShadow: '0 0 8px rgba(34, 211, 238, 0.3)' };
        } else if (index < 10) {
            colorClass = 'text-indigo-300 font-semibold bg-indigo-500/10 border-indigo-500/20';
        } else if (index < 25) {
            colorClass = 'text-zinc-200 font-medium bg-zinc-800/60 border-zinc-700/60';
        }

        return {
            fontSize: `${fontSizeRem}rem`,
            lineHeight: 1.2,
            ...glowStyle,
            className: colorClass
        };
    };

    if (isLoading) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-5 w-48 bg-zinc-800 rounded"></div>
                    <div className="h-8 w-32 bg-zinc-800 rounded-lg"></div>
                </div>
                <div className="h-56 bg-zinc-800/30 rounded-xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!wordCloud || wordCloud.length === 0) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-5 text-center text-zinc-400 text-sm space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-zinc-800/80 border-zinc-700/80 text-zinc-300">
                    <span>☁️ Topik Hangat & Word Cloud</span>
                </div>
                {isLive ? (
                    <div>
                        <p className="text-zinc-200 font-medium text-sm">🔴 Siaran Sedang Berlangsung</p>
                        <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                            Word Cloud (Top 50 Kata) sedang dianalisis dari riwayat live chat dan akan otomatis tersedia setelah sesi live ini selesai.
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-zinc-300 font-medium text-sm">Belum ada data topik & kata kunci untuk siaran ini.</p>
                        <p className="text-xs text-zinc-500 mt-1">Data kata terpopuler akan otomatis muncul saat penonton berinteraksi di live chat.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                            <span>☁️ Topik Hangat & Top 50 Kata</span>
                        </h3>
                        <span className="text-xs text-zinc-400">
                            ({filteredWords.length} kata {streamerName ? `• ${streamerName}` : ''})
                        </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Topik yang paling sering dibicarakan penonton selama live streaming
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                    {/* Search Input */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Cari kata kunci..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-zinc-900 border rounded-lg px-2.5 py-1.5 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 w-36 sm:w-44"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
                        <button
                            onClick={() => setViewMode('cloud')}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                                viewMode === 'cloud'
                                    ? 'bg-zinc-800 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            <span>☁️ Cloud</span>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                                viewMode === 'list'
                                    ? 'bg-zinc-800 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            <span>📋 Top Rank</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Hovered Word Summary Bar */}
            <div className="min-h-6 flex items-center justify-between text-xs px-1">
                {hoveredWord ? (
                    <div className="flex items-center gap-2 text-zinc-200 animate-fadeIn">
                        <span className="text-zinc-400">Kata:</span>
                        <strong className="text-emerald-400 font-semibold text-sm">"{hoveredWord.text}"</strong>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-300 font-medium">{Number(hoveredWord.value).toLocaleString()} kali diucapkan</span>
                        <span className="text-zinc-500 text-[11px]">
                            ({maxVal > 0 ? ((hoveredWord.value / maxVal) * 100).toFixed(0) : 0}% dari kata teratas)
                        </span>
                    </div>
                ) : (
                    <span className="text-zinc-500 text-xs italic">
                        {viewMode === 'cloud' ? 'Arahkan kursor atau klik kata untuk melihat frekuensi' : 'Peringkat 50 kata yang paling dominan di live chat'}
                    </span>
                )}
            </div>

            {/* Content Display */}
            {viewMode === 'cloud' ? (
                <div className="min-h-56 p-4 sm:p-6 rounded-xl bg-zinc-950/40 border border-zinc-800/40 flex flex-wrap items-center justify-center gap-2 sm:gap-3 select-none">
                    {filteredWords.length === 0 ? (
                        <p className="text-zinc-500 text-xs py-8">Tidak ada kata yang sesuai dengan pencarian "{searchQuery}"</p>
                    ) : (
                        filteredWords.map((item, idx) => {
                            const style = getWordStyle(item.value, idx);
                            const isHovered = hoveredWord?.text === item.text;

                            return (
                                <button
                                    key={item.text}
                                    onMouseEnter={() => setHoveredWord(item)}
                                    onMouseLeave={() => setHoveredWord(null)}
                                    onClick={() => setHoveredWord(item)}
                                    style={{
                                        fontSize: style.fontSize,
                                        lineHeight: style.lineHeight,
                                        ...style
                                    }}
                                    className={`px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-1.5 transform hover:scale-105 ${
                                        style.className
                                    } ${isHovered ? 'ring-2 ring-emerald-400 scale-110 z-10' : ''}`}
                                >
                                    <span>{item.text}</span>
                                    <span className="text-[10px] opacity-75 font-normal">
                                        {Number(item.value).toLocaleString()}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            ) : (
                /* Mode List / Top Ranking */
                <div className="overflow-x-auto max-h-80 custom-scrollbar rounded-xl border border-zinc-800/60 bg-zinc-950/30">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-900/90 text-zinc-400 sticky top-0 border-b border-zinc-800">
                            <tr>
                                <th className="py-2.5 px-3 w-16 text-center font-medium">Rank</th>
                                <th className="py-2.5 px-3 font-medium">Kata Kunci</th>
                                <th className="py-2.5 px-3 w-32 sm:w-48 font-medium">Frekuensi Relatif</th>
                                <th className="py-2.5 px-3 w-28 text-right font-medium">Total Sebutan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                            {filteredWords.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-6 text-center text-zinc-500 text-xs">
                                        Tidak ada kata yang sesuai dengan pencarian "{searchQuery}"
                                    </td>
                                </tr>
                            ) : (
                                filteredWords.map((item, idx) => {
                                    const rank = idx + 1;
                                    const relativePct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                                    
                                    let rankBadge = <span className="text-zinc-400 font-semibold">#{rank}</span>;
                                    if (rank === 1) rankBadge = <span className="text-base">🥇</span>;
                                    else if (rank === 2) rankBadge = <span className="text-base">🥈</span>;
                                    else if (rank === 3) rankBadge = <span className="text-base">🥉</span>;

                                    return (
                                        <tr
                                            key={item.text}
                                            onMouseEnter={() => setHoveredWord(item)}
                                            onMouseLeave={() => setHoveredWord(null)}
                                            className="hover:bg-zinc-800/40 transition"
                                        >
                                            <td className="py-2 px-3 text-center">{rankBadge}</td>
                                            <td className="py-2 px-3">
                                                <span className={`font-medium ${rank <= 3 ? 'text-zinc-100 font-semibold' : 'text-zinc-300'}`}>
                                                    {item.text}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3">
                                                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        style={{ width: `${relativePct}%` }}
                                                        className={`h-full rounded-full ${
                                                            rank === 1 ? 'bg-emerald-400' :
                                                            rank === 2 ? 'bg-amber-400' :
                                                            rank === 3 ? 'bg-cyan-400' :
                                                            'bg-indigo-400'
                                                        }`}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-right font-semibold text-zinc-100">
                                                {Number(item.value).toLocaleString()} <span className="text-zinc-500 text-[10px] font-normal">x</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
