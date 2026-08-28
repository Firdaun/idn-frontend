import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush } from 'recharts';
import { getMultiLiveData } from '../../utils/backend-api';
import { getMemberColor } from '../../utils/color';
import { useQuery } from '@tanstack/react-query';

export default function Analytics() {
    const [selectedStreamer, setSelectedStreamer] = useState(null);
    const [timeRange, setTimeRange] = useState(() => sessionStorage.getItem('analytics_timeRange') || 'today');
    const [customStart, setCustomStart] = useState(() => sessionStorage.getItem('analytics_customStart') || '');
    const [customEnd, setCustomEnd] = useState(() => sessionStorage.getItem('analytics_customEnd') || '');
    const [appliedCustom, setAppliedCustom] = useState(() => {
        const saved = sessionStorage.getItem('analytics_appliedCustom');
        return saved ? JSON.parse(saved) : { start: null, end: null };
    });

    useEffect(() => {
        sessionStorage.setItem('analytics_timeRange', timeRange);
    }, [timeRange]);
    useEffect(() => {
        sessionStorage.setItem('analytics_customStart', customStart);
    }, [customStart]);
    useEffect(() => {
        sessionStorage.setItem('analytics_customEnd', customEnd);
    }, [customEnd]);
    useEffect(() => {
        sessionStorage.setItem('analytics_appliedCustom', JSON.stringify(appliedCustom));
    }, [appliedCustom]);

    const getTodayStartIso = () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return start.toISOString();
    };

    const getDaysAgoIsoRange = (daysAgo) => {
        const start = new Date();
        start.setDate(start.getDate() - daysAgo);
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setDate(end.getDate() - daysAgo)
        end.setHours(23, 59, 59, 999);
        return {
            start: start.toISOString(),
            end: end.toISOString()
        };
    };

    const { start: activeStart, end: activeEnd } = useMemo(() => {
        if (timeRange === 'today' || timeRange === '1h') return { start: getTodayStartIso(), end: null };
        if (timeRange === '1d') return getDaysAgoIsoRange(1);
        if (timeRange === '2d') return getDaysAgoIsoRange(2);
        if (timeRange === 'custom') return appliedCustom;
        return { start: null, end: null };
    }, [timeRange, appliedCustom])

    const {
        data = { chartData: [], streamers: [] },
        isLoading: isAnalyticsLoading,
        isFetching: isAnalyticsFetching,
        refetch
    } = useQuery({
        queryKey: ['multiLive', timeRange, activeStart, activeEnd],
        queryFn: () => getMultiLiveData(activeStart, activeEnd),
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 20,
    })

    const loading = isAnalyticsLoading && (!data.chartData || data.chartData.length === 0);
    const refreshing = isAnalyticsFetching

    useEffect(() => {
        if (selectedStreamer && data?.streamers) {
            const updated = data.streamers.find(s => s.name === selectedStreamer.name)
            if (updated) {
                setSelectedStreamer(prev => ({
                    ...updated,
                    clickedTime: prev?.clickedTime ?? null,
                    clickedViewers: prev?.clickedViewers ?? null
                }))
            } else {
                setSelectedStreamer(null)
            }
        }
    }, [data])

    const streamers = data.streamers || [];
    const chartData = data.chartData || [];
    const maxPeak = streamers.reduce((max, s) => Math.max(max, s.peakViewers || 0), 0);

    const handleApplyCustomRange = () => {
        if (!customStart || !customEnd) {
            alert('Silakan pilih waktu mulai dan waktu selesai!');
            return;
        }
        setAppliedCustom({
            start: new Date(customStart).toISOString(),
            end: new Date(customEnd).toISOString()
        })
    };

    const calculateDurationAtTime = (liveAt, timestamp) => {
        if (!liveAt || !timestamp) return null;
        const startTime = new Date(liveAt).getTime();
        if (isNaN(startTime)) return null;

        const diffMs = Number(timestamp) - startTime;
        if (diffMs <= 0) return "0 Detik";

        const totalSeconds = Math.floor(diffMs / 1000);
        if (totalSeconds < 60) return `${totalSeconds} Detik`;

        const totalMinutes = Math.floor(totalSeconds / 60);
        if (totalMinutes < 60) return `${totalMinutes} Menit`;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes > 0 ? `${hours} Jam ${minutes} Menit` : `${hours} Jam`;
    };

    const formatLiveTime = (dateStrOrMs) => {
        if (!dateStrOrMs) return "-";
        const d = new Date(Number(dateStrOrMs) || dateStrOrMs);
        if (isNaN(d.getTime())) return "-";
        const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(/\./g, ":");
        const date = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        return `${time} (${date})`;
    };

    const formatAxisTime = (rawTime) => {
        if (!rawTime) return "";
        const d = new Date(Number(rawTime) || rawTime);
        if (isNaN(d.getTime())) return "";
        const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");
        const date = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        return `${time} ${date}`;
    };

    const handleDotClick = (streamer, dotPayload) => {
        const dataPoint = dotPayload?.payload
        const clickedTime = dataPoint?.timeLabel;
        const clickedViewers = dataPoint && streamer?.name ? dataPoint[streamer.name] : null;
        const clickedSlug = dataPoint && streamer?.name ? dataPoint[`_${streamer.name}_slug`] : null;
        let matchedSession = null;
        if (clickedSlug && streamer.sessions) {
            matchedSession = streamer.sessions.find(s => s.slug === clickedSlug);
        }

        const baseInfo = matchedSession || streamer;
        setSelectedStreamer({
            ...baseInfo,
            name: streamer.name,
            clickedTime: clickedTime || null,
            clickedViewers: clickedViewers ?? null,
            clickedSlug: clickedSlug || null
        });
    };
    

    const filteredChartData = useMemo(() => {
        if (!chartData.length || timeRange !== '1h') return chartData;

        const lastItem = chartData[chartData.length - 1];
        const lastTime = Number(lastItem?.timeLabel);

        if (!lastTime || isNaN(lastTime)) {
            console.error("Format waktu pada data snapshot terakhir tidak valid:", lastItem);
            throw new Error("Gagal memfilter 1 jam: Nilai timeLabel pada data terakhir tidak valid atau kosong.");
        }
        const threshold = lastTime - 60 * 60 * 1000;
        return chartData.filter(d => (Number(d.timeLabel) || 0) >= threshold);
    }, [chartData, timeRange]);


    // Downsampling data maksimum 400 titik untuk menjaga render SVG tetap super ringan (< 50MB RAM)
    const sampledChartData = useMemo(() => {
        const raw = filteredChartData;
        if (!raw || raw.length <= 400) return raw;

        const step = Math.ceil(raw.length / 400);
        const sampled = [];
        for (let i = 0; i < raw.length; i += step) {
            sampled.push(raw[i]);
        }

        if (sampled[sampled.length - 1] !== raw[raw.length - 1]) {
            sampled.push(raw[raw.length - 1]);
        }
        return sampled;
    }, [filteredChartData]);
    console.log('sampledChartData', sampledChartData);
    

    // Hanya render garis member yang memiliki data penonton pada rentang waktu ini
    const activeStreamers = useMemo(() => {
        if (!streamers.length || !sampledChartData.length) return streamers;
        const present = streamers.filter(s => sampledChartData.some(d => d[s.name] !== undefined && d[s.name] !== null));
        const list = present.length > 0 ? present : streamers;
        // 🔥 Sortir dari penonton tertinggi ke terendah (paling banyak di paling kiri)
        return [...list].sort((a, b) => (b.peakViewers || 0) - (a.peakViewers || 0));
    }, [streamers, sampledChartData]);
    console.log(activeStreamers);
    

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100">Live Analytics</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Statistik penonton dan durasi stream per member secara komparatif
                    </p>
                </div>

                <button
                    onClick={() => refetch()}
                    disabled={refreshing}
                    className="self-start sm:self-auto px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm text-zinc-300 hover:text-white font-medium transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                    <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{refreshing ? "Memuat..." : "Refresh"}</span>
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-5">
                    <span className="text-sm text-zinc-400 font-medium">Streamer Tercatat</span>
                    <p className="text-2xl sm:text-3xl font-semibold text-zinc-100 mt-1">
                        {streamers.length} <span className="text-sm font-normal text-zinc-400">member</span>
                    </p>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-5">
                    <span className="text-sm text-zinc-400 font-medium">Peak Viewers Tertinggi</span>
                    <p className="text-2xl sm:text-3xl font-semibold text-zinc-100 mt-1">
                        {maxPeak > 0 ? maxPeak.toLocaleString() : "-"}
                    </p>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-5">
                    <span className="text-sm text-zinc-400 font-medium">Total Snapshot Waktu</span>
                    <p className="text-2xl sm:text-3xl font-semibold text-zinc-100 mt-1">
                        {filteredChartData.length} <span className="text-sm font-normal text-zinc-400">titik ({timeRange === 'all' ? 'Semua' : timeRange === 'today' ? 'Hari Ini' : timeRange})</span>
                    </p>
                </div>
            </div>

            {/* Selected Detail */}
            {selectedStreamer && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 p-5 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                            <h3 className="font-semibold text-base sm:text-lg text-zinc-100 truncate">{selectedStreamer.fullName}</h3>
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${selectedStreamer.endAt
                                ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}>
                                {selectedStreamer.endAt ? "Selesai Live" : "Sedang Live"}
                            </span>
                        </div>
                        <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 truncate">{selectedStreamer.slug}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-5">
                        <div>
                            <span className="text-zinc-400 block text-xs">Total Snapshot</span>
                            <span className="font-semibold text-zinc-100 text-base">
                                {`${selectedStreamer.totalSnapshots}x`}
                            </span>
                        </div>
                        {selectedStreamer.clickedViewers !== null && selectedStreamer.clickedViewers !== undefined && (
                            <div>
                                <span className="text-zinc-400 block text-xs">
                                    Viewers (@{formatLiveTime(selectedStreamer.clickedTime)})
                                </span>
                                <span className="font-semibold text-zinc-100 text-base">
                                    {Number(selectedStreamer.clickedViewers).toLocaleString()}
                                </span>
                            </div>
                        )}
                        <div>
                            <span className="text-zinc-400 block text-xs">Peak Viewers</span>
                            <span className="font-semibold text-zinc-100 text-base">
                                {Number(selectedStreamer.peakViewers ?? 0).toLocaleString()}
                            </span>
                        </div>
                        <div>
                            <span className="text-zinc-400 block text-xs">Rata-rata (Avg)</span>
                            <span className="font-semibold text-zinc-100 text-base">
                                {Math.round(selectedStreamer.avgViewers).toLocaleString()}
                            </span>
                        </div>
                        <div>
                            <span className="text-zinc-400 block text-xs">Mulai Live</span>
                            <span className="font-semibold text-zinc-100 text-base">
                                {formatLiveTime(selectedStreamer.liveAt)}
                            </span>
                        </div>
                        <div>
                            <span className="text-zinc-400 block text-xs">Selesai Live</span>
                            <span className="font-semibold text-zinc-100 text-base">
                                {selectedStreamer.endAt ? formatLiveTime(selectedStreamer.endAt) : '-'}
                            </span>
                        </div>
                        <div>
                            <span className="text-zinc-400 block text-xs">
                                {selectedStreamer.clickedTime ? `Durasi (@${formatLiveTime(selectedStreamer.clickedTime)})` : "Durasi"}
                            </span>
                            <span className="font-semibold text-zinc-100 text-base">
                                {selectedStreamer.clickedTime
                                    ? (calculateDurationAtTime(selectedStreamer.liveAt, selectedStreamer.clickedTime) || selectedStreamer.duration)
                                    : selectedStreamer.duration}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedStreamer(null);
                            }}
                            className="text-xs sm:text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            )}

            {/* Chart Area */}
            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-3xl p-5 sm:p-6 space-y-4">
                {/* Time Range Filter Bar */}
                <div className="flex relative flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-medium text-zinc-400">Rentang Waktu:</span>
                        <div className="inline-flex p-1 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            {[
                                { id: 'today', label: 'Hari Ini' },
                                { id: '1d', label: '1 Hari Lalu' },
                                { id: '2d', label: '2 Hari Lalu' },
                                { id: '1h', label: '1 Jam' },
                                { id: 'all', label: 'Semua' },
                                { id: 'custom', label: '⚙️ Kustom' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setTimeRange(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${timeRange === tab.id
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        {timeRange === 'custom' && (
                            <div className="flex flex-wrap items-center gap-3 bg-zinc-900/80 p-2 py-1 rounded-xl border border-zinc-800/80">
                                <div className="flex items-center gap-2 text-xs text-zinc-300">
                                    <span>Dari:</span>
                                    <input
                                        type="datetime-local"
                                        value={customStart}
                                        onChange={(e) => setCustomStart(e.target.value)}
                                        className="bg-zinc-900 border border-zinc-800/80 rounded-lg px-1 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-zinc-500"
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-300">
                                    <span>Sampai:</span>
                                    <input
                                        type="datetime-local"
                                        value={customEnd}
                                        onChange={(e) => setCustomEnd(e.target.value)}
                                        className="bg-zinc-900 border border-zinc-800/80 rounded-lg px-1 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-zinc-500"
                                    />
                                </div>
                                <button
                                    onClick={handleApplyCustomRange}
                                    disabled={refreshing}
                                    className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50"
                                >
                                    {refreshing ? "Menerapkan..." : "Terapkan"}
                                </button>
                            </div>
                        )}
                    </div>

                    <span className="absolute right-0 text-xs text-zinc-500 hidden sm:inline-block">
                        Tarik slider di bawah untuk zoom & geser riwayat
                    </span>
                </div>

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-3 text-zinc-400 text-sm">
                        <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Memuat data analitik...</span>
                    </div>
                ) : !filteredChartData.length ? (
                    <div className="h-72 flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-1.5 text-sm">
                        <p className="text-zinc-200 font-semibold text-base">Belum ada riwayat snapshot</p>
                        <p>Data grafik akan tampil saat ada perekaman live aktif.</p>
                    </div>
                ) : (
                    <div className="h-125 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sampledChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.4} />

                                <XAxis
                                    dataKey="timeLabel"
                                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                                    tickMargin={12}
                                    stroke="#27272a"
                                    tickFormatter={formatAxisTime}
                                />
                                <YAxis
                                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickMargin={12}
                                />

                                <Tooltip
                                    cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    itemSorter={(item) => -Number(item.value || 0)}
                                    contentStyle={{
                                        backgroundColor: '#18181b',
                                        borderRadius: '12px',
                                        border: '1px solid #27272a',
                                        color: '#f4f4f5',
                                        fontSize: '13px',
                                        padding: '10px 14px'
                                    }}
                                    itemStyle={{ padding: '2px 0' }}
                                    labelStyle={{ marginBottom: '6px', color: '#a1a1aa', fontWeight: 'bold' }}
                                    labelFormatter={(label) => {
                                        if (!label) return "";
                                        const d = new Date(Number(label));
                                        if (isNaN(d.getTime())) return "";
                                        const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(/\./g, ":");
                                        const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
                                        return `Waktu: ${timeStr} WIB (${dateStr})`;
                                    }}
                                />

                                <Legend
                                    content={() => (
                                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pt-5 text-xs">
                                            {activeStreamers.map((streamer, index) => {
                                                const color = getMemberColor(streamer.name, index);
                                                const isSelected = selectedStreamer?.name === streamer.name;
                                                const isDimmed = selectedStreamer && !isSelected;
                                                return (
                                                    <div
                                                        key={streamer.name}
                                                        onClick={() => {
                                                            setSelectedStreamer(isSelected ? null : { ...streamer, clickedTime: null, clickedViewers: null, clickedSlug: null });
                                                        }}
                                                        className={`inline-flex items-center gap-2 cursor-pointer transition select-none ${isDimmed ? 'opacity-30 hover:opacity-75' : 'opacity-100'
                                                            }`}
                                                    >
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                                        <span className={`font-medium ${isSelected ? 'text-white font-semibold' : 'text-zinc-300 hover:text-white'}`}>
                                                            {streamer.name}
                                                        </span>
                                                        {streamer.peakViewers > 0 && (
                                                            <span className="text-[11px] text-zinc-500 font-normal">
                                                                ({Number(streamer.peakViewers).toLocaleString()})
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                />


                                {activeStreamers.flatMap((streamer, streamerIndex) => {
                                    const sessions = streamer.sessions && streamer.sessions.length > 0
                                        ? streamer.sessions
                                        : [{ slug: streamer.slug, liveAt: streamer.liveAt }];

                                    return sessions.map((session, sessionIndex) => {
                                        const isSameMember = selectedStreamer && selectedStreamer.name === streamer.name;
                                        const isExactSessionSelected = selectedStreamer && selectedStreamer.slug === session.slug;

                                        // Cek apakah yang diklik adalah nama di Legend (bukan titik dot pada grafik)
                                        const isLegendClick = isSameMember && !selectedStreamer.clickedTime && !selectedStreamer.clickedSlug;
                                        let strokeOpacity = 1;
                                        let strokeWidth = 1.75;
                                        if (selectedStreamer) {
                                            if (isLegendClick) {
                                                strokeOpacity = 1;
                                                strokeWidth = 3;
                                            } else if (isExactSessionSelected) {
                                                strokeOpacity = 1;
                                                strokeWidth = 3.5;
                                            } else if (isSameMember) {
                                                strokeOpacity = 0.45;
                                                strokeWidth = 1.75;
                                            } else {
                                                strokeOpacity = 0.1;
                                                strokeWidth = 1.25;
                                            }
                                        }
                                        return (
                                            <Line
                                                key={`${streamer.name}-${session.slug || sessionIndex}`}
                                                type="linear"
                                                dataKey={(d) => (d[`_${streamer.name}_slug`] === session.slug ? d[streamer.name] : null)}
                                                name={streamer.name}
                                                stroke={getMemberColor(streamer.name, streamerIndex)}
                                                strokeWidth={strokeWidth}
                                                strokeOpacity={strokeOpacity}
                                                dot={false}
                                                isAnimationActive={false}
                                                connectNulls={false}
                                                activeDot={{
                                                    r: isExactSessionSelected  ? 6 : 4,
                                                    onClick: (e, payload) => handleDotClick(streamer, payload),
                                                    cursor: 'pointer',
                                                    strokeWidth: 0
                                                }}
                                            />
                                        )
                                    })
                                })}

                                {sampledChartData.length > 5 && (
                                    <Brush
                                        dataKey="timeLabel"
                                        height={32}
                                        stroke="#3f3f46"
                                        fill="#121214"
                                        tickFormatter={formatAxisTime}
                                        travellerWidth={10}
                                        className="text-xs"
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}
