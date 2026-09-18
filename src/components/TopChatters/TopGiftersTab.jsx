import { useMemo, useRef } from 'react';
import UserAvatar from './UserAvatar';

export default function TopGiftersTab({
    topGifters = [],
    topGifts = [],
    searchQuery = ''
}) {
    const tableContainerRef = useRef(null);
    const vThumbRef = useRef(null);
    const hThumbRef = useRef(null);
    const scrollTimerRef = useRef(null);

    const handleTableScroll = () => {
        const el = tableContainerRef.current;
        if (!el) return;

        if (vThumbRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = el;
            if (scrollHeight > clientHeight) {
                const thumbH = Math.max(24, (clientHeight / scrollHeight) * clientHeight);
                const maxScrollTop = scrollHeight - clientHeight;
                const top = (scrollTop / maxScrollTop) * (clientHeight - thumbH);
                vThumbRef.current.style.height = `${thumbH}px`;
                vThumbRef.current.style.transform = `translateY(${top}px)`;
                vThumbRef.current.style.opacity = '1';
            } else {
                vThumbRef.current.style.opacity = '0';
            }
        }

        if (hThumbRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = el;
            if (scrollWidth > clientWidth) {
                const thumbW = Math.max(24, (clientWidth / scrollWidth) * clientWidth);
                const maxScrollLeft = scrollWidth - clientWidth;
                const left = (scrollLeft / maxScrollLeft) * (clientWidth - thumbW);
                hThumbRef.current.style.width = `${thumbW}px`;
                hThumbRef.current.style.transform = `translateX(${left}px)`;
                hThumbRef.current.style.opacity = '1';
            } else {
                hThumbRef.current.style.opacity = '0';
            }
        }

        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => {
            if (vThumbRef.current) vThumbRef.current.style.opacity = '0';
            if (hThumbRef.current) hThumbRef.current.style.opacity = '0';
        }, 600);
    };

    const filteredGifters = useMemo(() => {
        if (!topGifters || !topGifters.length) return [];
        if (!searchQuery.trim()) return topGifters;
        const query = searchQuery.toLowerCase().trim();
        return topGifters.filter(item => (item.userName || '').toLowerCase().includes(query));
    }, [topGifters, searchQuery]);

    const maxGoldCount = useMemo(() => {
        if (!topGifters || !topGifters.length) return 1;
        return Math.max(...topGifters.map(g => Number(g.totalGold || 0)), 1);
    }, [topGifters]);

    const top1Gifter = topGifters[0];
    const top2Gifter = topGifters[1];
    const top3Gifter = topGifters[2];

    return (
        <div className="space-y-5">
            {/* Virtual Gift Populer Banner */}
            {topGifts && topGifts.length > 0 && !searchQuery && (
                <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 shrink-0">
                        <span>⭐ Virtual Gift Terpopuler:</span>
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 max-w-full no-scrollbar">
                        {topGifts.map((g, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800/90 shrink-0 text-xs shadow-sm"
                            >
                                {g.giftIconUrl ? (
                                    <img src={g.giftIconUrl} alt={g.giftName} className="w-4 h-4 object-contain shrink-0" />
                                ) : (
                                    <span>🎁</span>
                                )}
                                <span className="text-zinc-200 font-medium">{g.giftName}</span>
                                <span className="text-zinc-500 text-[10px]">•</span>
                                <span className="text-amber-400 font-bold">{Number(g.totalCount || 0).toLocaleString('id-ID')}x</span>
                                <span className="text-zinc-400 text-[11px]">({Number(g.totalGold || 0).toLocaleString('id-ID')} Gold)</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Podium Top 3 Gifters */}
            {!searchQuery && top1Gifter && (
                <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-4 sm:p-5">
                    <h4 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold text-center mb-4 flex items-center justify-center gap-1.5">
                        <span>👑</span>
                        <span>Top 3 Donatur Gift</span>
                    </h4>

                    <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-lg mx-auto pt-2">
                        {/* Rank 2 (Silver) */}
                        {top2Gifter ? (
                            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-700/60 shadow-lg relative group">
                                <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-600 text-[11px] font-bold text-zinc-200 flex items-center gap-1 shadow">
                                    <span>🥈</span> #2
                                </div>
                                <div className="mt-1">
                                    <UserAvatar user={top2Gifter} sizeClass="w-12 h-12 sm:w-14 sm:h-14 text-sm" borderClass="border-zinc-400 shadow-zinc-400/20 shadow-md" />
                                </div>
                                <span className="font-semibold text-xs sm:text-sm text-zinc-100 mt-2 truncate max-w-full" title={top2Gifter.userName}>
                                    {top2Gifter.userName}
                                </span>
                                <div className="text-xs sm:text-sm text-amber-300 font-bold mt-0.5 flex items-center justify-center gap-1">
                                    <img className='w-5' src="https://cdn.idntimes.com/content-images/icons/virtual-gifts/icons-db4c48e5772bbb084699019e4903ed5c.png" alt="GOLD" />
                                    <span>{Number(top2Gifter.totalGold).toLocaleString('id-ID')}</span>
                                    <span className="text-[11px] font-normal text-zinc-400">Gold</span>
                                </div>
                                <span className="text-[11px] text-zinc-400">
                                    Rp {Number(top2Gifter.totalIdr ?? (top2Gifter.totalGold || 0) * 1500).toLocaleString('id-ID')}
                                </span>
                            </div>
                        ) : <div />}

                        {/* Rank 1 (Gold - Taller) */}
                        <div className="flex flex-col items-center text-center p-3.5 sm:p-4 rounded-xl bg-linear-to-b from-amber-500/15 via-zinc-900/80 to-zinc-900 border border-amber-500/40 shadow-amber-500/10 shadow-xl relative -translate-y-2 group">
                            <div className="absolute -top-3.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[11px] font-extrabold flex items-center gap-1 shadow-lg">
                                <span>👑</span> #1
                            </div>
                            <div className="mt-1 relative">
                                <UserAvatar user={top1Gifter} sizeClass="w-14 h-14 sm:w-16 sm:h-16 text-base" borderClass="border-amber-400 shadow-amber-400/30 shadow-lg ring-2 ring-amber-400/30" />
                            </div>
                            <span className="font-bold text-xs sm:text-sm text-amber-200 mt-2 truncate max-w-full" title={top1Gifter.userName}>
                                {top1Gifter.userName}
                            </span>
                            <div className="text-xs sm:text-sm text-amber-400 font-extrabold mt-0.5 flex items-center justify-center gap-1">
                                <img className='w-5' src="https://cdn.idntimes.com/content-images/icons/virtual-gifts/icons-db4c48e5772bbb084699019e4903ed5c.png" alt="GOLD" />
                                <span>{Number(top1Gifter.totalGold).toLocaleString('id-ID')}</span>
                                <span className="text-[11px] font-normal text-amber-300/80">Gold</span>
                            </div>
                            <span className="text-[11px] text-zinc-400">
                                Rp {Number(top1Gifter.totalIdr ?? (top1Gifter.totalGold || 0) * 1500).toLocaleString('id-ID')}
                            </span>
                        </div>

                        {/* Rank 3 (Bronze) */}
                        {top3Gifter ? (
                            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-zinc-900/60 border border-amber-800/40 shadow-lg relative group">
                                <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-zinc-800 border border-amber-800/60 text-[11px] font-bold text-amber-300 flex items-center gap-1 shadow">
                                    <span>🥉</span> #3
                                </div>
                                <div className="mt-1">
                                    <UserAvatar user={top3Gifter} sizeClass="w-12 h-12 sm:w-14 sm:h-14 text-sm" borderClass="border-amber-700 shadow-amber-700/20 shadow-md" />
                                </div>
                                <span className="font-semibold text-xs sm:text-sm text-zinc-100 mt-2 truncate max-w-full" title={top3Gifter.userName}>
                                    {top3Gifter.userName}
                                </span>
                                <div className="text-xs sm:text-sm text-amber-300 font-bold mt-0.5 flex items-center justify-center gap-1">
                                    <img className='w-5' src="https://cdn.idntimes.com/content-images/icons/virtual-gifts/icons-db4c48e5772bbb084699019e4903ed5c.png" alt="GOLD" />
                                    <span>{Number(top3Gifter.totalGold).toLocaleString('id-ID')}</span>
                                    <span className="text-[11px] font-normal text-zinc-400">Gold</span>
                                </div>
                                <span className="text-[11px] text-zinc-400">
                                    Rp {top3Gifter.totalIdr.toLocaleString('id-ID')}
                                </span>
                            </div>
                        ) : <div />}
                    </div>
                </div>
            )}

            {/* Header List Table */}
            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>Daftar Peringkat Lengkap</span>
                <span>Menampilkan {filteredGifters.length} donatur</span>
            </div>

            {/* Table Container */}
            <div className="relative flex-1 min-h-80 rounded-xl border border-zinc-800/60 bg-zinc-950/30 overflow-hidden">
                <div
                    ref={tableContainerRef}
                    onScroll={handleTableScroll}
                    className="absolute inset-0 overflow-auto no-scrollbar"
                >
                    <table className="w-full min-w-130 table-fixed text-left text-xs">
                        <colgroup>
                            <col className="w-20" />
                            <col className="w-45" />
                            <col className="w-45" />
                            <col className="w-30" />
                        </colgroup>
                        <thead className="sticky top-0 z-10 bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                            <tr>
                                <th className="py-2.5 px-2 text-center font-medium">Peringkat</th>
                                <th className="py-2.5 px-2 font-medium">Donatur IDN</th>
                                <th className="py-2.5 px-2 font-medium">Rincian Gift & Kontribusi</th>
                                <th className="py-2.5 px-2 text-right font-medium">Total Kontribusi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                            {filteredGifters.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-zinc-500 text-xs">
                                        {searchQuery
                                            ? `Tidak ditemukan donatur dengan nama "${searchQuery}"`
                                            : "Belum ada data pengirim gift untuk siaran ini."}
                                    </td>
                                </tr>
                            ) : (
                                filteredGifters.map((gifter, idx) => {
                                    const originalIndex = topGifters.indexOf(gifter);
                                    const originalRank = originalIndex !== -1 ? originalIndex + 1 : (idx + 1);
                                    const relativePct = maxGoldCount > 0 ? (Number(gifter.totalGold || 0) / maxGoldCount) * 100 : 0;

                                    let rankBadge = <span className="text-zinc-400 font-semibold text-xs">#{originalRank}</span>;
                                    if (originalRank === 1) rankBadge = <span className="text-sm">🥇</span>;
                                    else if (originalRank === 2) rankBadge = <span className="text-sm">🥈</span>;
                                    else if (originalRank === 3) rankBadge = <span className="text-sm">🥉</span>;

                                    return (
                                        <tr
                                            key={gifter.userUuid || gifter.userName || idx}
                                            className="hover:bg-zinc-800/40 transition group"
                                        >
                                            {/* Rank */}
                                            <td className="py-2 px-2 text-center">{rankBadge}</td>

                                            {/* Gifter Info */}
                                            <td className="py-2 px-1.75">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <UserAvatar user={gifter} sizeClass="w-7 h-7 text-[11px]" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs sm:text-sm font-semibold text-zinc-100 truncate max-w-40 sm:max-w-xs" title={gifter.userName}>
                                                            {gifter.userName}
                                                        </p>
                                                        {gifter.userUuid && (
                                                            <p className="text-[11px] text-zinc-500 truncate font-mono">
                                                                {gifter.userUuid.slice(0, 8)}...
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Rincian Gift & Progres Bar */}
                                            <td className="py-2 px-2">
                                                <div className="space-y-1">
                                                    <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            style={{ width: `${relativePct}%` }}
                                                            className={`h-full rounded-full transition-all duration-500 ${originalRank === 1 ? 'bg-amber-400' :
                                                                originalRank === 2 ? 'bg-zinc-300' :
                                                                    originalRank === 3 ? 'bg-amber-600' :
                                                                        'bg-amber-500/80'
                                                                }`}
                                                        />
                                                    </div>
                                                    {gifter.gifts && gifter.gifts.length > 0 && (
                                                        <div className="flex items-center gap-1 flex-wrap">
                                                            {gifter.gifts.map((g, gIdx) => (
                                                                <span
                                                                    key={gIdx}
                                                                    className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800/90 rounded px-1.5 py-0.5 text-[10px] text-zinc-300"
                                                                    title={`${g.name}: ${g.count}x (${g.gold} Gold)`}
                                                                >
                                                                    {g.iconUrl ? (
                                                                        <img src={g.iconUrl} alt={g.name} className="w-3.5 h-3.5 object-contain inline" />
                                                                    ) : (
                                                                        <span>🎁</span>
                                                                    )}
                                                                    <span className="truncate max-w-24">{g.name}</span>
                                                                    <span className="text-amber-400 font-bold">x{g.count}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Total Gold & Gift */}
                                            <td className="py-2 px-2 text-right">
                                                <div className="font-bold text-amber-300 text-xs sm:text-sm flex items-center justify-end gap-1">
                                                    <img className='w-5' src="https://cdn.idntimes.com/content-images/icons/virtual-gifts/icons-db4c48e5772bbb084699019e4903ed5c.png" alt="GOLD" />
                                                    <span>{Number(gifter.totalGold || 0).toLocaleString('id-ID')}</span>
                                                    <span className="text-[11px] font-normal text-amber-400/80">Gold</span>
                                                </div>
                                                <span className="text-zinc-500 text-[11px] font-normal block">
                                                    Rp {gifter?.totalIdr.toLocaleString('id-ID')}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div
                    ref={vThumbRef}
                    className="absolute right-0 top-0 w-1 bg-zinc-700 rounded-full pointer-events-none opacity-0 transition-opacity duration-500 ease-out z-20"
                    style={{ height: '0px' }}
                />

                <div
                    ref={hThumbRef}
                    className="absolute bottom-0 left-0 h-1 bg-zinc-700 rounded-full pointer-events-none opacity-0 transition-opacity duration-500 ease-out z-20"
                    style={{ width: '0px' }}
                />
            </div>
        </div>
    );
}
