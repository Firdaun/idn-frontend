import { useState, useMemo, useEffect, useRef } from 'react';
import TagCanvas from '../lib/tagcanvas.js';

export default function WordCloudCard({ wordCloud = [], isLoading = false, streamerName = '', isLive = false }) {
    const [viewMode, setViewMode] = useState('cloud');
    const [searchQuery, setSearchQuery] = useState('');
    const [cloudShape, setCloudShape] = useState('sphere');
    const [isAutoRotating, setIsAutoRotating] = useState(true);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const tableContainerRef = useRef(null);
    const vThumbRef = useRef(null);
    const hThumbRef = useRef(null);
    const scrollTimerRef = useRef(null);

    const handleTableScroll = () => {
        const el = tableContainerRef.current;
        if (!el) return;

        // Indikator vertikal
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

        // Indikator horizontal
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

    const topThree = useMemo(() => {
        return (wordCloud || []).slice(0, 3);
    }, [wordCloud]);

    const getWordColor = (idx) => {
        if (idx === 0) return '#fbbf24';
        if (idx === 1) return '#38bdf8';
        if (idx === 2) return '#34d399';
        if (idx < 10) return '#a78bfa';
        if (idx < 25) return '#e2e8f0';
        return '#94a3b8';
    };

    useEffect(() => {
        if (viewMode !== 'cloud' || !filteredWords || filteredWords.length === 0) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        let resizeTimer = null;
        let prevWidth = 0;
        let prevHeight = 0;

        const initTagCanvas = (force = false) => {
            const width = Math.floor(canvas.clientWidth);
            const height = Math.floor(canvas.clientHeight);
            if (width <= 0 || height <= 0) return;

            if (!force && prevWidth === width && prevHeight === height && canvas.width === width && canvas.height === height) {
                return;
            }

            prevWidth = width;
            prevHeight = height;
            canvas.width = width;
            canvas.height = height;

            const screenW = typeof window !== 'undefined' ? window.innerWidth : width;
            const isMobile = screenW < 640;
            const isTablet = screenW >= 640 && screenW < 1024;

            const textHeight = isMobile ? 14 : isTablet ? 16 : 18;
            const weightSizeMin = isMobile ? 12 : isTablet ? 15 : 16;
            const weightSizeMax = isMobile ? 22 : isTablet ? 28 : 32;

            try {
                TagCanvas.Start('wordcloud-canvas', 'wordcloud-taglist', {
                    textColour: null,
                    textFont: 'Inter, system-ui, -apple-system, sans-serif',
                    textHeight: textHeight,
                    weight: true,
                    weightMode: 'size',
                    weightFrom: 'data-weight',
                    weightSizeMin: weightSizeMin,
                    weightSizeMax: weightSizeMax,

                    txtOpt: false,

                    noSelect: true,
                    outlineMethod: 'none',

                    shape: cloudShape,
                    maxSpeed: 0.035,
                    minSpeed: 0.0,
                    initial: isAutoRotating ? [0.08, -0.04] : [0, 0],
                    decel: 0.96,
                    depth: 0.7,
                    minBrightness: 0.35,
                    maxBrightness: 1.0,
                    zoom: 1,

                    dragControl: true,
                    wheelZoom: false,
                    clickToFront: false,
                    activeCursor: 'grab',
                    fadeIn: 400,
                    animTiming: 'Smooth',
                    padding: 4
                });

                // Posisikan kata Top 1-3 di pojok kiri atas depan saat inisialisasi awal
                TagCanvas.RotateTag('wordcloud-canvas', {
                    id: 'word-tag-0',
                    lat: 18,
                    lng: -40,
                    time: 0
                });
            } catch (err) {
                console.warn('TagCanvas initialization:', err);
            }
        };

        const timer = setTimeout(() => initTagCanvas(true), 50);

        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                initTagCanvas(false);
            }, 100);
        });
        resizeObserver.observe(container);

        return () => {
            clearTimeout(timer);
            clearTimeout(resizeTimer);
            resizeObserver.disconnect();
            try {
                TagCanvas.Delete('wordcloud-canvas');
            } catch (e) {
            }
        };
    }, [filteredWords, cloudShape, viewMode]);

    const toggleAutoRotate = () => {
        setIsAutoRotating(prev => {
            const next = !prev;
            try {
                if (next) {
                    TagCanvas.SetSpeed('wordcloud-canvas', [0.08, -0.04]);
                    TagCanvas.Resume('wordcloud-canvas');
                } else {
                    TagCanvas.SetSpeed('wordcloud-canvas', [0, 0]);
                }
            } catch (e) { }
            return next;
        });
    };

    const handleResetPosition = () => {
        try {
            TagCanvas.RotateTag('wordcloud-canvas', {
                id: 'word-tag-0',
                lat: 18,
                lng: -40,
                time: 600,
                callback: () => {
                    if (isAutoRotating) {
                        TagCanvas.SetSpeed('wordcloud-canvas', [0.08, -0.04]);
                        TagCanvas.Resume('wordcloud-canvas');
                    } else {
                        TagCanvas.SetSpeed('wordcloud-canvas', [0, 0]);
                    }
                }
            });
        } catch (e) { }
    };

    if (isLoading) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-5 w-48 bg-zinc-800 rounded"></div>
                    <div className="h-8 w-32 bg-zinc-800 rounded-lg"></div>
                </div>
                <div className="h-72 bg-zinc-800/30 rounded-xl flex items-center justify-center">
                    <div className="w-7 h-7 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!wordCloud || wordCloud.length === 0) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 flex flex-col items-center justify-center text-center h-full min-h-80 select-none">
                <div className="w-12 h-12 rounded-full bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-xl mb-3">
                    💬
                </div>
                {isLive ? (
                    <div>
                        <p className="text-zinc-200 font-medium text-sm">🔴 Siaran Sedang Berlangsung</p>
                        <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                            Awan kata (50 kata teratas) sedang dianalisis dari riwayat obrolan dan akan otomatis tersedia setelah siaran selesai.
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-zinc-300 font-medium text-sm">Belum ada data topik & kata kunci untuk siaran ini.</p>
                        <p className="text-xs text-zinc-500 mt-1">Data kata terpopuler akan otomatis muncul saat penonton mengirim pesan.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 flex flex-col h-full space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row lg:flex-col xl:flex-row md:items-center lg:items-start justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-2">
                            <span>☁️ 50 Kata Terpopuler</span>
                        </h3>
                        <span className="text-xs text-zinc-400">
                            ({filteredWords.length} kata {streamerName ? `• ${streamerName}` : ''})
                        </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Topik yang paling sering dibicarakan penonton selama siaran berlangsung
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-col min-[540px]:flex-row md:flex-col lg:flex-row xl:flex-col lg:w-full xl:w-85">
                    {/* Search Input */}
                    <div className="relative w-full min-[540px]:w-[45%] md:w-64.75 lg:w-[90%] xl:w-80">
                        <input
                            type="text"
                            placeholder="Cari kata kunci..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-zinc-900 border rounded-lg px-2.5 py-1.5 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 w-full"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex p-0.5 w-full min-[540px]:w-[55%] md:w-64.75 lg:w-full xl:w-80 rounded-lg bg-zinc-900 border border-zinc-800">
                        <button
                            onClick={() => setViewMode('cloud')}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex justify-center w-full gap-1 ${viewMode === 'cloud'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                        >
                            <span>🌐 Awan Kata 3D</span>
                        </button>
                        <button
                            onClick={() => {setViewMode('list'), setIsAutoRotating(false)}}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex justify-center w-full gap-1 ${viewMode === 'list'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                        >
                            <span>📋 Daftar Peringkat</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Ringkasan Statistik: Total Kata & Top 3 di Atas Konten */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/70 text-xs">
                <div className="flex md:w-full items-start min-[540px]:items-center justify-between md:flex-wrap gap-2">
                    <div className="flex items-center justify-evenly px-2.5 py-1 w-30 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-medium">
                        <span className="text-zinc-500">Total:</span>
                        <span className="text-zinc-100 font-semibold">{wordCloud.length} Kata</span>
                    </div>

                    {topThree.length > 0 && (
                        <>
                            <div className="flex w-1/2 min-[540px]:w-[90%] md:w-[70%] items-center justify-end flex-wrap gap-1.5">
                                {topThree.map((item, idx) => {
                                    const rankStyles = [
                                        'border-amber-500/40 bg-amber-500/10 text-amber-300',     // Peringkat 1: Emas
                                        'border-sky-500/40 bg-sky-500/10 text-sky-300',         // Peringkat 2: Biru
                                        'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' // Peringkat 3: Hijau
                                    ];
                                    const medals = ['🥇', '🥈', '🥉'];
                                    return (
                                        <div
                                            key={item.text}
                                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs ${rankStyles[idx] || 'border-zinc-700 bg-zinc-800 text-zinc-300'}`}
                                        >
                                            <span>{medals[idx]}</span>
                                            <span className="font-semibold text-zinc-100">"{item.text}"</span>
                                            <span className="text-[11px] opacity-80">{Number(item.value).toLocaleString()}x</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Hidden HTML Tag List for TagCanvas (ditempatkan di luar viewport) */}
            <div
                id="wordcloud-taglist"
                style={{
                    position: 'absolute',
                    top: '-9999px',
                    left: '-9999px',
                    opacity: 0
                }}
                aria-hidden="true"
            >
                <ul>
                    {filteredWords.map((item, idx) => {
                        const color = getWordColor(idx);
                        return (
                            <li key={item.text}>
                                <a
                                    id={`word-tag-${idx}`}
                                    href={`#${encodeURIComponent(item.text)}`}
                                    data-weight={item.value}
                                    style={{ color }}
                                    onClick={(e) => e.preventDefault()}
                                >
                                    {item.text}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Content Display */}
            {viewMode === 'cloud' ? (
                <div
                    ref={containerRef}
                    className="relative w-full flex-1 min-h-80 rounded-xl bg-linear-to-b from-zinc-900/50 via-zinc-950/80 to-zinc-950 border border-zinc-800/60 overflow-hidden flex flex-col select-none"
                >
                    {filteredWords.length === 0 ? (
                        <div className="py-16 text-center text-zinc-500 text-xs m-auto">
                            Tidak ada kata yang sesuai dengan pencarian "{searchQuery}"
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 w-full h-full min-h-0">
                            {/* Area Canvas 3D */}
                            <div className="relative w-full flex-1 min-h-0">
                                <canvas
                                    id="wordcloud-canvas"
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full block"
                                >
                                    <p>Peramban Anda tidak mendukung HTML5 Canvas.</p>
                                </canvas>
                            </div>

                            {/* Floating Toolbar Interaktif di Bagian Bawah Canvas */}
                            <div className="w-full shrink-0 flex items-center justify-between flex-wrap gap-2 px-3 py-2 bg-zinc-900/70 border-t border-zinc-800/60 text-xs backdrop-blur-sm z-10">
                                {/* Mode Putar Bebas Info */}
                                <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                                    <span className="text-zinc-500 hidden sm:inline">
                                        • Geser kursor mouse atau sentuh layar untuk memutar 360°
                                    </span>
                                </div>

                                {/* Kontrol Bentuk 3D, Putar/Jeda, Reset */}
                                <div className="flex items-center gap-1.5">
                                    <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                                        <button
                                            onClick={() => setCloudShape('sphere')}
                                            title="Bentuk Bola 3D"
                                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${cloudShape === 'sphere' ? 'bg-zinc-800 text-sky-400' : 'text-zinc-400 hover:text-zinc-200'
                                                }`}
                                        >
                                            Bola 3D
                                        </button>
                                        <button
                                            onClick={() => setCloudShape('hcylinder')}
                                            title="Bentuk Silinder Vertikal"
                                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${cloudShape === 'hcylinder' ? 'bg-zinc-800 text-sky-400' : 'text-zinc-400 hover:text-zinc-200'
                                                }`}
                                        >
                                            Silinder
                                        </button>
                                        <button
                                            onClick={() => setCloudShape('hring')}
                                            title="Bentuk Cincin Melingkar"
                                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${cloudShape === 'hring' ? 'bg-zinc-800 text-sky-400' : 'text-zinc-400 hover:text-zinc-200'
                                                }`}
                                        >
                                            Cincin
                                        </button>
                                    </div>

                                    {/* Tombol Putar / Jeda */}
                                    <button
                                        onClick={toggleAutoRotate}
                                        title={isAutoRotating ? 'Jeda Rotasi Otomatis' : 'Mulai Rotasi Otomatis'}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-medium transition cursor-pointer"
                                    >
                                        {isAutoRotating ? (
                                            <>
                                                <svg className="w-3 h-3 text-sky-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                                </svg>
                                                <span>Jeda</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3 h-3 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                                <span>Putar</span>
                                            </>
                                        )}
                                    </button>

                                    {/* Tombol Reset Posisi */}
                                    <button
                                        onClick={handleResetPosition}
                                        title="Kembalikan Kecepatan & Posisi Semula"
                                        className="p-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center justify-center"
                                    >
                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="relative w-full flex-1 min-h-80 rounded-xl border border-zinc-800/60 bg-zinc-950/30 overflow-hidden">
                    <div
                        ref={tableContainerRef}
                        onScroll={handleTableScroll}
                        className="absolute inset-0 overflow-auto no-scrollbar"
                    >
                        <table className="w-full min-w-120 table-fixed text-left text-xs">
                            <colgroup>
                                <col className="w-16" />
                                <col className="w-32" />
                                <col className="w-44" />
                                <col className="w-24" />
                            </colgroup>
                            <thead className="sticky top-0 z-10 bg-zinc-900 text-zinc-400 border-b border-zinc-800 shadow-sm">
                                <tr>
                                    <th className="py-2.5 px-3 text-center font-medium">Peringkat</th>
                                    <th className="py-2.5 px-3 font-medium">Kata Kunci</th>
                                    <th className="py-2.5 px-3 font-medium">Frekuensi Relatif</th>
                                    <th className="py-2.5 px-3 text-right font-medium">Total Sebutan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                                {filteredWords.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-zinc-500 text-xs">
                                            Tidak ada kata yang sesuai dengan pencarian "{searchQuery}"
                                        </td>
                                    </tr>
                                ) : (
                                    filteredWords.map((item, idx) => {
                                        const rank = idx + 1;
                                        const relativePct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;

                                        let rankBadge = <span className="text-zinc-400 font-semibold text-xs">#{rank}</span>;
                                        if (rank === 1) rankBadge = <span className="text-base">🥇</span>;
                                        else if (rank === 2) rankBadge = <span className="text-base">🥈</span>;
                                        else if (rank === 3) rankBadge = <span className="text-base">🥉</span>;

                                        return (
                                            <tr
                                                key={item.text}
                                                className="hover:bg-zinc-800/40 transition"
                                            >
                                                <td className="py-2 px-3 text-center">{rankBadge}</td>
                                                <td className="py-2 px-3 truncate">
                                                    <span className={`text-xs sm:text-sm font-medium ${rank <= 3 ? 'text-zinc-100 font-semibold' : 'text-zinc-300'}`}>
                                                        {item.text}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            style={{ width: `${relativePct}%` }}
                                                            className={`h-full rounded-full ${rank === 1 ? 'bg-amber-400' :
                                                                rank === 2 ? 'bg-sky-400' :
                                                                    rank === 3 ? 'bg-emerald-400' :
                                                                        'bg-indigo-400'
                                                                }`}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3 text-right font-semibold text-zinc-100 text-xs sm:text-sm">
                                                    {Number(item.value).toLocaleString()} <span className="text-zinc-500 text-[11px] font-normal">x</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Floating Vertical Scrollbar Indicator */}
                    <div
                        ref={vThumbRef}
                        className="absolute right-0 top-0 w-1 bg-zinc-700 rounded-full pointer-events-none opacity-0 transition-opacity duration-500 ease-out z-20"
                        style={{ height: '0px' }}
                    />

                    {/* Floating Horizontal Scrollbar Indicator */}
                    <div
                        ref={hThumbRef}
                        className="absolute bottom-0 left-0 h-1 bg-zinc-700 rounded-full pointer-events-none opacity-0 transition-opacity duration-500 ease-out z-20"
                        style={{ width: '0px' }}
                    />
                </div>
            )}
        </div>
    );
}
