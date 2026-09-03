import { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush } from 'recharts';
import { getMultiLiveData } from '../../utils/backend-api';
import { getMemberColor } from '../../utils/color';
import { useQuery } from '@tanstack/react-query';

const getTodayStartIso = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
};

export default function Analytics() {
    const [selectedStreamer, setSelectedStreamer] = useState(null);
    const [timeRange, setTimeRange] = useState(() => sessionStorage.getItem('analytics_timeRange') || 'today');
    const [customStart, setCustomStart] = useState(() => sessionStorage.getItem('analytics_customStart') || '');
    const [customEnd, setCustomEnd] = useState(() => sessionStorage.getItem('analytics_customEnd') || '');
    const [appliedCustom, setAppliedCustom] = useState(() => {
        const saved = sessionStorage.getItem('analytics_appliedCustom');
        return saved ? JSON.parse(saved) : { start: getTodayStartIso(), end: null };
    });
    const [metricType, setMetricType] = useState(() => sessionStorage.getItem('analytics_metricType') || 'viewers');
    const scrollMetricsRef = useRef(null);
    useEffect(() => {
        if (selectedStreamer && scrollMetricsRef.current) {
            scrollMetricsRef.current.scrollLeft = scrollMetricsRef.current.scrollWidth;
        }
    }, [selectedStreamer?.slug, selectedStreamer?.clickedTime]);

    useEffect(() => {
        sessionStorage.setItem('analytics_metricType', metricType);
    }, [metricType]);
    useEffect(() => {
        sessionStorage.setItem('analytics_timeRange', timeRange);
        setSelectedStreamer(prev => prev ? ({
            ...prev,
            clickedTime: null,
            clickedViewers: null,
            clickedChat: null
        }) : null);
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
        staleTime: 1000 * 60 * 15,
        gcTime: 1000 * 60 * 30
    })

    const loading = isAnalyticsLoading
    const refreshing = isAnalyticsFetching

    useEffect(() => {
        if (isAnalyticsLoading || isAnalyticsFetching) return;
        if (selectedStreamer && data.streamers) {
            const updated = data.streamers.find(s => s.name === selectedStreamer.name);
            if (updated) {
                const sessions = updated.sessions;
                const matchedSession = sessions.find(sess => sess.slug === selectedStreamer.slug);
                if (matchedSession) {
                    setSelectedStreamer(prev => ({
                        ...matchedSession,
                        name: updated.name,
                        fullName: matchedSession.fullName,
                        clickedTime: prev?.clickedTime ?? null,
                        clickedViewers: prev?.clickedViewers ?? null,
                        clickedChat: prev?.clickedChat ?? null
                    }));
                    console.log('selectedStreamer', selectedStreamer);

                } else {
                    setSelectedStreamer(null);
                }
            } else {
                setSelectedStreamer(null);
            }
        }
    }, [data, isAnalyticsLoading, isAnalyticsFetching]);

    const streamers = useMemo(() => {
        const rawStreamers = data.streamers;
        return rawStreamers.map(s => {
            const sessions = s.sessions
            const getPeak = (key) => Math.max(...sessions.map(sess => Number(sess[key])), 0);

            const maxSessionPeakViewers = getPeak('peakViewers');
            const maxSessionPeakChat = getPeak('peakChat');
            const totalSessionChat = s.sessions.reduce((acc, sess) => acc + (Number(sess.totalChat)), 0)

            return {
                ...s,
                peakViewers: maxSessionPeakViewers,
                peakChat: maxSessionPeakChat,
                totalChat: totalSessionChat
            };
        });
    }, [data.streamers]);

    const chartData = data.chartData;
    const maxPeak = useMemo(() => {
        return streamers.reduce((max, s) => Math.max(max, s.peakViewers), 0);
    }, [streamers]);

    const handleApplyCustomRange = () => {
        if (!customStart || !customEnd) {
            alert('Silakan pilih waktu mulai dan waktu selesai!');
            return;
        }
        setAppliedCustom({
            start: new Date(customStart).toISOString(),
            end: new Date(customEnd).toISOString()
        });
        setSelectedStreamer(prev => prev ? ({
            ...prev,
            clickedTime: null,
            clickedViewers: null,
            clickedChat: null
        }) : null);
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
        const clickedViewers = dataPoint[streamer.name];
        const clickedChat = dataPoint[`_${streamer.name}_chat`];
        const clickedSlug = dataPoint[`_${streamer.name}_slug`];
        const matchedSession = streamer.sessions.find(s => s.slug === clickedSlug);
        setSelectedStreamer({
            ...matchedSession,
            name: streamer.name,
            isLegendClick: false,
            clickedTime: clickedTime ?? null,
            clickedViewers: clickedViewers ?? null,
            clickedChat: clickedChat ?? null
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

    const activeChartData = useMemo(() => {
        if (!selectedStreamer) return sampledChartData;

        const memberPoints = filteredChartData.filter(
            d => selectedStreamer.name in d
        );

        if (!memberPoints.length) return sampledChartData;

        const timeMap = new Map();
        sampledChartData.forEach(d => timeMap.set(Number(d.timeLabel), d));
        memberPoints.forEach(d => timeMap.set(Number(d.timeLabel), d));

        return [...timeMap.values()].sort((a, b) => Number(a.timeLabel) - Number(b.timeLabel));
    }, [selectedStreamer?.name, sampledChartData, filteredChartData]);

    const activeStreamers = useMemo(() => {
        if (!streamers.length || !activeChartData.length) return streamers;
        const present = streamers.filter(s => activeChartData.some(d => s.name in d));
        const list = present.length > 0 ? present : streamers;
        return [...list].sort((a, b) => {
            if (metricType === 'chat') {
                return (b.peakChat || 0) - (a.peakChat || 0);
            }
            return (b.peakViewers || 0) - (a.peakViewers || 0);
        });
    }, [streamers, activeChartData, metricType]);

    const currentStreamerObj = streamers.find(s => s.name === selectedStreamer?.name);
    const streamerSessions = currentStreamerObj?.sessions || [];
    const currentSessionIndex = streamerSessions.findIndex(s => s.slug === selectedStreamer?.slug);
    const handlePrevSession = () => {
        if (streamerSessions.length <= 1) return;
        const activeIdx = currentSessionIndex >= 0 ? currentSessionIndex : 0;
        const prevIndex = (activeIdx - 1 + streamerSessions.length) % streamerSessions.length;
        const target = streamerSessions[prevIndex];
        setSelectedStreamer({
            ...target,
            name: selectedStreamer.name,
            fullName: target.fullName || selectedStreamer.fullName,
            isLegendClick: false,
            clickedTime: null,
            clickedViewers: null,
            clickedChat: null
        });
    };
    const handleNextSession = () => {
        if (streamerSessions.length <= 1) return;
        const activeIdx = currentSessionIndex >= 0 ? currentSessionIndex : 0;
        const nextIndex = (activeIdx + 1) % streamerSessions.length;
        const target = streamerSessions[nextIndex];
        setSelectedStreamer({
            ...target,
            name: selectedStreamer.name,
            fullName: target.fullName || selectedStreamer.fullName,
            isLegendClick: false,
            clickedTime: null,
            clickedViewers: null,
            clickedChat: null
        });
    };

    const activeRangeLabel = timeRange === 'all' ? 'Semua' : timeRange === 'today' ? 'Hari Ini' : timeRange === '1d' ? '1 Hari Lalu' : timeRange === '2d' ? '2 Hari Lalu' : timeRange === '1h' ? '1 Jam' : timeRange === 'custom' ? 'Kustom' : timeRange;

    return (
        <div className="space-y-3 lg:space-y-5 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100">Live Analytics</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Statistik penonton dan durasi stream per member secara komparatif
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                    <button
                        onClick={() => refetch()}
                        disabled={refreshing}
                        className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm text-zinc-300 hover:text-white font-medium transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>{refreshing ? "Memuat..." : "Refresh"}</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5">
                <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-lg lg:rounded-xl p-3 lg:p-5">
                    <span className="text-sm text-zinc-400 font-medium">Streamer Tercatat</span>
                    <p className="text-2xl lg:text-3xl font-semibold text-zinc-100 mt-1">
                        {streamers.length} <span className="text-sm font-normal text-zinc-400">member</span>
                    </p>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-lg lg:rounded-xl p-3 lg:p-5">
                    <span className="text-sm text-zinc-400 font-medium">Penonton Tertinggi</span>
                    <p className="text-2xl lg:text-3xl font-semibold text-zinc-100 mt-1">
                        {maxPeak > 0 ? maxPeak.toLocaleString() : "-"}
                    </p>
                </div>

                <div className="bg-zinc-900/30 hidden lg:block border border-zinc-800/40 rounded-lg lg:rounded-xl p-3 lg:p-5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-zinc-400 font-medium">Total Snapshot Waktu</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                            filteredChartData.length > 400
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                            {filteredChartData.length > 400 ? '> 400 (Disampling)' : '≤ 400 (Lengkap)'}
                        </span>
                    </div>
                    <p className="text-2xl lg:text-3xl font-semibold text-zinc-100 mt-1">
                        {sampledChartData.length.toLocaleString()}{' '}
                        <span className="text-sm font-normal text-zinc-400">
                            titik (dari {filteredChartData.length.toLocaleString()} asli • {activeRangeLabel})
                        </span>
                    </p>
                </div>
            </div>

            <div className="bg-zinc-900/30 block lg:hidden border text-center border-zinc-800/40 rounded-lg p-3">
                <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-zinc-400 font-medium">Total Snapshot Waktu</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                        filteredChartData.length > 400
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                        {filteredChartData.length > 400 ? '> 400 (Disampling)' : '≤ 400 (Lengkap)'}
                    </span>
                </div>
                <p className="text-2xl lg:text-3xl font-semibold text-zinc-100 mt-1">
                    {sampledChartData.length.toLocaleString()}{' '}
                    <span className="text-sm font-normal text-zinc-400">
                        titik (dari {filteredChartData.length.toLocaleString()} asli • {activeRangeLabel})
                    </span>
                </p>
            </div>

            {/* Selected Detail */}
            {selectedStreamer && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 p-3 lg:p-5 rounded-lg lg:rounded-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    {/* Sisi Kiri: Tombol Panah Kiri (jika multi-sesi) & Info Streamer */}
                    <div className="flex items-center justify-between gap-2 w-full lg:w-auto">
                        {streamerSessions.length > 1 && (
                            <button
                                onClick={handlePrevSession}
                                title="Sesi Sebelumnya"
                                className="p-2 rounded-md lg:rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}

                        <div className="min-w-10">
                            <div className="flex items-center gap-1 flex-wrap">
                                <h3 className="font-semibold text-base lg:text-lg text-zinc-100 truncate">
                                    {selectedStreamer.fullName}
                                </h3>
                                <div className='flex gap-1'>
                                    <span className={`px-1.5 py-0.5 rounded-sm lg:rounded-md text-[10px] font-medium border ${selectedStreamer.endAt
                                        ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                        : "bg-red-500/10 text-red-400 border-red-500/20"
                                        }`}>
                                        {selectedStreamer.endAt ? "Selesai Live" : "Sedang Live"}
                                    </span>
                                    {/* Badge penanda sesi */}
                                    {streamerSessions.length > 1 && (
                                        <span className="px-1.5 py-0.5 rounded-sm lg:rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                                            Sesi {(currentSessionIndex >= 0 ? currentSessionIndex : 0) + 1} dari {streamerSessions.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 truncate">{selectedStreamer.slug}</p>
                        </div>

                        {streamerSessions.length > 1 && (
                            <button
                                onClick={handleNextSession}
                                title="Sesi Berikutnya"
                                className="p-2 rounded-md lg:rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <div className='flex items-center gap-4 w-full lg:w-147 xl:w-208 2xl:w-272'>
                        <div ref={scrollMetricsRef} className='flex-1 overflow-x-auto pb-1'>
                            <div className="flex items-center gap-6 whitespace-nowrap">
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">Total Snapshot</span>
                                    <span className="font-semibold text-zinc-100 text-base">
                                        {`${selectedStreamer.totalSnapshots}x`}
                                    </span>
                                </div>
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">Peak Viewers</span>
                                    <span className="font-semibold text-zinc-100 text-base">
                                        {Number(selectedStreamer.peakViewers ?? 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">Rata-rata Viewers (Avg)</span>
                                    <span className="font-semibold text-zinc-100 text-base">
                                        {Math.round(selectedStreamer.avgViewers || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">Total Komentar</span>
                                    <span className="font-semibold text-zinc-100 text-base">
                                        {selectedStreamer.totalChat !== undefined ? Number(selectedStreamer.totalChat).toLocaleString() : '-'}
                                    </span>
                                </div>
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">Puncak Chat (Peak Hype)</span>
                                    <span className="font-semibold text-base text-zinc-100">
                                        {selectedStreamer.peakChat !== undefined ? `${Number(selectedStreamer.peakChat).toLocaleString()} / 30s` : '-'}
                                    </span>
                                </div>
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">Rata-rata Chat (Avg)</span>
                                    <span className="font-semibold text-zinc-100 text-base">
                                        {selectedStreamer.avgChat !== undefined ? `${selectedStreamer.avgChat} / 30s` : '-'}
                                    </span>
                                </div>
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">Mulai Live</span>
                                    <span className="font-semibold text-zinc-100 text-base">
                                        {formatLiveTime(selectedStreamer.liveAt)}
                                    </span>
                                </div>
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">Selesai Live</span>
                                    <span className="font-semibold text-zinc-100 text-base">
                                        {selectedStreamer.endAt ? formatLiveTime(selectedStreamer.endAt) : '-'}
                                    </span>
                                </div>
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">
                                        {selectedStreamer.clickedTime ? `Durasi (@${formatLiveTime(selectedStreamer.clickedTime)})` : "Durasi"}
                                    </span>
                                    <span className="font-semibold text-zinc-100 text-base">
                                        {selectedStreamer.clickedTime
                                            ? (calculateDurationAtTime(selectedStreamer.liveAt, selectedStreamer.clickedTime) || selectedStreamer.duration)
                                            : selectedStreamer.duration}
                                    </span>
                                </div>
                                {selectedStreamer.clickedViewers !== null && selectedStreamer.clickedViewers !== undefined && (
                                    <div className='shrink-0'>
                                        <span className="text-zinc-400 block text-xs">
                                            Viewers (@{formatLiveTime(selectedStreamer.clickedTime)})
                                        </span>
                                        <span className="font-semibold text-zinc-100 text-base">
                                            {Number(selectedStreamer.clickedViewers).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {selectedStreamer.clickedChat !== null && selectedStreamer.clickedChat !== undefined && (
                                    <div className='shrink-0'>
                                        <span className="text-zinc-400 block text-xs">
                                            Chat (@{formatLiveTime(selectedStreamer.clickedTime)})
                                        </span>
                                        <span className="font-semibold text-base text-zinc-100">
                                            {Number(selectedStreamer.clickedChat).toLocaleString()} / 30s
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className='flex justify-center items-center'>
                            <button
                                onClick={() => setSelectedStreamer(null)}
                                className="text-xs sm:text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-md lg:rounded-lg bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Chart Area */}
            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-lg lg:rounded-xl p-3 lg:p-5 space-y-4">
                {/* Time Range Filter Bar */}
                <div className="border-b border-zinc-900 pb-3 lg:pb-5 flex items-center w-full gap-3 md:gap-0 md:justify-between xl:justify-start xl:gap-3 flex-wrap">
                    <div className="flex w-full md:w-[calc(50%-4px)] lg:w-[calc(50%-37px)] xl:w-[24%] p-1 rounded-md lg:rounded-lg bg-zinc-900/80 border border-zinc-800/80">
                        <button
                            onClick={() => setMetricType('viewers')}
                            className={`px-3 py-1.5 w-1/2 rounded-sm lg:rounded-md text-xs font-medium transition cursor-pointer flex justify-center items-center gap-1.5 ${metricType === 'viewers'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                        >
                            <span>👥 Penonton</span>
                        </button>
                        <button
                            onClick={() => setMetricType('chat')}
                            className={`px-3 py-1.5 w-1/2 rounded-sm lg:rounded-md text-xs font-medium transition cursor-pointer flex justify-center items-center gap-1.5 ${metricType === 'chat'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                        >
                            <span>💬 Aktivitas Chat</span>
                        </button>
                    </div>

                    <div className="flex rounded-md lg:rounded-lg overflow-hidden md:h-9.5 bg-zinc-900/80 border w-full md:w-[calc(50%-4px)] lg:w-[calc(50%-37px)] xl:w-[calc(30%-9.4px)] border-zinc-800/80">
                        <div className='overflow-x-auto'>
                            <div className='flex h-full'>
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
                                        className={`shrink-0 px-3 py-1.5 text-xs font-medium transition cursor-pointer ${timeRange === tab.id
                                            ? 'bg-zinc-800 text-white shadow-sm'
                                            : 'text-zinc-400 hover:text-zinc-200'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {timeRange === 'custom' && (
                        <div className="flex flex-wrap md:mt-3 lg:mt-5 xl:mt-0 items-center gap-3 bg-zinc-900/80 p-2 py-1 rounded-md lg:rounded-lg border border-zinc-800/80">
                            <div className="flex items-center gap-2 text-xs text-zinc-300">
                                <span>Dari:</span>
                                <input
                                    type="datetime-local"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-800/80 rounded-sm lg:rounded-md px-1 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-zinc-500"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-300">
                                <span>Sampai:</span>
                                <input
                                    type="datetime-local"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="bg-zinc-900 border border-zinc-800/80 rounded-sm lg:rounded-md px-1 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-zinc-500"
                                />
                            </div>
                            <button
                                onClick={handleApplyCustomRange}
                                disabled={refreshing}
                                className="px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold rounded-sm lg:rounded-md transition cursor-pointer disabled:opacity-50"
                            >
                                {refreshing ? "Menerapkan..." : "Terapkan"}
                            </button>
                        </div>
                    )}
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
                            <LineChart data={activeChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
                                    tickFormatter={(val) => metricType === 'chat' ? `${val}/30s` : Number(val).toLocaleString()}
                                />

                                <Tooltip
                                    isAnimationActive={false}
                                    offset={25}
                                    wrapperStyle={{ pointerEvents: 'none', zIndex: 9999 }}
                                    cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    content={({ active, payload, label }) => {
                                        if (!active || label === undefined || label === null) return null;

                                        const d = new Date(Number(label));
                                        const timeStr = !isNaN(d.getTime())
                                            ? d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(/\./g, ":")
                                            : "";
                                        const dateStr = !isNaN(d.getTime())
                                            ? d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                                            : "";

                                        if (!timeStr) return null;

                                        let items = (payload || []).filter(item => item.value !== null && item.value !== undefined);
                                        if (selectedStreamer) {
                                            items = items.filter(item => item.name === selectedStreamer.name);
                                        }

                                        // Jika tidak ada data member (misal sedang hover di luar sesi member yang dipilih),
                                        // hanya tampilkan informasi waktu saja
                                        if (!items.length) {
                                            return (
                                                <div className="bg-zinc-900/95 border border-zinc-800 text-zinc-100 text-xs rounded-xl p-2.5 px-3 shadow-xl">
                                                    <p className="text-zinc-300 font-medium text-xs">
                                                        Waktu: {timeStr} WIB ({dateStr})
                                                    </p>
                                                </div>
                                            );
                                        }

                                        const sortedItems = [...items].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));

                                        return (
                                            <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs sm:text-sm rounded-xl p-3 shadow-xl space-y-1.5 min-w-48">
                                                <p className="text-zinc-400 font-semibold text-xs border-b border-zinc-800 pb-1.5">
                                                    Waktu: {timeStr} WIB ({dateStr})
                                                </p>
                                                <div className="space-y-1">
                                                    {sortedItems.map((item, idx) => {
                                                        const dataPoint = item?.payload;
                                                        const memberName = item.name;
                                                        const chatVal = dataPoint && dataPoint[`_${memberName}_chat`] !== undefined ? dataPoint[`_${memberName}_chat`] : 0;
                                                        const viewerVal = dataPoint && dataPoint[memberName] !== undefined ? dataPoint[memberName] : 0;

                                                        return (
                                                            <div key={idx} className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color || '#fff' }} />
                                                                <span className="truncate">
                                                                    <strong className="text-zinc-100">{memberName}:</strong>{' '}
                                                                    {metricType === 'chat' ? (
                                                                        <span>
                                                                            {Number(item.value || 0).toLocaleString()} pesan / 30 dtk{' '}
                                                                            <span className="text-zinc-400 text-[11px]">(👥 {Number(viewerVal).toLocaleString()} penonton)</span>
                                                                        </span>
                                                                    ) : (
                                                                        <span>
                                                                            {Number(item.value || 0).toLocaleString()} penonton{' '}
                                                                            <span className="text-zinc-400 text-[11px]">(💬 {Number(chatVal).toLocaleString()} pesan / 30 dtk)</span>
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }}
                                />

                                <Legend
                                    content={() => (
                                        <div className="overflow-x-auto max-w-full pb-1.5 pt-3 lg:pt-5 custom-scrollbar">
                                            <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-x-4 gap-y-2 items-center w-max mx-auto px-4 text-xs">
                                                {activeStreamers.map((streamer, index) => {
                                                    const color = getMemberColor(streamer.name, index);
                                                    const isSelected = selectedStreamer?.name === streamer.name;
                                                    const isDimmed = selectedStreamer && !isSelected;
                                                    return (
                                                        <div
                                                            key={streamer.name}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedStreamer(null);
                                                                } else {
                                                                    const bestSession = streamer.sessions && streamer.sessions.length > 0
                                                                        ? [...streamer.sessions].sort((a, b) => (b.peakViewers || 0) - (a.peakViewers || 0))[0]
                                                                        : streamer;
                                                                    setSelectedStreamer({
                                                                        ...bestSession,
                                                                        name: streamer.name,
                                                                        fullName: bestSession.fullName || streamer.fullName,
                                                                        isLegendClick: true,
                                                                        clickedTime: null,
                                                                        clickedViewers: null
                                                                    });
                                                                }
                                                            }}
                                                            className={`inline-flex items-center gap-2 cursor-pointer transition select-none shrink-0 ${isDimmed ? 'opacity-30 hover:opacity-75' : 'opacity-100'
                                                                }`}
                                                        >
                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                                            <span className={`font-medium whitespace-nowrap ${isSelected ? 'text-white font-semibold' : 'text-zinc-300 hover:text-white'}`}>
                                                                {streamer.name}
                                                            </span>
                                                            {metricType === 'chat' ? (
                                                                streamer.peakChat > 0 && (
                                                                    <span className="text-[11px] text-zinc-500 font-normal whitespace-nowrap">
                                                                        ({Number(streamer.peakChat).toLocaleString()}/30s)
                                                                    </span>
                                                                )
                                                            ) : (
                                                                streamer.peakViewers > 0 && (
                                                                    <span className="text-[11px] text-zinc-500 font-normal whitespace-nowrap">
                                                                        ({Number(streamer.peakViewers).toLocaleString()})
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                />


                                {activeStreamers.flatMap((streamer, streamerIndex) => {
                                    return streamer.sessions.map((session, sessionIndex) => {
                                        const isSameMember = selectedStreamer?.name === streamer.name;
                                        const isExactSessionSelected = selectedStreamer?.slug === session.slug;

                                        const isLegendClick = isSameMember && selectedStreamer?.isLegendClick;
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
                                                strokeOpacity = 0.60;
                                                strokeWidth = 3;
                                            } else {
                                                strokeOpacity = 0.10;
                                                strokeWidth = 1.25;
                                            }
                                        }

                                        // Dot tetap aktif untuk semua sesi dari member yang sedang dipilih
                                        const shouldShowActiveDot = !selectedStreamer || isSameMember;

                                        return (
                                            <Line
                                                key={`${streamer.name}-${session.slug || sessionIndex}`}
                                                type="linear"
                                                dataKey={(d) => {
                                                    if (d[`_${streamer.name}_slug`] !== session.slug) return null;
                                                    if (metricType === 'chat') {
                                                        return d[`_${streamer.name}_chat`] ?? 0;
                                                    }
                                                    return d[streamer.name] ?? null;
                                                }}
                                                name={streamer.name}
                                                stroke={getMemberColor(streamer.name, streamerIndex)}
                                                strokeWidth={strokeWidth}
                                                strokeOpacity={strokeOpacity}
                                                dot={false}
                                                isAnimationActive={false}
                                                connectNulls={false}
                                                activeDot={shouldShowActiveDot ? {
                                                    r: isExactSessionSelected ? 6 : 4,
                                                    onClick: (e, payload) => handleDotClick(streamer, payload),
                                                    cursor: 'pointer',
                                                    strokeWidth: 0
                                                } : false}
                                            />
                                        )
                                    })
                                })}

                                {activeChartData.length > 5 && (
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
