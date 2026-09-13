import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush } from 'recharts';
import { getMultiLiveData, getAnalytics } from '../../utils/backend-api';
import { getMemberColor } from '../../utils/color';
import { useQuery } from '@tanstack/react-query';
import SentimentCard from '../components/SentimentCard';
import WordCloudCard from '../components/WordCloudCard';
import TopChattersCard from '../components/TopChattersCard';

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
    const [now] = useState(() => Date.now());
    const [isSnapshotHighlight, setIsSnapshotHighlight] = useState(false);

    useEffect(() => {
        if (!isSnapshotHighlight) return;
        const timer = setTimeout(() => {
            setIsSnapshotHighlight(false);
        }, 800);
        return () => clearTimeout(timer);
    }, [isSnapshotHighlight]);

    useEffect(() => {
        sessionStorage.setItem('analytics_metricType', metricType);
    }, [metricType]);
    useEffect(() => {
        sessionStorage.setItem('analytics_timeRange', timeRange);
        setSelectedStreamer(prev => prev ? ({
            ...prev,
            clickedTime: null,
            clickedViewers: null,
            clickedChat: null,
            clickedPos: null,
            clickedNeu: null,
            clickedNeg: null
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

    const {
        data: sessionAnalyticsData,
        isLoading: isSessionLoading
    } = useQuery({
        queryKey: ['sessionAnalytics', selectedStreamer?.slug],
        queryFn: () => getAnalytics(selectedStreamer.slug),
        enabled: !!selectedStreamer?.slug,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15
    });

    const activeSentiment = sessionAnalyticsData?.sentiment || null;
    const activeWordCloud = sessionAnalyticsData?.wordCloud || [];
    const activeTopChatters = sessionAnalyticsData?.topChatters || [];

    const loading = isAnalyticsLoading
    const refreshing = isAnalyticsFetching

    useEffect(() => {
        if (isAnalyticsLoading || isAnalyticsFetching) return;
        if (selectedStreamer && data.streamers) {
            const updated = data.streamers.find(s => s.name === selectedStreamer.name);
            if (!updated) {
                setSelectedStreamer(null);
            }
        }
    }, [data.streamers, isAnalyticsLoading, isAnalyticsFetching]);

    const streamers = useMemo(() => {
        const rawStreamers = data.streamers || [];
        return rawStreamers.map(s => ({
            name: s.name,
            slug: s.slug,
            peakViewers: Number(s.peakViewers) || 0,
            peakChat: Number(s.peakChat) || 0
        }));
    }, [data.streamers]);

    const chartData = data.chartData || [];
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
            clickedChat: null,
            clickedPos: null,
            clickedNeu: null,
            clickedNeg: null
        }) : null);
    };

    const calculateSessionDuration = (liveAt, endAt) => {
        if (!liveAt) return "-";
        const start = new Date(liveAt).getTime();
        const end = endAt ? new Date(endAt).getTime() : now;
        if (isNaN(start) || isNaN(end) || end <= start) return "-";

        const diffSeconds = Math.floor((end - start) / 1000);
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours} Jam ${minutes} Menit`;
        }
        return `${minutes} Menit`;
    };

    const countMemberSnapshots = (chartDataList, memberName, slug) => {
        if (!chartDataList || !memberName) return 0;
        return chartDataList.filter(d => {
            if (slug && d[`_${memberName}_slug`]) {
                return d[`_${memberName}_slug`] === slug;
            }
            return memberName in d;
        }).length;
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
        const dataPoint = dotPayload?.payload;
        const clickedTime = dataPoint?.timeLabel;
        const clickedViewers = dataPoint[streamer.name];
        const clickedChat = dataPoint[`_${streamer.name}_chat`];
        const clickedSlug = dataPoint[`_${streamer.name}_slug`] || streamer.slug;
        const clickedPos = dataPoint[`_${streamer.name}_pos`];
        const clickedNeu = dataPoint[`_${streamer.name}_neu`];
        const clickedNeg = dataPoint[`_${streamer.name}_neg`];

        const applyNewSnapshotData = () => {
            setSelectedStreamer(prev => ({
                ...(prev?.slug === clickedSlug ? prev : {}),
                name: streamer.name,
                slug: clickedSlug,
                isLegendClick: false,
                clickedTime: clickedTime ?? null,
                clickedViewers: clickedViewers ?? null,
                clickedChat: clickedChat ?? null,
                clickedPos: clickedPos ?? null,
                clickedNeu: clickedNeu ?? null,
                clickedNeg: clickedNeg ?? null
            }));

            setIsSnapshotHighlight(false);
            requestAnimationFrame(() => {
                setIsSnapshotHighlight(true);
            });
        };

        if (!selectedStreamer) {
            applyNewSnapshotData();
        } else {
            if (selectedStreamer.slug !== clickedSlug || selectedStreamer.name !== streamer.name) {
                setSelectedStreamer(prev => ({
                    name: streamer.name,
                    slug: clickedSlug,
                    isLegendClick: false,
                    clickedTime: prev?.clickedTime ?? null,
                    clickedViewers: prev?.clickedViewers ?? null,
                    clickedChat: prev?.clickedChat ?? null,
                    clickedPos: prev?.clickedPos ?? null,
                    clickedNeu: prev?.clickedNeu ?? null,
                    clickedNeg: prev?.clickedNeg ?? null
                }));
            }

            let isDone = false;
            const onFinishScroll = () => {
                if (isDone) return;
                isDone = true;
                window.removeEventListener('scrollend', onFinishScroll);
                setTimeout(() => {
                    applyNewSnapshotData();
                }, 200);
            };

            if ('onscrollend' in window) {
                window.addEventListener('scrollend', onFinishScroll, { once: true });
            }

            const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
            const targetEl = isMobile
                ? (document.getElementById('analytics-stats-card') || document.getElementById('analytics-detail-header'))
                : document.getElementById('analytics-detail-header');

            const rect = targetEl?.getBoundingClientRect();
            const isAlreadyAtTarget = rect
                ? (isMobile ? (rect.top >= 50 && rect.bottom <= window.innerHeight) : Math.abs(rect.top - 80) < 30)
                : false;
            const fallbackDuration = isAlreadyAtTarget ? 60 : 520;

            setTimeout(onFinishScroll, fallbackDuration);

            // Scroll ke target: di HP dibuat 'center', di Desktop dibuat 'start'
            targetEl?.scrollIntoView({
                behavior: 'smooth',
                block: isMobile ? 'center' : 'start'
            });
        }
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

    const selectedMemberName = selectedStreamer?.name;
    const activeChartData = useMemo(() => {
        if (!selectedMemberName) return sampledChartData;

        const memberPoints = filteredChartData.filter(
            d => selectedMemberName in d
        );

        if (!memberPoints.length) return sampledChartData;

        const timeMap = new Map();
        sampledChartData.forEach(d => timeMap.set(Number(d.timeLabel), d));
        memberPoints.forEach(d => timeMap.set(Number(d.timeLabel), d));

        return [...timeMap.values()].sort((a, b) => Number(a.timeLabel) - Number(b.timeLabel));
    }, [selectedMemberName, sampledChartData, filteredChartData]);

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

    const memberSessionsMap = useMemo(() => {
        const map = new Map();
        if (!filteredChartData || !activeStreamers) return map;

        activeStreamers.forEach(s => {
            map.set(s.name, new Set());
        });

        filteredChartData.forEach(d => {
            activeStreamers.forEach(s => {
                const slug = d[`_${s.name}_slug`];
                if (slug) {
                    map.get(s.name)?.add(slug);
                }
            });
        });

        activeStreamers.forEach(s => {
            const set = map.get(s.name);
            if (set && set.size === 0 && s.slug) {
                set.add(s.slug);
            }
        });

        return map;
    }, [filteredChartData, activeStreamers]);

    const selectedMemberSlug = selectedStreamer?.slug;
    const streamerSessions = useMemo(() => {
        const allSessions = sessionAnalyticsData?.sessions || [];
        if (!selectedStreamer?.name || !allSessions.length) return allSessions;

        const slugSet = memberSessionsMap.get(selectedStreamer?.name);
        if (!slugSet || slugSet.size === 0) {
            return selectedMemberSlug
                ? allSessions.filter(s => s.slug === selectedMemberSlug)
                : allSessions;
        }

        const visibleSessions = allSessions.filter(s => slugSet.has(s.slug));
        return visibleSessions.length > 0 ? visibleSessions : allSessions;
    }, [sessionAnalyticsData?.sessions, selectedStreamer?.name, selectedMemberSlug, memberSessionsMap]);

    const currentSessionIndex = streamerSessions.findIndex(s => s.slug === selectedMemberSlug);
    const activeSession = (currentSessionIndex >= 0 ? streamerSessions[currentSessionIndex] : streamerSessions[0]) || null;
    const isSessionTimeLoading = isSessionLoading || !sessionAnalyticsData || !activeSession;

    const handlePrevSession = () => {
        if (streamerSessions.length <= 1) return;
        const activeIdx = currentSessionIndex >= 0 ? currentSessionIndex : 0;
        const prevIndex = (activeIdx - 1 + streamerSessions.length) % streamerSessions.length;
        const target = streamerSessions[prevIndex];
        setSelectedStreamer(prev => ({
            ...prev,
            ...target,
            name: selectedStreamer.name,
            isLegendClick: false,
            clickedTime: null,
            clickedViewers: null,
            clickedChat: null,
            clickedPos: null,
            clickedNeu: null,
            clickedNeg: null
        }));
    };

    const handleNextSession = () => {
        if (streamerSessions.length <= 1) return;
        const activeIdx = currentSessionIndex >= 0 ? currentSessionIndex : 0;
        const nextIndex = (activeIdx + 1) % streamerSessions.length;
        const target = streamerSessions[nextIndex];
        setSelectedStreamer(prev => ({
            ...prev,
            ...target,
            name: selectedStreamer.name,
            isLegendClick: false,
            clickedTime: null,
            clickedViewers: null,
            clickedChat: null,
            clickedPos: null,
            clickedNeu: null,
            clickedNeg: null
        }));
    };

    const activeRangeLabel = timeRange === 'all' ? 'Semua' : timeRange === 'today' ? 'Hari Ini' : timeRange === '1d' ? '1 Hari Lalu' : timeRange === '2d' ? '2 Hari Lalu' : timeRange === '1h' ? '1 Jam' : timeRange === 'custom' ? 'Kustom' : timeRange;

    return (
        <div className="space-y-3 lg:space-y-5 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100">Analisis Siaran Langsung</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Statistik penonton dan durasi siaran antar member secara komparatif
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
                        <span>{refreshing ? "Memuat..." : "Segarkan"}</span>
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5">
                <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-lg lg:rounded-xl p-3 lg:p-5">
                    <span className="text-xs text-zinc-400 font-medium">Member Tercatat</span>
                    <p className="text-2xl lg:text-3xl font-semibold text-zinc-100 mt-1">
                        {streamers.length} <span className="text-xs sm:text-sm font-normal text-zinc-400">member</span>
                    </p>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-lg lg:rounded-xl p-3 lg:p-5">
                    <span className="text-xs text-zinc-400 font-medium">Penonton Tertinggi</span>
                    <p className="text-2xl lg:text-3xl font-semibold text-zinc-100 mt-1">
                        {maxPeak > 0 ? maxPeak.toLocaleString() : "-"}
                    </p>
                </div>

                <div className="bg-zinc-900/30 hidden lg:block border border-zinc-800/40 rounded-lg lg:rounded-xl p-3 lg:p-5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-400 font-medium">Total Cuplikan Waktu</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${filteredChartData.length > 400
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                            {filteredChartData.length > 400 ? '> 400 (Disampel)' : '≤ 400 (Lengkap)'}
                        </span>
                    </div>
                    <p className="text-2xl lg:text-3xl font-semibold text-zinc-100 mt-1">
                        {sampledChartData.length.toLocaleString()}{' '}
                        <span className="text-xs sm:text-sm font-normal text-zinc-400">
                            titik (dari {filteredChartData.length.toLocaleString()} asli • {activeRangeLabel})
                        </span>
                    </p>
                </div>
            </div>

            <div className="bg-zinc-900/30 block lg:hidden border text-center border-zinc-800/40 rounded-lg p-3">
                <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">Total Cuplikan Waktu</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${filteredChartData.length > 400
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                        {filteredChartData.length > 400 ? '> 400 (Disampel)' : '≤ 400 (Lengkap)'}
                    </span>
                </div>
                <p className="text-2xl lg:text-3xl font-semibold text-zinc-100 mt-1">
                    {sampledChartData.length.toLocaleString()}{' '}
                    <span className="text-xs sm:text-sm font-normal text-zinc-400">
                        titik (dari {filteredChartData.length.toLocaleString()} asli • {activeRangeLabel})
                    </span>
                </p>
            </div>

            {/* Selected Detail Header */}
            {selectedStreamer && (
                <div
                    id="analytics-detail-header"
                    className="scroll-mt-24 bg-zinc-900/50 border border-zinc-800/50 p-3 lg:p-5 rounded-lg lg:rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-1"
                >
                    {/* Sisi Kiri: Tombol Navigasi Sesi & Info Streamer */}
                    <div className="flex items-center justify-between gap-1 min-[375px]:gap-2 xl:gap-5 w-full md:w-auto">
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

                        <div className="min-w-0">
                            <div className="flex items-center min-[375px]:gap-1.5 flex-wrap">
                                <h3 className="font-semibold text-base sm:text-lg text-zinc-100 truncate">
                                    {sessionAnalyticsData?.name || selectedStreamer.fullName || selectedStreamer.name}
                                </h3>
                                <div className='flex space-x-0.5 min-[360px]:space-x-0 min-[360px]:gap-1'>
                                    {isSessionTimeLoading ? (
                                        <span className="inline-block h-5 w-18 bg-zinc-800/80 rounded-sm lg:rounded-md animate-pulse" />
                                    ) : (
                                        <span className={`px-2 py-0.5 rounded-sm lg:rounded-md text-[11px] font-medium border ${(activeSession ? activeSession.endAt : selectedStreamer.endAt)
                                            ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                            : "bg-red-500/10 text-red-400 border-red-500/20"
                                            }`}>
                                            {(activeSession ? activeSession.endAt : selectedStreamer.endAt) ? "Selesai Siaran" : "Sedang Siaran"}
                                        </span>
                                    )}
                                    {/* Badge penanda sesi */}
                                    {streamerSessions.length > 1 && (
                                        <span className="px-2 py-0.5 rounded-sm lg:rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                                            Sesi {(currentSessionIndex >= 0 ? currentSessionIndex : 0) + 1} dari {streamerSessions.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-zinc-400 text-xs mt-0.5 truncate">{selectedStreamer.slug}</p>
                        </div>

                        {streamerSessions.length > 1 && (
                            <button
                                onClick={handleNextSession}
                                title="Sesi Berikutnya"
                                className="p-2 rounded-md lg:rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Sisi Kanan: Jadwal Waktu & Tombol Reset */}
                    <div className="flex items-center justify-between gap-0 md:gap-2 xl:gap-5 w-full md:w-auto flex-wrap border-t md:border-t-0 border-zinc-800/80 pt-1 md:pt-0">
                        <div className={`min-w-50 w-53 min-[360px]:w-57 min-[375px]:w-60 min-[412px]:w-70 min-[440px]:w-76 ${streamerSessions.length > 1 ? 'md:w-62' : 'md:w-83'
                            } lg:w-85 overflow-x-auto pb-1`}>
                            <div className="flex items-center gap-3 text-xs sm:text-sm whitespace-nowrap">
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">Mulai Siaran</span>
                                    {isSessionTimeLoading ? (
                                        <div className="h-4.5 sm:h-5 w-20 sm:w-24 bg-zinc-800/80 rounded-md animate-pulse mt-0.5" />
                                    ) : (
                                        <span className="font-semibold text-zinc-200 block">
                                            {formatLiveTime(activeSession?.liveAt || selectedStreamer.liveAt)}
                                        </span>
                                    )}
                                </div>
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">Selesai Siaran</span>
                                    {isSessionTimeLoading ? (
                                        <div className="h-4.5 sm:h-5 w-20 sm:w-24 bg-zinc-800/80 rounded-md animate-pulse mt-0.5" />
                                    ) : (
                                        <span className="font-semibold text-zinc-200 block">
                                            {(activeSession ? activeSession.endAt : selectedStreamer.endAt) ? formatLiveTime(activeSession?.endAt || selectedStreamer.endAt) : '-'}
                                        </span>
                                    )}
                                </div>
                                <div className='shrink-0'>
                                    <span className="text-zinc-400 block text-xs">Total Durasi</span>
                                    {isSessionTimeLoading ? (
                                        <div className="h-4.5 sm:h-5 w-22 sm:w-26 bg-zinc-800/80 rounded-md animate-pulse mt-0.5" />
                                    ) : (
                                        <span className="font-semibold text-zinc-200 block">
                                            {calculateSessionDuration(activeSession?.liveAt || selectedStreamer.liveAt, activeSession?.endAt ?? selectedStreamer.endAt)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedStreamer(null)}
                            className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-md lg:rounded-lg bg-zinc-800 hover:bg-zinc-700 transition cursor-pointer shrink-0 font-medium"
                        >
                            Atur Ulang
                        </button>
                    </div>
                </div>
            )}

            {/* Sentiment, Stream Stats & Word Cloud Section */}
            {selectedStreamer && (
                <div className="space-y-3 lg:space-y-5">
                    <div className="flex flex-col lg:flex-row gap-3 lg:gap-5 items-stretch">
                        {/* Kolom Kiri: Sentimen & Statistik Performa Siaran */}
                        <div className="w-full lg:w-[40%] flex flex-col gap-3 lg:gap-4 shrink-0">
                            {/* Card Sentimen */}
                            <SentimentCard
                                sentiment={activeSentiment}
                                isLoading={isSessionTimeLoading}
                            />

                            {/* Card Statistik Performa & Snapshot Titik Terpilih */}
                            {isSessionTimeLoading ? (
                                <div id="analytics-stats-card" className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-3 lg:space-y-5 flex-1 animate-pulse">
                                    {/* Header Skeleton */}
                                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 lg:pb-5">
                                        <div className="h-5 sm:h-6 w-36 bg-zinc-800 rounded" />
                                        <div className="h-4 w-20 bg-zinc-800/80 rounded" />
                                    </div>

                                    {/* 6 Grid Metrik Skeleton */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5 lg:gap-3">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-2.5 space-y-2">
                                                <div className="h-3.5 w-24 bg-zinc-800/80 rounded" />
                                                <div className="h-5 sm:h-6 w-16 bg-zinc-800/90 rounded" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Snapshot Inspector Skeleton */}
                                    <div className="bg-zinc-950/30 border border-zinc-800/60 rounded-lg p-3 flex flex-col justify-center items-center h-[90.3px] space-y-2">
                                        <div className="h-3.5 w-36 bg-zinc-800/80 rounded" />
                                        <div className="h-3 w-52 sm:w-64 bg-zinc-800/50 rounded" />
                                    </div>
                                </div>
                            ) : (
                                <div id="analytics-stats-card" className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-3 lg:space-y-5 flex-1">
                                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 lg:pb-5">
                                        <span className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-2">
                                            <span>📊 Statistik Siaran</span>
                                        </span>
                                        <span className="text-xs text-zinc-400">
                                            {countMemberSnapshots(filteredChartData, selectedStreamer.name, activeSession?.slug || selectedStreamer.slug) ? `${countMemberSnapshots(filteredChartData, selectedStreamer.name, activeSession?.slug || selectedStreamer.slug)}x cuplikan` : ''}
                                        </span>
                                    </div>

                                    {/* Ringkasan Metrik 2x3 Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5 lg:gap-3">
                                        <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-2.5">
                                            <span className="text-xs text-zinc-400 font-medium block truncate">Puncak Penonton</span>
                                            <span className="font-bold text-zinc-100 text-base sm:text-lg">
                                                {Number(activeSession?.peakViewers ?? selectedStreamer.peakViewers ?? 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-2.5">
                                            <span className="text-xs text-zinc-400 font-medium block truncate">Rata-rata Penonton</span>
                                            <span className="font-bold text-zinc-100 text-base sm:text-lg">
                                                {Math.round(activeSession?.avgViewers ?? selectedStreamer.avgViewers ?? 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-2.5">
                                            <span className="text-xs text-zinc-400 font-medium block truncate">Total Pesan</span>
                                            <span className="font-bold text-zinc-100 text-base sm:text-lg">
                                                {activeSentiment?.totalChat !== undefined ? Number(activeSentiment.totalChat).toLocaleString() : (activeSession?.totalChat !== undefined ? Number(activeSession.totalChat).toLocaleString() : (selectedStreamer.totalChat !== undefined ? Number(selectedStreamer.totalChat).toLocaleString() : '-'))}
                                            </span>
                                        </div>
                                        <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-2.5">
                                            <span className="text-xs text-zinc-400 font-medium block truncate">Puncak Pesan / 30 dtk</span>
                                            <span className="font-bold text-zinc-100 text-base sm:text-lg">
                                                {activeSession?.peakChat !== undefined ? `${Number(activeSession.peakChat).toLocaleString()}` : (selectedStreamer.peakChat !== undefined ? `${Number(selectedStreamer.peakChat).toLocaleString()}` : '-')}
                                            </span>
                                        </div>
                                        <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-2.5">
                                            <span className="text-xs text-zinc-400 font-medium block truncate">Rata-rata Pesan / 30 dtk</span>
                                            <span className="font-bold text-zinc-100 text-base sm:text-lg">
                                                {activeSession?.avgChat !== undefined ? `${activeSession.avgChat}` : (selectedStreamer.avgChat !== undefined ? `${selectedStreamer.avgChat}` : '-')}
                                            </span>
                                        </div>
                                        <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-lg p-2.5">
                                            <span className="text-xs text-zinc-400 font-medium block truncate">Sentimen Positif</span>
                                            <span className="font-bold text-zinc-100 text-base sm:text-lg">
                                                {activeSentiment?.positivePercentage !== undefined ? `${activeSentiment.positivePercentage}%` : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Snapshot Inspector (Titik Cuplikan Terpilih) */}
                                    {selectedStreamer.clickedTime ? (
                                        <div
                                            className={`border rounded-lg p-3 space-y-2 transition-all duration-500 ease-out ${isSnapshotHighlight
                                                ? 'bg-indigo-950/40 border-indigo-400/80 shadow-[0_0_24px_rgba(99,102,241,0.25)] animate-snapshot-pop'
                                                : 'bg-indigo-950/20 border-indigo-500/30 shadow-none'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between text-xs border-b border-indigo-500/20 pb-1.5">
                                                <span className={`font-semibold flex items-center gap-1.5 transition-colors duration-300 ${isSnapshotHighlight ? 'text-indigo-200' : 'text-indigo-300'
                                                    }`}>
                                                    <span>📍</span>
                                                    <span>Titik Cuplikan Terpilih</span>
                                                </span>
                                                <div className="flex items-center">
                                                    <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold transition-all duration-300 ${isSnapshotHighlight
                                                        ? 'bg-indigo-500/30 text-indigo-100 animate-flash-badge'
                                                        : 'text-zinc-400 bg-transparent'
                                                        }`}>
                                                        {formatLiveTime(selectedStreamer.clickedTime)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedStreamer(prev => prev ? ({
                                                            ...prev,
                                                            clickedTime: null,
                                                            clickedViewers: null,
                                                            clickedChat: null,
                                                            clickedPos: null,
                                                            clickedNeu: null,
                                                            clickedNeg: null
                                                        }) : null)}
                                                        className="text-zinc-400 hover:text-zinc-200 transition text-[11px] px-1 rounded hover:bg-indigo-500/20 cursor-pointer"
                                                        title="Tutup cuplikan titik"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
                                                <div>
                                                    <span className="text-[11px] text-zinc-400 block">Durasi Saat Itu</span>
                                                    <span className={`font-semibold text-zinc-200 block ${isSnapshotHighlight ? 'animate-number-flip' : ''}`}>
                                                        {calculateDurationAtTime(activeSession?.liveAt || selectedStreamer.liveAt, selectedStreamer.clickedTime) || '-'}
                                                    </span>
                                                </div>
                                                {selectedStreamer.clickedViewers !== null && (
                                                    <div>
                                                        <span className="text-[11px] text-zinc-400 block">Penonton</span>
                                                        <span className={`font-bold block transition-colors duration-300 ${isSnapshotHighlight ? 'animate-number-flip text-white' : 'text-zinc-100'}`}>
                                                            👥 {Number(selectedStreamer.clickedViewers).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedStreamer.clickedChat !== null && (
                                                    <div>
                                                        <span className="text-[11px] text-zinc-400 block">Pesan / 30 dtk</span>
                                                        <span className={`font-bold block transition-colors duration-300 ${isSnapshotHighlight ? 'animate-number-flip text-white' : 'text-zinc-100'}`}>
                                                            💬 {Number(selectedStreamer.clickedChat).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                {selectedStreamer.clickedPos !== null && (
                                                    <div>
                                                        <span className="text-[11px] text-zinc-400 block">Sentimen</span>
                                                        <span className={`font-semibold text-[11px] text-zinc-200 flex items-center gap-1 ${isSnapshotHighlight ? 'animate-number-flip' : ''}`}>
                                                            <span className="text-emerald-400">🟢 {selectedStreamer.clickedPos}</span>
                                                            <span className="text-sky-400">🔵 {selectedStreamer.clickedNeu}</span>
                                                            <span className="text-rose-400">🔴 {selectedStreamer.clickedNeg}</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-zinc-950/30 border border-dashed border-zinc-800/80 rounded-lg p-3 flex flex-col justify-center text-center h-[90.3px] space-y-1">
                                            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-400">
                                                <span>📍</span>
                                                <span>Titik Cuplikan Terpilih</span>
                                            </div>
                                            <p className="text-[11px] text-zinc-500 leading-relaxed max-w-lg mx-auto">
                                                Nilai pada bagian ini akan terisi jika kamu mengklik salah satu titik pada garis grafik di bawah.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Kolom Kanan: Word Cloud (Topik Hangat) */}
                        <div className="w-full lg:flex-1 flex flex-col min-w-0">
                            <WordCloudCard
                                wordCloud={activeWordCloud}
                                isLoading={isSessionTimeLoading}
                                streamerName={sessionAnalyticsData?.name || selectedStreamer.fullName || selectedStreamer.name}
                                isLive={!(activeSession ? activeSession.endAt : selectedStreamer.endAt)}
                            />
                        </div>
                    </div>

                    {/* Leaderboard Top 50 Chatters */}
                    <TopChattersCard
                        topChatters={activeTopChatters}
                        isLoading={isSessionTimeLoading}
                        streamerName={selectedStreamer.fullName || selectedStreamer.name}
                        isLive={!selectedStreamer.endAt}
                    />
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
                            <span>💬 Aktivitas Pesan</span>
                        </button>
                    </div>

                    <div className="flex rounded-md lg:rounded-lg overflow-hidden md:h-9.5 bg-zinc-900/80 border w-[427.9px] md:w-[calc(50%-4px)] lg:w-[calc(50%-37px)] xl:w-[calc(30%-9.4px)] border-zinc-800/80">
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
                        <p className="text-zinc-200 font-semibold text-base">Belum ada riwayat cuplikan</p>
                        <p>Data grafik akan tampil saat ada perekaman siaran langsung aktif.</p>
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
                                            <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs sm:text-sm rounded-xl p-3 shadow-xl space-y-2 min-w-52">
                                                <p className="text-zinc-400 font-semibold text-xs border-b border-zinc-800 pb-1.5">
                                                    Waktu: {timeStr} WIB ({dateStr})
                                                </p>
                                                <div className="space-y-1.5">
                                                    {sortedItems.map((item, idx) => {
                                                        const dataPoint = item?.payload;
                                                        const memberName = item.name;
                                                        const chatVal = dataPoint && dataPoint[`_${memberName}_chat`] !== undefined ? dataPoint[`_${memberName}_chat`] : 0;
                                                        const viewerVal = dataPoint && dataPoint[memberName] !== undefined ? dataPoint[memberName] : 0;
                                                        const posVal = dataPoint?.[`_${memberName}_pos`];
                                                        const neuVal = dataPoint?.[`_${memberName}_neu`];
                                                        const negVal = dataPoint?.[`_${memberName}_neg`];
                                                        const hasSentiment = posVal !== undefined || neuVal !== undefined || negVal !== undefined;

                                                        return (
                                                            <div key={idx} className="space-y-0.5">
                                                                <div className="flex items-center gap-2">
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
                                                                {hasSentiment && (
                                                                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 ml-4 pl-0.5">
                                                                        <span className="text-emerald-400 font-medium">🟢 {posVal ?? 0}</span>
                                                                        <span className="text-sky-400 font-medium">🔵 {neuVal ?? 0}</span>
                                                                        <span className="text-rose-400 font-medium">🔴 {negVal ?? 0}</span>
                                                                    </div>
                                                                )}
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
                                                                    setSelectedStreamer({
                                                                        name: streamer.name,
                                                                        slug: streamer.slug,
                                                                        peakViewers: streamer.peakViewers,
                                                                        peakChat: streamer.peakChat,
                                                                        isLegendClick: true,
                                                                        clickedTime: null,
                                                                        clickedViewers: null,
                                                                        clickedChat: null,
                                                                        clickedPos: null,
                                                                        clickedNeu: null,
                                                                        clickedNeg: null
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
                                                                        ({Number(streamer.peakChat).toLocaleString()}/30 dtk)
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
                                    const slugSet = memberSessionsMap.get(streamer.name);
                                    const sessionSlugs = slugSet && slugSet.size > 0 ? Array.from(slugSet) : (streamer.slug ? [streamer.slug] : ['default']);

                                    return sessionSlugs.map((sessionSlug, sessionIndex) => {
                                        const isSameMember = selectedStreamer?.name === streamer.name;
                                        const isExactSessionSelected = selectedStreamer?.slug === sessionSlug;

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
                                                key={`${streamer.name}-${sessionSlug || sessionIndex}`}
                                                type="linear"
                                                dataKey={(d) => {
                                                    if (d[`_${streamer.name}_slug`] !== sessionSlug) return null;
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
                                                    onClick: (_e, payload) => handleDotClick({ ...streamer, slug: sessionSlug }, payload),
                                                    cursor: 'pointer',
                                                    strokeWidth: 0
                                                } : false}
                                            />
                                        );
                                    });
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

            {/* Tip banner when no streamer is selected */}
            {!selectedStreamer && !loading && filteredChartData.length > 0 && (
                <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-xl p-3.5 sm:p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                    <span>💡</span>
                    <span>
                        <strong className="text-zinc-200">Eksplorasi Sentimen, Topik & Pengirim Chat:</strong> Klik salah satu nama member di grafik atau legenda di atas untuk melihat analisis sentimen mendalam, 50 kata terpopuler, dan daftar 50 pengirim chat terbanyak.
                    </span>
                </div>
            )}
        </div>
    );
}
