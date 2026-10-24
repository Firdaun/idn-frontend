import { useState, useMemo, useRef, useEffect } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Brush } from 'recharts';
import { UserAvatar, GiftItemsProfile } from './UserAvatar';
import { formatAxisTime, formatAxisTimeSecond } from '../../../utils/analyticsHelpers';
function useScrollThumbs() {
    const containerRef = useRef(null);
    const vThumbRef = useRef(null);
    const hThumbRef = useRef(null);
    const timerRef = useRef(null);

    const update = () => {
        const el = containerRef.current;
        if (!el) return;

        const v = vThumbRef.current;
        if (v) {
            const { scrollTop, scrollHeight, clientHeight } = el;
            if (scrollHeight > clientHeight) {
                const thumbH = Math.max(24, (clientHeight / scrollHeight) * clientHeight);
                const maxScrollTop = scrollHeight - clientHeight;
                const top = (scrollTop / maxScrollTop) * (clientHeight - thumbH);
                v.style.height = `${thumbH}px`;
                v.style.transform = `translateY(${top}px)`;
                v.style.opacity = '1';
            } else {
                v.style.opacity = '0';
            }
        }

        const h = hThumbRef.current;
        if (h) {
            const { scrollLeft, scrollWidth, clientWidth } = el;
            if (scrollWidth > clientWidth) {
                const thumbW = Math.max(24, (clientWidth / scrollWidth) * clientWidth);
                const maxScrollLeft = scrollWidth - clientWidth;
                const left = (scrollLeft / maxScrollLeft) * (clientWidth - thumbW);
                h.style.width = `${thumbW}px`;
                h.style.transform = `translateX(${left}px)`;
                h.style.opacity = '1';
            } else {
                h.style.opacity = '0';
            }
        }

        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (vThumbRef.current) vThumbRef.current.style.opacity = '0';
            if (hThumbRef.current) hThumbRef.current.style.opacity = '0';
        }, 600);
    };

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return { containerRef, vThumbRef, hThumbRef, onScroll: update, refresh: update };
}
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif'];
function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;

    try {
        const { pathname } = new URL(url);
        const ext = pathname.split('.').pop()?.toLowerCase();
        return IMAGE_EXTENSIONS.includes(ext);
    } catch {
        return false;
    }
}
export default function GiftDistributionCard({
    giftData,
    isLoading = false,
    isLive = false,
    streamerName = ''
}) {
    const [selectedSnapshot, setSelectedSnapshot] = useState(null)
    const [expandedGifts, setExpandedGift] = useState(new Set());

    const topDonor = useScrollThumbs();
    const topGift = useScrollThumbs();

    useEffect(() => {
        topDonor.refresh();
        topGift.refresh();
    }, [giftData]);

    const sortedGifters = useMemo(() => {
        const list = selectedSnapshot?.payload?.gifters ?? [];
        return [...list].sort((a, b) => b.gold - a.gold);
    }, [selectedSnapshot]);

    // Format Rupiah
    const formatIdr = (val) => {
        return `Rp ${Number(val || 0).toLocaleString('id-ID')}`;
    };

    // Format angka
    const formatNumber = (val) => {
        return Number(val || 0).toLocaleString('id-ID');
    };

    const toggleGiftExpand = (giftName) => {
        setExpandedGift((prev) => {
            const next = new Set(prev)

            if (next.has(giftName)) {
                next.delete(giftName)
            } else {
                next.add(giftName)
            }
            return next
        });
    };

    const top1Gifter = giftData?.topGifters[0];
    const top2Gifter = giftData?.topGifters[1];
    const top3Gifter = giftData?.topGifters[2];

    const top1Gift = giftData?.topGifts[0];
    const top2Gift = giftData?.topGifts[1];
    const top3Gift = giftData?.topGifts[2];

    // Loading State
    if (isLoading) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-6 space-y-6 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-6 w-56 bg-zinc-800 rounded-lg"></div>
                    <div className="h-6 w-32 bg-zinc-800 rounded-full"></div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="h-20 bg-zinc-800/60 rounded-xl"></div>
                    <div className="h-20 bg-zinc-800/60 rounded-xl"></div>
                    <div className="h-20 bg-zinc-800/60 rounded-xl"></div>
                    <div className="h-20 bg-zinc-800/60 rounded-xl"></div>
                </div>
                <div className="h-64 bg-zinc-800/40 rounded-xl"></div>
            </div>
        );
    }

    // Empty State
    if (isLive) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-6 text-center text-zinc-400 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border bg-amber-500/10 border-amber-500/20 text-amber-400">
                    <span>🎁 Distribusi Donasi & Pola Gift</span>
                </div>
                <div>
                    <p className="text-zinc-200 font-medium text-sm">🔴 Siaran Sedang Berlangsung</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                        Data distribusi donasi & pola gift sedang dikumpulkan secara langsung dan akan otomatis tersedia setelah sesi siaran ini selesai.
                    </p>
                </div>
                {!giftData || !giftData.totalGiftCount && (
                    <div>
                        <p className="text-zinc-200 font-medium text-sm">Belum Ada Riwayat Gift pada Sesi Ini</p>
                        <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                            Data grafik distribusi gift dan pola donasi akan otomatis tercatat saat ada penonton yang mengirimkan virtual gift.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    const {
        totalGold = 0,
        totalIdr = 0,
        totalGiftCount = 0,
        averageGoldPerMinute = 0,
        pattern = '',
        patternDescription = '',
        phases = {},
        peakMoment = null,
        timeline = []
    } = giftData;

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 sm:p-5 lg:p-6 space-y-6">
            {/* Header Bagian */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-4">
                <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-lg flex items-center justify-center">
                        🎁
                    </span>
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                            Distribusi Donasi & Pola Gift
                            <span className="text-xs font-normal text-zinc-400">
                                • {streamerName || giftData.streamerName}
                            </span>
                        </h3>
                        <p className="text-xs text-zinc-400">
                            Analisis lonjakan gift, kurva akumulasi, dan segmentasi fase donasi penonton
                        </p>
                    </div>
                </div>

                {pattern && (
                    <div className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-linear-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-300 shadow-sm">
                        <span className="text-amber-400">⚡</span>
                        <span className="font-semibold">{pattern}</span>
                    </div>
                )}
            </div>

            {/* 4 Kartu KPI Utama */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Gold */}
                <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-3.5 sm:p-4 relative overflow-hidden group hover:border-amber-500/40 transition">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">Total Gold Masuk</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl sm:text-2xl font-bold text-amber-400">
                            {formatNumber(totalGold)}
                        </span>
                        <span className="text-xs text-amber-400/80 font-medium">Gold</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-0.5 block">
                        Saldo virtual yang diterima
                    </span>
                </div>

                {/* Estimasi Rupiah */}
                <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-3.5 sm:p-4 relative overflow-hidden group hover:border-emerald-500/40 transition">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">Estimasi Rupiah (IDR)</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                            {formatIdr(totalIdr)}
                        </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-0.5 block">
                        Kurs IDN ~Rp 2.500 / Gold
                    </span>
                </div>

                {/* Kecepatan Donasi */}
                <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-3.5 sm:p-4 relative overflow-hidden group hover:border-cyan-500/40 transition">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">Laju Donasi (Velocity)</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl sm:text-2xl font-bold text-cyan-400">
                            {averageGoldPerMinute}
                        </span>
                        <span className="text-xs text-cyan-400/80 font-medium">Gold / mnt</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-0.5 block">
                        Rata-rata intensitas saweran
                    </span>
                </div>

                {/* Total Item Gift */}
                <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-3.5 sm:p-4 relative overflow-hidden group hover:border-purple-500/40 transition">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">Total Gift Dikirim</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl sm:text-2xl font-bold text-purple-400">
                            {formatNumber(totalGiftCount)}
                        </span>
                        <span className="text-xs text-purple-400/80 font-medium">Item</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-0.5 block">
                        Total {giftData.durationMinutes || 0} menit siaran
                    </span>
                </div>
            </div>

            {/* Pattern Description & Peak Moment Box */}
            <div className="bg-linear-to-r from-amber-500/10 via-zinc-900/60 to-zinc-900/40 border border-amber-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                            Analisis Pola Perilaku
                        </span>
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed">
                        {patternDescription || 'Pola donasi terpantau seimbang di sepanjang siaran.'}
                    </p>
                </div>

                {peakMoment && (
                    <div className="shrink-0 bg-zinc-900/90 border border-amber-500/30 rounded-xl p-3 px-4 flex items-center gap-3 shadow-md">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 text-base">
                            🔥
                        </div>
                        <div>
                            <span className="text-[11px] text-zinc-400 font-medium block">
                                Momen Donasi Paling Deras
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white">
                                    Pukul {peakMoment.timeLabel}
                                </span>
                                <span className="text-xs font-bold text-amber-400">
                                    ({formatNumber(peakMoment.gold)} Gold • {formatIdr(peakMoment.idr)})
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Segmented Phase Bar (Fase Siaran: Opening, Main, Closing) */}
            {phases && (phases.opening || phases.main || phases.closing) && (
                <div className="space-y-3 bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-300">
                            Distribusi Berdasarkan 3 Fase Siaran
                        </span>
                        <span className="text-[11px] text-zinc-500">
                            Proporsi donasi di awal, tengah, dan akhir
                        </span>
                    </div>

                    {/* Progress Bar Multi-Segment */}
                    <div className="w-full h-3.5 rounded-full overflow-hidden bg-zinc-800/70 flex p-0.5 gap-0.5">
                        {phases.opening && (
                            <div
                                style={{ width: `${Math.max(4, phases.opening.percentage)}%` }}
                                className="h-full bg-teal-500 rounded-l-full transition-all duration-500 relative group"
                                title={`Awal: ${phases.opening.percentage}% (${phases.opening.gold} Gold)`}
                            />
                        )}
                        {phases.main && (
                            <div
                                style={{ width: `${Math.max(4, phases.main.percentage)}%` }}
                                className="h-full bg-violet-500 transition-all duration-500 relative group"
                                title={`Tengah: ${phases.main.percentage}% (${phases.main.gold} Gold)`}
                            />
                        )}
                        {phases.closing && (
                            <div
                                style={{ width: `${Math.max(4, phases.closing.percentage)}%` }}
                                className="h-full bg-amber-500 rounded-r-full transition-all duration-500 relative group"
                                title={`Akhir: ${phases.closing.percentage}% (${phases.closing.gold} Gold)`}
                            />
                        )}
                    </div>

                    {/* 3 Detail Cards per Fase */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {/* Awal (Opening) */}
                        {phases.opening && (
                            <div className="bg-zinc-900/60 border border-indigo-500/20 rounded-xl p-3 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-teal-400 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                        Awal (0 - 25%)
                                    </span>
                                    <span className="text-xs font-bold text-zinc-200">
                                        {phases.opening.percentage}%
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between text-xs mt-1">
                                    <span className="text-zinc-400">{formatNumber(phases.opening.gold)} Gold</span>
                                    <span className="text-zinc-500">{formatIdr(phases.opening.idr)}</span>
                                </div>
                                <span className="text-[11px] text-zinc-500 mt-0.5">
                                    {phases.opening.giftCount} gift terkirim
                                </span>
                            </div>
                        )}

                        {/* Tengah (Main) */}
                        {phases.main && (
                            <div className="bg-zinc-900/60 border border-violet-500/20 rounded-xl p-3 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-violet-400 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                                        Tengah (25 - 75%)
                                    </span>
                                    <span className="text-xs font-bold text-zinc-200">
                                        {phases.main.percentage}%
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between text-xs mt-1">
                                    <span className="text-zinc-400">{formatNumber(phases.main.gold)} Gold</span>
                                    <span className="text-zinc-500">{formatIdr(phases.main.idr)}</span>
                                </div>
                                <span className="text-[11px] text-zinc-500 mt-0.5">
                                    {phases.main.giftCount} gift terkirim
                                </span>
                            </div>
                        )}

                        {/* Akhir (Closing) */}
                        {phases.closing && (
                            <div className="bg-zinc-900/60 border border-amber-500/20 rounded-xl p-3 flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        Akhir (75 - 100%)
                                    </span>
                                    <span className="text-xs font-bold text-zinc-200">
                                        {phases.closing.percentage}%
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between text-xs mt-1">
                                    <span className="text-zinc-400">{formatNumber(phases.closing.gold)} Gold</span>
                                    <span className="text-zinc-500">{formatIdr(phases.closing.idr)}</span>
                                </div>
                                <span className="text-[11px] text-zinc-500 mt-0.5">
                                    {phases.closing.giftCount} gift terkirim
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Grafik Time-Series: Lonjakan Donasi (Bar) & Akumulasi (Line) */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                        <span>📈</span>
                        <span>Kurva Saweran & Akumulasi Sepanjang Siaran</span>
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
                            <span className="text-zinc-400">Lonjakan Gold (Per 30s)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-0.5 bg-emerald-400"></span>
                            <span className="text-zinc-400">Akumulasi Gold</span>
                        </div>
                    </div>
                </div>

                <div className="h-72 sm:h-80 w-full bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-2 sm:p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={timeline}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="goldBarGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.5} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.4} />
                            <XAxis
                                dataKey="timestamp"
                                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                                stroke="#27272a"
                                tickFormatter={formatAxisTime}
                            />
                            {/* Y-Axis Kiri: Lonjakan Gold */}
                            <YAxis
                                yAxisId="left"
                                tick={{ fill: '#f59e0b', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val) => `${val}g`}
                            />
                            {/* Y-Axis Kanan: Akumulasi Gold */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fill: '#34d399', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val) => `${val}g`}
                            />

                            <Tooltip
                                isAnimationActive={false}
                                offset={15}
                                cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '3 3' }}
                                content={({ active, payload, label }) => {
                                    if (!active || !payload || !payload.length) return null;
                                    const data = payload[0].payload;
                                    const sortedItems = [...data.gifters].sort((a, b) => Number(b.gold || 0) - Number(a.gold || 0))

                                    return (
                                        <div className="bg-zinc-900/95 border border-zinc-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-2 max-w-xs">
                                            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                                                <span className="font-bold text-zinc-100">
                                                    Pukul {formatAxisTimeSecond(label)}
                                                </span>
                                                <span className="text-[11px] text-zinc-400">
                                                    {data.messageCount} chat
                                                </span>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-400">Saweran Waktu Ini:</span>
                                                    <span className="font-bold text-amber-400">
                                                        {formatNumber(data.gold)} Gold ({formatIdr(data.idr)})
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-400">Akumulasi Total:</span>
                                                    <span className="font-bold text-emerald-400">
                                                        {formatNumber(data.cumulativeGold)} Gold
                                                    </span>
                                                </div>
                                            </div>

                                            {Array.isArray(data.gifters) && data.gifters.length > 0 && (
                                                <div className="border-t border-zinc-800/80 pt-2 space-y-1.5">
                                                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                                                        Gift Masuk ({data.gifters.length}):
                                                    </span>
                                                    <div className="space-y-1.5 pr-1">
                                                        {sortedItems.map((g, idx) => (
                                                            <div key={idx} className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    {g.giftIconUrl ? (
                                                                        <img
                                                                            src={g.giftIconUrl}
                                                                            alt={g.giftName}
                                                                            className="w-4 h-4 object-contain shrink-0"
                                                                        />
                                                                    ) : (
                                                                        <span>🎁</span>
                                                                    )}
                                                                    <span className="text-zinc-200 truncate">
                                                                        {g.userName}
                                                                    </span>
                                                                </div>
                                                                <span className="text-amber-400 font-semibold shrink-0">
                                                                    +{g.gold}g
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }}
                            />

                            {/* Batang Donasi Masuk */}
                            <Bar
                                yAxisId="left"
                                dataKey="gold"
                                name="Gold"
                                fill="url(#goldBarGradient)"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={30}
                            />

                            {/* Garis Akumulasi */}
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="cumulativeGold"
                                name="Akumulasi Gold"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{
                                    cursor: 'pointer',
                                    r: 5,
                                    fill: '#10b981',
                                    stroke: '#064e3b',
                                    strokeWidth: 2,
                                    onClick: (_e, payload) => setSelectedSnapshot(payload),
                                }}
                            />

                            {timeline.length > 25 && (
                                <Brush
                                    dataKey="timeLabel"
                                    height={24}
                                    stroke="#3f3f46"
                                    fill="#18181b"
                                    travellerWidth={8}
                                    className="text-xs"
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Titik Terpilih Detail Inspector (Muncul jika bar/titik diklik) */}
            {selectedSnapshot?.payload && (
                <div className="bg-zinc-950/70 border border-amber-500/30 rounded-xl p-4 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-bold text-sm">
                                🔍 Detail Momen Pukul {selectedSnapshot.payload.timeLabel}
                            </span>
                            <span className="text-xs text-zinc-400">
                                • {selectedSnapshot.payload.gold} Gold ({selectedSnapshot.payload.idr.toLocaleString('id-ID')})
                            </span>
                        </div>
                        <button
                            onClick={() => setSelectedSnapshot(null)}
                            className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                        >
                            Tutup
                        </button>
                    </div>

                    {selectedSnapshot.payload.gifters && selectedSnapshot.payload.gifters.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                            {sortedGifters.map((g, idx) => (
                                <div
                                    key={idx}
                                    className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-2.5 flex items-center gap-2.5"
                                >
                                    <UserAvatar
                                        user={{ userName: g.userName, userAvatar: g.userAvatar }}
                                        sizeClass="w-8 h-8 text-xs"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-zinc-200 truncate">
                                            {g.userName}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                            {g.giftIconUrl && (
                                                <img src={g.giftIconUrl} alt={g.giftName} className="w-3.5 h-3.5 object-contain" />
                                            )}
                                            <span className="truncate">{g.giftName}</span>
                                            <span>•</span>
                                            <span className="text-amber-400 font-semibold">{g.gold} Gold</span>
                                        </div>
                                    </div>
                                    <span
                                        className="shrink-0 self-center flex items-center gap-1 text-xs text-zinc-400 tabular-nums"
                                        title="Waktu saweran"
                                    >
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13" />
                                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                        </svg>
                                        {formatAxisTimeSecond(g.createdAt)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-500">
                            Tidak ada donasi gift yang tercatat pada interval 30 detik ini.
                        </p>
                    )}
                </div>
            )}

            {/* Grid Bawah: Top Donatur & Gift Terfavorit */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                {/* Kolom Kiri: Top Donatur (Sultan Siaran) */}
                <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
                        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                            <span>👑</span>
                            <span>Top Donatur (Sultan Siaran)</span>
                        </span>
                        <span className="text-[11px] text-zinc-500">
                            {(giftData?.topGifters || []).length} Donatur Teratas
                        </span>
                    </div>

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
                                        <img className='w-5' src="https://connect.idn.media/my-account/assets/images/idn-gold/gold-card.svg" alt="GOLD" />
                                        <span>{Number(top2Gifter.totalGold).toLocaleString('id-ID')}</span>
                                        <span className="text-[11px] font-normal text-zinc-400">Gold</span>
                                    </div>
                                    <span className="text-[11px] text-zinc-400">
                                        Rp {top2Gifter.totalIdr.toLocaleString('id-ID')}
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
                                    <img className='w-5' src="https://connect.idn.media/my-account/assets/images/idn-gold/gold-card.svg" alt="GOLD" />
                                    <span>{Number(top1Gifter.totalGold).toLocaleString('id-ID')}</span>
                                    <span className="text-[11px] font-normal text-amber-300/80">Gold</span>
                                </div>
                                <span className="text-[11px] text-zinc-400">
                                    Rp {top1Gifter.totalIdr.toLocaleString('id-ID')}
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
                                        <img className='w-5' src="https://connect.idn.media/my-account/assets/images/idn-gold/gold-card.svg" alt="GOLD" />
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

                    <div className='relative'>
                        <div
                            ref={topDonor.containerRef}
                            onScroll={topDonor.onScroll}
                            className="max-h-96 overflow-auto no-scrollbar"
                        >
                            {Array.isArray(giftData?.topGifters) && giftData.topGifters.length > 0 ? (
                                <div className="space-y-2">
                                    {giftData.topGifters.map((gifter, idx) => {
                                        const rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                                        return (
                                            <div
                                                key={gifter.userUuid}
                                                className="bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/40 rounded-xl p-2.5 flex items-center justify-between gap-3 transition"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="text-sm font-bold w-5 text-center shrink-0 text-zinc-400">
                                                        {rankBadge}
                                                    </span>
                                                    <UserAvatar user={gifter} sizeClass="w-8 h-8 text-xs" />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-zinc-200 truncate">
                                                            {gifter.userName}
                                                        </p>
                                                        <span className="text-[11px] text-zinc-500">
                                                            {gifter.giftCount}x kirim gift
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <span className="text-xs font-bold text-amber-400 block">
                                                        {Number(gifter.totalGold || 0).toLocaleString('id-ID')} Gold
                                                    </span>
                                                    <span className="text-[11px] text-emerald-400/80">
                                                        {formatIdr(gifter.totalIdr || (gifter.totalGold * 2500))}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-zinc-500 text-center py-4">Belum ada donatur yang tercatat.</p>
                            )}
                        </div>
                        <div
                            ref={topDonor.vThumbRef}
                            className="absolute right-0 top-0 w-1 bg-zinc-700 rounded-full pointer-events-none opacity-0 transition-opacity duration-500 ease-out z-20"
                            style={{ height: '0px' }}
                        />

                        <div
                            ref={topDonor.hThumbRef}
                            className="absolute bottom-0 left-0 h-1 bg-zinc-700 rounded-full pointer-events-none opacity-0 transition-opacity duration-500 ease-out z-20"
                            style={{ width: '0px' }}
                        />
                    </div>
                </div>

                {/* Kolom Kanan: Gift Terpopuler (Katalog yang Dikirim) */}
                <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
                        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🎁</span>
                            <span>Katalog Gift Terfavorit</span>
                        </span>
                        <span className="text-[11px] text-zinc-500">
                            {(giftData?.topGifts || []).length} Item
                        </span>
                    </div>

                    <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-4 sm:p-5">
                        <h4 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold text-center mb-4 flex items-center justify-center gap-1.5">
                            <span>👑</span>
                            <span>Top 3 Gifts</span>
                        </h4>

                        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-lg mx-auto pt-2">
                            {/* Rank 2 (Silver) */}
                            {top2Gift ? (
                                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-zinc-900/60 border border-zinc-700/60 shadow-lg relative group">
                                    <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-600 text-[11px] font-bold text-zinc-200 flex items-center gap-1 shadow">
                                        <span>🥈</span> #2
                                    </div>
                                    <div className="mt-1">
                                        <GiftItemsProfile user={top2Gift} sizeClass="w-12 h-12 sm:w-14 sm:h-14 text-sm" borderClass="border-zinc-400 shadow-zinc-400/20 shadow-md" />
                                    </div>
                                    <span className="font-semibold text-xs sm:text-sm text-zinc-100 mt-2 truncate max-w-full" title={top2Gift.giftName}>
                                        {top2Gift.giftName}
                                    </span>
                                    <div className="text-xs sm:text-sm text-amber-300 font-bold mt-0.5 flex items-center justify-center gap-1">
                                        <img className='w-5' src="https://connect.idn.media/my-account/assets/images/idn-gold/gold-card.svg" alt="GOLD" />
                                        <span>{Number(top2Gift.totalGold).toLocaleString('id-ID')}</span>
                                        <span className="text-[11px] font-normal text-zinc-400">Gold</span>
                                    </div>
                                    <span className="text-[11px] text-zinc-400">
                                        Rp {top2Gift.totalIdr.toLocaleString('id-ID')}
                                    </span>
                                </div>
                            ) : <div />}

                            {/* Rank 1 (Gold - Taller) */}
                            <div className="flex flex-col items-center text-center p-3.5 sm:p-4 rounded-xl bg-linear-to-b from-amber-500/15 via-zinc-900/80 to-zinc-900 border border-amber-500/40 shadow-amber-500/10 shadow-xl relative -translate-y-2 group">
                                <div className="absolute -top-3.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[11px] font-extrabold flex items-center gap-1 shadow-lg">
                                    <span>👑</span> #1
                                </div>
                                <div className="mt-1 relative">
                                    <GiftItemsProfile user={top1Gift} sizeClass="w-14 h-14 sm:w-16 sm:h-16 text-base" borderClass="border-amber-400 shadow-amber-400/30 shadow-lg ring-2 ring-amber-400/30" />
                                </div>
                                <span className="font-bold text-xs sm:text-sm text-amber-200 mt-2 truncate max-w-full" title={top1Gift.giftName}>
                                    {top1Gift.giftName}
                                </span>
                                <div className="text-xs sm:text-sm text-amber-400 font-extrabold mt-0.5 flex items-center justify-center gap-1">
                                    <img className='w-5' src="https://connect.idn.media/my-account/assets/images/idn-gold/gold-card.svg" alt="GOLD" />
                                    <span>{Number(top1Gift.goldPerItem || 0).toLocaleString('id-ID')}</span>
                                    <span className="text-[11px] font-normal text-amber-300/80">Gold x{Number(top1Gift.totalCount || 0).toLocaleString('id-ID')}</span>
                                </div>
                                <span className="text-[11px] text-zinc-400">
                                    Rp {top1Gift.totalIdr.toLocaleString('id-ID')}
                                </span>
                            </div>

                            {/* Rank 3 (Bronze) */}
                            {top3Gift ? (
                                <div className="flex flex-col items-center text-center p-3 rounded-xl bg-zinc-900/60 border border-amber-800/40 shadow-lg relative group">
                                    <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-zinc-800 border border-amber-800/60 text-[11px] font-bold text-amber-300 flex items-center gap-1 shadow">
                                        <span>🥉</span> #3
                                    </div>
                                    <div className="mt-1">
                                        <GiftItemsProfile user={top3Gift} sizeClass="w-12 h-12 sm:w-14 sm:h-14 text-sm" borderClass="border-amber-700 shadow-amber-700/20 shadow-md" />
                                    </div>
                                    <span className="font-semibold text-xs sm:text-sm text-zinc-100 mt-2 truncate max-w-full" title={top3Gift.giftName}>
                                        {top3Gift.giftName}
                                    </span>
                                    <div className="text-xs sm:text-sm text-amber-300 font-bold mt-0.5 flex items-center justify-center gap-1">
                                        <img className='w-5' src="https://connect.idn.media/my-account/assets/images/idn-gold/gold-card.svg" alt="GOLD" />
                                        <span>{Number(top3Gift.totalGold).toLocaleString('id-ID')}</span>
                                        <span className="text-[11px] font-normal text-zinc-400">Gold</span>
                                    </div>
                                    <span className="text-[11px] text-zinc-400">
                                        Rp {top3Gift.totalIdr.toLocaleString('id-ID')}
                                    </span>
                                </div>
                            ) : <div />}
                        </div>
                    </div>

                    <div className='relative'>
                        <div
                            ref={topGift.containerRef}
                            onScroll={topGift.onScroll}
                            className="max-h-96 overflow-auto no-scrollbar"
                        >
                            {Array.isArray(giftData?.topGifts) && giftData.topGifts.length > 0 ? (
                                <div className="columns-1 sm:columns-2 gap-2.5">
                                    {giftData.topGifts.map((gift) => {
                                        const isExpanded = expandedGifts.has(gift.giftName);
                                        return (
                                            <div
                                                key={gift.giftName}
                                                onClick={() => { toggleGiftExpand(gift.giftName); requestAnimationFrame(topGift.refresh); }}
                                                className={`mb-2 break-inside-avoid flex flex-col rounded-xl p-2.5 cursor-pointer transition-all duration-200 border ${isExpanded
                                                    ? 'bg-zinc-900/90 border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20'
                                                    : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/60 hover:border-zinc-700/80'
                                                    }`}
                                            >
                                                {/* Baris Utama */}
                                                <div className="flex justify-between w-full items-center gap-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center p-1 shrink-0 transition ${isExpanded ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-800/80 border-zinc-700/40'
                                                            }`}>
                                                            {isValidImageUrl(gift.giftIconUrl) ? (
                                                                <img
                                                                    src={gift.giftIconUrl}
                                                                    alt={gift.giftName}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            ) : (
                                                                <span className="text-sm">🎁</span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-xs font-semibold truncate transition ${isExpanded ? 'text-amber-200' : 'text-zinc-200'
                                                                }`}>
                                                                {gift.giftName}
                                                            </p>
                                                            <span className="text-[11px] text-zinc-500">
                                                                {Number(gift.totalCount || 0).toLocaleString('id-ID')}x dikirim
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                                                            {Number(gift.totalGold || 0).toLocaleString('id-ID')}g
                                                        </span>
                                                        <span className={`text-[10px] text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-amber-400' : ''
                                                            }`}>
                                                            ▼
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Detail Melebar ke Bawah (Accordion) */}
                                                {isExpanded && (
                                                    <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2 text-xs animate-in fade-in duration-150">
                                                        <div className="grid grid-cols-2 gap-2 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                                                            <div>
                                                                <span className="text-[10px] uppercase font-medium text-zinc-500 block">Harga Satuan</span>
                                                                <span className="text-xs font-semibold text-zinc-300">
                                                                    {formatIdr(gift.pricePerItemIdr)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase font-medium text-zinc-500 block">Gold Satuan</span>
                                                                <span className="text-xs font-bold text-amber-400">
                                                                    {Number(gift.goldPerItem || 0).toLocaleString('id-ID')} Gold
                                                                </span>
                                                            </div>

                                                            <div className='col-span-2 pt-1.5 border-t border-zinc-900 gap-2 grid grid-cols-2'>
                                                                <div>
                                                                    <span className="text-[10px] uppercase font-medium text-zinc-500 block">Total Perolehan IDR</span>
                                                                    <span className="text-xs font-bold text-emerald-400">
                                                                        {formatIdr(gift.totalIdr)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] uppercase font-medium text-zinc-500 block">Total Gold</span>
                                                                    <span className="text-xs font-bold text-amber-400">
                                                                        {Number(gift.totalGold || 0).toLocaleString('id-ID')} Gold
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-zinc-500 text-center py-4">Belum ada item yang tercatat.</p>
                            )}
                        </div>
                        <div
                            ref={topGift.vThumbRef}
                            className="absolute right-0 top-0 w-1 bg-zinc-700 rounded-full pointer-events-none opacity-0 transition-opacity duration-500 ease-out z-20"
                            style={{ height: '0px' }}
                        />

                        <div
                            ref={topGift.hThumbRef}
                            className="absolute bottom-0 left-0 h-1 bg-zinc-700 rounded-full pointer-events-none opacity-0 transition-opacity duration-500 ease-out z-20"
                            style={{ width: '0px' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
