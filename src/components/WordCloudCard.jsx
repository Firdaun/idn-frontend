import { useState, useMemo, useEffect, useRef } from 'react';
import TagCanvas from '../lib/tagcanvas.js';

export default function WordCloudCard({ wordCloud = [], isLoading = false, streamerName = '', isLive = false }) {
    const [viewMode, setViewMode] = useState('cloud');
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredWord, setHoveredWord] = useState(null);
    const [selectedWord, setSelectedWord] = useState(null);
    const [isHighlightMode, setIsHighlightMode] = useState(false);
    const [cloudShape, setCloudShape] = useState('sphere');
    const [isAutoRotating, setIsAutoRotating] = useState(true);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const lastActiveTagRef = useRef(null);

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

    const getWordColor = (idx) => {
        if (idx === 0) return '#34d399'
        if (idx === 1) return '#fbbf24'
        if (idx === 2) return '#38bdf8'
        if (idx < 10) return '#a78bfa'
        if (idx < 25) return '#e2e8f0'
        return '#94a3b8';
    };

    const handleSelectWord = (item, idx) => {
        if (!isHighlightMode && viewMode === 'cloud') return;
        setSelectedWord(item);
        setHoveredWord(null);
        try {
            if (typeof idx === 'number' && !isNaN(idx)) {
                TagCanvas.TagToFront('wordcloud-canvas', { id: `word-tag-${idx}` });
            } else {
                TagCanvas.TagToFront('wordcloud-canvas', { text: item.text });
            }
        } catch (err) {
            console.warn('TagToFront error:', err);
        }
    };

    useEffect(() => {
        if (viewMode !== 'cloud' || !filteredWords || filteredWords.length === 0) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const initTagCanvas = () => {
            const width = Math.floor(container.clientWidth || 520);
            const height = Math.max(340, Math.min(420, Math.round(width * 0.62)));
            canvas.width = width;
            canvas.height = height;

            try {
                TagCanvas.Start('wordcloud-canvas', 'wordcloud-taglist', {
                    textColour: null,
                    textFont: 'Inter, system-ui, -apple-system, sans-serif',
                    textHeight: 18,
                    weight: true,
                    weightMode: 'size',
                    weightFrom: 'data-weight',
                    weightSizeMin: 14,
                    weightSizeMax: 32,

                    noSelect: !isHighlightMode,
                    outlineMethod: isHighlightMode ? 'outline' : 'none',
                    outlineColour: '#38bdf8',
                    outlineThickness: 2,
                    outlineRadius: 6,
                    outlineOffset: 4,
                    padding: 2,

                    shape: cloudShape,
                    maxSpeed: 0.035,
                    minSpeed: 0.0,
                    initial: isAutoRotating ? [0.08, -0.04] : [0, 0],
                    decel: 0.96,
                    depth: 0.85,
                    minBrightness: 0.25,
                    maxBrightness: 1.0,

                    dragControl: true,
                    wheelZoom: false,
                    clickToFront: isHighlightMode ? 600 : false,
                    activeCursor: isHighlightMode ? 'pointer' : 'grab',
                    fadeIn: 400,
                    animTiming: 'Smooth'
                });
            } catch (err) {
                console.warn('TagCanvas initialization:', err);
            }
        };

        const timer = setTimeout(initTagCanvas, 50);

        const resizeObserver = new ResizeObserver(() => {
            initTagCanvas();
        });
        resizeObserver.observe(container);

        return () => {
            clearTimeout(timer);
            resizeObserver.disconnect();
            try {
                TagCanvas.Delete('wordcloud-canvas');
            } catch (e) {
            }
        };
    }, [filteredWords, cloudShape, viewMode, isAutoRotating, isHighlightMode]);

    // Tangani mouse move pada canvas untuk melacak kata aktif (hanya di Mode Sorot)
    const handleCanvasMouseMove = () => {
        if (!isHighlightMode) return;
        const tc = TagCanvas?.tc?.['wordcloud-canvas'];
        if (tc?.active?.tag) {
            lastActiveTagRef.current = tc.active.tag;
            const text = tc.active.tag.a?.getAttribute('data-text');
            const value = Number(tc.active.tag.a?.getAttribute('data-value') || 0);
            if (text && (!hoveredWord || hoveredWord.text !== text)) {
                setHoveredWord({ text, value });
            }
        } else {
            if (hoveredWord) {
                setHoveredWord(null);
            }
        }
    };

    // Tangani klik pada canvas untuk memilih/menyorot kata (hanya di Mode Sorot)
    const handleCanvasClick = () => {
        if (!isHighlightMode) return;
        const tc = TagCanvas?.tc?.['wordcloud-canvas'];
        const activeTag = tc?.active?.tag || lastActiveTagRef.current;
        if (activeTag) {
            const text = activeTag.a?.getAttribute('data-text');
            const value = Number(activeTag.a?.getAttribute('data-value') || 0);
            const idxStr = activeTag.a?.getAttribute('data-index');
            const idx = idxStr ? parseInt(idxStr, 10) : undefined;
            if (text) {
                handleSelectWord({ text, value }, idx);
            }
        }
    };

    // Tombol toggle putar otomatis
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
            } catch (e) {}
            return next;
        });
    };

    // Reset arah dan kecepatan rotasi
    const handleResetPosition = () => {
        try {
            TagCanvas.SetSpeed('wordcloud-canvas', [0.08, -0.04]);
            setIsAutoRotating(true);
        } catch (e) {}
    };

    const displayWord = hoveredWord || selectedWord;

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
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-5 text-center text-zinc-400 text-sm space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-zinc-800/80 border-zinc-700/80 text-zinc-300">
                    <span>☁️ Awan Kata & Topik Hangat</span>
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
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-4">
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
                            onClick={() => setViewMode('list')}
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

            {/* Hovered / Selected Word Summary Bar */}
            <div className="min-h-6 flex items-center justify-between text-xs px-1">
                {isHighlightMode && displayWord ? (
                    <div className="flex items-center gap-2 text-zinc-200 animate-fadeIn">
                        <span className="text-zinc-400">Kata:</span>
                        <strong className="text-sky-400 font-semibold text-sm">"{displayWord.text}"</strong>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-300 font-medium">{Number(displayWord.value).toLocaleString()} kali diucapkan</span>
                        <span className="text-zinc-500 text-[11px]">
                            ({maxVal > 0 ? ((displayWord.value / maxVal) * 100).toFixed(0) : 0}% dari kata teratas)
                        </span>
                        {selectedWord && (
                            <button
                                onClick={() => setSelectedWord(null)}
                                className="text-zinc-400 hover:text-zinc-200 ml-2 text-xs px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer flex items-center gap-1"
                                title="Hapus sorotan"
                            >
                                <span>✕</span>
                                <span>Lepas Sorot</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <span className="text-zinc-500 text-xs italic">
                        {viewMode === 'cloud'
                            ? isHighlightMode
                                ? 'Arahkan kursor atau klik kata untuk melihat rincian dan memutarnya ke depan'
                                : 'Mode putar mulus aktif. Klik tombol "🎯 Mode Sorot" di bawah jika ingin menyorot kata tertentu'
                            : 'Peringkat 50 kata yang paling dominan di obrolan'}
                    </span>
                )}
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
                                    data-text={item.text}
                                    data-value={item.value}
                                    data-index={idx}
                                    style={{ color }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (isHighlightMode) {
                                            handleSelectWord(item, idx);
                                        }
                                    }}
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
                    className="relative w-full rounded-xl bg-linear-to-b from-zinc-900/50 via-zinc-950/80 to-zinc-950 border border-zinc-800/60 overflow-hidden flex flex-col items-center justify-center select-none"
                    style={{ minHeight: '340px' }}
                >
                    {filteredWords.length === 0 ? (
                        <div className="py-16 text-center text-zinc-500 text-xs">
                            Tidak ada kata yang sesuai dengan pencarian "{searchQuery}"
                        </div>
                    ) : (
                        <>
                            {/* Canvas 3D */}
                            <canvas
                                id="wordcloud-canvas"
                                ref={canvasRef}
                                onClick={handleCanvasClick}
                                onMouseMove={handleCanvasMouseMove}
                                onMouseLeave={() => setHoveredWord(null)}
                                className={`w-full block cursor-grab ${isHighlightMode ? 'cursor-pointer' : 'active:cursor-grabbing'}`}
                            >
                                <p>Peramban Anda tidak mendukung HTML5 Canvas.</p>
                            </canvas>

                            {/* Floating Toolbar Interaktif di Bawah Canvas */}
                            <div className="w-full flex items-center justify-between flex-wrap gap-2 px-3 py-2 bg-zinc-900/70 border-t border-zinc-800/60 text-xs backdrop-blur-sm">
                                {/* Mode Interaksi: Putar Bebas vs Mode Sorot */}
                                <div className="flex items-center gap-2">
                                    <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                                        <button
                                            onClick={() => {
                                                setIsHighlightMode(false);
                                                setHoveredWord(null);
                                                setSelectedWord(null);
                                            }}
                                            title="Putar awan kata dengan bebas dan mulus tanpa gangguan sorotan"
                                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                                !isHighlightMode
                                                    ? 'bg-zinc-800 text-white shadow-xs'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            <span>🖐️ Putar Bebas</span>
                                        </button>
                                        <button
                                            onClick={() => setIsHighlightMode(true)}
                                            title="Aktifkan mode sorot untuk melihat border kata saat di-hover dan memilih kata"
                                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                                isHighlightMode
                                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
                                                    : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            <span>🎯 Mode Sorot</span>
                                        </button>
                                    </div>

                                    {/* Petunjuk Ringkas */}
                                    <span className="text-[11px] text-zinc-500 hidden sm:inline">
                                        {isHighlightMode ? '• Klik kata untuk fokus & melihat detail' : '• Geser untuk memutar 360° secara mulus'}
                                    </span>
                                </div>

                                {/* Kontrol Bentuk 3D, Putar/Jeda, Reset */}
                                <div className="flex items-center gap-1.5">
                                    <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                                        <button
                                            onClick={() => setCloudShape('sphere')}
                                            title="Bentuk Bola 3D"
                                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                                cloudShape === 'sphere' ? 'bg-zinc-800 text-sky-400' : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            Bola 3D
                                        </button>
                                        <button
                                            onClick={() => setCloudShape('vcylinder')}
                                            title="Bentuk Silinder Vertikal"
                                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                                cloudShape === 'vcylinder' ? 'bg-zinc-800 text-sky-400' : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            Silinder
                                        </button>
                                        <button
                                            onClick={() => setCloudShape('hring')}
                                            title="Bentuk Cincin Melingkar"
                                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                                cloudShape === 'hring' ? 'bg-zinc-800 text-sky-400' : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            Cincin
                                        </button>
                                    </div>

                                    {/* Tombol Putar / Jeda */}
                                    <button
                                        onClick={toggleAutoRotate}
                                        title={isAutoRotating ? 'Jeda Rotasi Otomatis' : 'Mulai Rotasi Otomatis'}
                                        className="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] transition cursor-pointer"
                                    >
                                        {isAutoRotating ? '⏸️ Jeda' : '▶️ Putar'}
                                    </button>

                                    {/* Tombol Reset Posisi */}
                                    <button
                                        onClick={handleResetPosition}
                                        title="Kembalikan Kecepatan & Posisi Semula"
                                        className="p-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition cursor-pointer"
                                    >
                                        🔄
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                /* Mode List / Top Ranking */
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/30 overflow-hidden">
                    <table className="w-full table-fixed text-left text-xs bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                        <colgroup>
                            <col className="w-14 sm:w-16" />
                            <col />
                            <col className="w-32 sm:w-48" />
                            <col className="w-24 sm:w-28" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="py-2.5 px-3 text-center font-medium">Peringkat</th>
                                <th className="py-2.5 px-3 font-medium">Kata Kunci</th>
                                <th className="py-2.5 px-3 font-medium">Frekuensi Relatif</th>
                                <th className="py-2.5 pl-2 pr-3 text-right font-medium">Total Sebutan</th>
                            </tr>
                        </thead>
                    </table>

                    <div className="overflow-y-auto max-h-80 custom-scrollbar">
                        <table className="w-full table-fixed text-left text-xs">
                            <colgroup>
                                <col className="w-14 sm:w-16" />
                                <col />
                                <col className="w-32 sm:w-48" />
                                <col className="w-24 sm:w-28" />
                            </colgroup>
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
                                                onMouseEnter={() => setHoveredWord(item)}
                                                onMouseLeave={() => setHoveredWord(null)}
                                                className="hover:bg-zinc-800/40 transition cursor-pointer"
                                                onClick={() => handleSelectWord(item, idx)}
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
                                                            className={`h-full rounded-full ${rank === 1 ? 'bg-emerald-400' :
                                                                    rank === 2 ? 'bg-amber-400' :
                                                                        rank === 3 ? 'bg-sky-400' :
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
                </div>
            )}
        </div>
    );
}
