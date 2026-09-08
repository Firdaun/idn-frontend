import { useState, useMemo } from 'react';

export default function TopChattersCard({ topChatters = [], isLoading = false, streamerName = '', isLive = false }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [failedAvatars, setFailedAvatars] = useState({});

    const filteredChatters = useMemo(() => {
        if (!topChatters || !topChatters.length) return [];
        if (!searchQuery.trim()) return topChatters;
        const query = searchQuery.toLowerCase();
        return topChatters.filter(item => (item.userName || '').toLowerCase().includes(query));
    }, [topChatters, searchQuery]);

    const maxCount = useMemo(() => {
        if (!topChatters || !topChatters.length) return 1;
        return Math.max(...topChatters.map(c => Number(c.count || 0)), 1);
    }, [topChatters]);

    const totalChattersCount = topChatters.length;
    const totalMessagesByTop = useMemo(() => {
        return topChatters.reduce((sum, c) => sum + (Number(c.count) || 0), 0);
    }, [topChatters]);

    const handleImageError = (userUuid) => {
        setFailedAvatars(prev => ({ ...prev, [userUuid]: true }));
    };

    // Helper untuk membuat avatar inisial warna-warni jika avatar null/gagal dimuat
    const renderAvatar = (chatter, sizeClass = 'w-9 h-9 text-xs', borderClass = 'border-zinc-800') => {
        const hasValidAvatar = chatter.userAvatar && !failedAvatars[chatter.userUuid];
        const initial = (chatter.userName || '?').charAt(0).toUpperCase();

        if (hasValidAvatar) {
            return (
                <img
                    src={chatter.userAvatar}
                    alt={chatter.userName}
                    onError={() => handleImageError(chatter.userUuid)}
                    className={`${sizeClass} rounded-full object-cover border ${borderClass} shrink-0 bg-zinc-800`}
                    loading="lazy"
                />
            );
        }

        // Warna latar avatar acak yang konsisten berdasarkan huruf depan
        const charCode = initial.charCodeAt(0) || 0;
        const bgColors = [
            'from-rose-500 to-pink-600',
            'from-indigo-500 to-purple-600',
            'from-emerald-500 to-teal-600',
            'from-amber-500 to-orange-600',
            'from-cyan-500 to-blue-600',
            'from-violet-500 to-fuchsia-600'
        ];
        const colorClass = bgColors[charCode % bgColors.length];

        return (
            <div className={`${sizeClass} rounded-full bg-linear-to-br ${colorClass} border ${borderClass} flex items-center justify-center font-bold text-white shrink-0 shadow-inner`}>
                {initial}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-5 w-48 bg-zinc-800 rounded"></div>
                    <div className="h-8 w-36 bg-zinc-800 rounded-lg"></div>
                </div>
                <div className="grid grid-cols-3 gap-3 h-36">
                    <div className="bg-zinc-800/40 rounded-xl"></div>
                    <div className="bg-zinc-800/50 rounded-xl"></div>
                    <div className="bg-zinc-800/40 rounded-xl"></div>
                </div>
                <div className="h-40 bg-zinc-800/20 rounded-xl"></div>
            </div>
        );
    }

    if (!topChatters || topChatters.length === 0) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-5 text-center text-zinc-400 text-sm space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-zinc-800/80 border-zinc-700/80 text-zinc-300">
                    <span>🏆 Top Chatters & Leaderboard</span>
                </div>
                {isLive ? (
                    <div>
                        <p className="text-zinc-200 font-medium text-sm">🔴 Siaran Sedang Berlangsung</p>
                        <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                            Leaderboard Top 50 Chatters sedang dikumpulkan dan akan otomatis tersedia setelah sesi live ini selesai.
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-zinc-300 font-medium text-sm">Belum ada data interaksi penonton untuk siaran ini.</p>
                        <p className="text-xs text-zinc-500 mt-1">Data pengirim pesan terbanyak akan muncul saat penonton mengirim pesan di live chat.</p>
                    </div>
                )}
            </div>
        );
    }

    // Pisahkan Top 3 untuk Podium dan sisanya untuk tabel list
    const top1 = topChatters[0];
    const top2 = topChatters[1];
    const top3 = topChatters[2];

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-5">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                            <span>🏆 Top 50 Chatters (Paling Aktif)</span>
                        </h3>
                        <span className="text-xs text-zinc-400">
                            ({totalChattersCount} pengguna • {totalMessagesByTop.toLocaleString()} pesan)
                        </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Daftar penonton yang paling banyak mengirimkan pesan selama sesi live {streamerName ? `• ${streamerName}` : ''}
                    </p>
                </div>

                {/* Search Input */}
                <div className="relative self-start md:self-auto">
                    <input
                        type="text"
                        placeholder="Cari nama penonton..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-zinc-900 border rounded-lg px-2.5 py-1.5 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 w-44 sm:w-56"
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
            </div>

            {/* Podium Top 3 (Hanya tampil jika tidak sedang memfilter pencarian spesifik atau pencarian mencakup top 3) */}
            {!searchQuery && top1 && (
                <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-4 sm:p-5">
                    <h4 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold text-center mb-4 flex items-center justify-center gap-1.5">
                        <span>👑</span>
                        <span>Hall of Fame • Top 3 Pengirim Chat</span>
                    </h4>

                    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-lg mx-auto pt-2">
                        {/* Rank 2 (Silver) */}
                        {top2 ? (
                            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-700/60 shadow-lg relative group">
                                <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-600 text-[10px] font-bold text-zinc-200 flex items-center gap-1 shadow">
                                    <span>🥈</span> #2
                                </div>
                                <div className="mt-1">
                                    {renderAvatar(top2, 'w-12 h-12 sm:w-14 sm:h-14 text-sm', 'border-zinc-400 shadow-zinc-400/20 shadow-md')}
                                </div>
                                <span className="font-semibold text-xs sm:text-sm text-zinc-100 mt-2 truncate max-w-full" title={top2.userName}>
                                    {top2.userName}
                                </span>
                                <span className="text-[11px] sm:text-xs text-zinc-300 font-bold mt-0.5">
                                    {Number(top2.count).toLocaleString()} <span className="text-[10px] font-normal text-zinc-500">pesan</span>
                                </span>
                            </div>
                        ) : <div />}

                        {/* Rank 1 (Gold - Taller) */}
                        <div className="flex flex-col items-center text-center p-3.5 sm:p-4 rounded-xl bg-linear-to-b from-amber-500/15 via-zinc-900/80 to-zinc-900 border border-amber-500/40 shadow-amber-500/10 shadow-xl relative -translate-y-2 group">
                            <div className="absolute -top-3.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[11px] font-extrabold flex items-center gap-1 shadow-lg">
                                <span>👑</span> #1
                            </div>
                            <div className="mt-1 relative">
                                {renderAvatar(top1, 'w-14 h-14 sm:w-16 sm:h-16 text-base', 'border-amber-400 shadow-amber-400/30 shadow-lg ring-2 ring-amber-400/30')}
                            </div>
                            <span className="font-bold text-xs sm:text-sm text-amber-200 mt-2 truncate max-w-full" title={top1.userName}>
                                {top1.userName}
                            </span>
                            <span className="text-xs sm:text-sm text-amber-400 font-extrabold mt-0.5">
                                {Number(top1.count).toLocaleString()} <span className="text-[10px] font-normal text-zinc-400">pesan</span>
                            </span>
                        </div>

                        {/* Rank 3 (Bronze) */}
                        {top3 ? (
                            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-zinc-900/60 border border-amber-800/40 shadow-lg relative group">
                                <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-zinc-800 border border-amber-800/60 text-[10px] font-bold text-amber-300 flex items-center gap-1 shadow">
                                    <span>🥉</span> #3
                                </div>
                                <div className="mt-1">
                                    {renderAvatar(top3, 'w-12 h-12 sm:w-14 sm:h-14 text-sm', 'border-amber-700 shadow-amber-700/20 shadow-md')}
                                </div>
                                <span className="font-semibold text-xs sm:text-sm text-zinc-100 mt-2 truncate max-w-full" title={top3.userName}>
                                    {top3.userName}
                                </span>
                                <span className="text-[11px] sm:text-xs text-zinc-300 font-bold mt-0.5">
                                    {Number(top3.count).toLocaleString()} <span className="text-[10px] font-normal text-zinc-500">pesan</span>
                                </span>
                            </div>
                        ) : <div />}
                    </div>
                </div>
            )}

            {/* Leaderboard List Table */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                    <span>Daftar Peringkat Lengkap</span>
                    <span>Menampilkan {filteredChatters.length} penonton</span>
                </div>

                <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/30 overflow-hidden">
                    <table className="w-full table-fixed text-left text-xs bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                        <colgroup>
                            <col className="w-14 sm:w-16" />
                            <col />
                            <col className="w-32 sm:w-56 hidden sm:table-column" />
                            <col className="w-24 sm:w-28" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="py-2.5 px-3 text-center font-medium">Rank</th>
                                <th className="py-2.5 px-3 font-medium">Pengguna IDN</th>
                                <th className="py-2.5 px-3 font-medium hidden sm:table-cell">Aktivitas Relatif</th>
                                <th className="py-2.5 px-3 text-right font-medium">Total Pesan</th>
                            </tr>
                        </thead>
                    </table>

                    <div className="overflow-y-auto max-h-96 custom-scrollbar">
                        <table className="w-full table-fixed text-left text-xs">
                            <colgroup>
                                <col className="w-14 sm:w-16" />
                                <col />
                                <col className="w-32 sm:w-56 hidden sm:table-column" />
                                <col className="w-24 sm:w-28" />
                            </colgroup>
                            <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                                {filteredChatters.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-zinc-500 text-xs">
                                            Tidak ditemukan penonton dengan nama "{searchQuery}"
                                        </td>
                                    </tr>
                                ) : (
                                    filteredChatters.map((chatter, idx) => {
                                        // Cari ranking asli di array lengkap
                                        const originalRank = topChatters.findIndex(c => c.userUuid === chatter.userUuid) + 1 || idx + 1;
                                        const relativePct = maxCount > 0 ? (Number(chatter.count) / maxCount) * 100 : 0;

                                        let rankBadge = <span className="text-zinc-400 font-semibold">#{originalRank}</span>;
                                        if (originalRank === 1) rankBadge = <span className="text-sm">🥇</span>;
                                        else if (originalRank === 2) rankBadge = <span className="text-sm">🥈</span>;
                                        else if (originalRank === 3) rankBadge = <span className="text-sm">🥉</span>;

                                        return (
                                            <tr
                                                key={chatter.userUuid || idx}
                                                className="hover:bg-zinc-800/40 transition group"
                                            >
                                                {/* Rank */}
                                                <td className="py-2.5 px-3 text-center">{rankBadge}</td>

                                                {/* User Info */}
                                                <td className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        {renderAvatar(chatter, 'w-7 h-7 text-[11px]')}
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-zinc-100 truncate max-w-40 sm:max-w-xs" title={chatter.userName}>
                                                                {chatter.userName}
                                                            </p>
                                                            <p className="text-[10px] text-zinc-500 truncate font-mono">
                                                                {chatter.userUuid ? `${chatter.userUuid.slice(0, 8)}...` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Relative Progress Bar */}
                                                <td className="py-2.5 px-3 hidden sm:table-cell">
                                                    <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            style={{ width: `${relativePct}%` }}
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                originalRank === 1 ? 'bg-amber-400' :
                                                                originalRank === 2 ? 'bg-zinc-300' :
                                                                originalRank === 3 ? 'bg-amber-600' :
                                                                'bg-indigo-400'
                                                            }`}
                                                        />
                                                    </div>
                                                </td>

                                                {/* Count */}
                                                <td className="py-2.5 px-3 text-right">
                                                    <span className="font-bold text-zinc-100 text-xs sm:text-sm">
                                                        {Number(chatter.count).toLocaleString()}
                                                    </span>
                                                    <span className="text-zinc-500 text-[10px] font-normal ml-1">
                                                        pesan
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
