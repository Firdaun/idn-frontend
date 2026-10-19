import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush } from 'recharts';
import { getMultiLiveData, getAnalytics, getGiftDistribution } from '../../utils/backend-api';
import { getMemberColor } from '../../utils/color';
import { useQuery } from '@tanstack/react-query';
import SentimentCard from '../components/Analytics_Page/SentimentCard';
import WordCloudCard from '../components/Analytics_Page/WordCloudCard';
import AnalyticsDetailHeader from '../components/Analytics_Page/AnalyticsDetailHeader';
import StreamStatsCard from '../components/Analytics_Page/StreamStatsCard';
import GiftDistributionCard from '../components/Analytics_Page/GiftDistributionCard';
import DateRangePickerModal from '../components/Analytics_Page/DateRangePickerModal';
import { formatAxisTime } from '../../utils/analyticsHelpers';

export default function Analytics() {
    const [selectedStreamer, setSelectedStreamer] = useState(null);
    const [metricType, setMetricType] = useState(() => sessionStorage.getItem('analytics_metricType') || 'viewers');
    const [isSnapshotHighlight, setIsSnapshotHighlight] = useState(false);

    const [dateRange, setDateRange] = useState(() => {
        const saved = sessionStorage.getItem('analytics_dateRange');

        if (saved) {
            try {
                const parsed = JSON.parse(saved);

                if (parsed.startDate) {
                    return {
                        startDate: new Date(parsed.startDate),
                        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
                        isRange: Boolean(parsed.isRange)
                    };
                }
            } catch {console.warn('JANGAN UBAH2 SESSIONSTORAGE!!!')}
        }

        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        return {
            startDate: startDate,
            endDate: null,
            isRange: false
        };
    });

    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    useEffect(() => {
        if (!isSnapshotHighlight) return;
        const timer = setTimeout(() => {
            setIsSnapshotHighlight(false);
        }, 800);
        return () => clearTimeout(timer);
    }, [isSnapshotHighlight]);

    useEffect(() => {
        sessionStorage.setItem('analytics_dateRange', JSON.stringify({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate ? dateRange.endDate : null,
            isRange: dateRange.isRange
        }));
    }, [dateRange]);

    useEffect(() => {
        sessionStorage.setItem('analytics_metricType', metricType);
    }, [metricType]);

    const { start: activeStart, end: activeEnd } = useMemo(() => {
        const start = new Date(dateRange.startDate);
        start.setHours(0, 0, 0, 0);

        if (dateRange.isRange && dateRange.endDate) {
            const end = new Date(dateRange.endDate);
            const isEndToday = end.toDateString() === new Date().toDateString();
            if (isEndToday) {
                return { start: start.toISOString(), end: null };
            }
            end.setHours(23, 59, 59, 999);
            return { start: start.toISOString(), end: end.toISOString() };
        }

        const isToday = start.toDateString() === new Date().toDateString();
        if (isToday) return { start: start.toISOString(), end: null };

        const end = new Date(dateRange.startDate);
        end.setHours(23, 59, 59, 999);
        return { start: start.toISOString(), end: end.toISOString() };
    }, [dateRange]);

    const isToday = () => {
        let isToday
        if (!dateRange.isRange) {
            isToday = new Date(dateRange.startDate).toDateString() === new Date().toDateString()
        } else {
            isToday = new Date(dateRange.endDate).toDateString() === new Date().toDateString()
        }
        return isToday
    }

    const handlePrevDay = () => {
        setDateRange(prev => {
            const start = new Date(prev.startDate);
            start.setHours(0, 0, 0, 0);

            if (prev.isRange && prev.endDate) {
                const end = new Date(prev.endDate);
                end.setHours(0, 0, 0, 0);

                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

                start.setDate(start.getDate() - diffDays);
                end.setDate(end.getDate() - diffDays);

                end.setHours(23, 59, 59, 999);
                return {
                    startDate: start,
                    endDate: end,
                    isRange: true
                };
            }

            start.setDate(start.getDate() - 1);
            return {
                startDate: start,
                endDate: null,
                isRange: false
            };
        });
    };

    const handleNextDay = () => {
        setDateRange(prev => {
            const start = new Date(prev.startDate);
            const today = new Date();

            start.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0)

            if (prev.isRange && prev.endDate) {
                const end = new Date(prev.endDate);
                end.setHours(0, 0, 0, 0);

                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

                end.setDate(end.getDate() + diffDays);
                start.setDate(start.getDate() + diffDays);

                if (end > today) {
                    const shift = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    end.setDate(end.getDate() - shift);
                    start.setDate(start.getDate() - shift);
                }

                end.setHours(23, 59, 59, 999)
                return {
                    startDate: start,
                    endDate: end,
                    isRange: true
                };
            }

            start.setDate(start.getDate() + 1);

            if (start > today) return prev
            return {
                startDate: start,
                endDate: null,
                isRange: false
            };
        });
    };

    const handleGoToday = () => {
        setDateRange({ startDate: new Date(), endDate: null, isRange: false });
    };

    const formattedDateLabel = useMemo(() => {
        const fmt = (d) => d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short'
        });

        if (dateRange.isRange && dateRange.endDate) {
            const startStr = fmt(new Date(dateRange.startDate));
            const endStr = fmt(new Date(dateRange.endDate));
            const yearStr = new Date(dateRange.endDate).getFullYear();
            return `${startStr} — ${endStr} ${yearStr}`;
        }

        const curr = new Date(dateRange.startDate);
        const isCurrentToday = curr.toDateString() === new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = curr.toDateString() === yesterday.toDateString();

        const dateStr = curr.toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });

        if (isCurrentToday) return `Hari Ini (${dateStr})`;
        if (isYesterday) return `Kemarin (${dateStr})`;
        return dateStr;
    }, [dateRange]);

    const {
        data = { chartData: [], streamers: [] },
        isLoading: isAnalyticsLoading,
        isFetching: isAnalyticsFetching,
        refetch
    } = useQuery({
        queryKey: ['multiLive', activeStart, activeEnd],
        queryFn: () => getMultiLiveData(activeStart, activeEnd),
        staleTime: 1000 * 60 * 15,
        gcTime: 1000 * 60 * 30
    })

    const {
        data: sessionAnalyticsData = {
            sentiment: null,
            wordCloud: [],
            topChatters: [],
            topGifters: [],
            topGifts: []
        },
        isLoading: isSessionLoading
    } = useQuery({
        queryKey: ['sessionAnalytics', selectedStreamer?.slug],
        queryFn: () => getAnalytics(selectedStreamer.slug),
        enabled: !!selectedStreamer?.slug,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15
    });

    const activeSentiment = sessionAnalyticsData.sentiment;
    const activeWordCloud = sessionAnalyticsData.wordCloud;
    const activeTopChatters = sessionAnalyticsData.topChatters;

    const {
        data: giftDistributionData = null,
        isLoading: isGiftDistributionLoading
    } = useQuery({
        queryKey: ['giftDistribution', selectedStreamer?.slug],
        queryFn: () => getGiftDistribution(selectedStreamer.slug),
        enabled: !!selectedStreamer?.slug,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15
    });

    const loading = isAnalyticsLoading
    const refreshing = isAnalyticsFetching

    const streamers = data.streamers;
    const chartData = data.chartData;
    const maxPeak = useMemo(() => {
        return streamers.reduce((max, s) => Math.max(max, s.peakViewers), 0);
    }, [streamers]);

    const handleDotClick = (streamer, dotPayload) => {
        const dataPoint = dotPayload?.payload;
        const clickedTime = dataPoint?.timeLabel;
        const clickedViewers = dataPoint[streamer.name];
        const clickedChat = dataPoint[`_${streamer.name}_chat`];
        const clickedSlug = dataPoint[`_${streamer.name}_slug`];
        const clickedPos = dataPoint[`_${streamer.name}_pos`];
        const clickedNeu = dataPoint[`_${streamer.name}_neu`];
        const clickedNeg = dataPoint[`_${streamer.name}_neg`];

        const applyNewSnapshotData = () => {
            setSelectedStreamer({
                name: streamer.name,
                slug: clickedSlug,
                isLegendClick: false,
                clickedTime,
                clickedViewers,
                clickedChat,
                clickedPos,
                clickedNeu,
                clickedNeg
            });

            setIsSnapshotHighlight(false);
            requestAnimationFrame(() => {
                setIsSnapshotHighlight(true);
            });
        };

        if (!selectedStreamer) {
            applyNewSnapshotData();
            setTimeout(() => {
                const targetEl = document.getElementById('analytics-stats-card');
                targetEl?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 60);
        } else {
            if (selectedStreamer.slug !== clickedSlug || selectedStreamer.name !== streamer.name) {
                setSelectedStreamer({
                    name: streamer.name,
                    slug: clickedSlug,
                    isLegendClick: false,
                    clickedTime: null,
                    clickedViewers: null,
                    clickedChat: null,
                    clickedPos: null,
                    clickedNeu: null,
                    clickedNeg: null
                });
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

            const targetEl = document.getElementById('analytics-stats-card');

            const rect = targetEl?.getBoundingClientRect();
            const isAlreadyAtTarget = rect ? (rect.top >= 50 && rect.bottom <= window.innerHeight) : false;
            const fallbackDuration = isAlreadyAtTarget ? 60 : 520;

            setTimeout(onFinishScroll, fallbackDuration);

            // Scroll ke target: di HP dibuat 'center', di Desktop dibuat 'start'
            targetEl?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    };

    const sampledChartData = useMemo(() => {
        const raw = chartData;
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
    }, [chartData]);

    const selectedMemberName = selectedStreamer?.name;
    const activeChartData = useMemo(() => {
        if (!selectedMemberName) return sampledChartData;

        const memberPoints = chartData.filter(
            d => selectedMemberName in d
        );

        if (!memberPoints.length) return sampledChartData;

        const timeMap = new Map();
        sampledChartData.forEach(d => timeMap.set(Number(d.timeLabel), d));
        memberPoints.forEach(d => timeMap.set(Number(d.timeLabel), d));

        return [...timeMap.values()].sort((a, b) => Number(a.timeLabel) - Number(b.timeLabel));
    }, [selectedMemberName, sampledChartData, chartData]);

    const activeStreamers = useMemo(() => {
        if (!streamers.length) return []
        const present = streamers.filter(s => activeChartData.some(d => s.name in d));
        return [...present].sort((a, b) => {
            if (metricType === 'chat') {
                return (b.peakChat) - (a.peakChat);
            }
            return (b.peakViewers) - (a.peakViewers);
        });
    }, [streamers, activeChartData, metricType]);

    const memberSessionsMap = useMemo(() => {
        const map = new Map();
        if (!chartData.length || !activeStreamers.length) return map

        activeStreamers.forEach(s => {
            map.set(s.name, new Set());
        });

        chartData.forEach(d => {
            activeStreamers.forEach(s => {
                const slug = d[`_${s.name}_slug`];
                if (slug) {
                    map.get(s.name)?.add(slug);
                }
            });
        });

        return map;
    }, [chartData, activeStreamers]);

    useEffect(() => {
        if (isAnalyticsLoading || isAnalyticsFetching) return;
        if (selectedStreamer && streamers) {
            const updated = streamers.find(s => s.name === selectedStreamer.name);

            if (!updated) {
                setSelectedStreamer(null);
            } else {
                const slugSet = memberSessionsMap.get(selectedStreamer.name);

                const isCurrentSlugValid = slugSet?.has(selectedStreamer.slug)

                if (!isCurrentSlugValid && updated.slug !== selectedStreamer.slug) {
                    setSelectedStreamer(prev => prev ? ({
                        ...prev,
                        slug: updated.slug,
                        clickedTime: null,
                        clickedViewers: null,
                        clickedChat: null,
                        clickedPos: null,
                        clickedNeu: null,
                        clickedNeg: null
                    }) : null);
                }
            }
        }
    }, [streamers, isAnalyticsLoading, isAnalyticsFetching, memberSessionsMap, selectedStreamer?.name, selectedStreamer?.slug]);

    const selectedMemberSlug = selectedStreamer?.slug;
    const streamerSessions = useMemo(() => {
        const allSessions = sessionAnalyticsData?.sessions || [];
        if (!selectedStreamer?.name || !allSessions.length) return allSessions;
        const slugSet = memberSessionsMap.get(selectedStreamer?.name);

        const visibleSessions = allSessions.filter(s => slugSet?.has(s.slug));
        return visibleSessions.length > 0 ? visibleSessions : allSessions;
    }, [sessionAnalyticsData?.sessions, selectedStreamer?.name, selectedMemberSlug, memberSessionsMap]);

    const matchedSessionIndex = streamerSessions.findIndex(s => s.slug === selectedMemberSlug);
    const currentSessionIndex = matchedSessionIndex >= 0 ? matchedSessionIndex : 0;
    const activeSession = streamerSessions.length > 0 ? streamerSessions[currentSessionIndex] : null;
    const isSessionTimeLoading = isSessionLoading || !sessionAnalyticsData || !activeSession;
    const isCurrentSessionLive = Boolean(activeSession && !activeSession.endAt);

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
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${chartData.length > 400
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                            {chartData.length > 400 ? '> 400 (Disampel)' : '≤ 400 (Lengkap)'}
                        </span>
                    </div>
                    <p className="text-2xl lg:text-3xl font-semibold text-zinc-100 mt-1">
                        {sampledChartData.length.toLocaleString()}{' '}
                        <span className="text-xs sm:text-sm font-normal text-zinc-400">
                            titik (dari {chartData.length.toLocaleString()} asli • {formattedDateLabel})
                        </span>
                    </p>
                </div>
            </div>

            <div className="bg-zinc-900/30 block lg:hidden border text-center border-zinc-800/40 rounded-lg p-3">
                <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">Total Cuplikan Waktu</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${chartData.length > 400
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                        {chartData.length > 400 ? '> 400 (Disampel)' : '≤ 400 (Lengkap)'}
                    </span>
                </div>
                <p className="text-2xl lg:text-3xl font-semibold text-zinc-100 mt-1">
                    {sampledChartData.length.toLocaleString()}{' '}
                    <span className="text-xs sm:text-sm font-normal text-zinc-400">
                        titik (dari {chartData.length.toLocaleString()} asli • {formattedDateLabel})
                    </span>
                </p>
            </div>

            {/* Selected Detail Header */}
            <AnalyticsDetailHeader
                selectedStreamer={selectedStreamer}
                setSelectedStreamer={setSelectedStreamer}
                streamerSessions={streamerSessions}
                currentSessionIndex={currentSessionIndex}
                activeSession={activeSession}
                isSessionTimeLoading={isSessionTimeLoading}
                streamerName={sessionAnalyticsData?.name}
            />

            {/* Sentiment, Stream Stats & Word Cloud Section */}
            {selectedStreamer && (
                <div className="space-y-3 lg:space-y-5">
                    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch">
                        {/* Kolom Kiri: Sentimen & Statistik Performa Siaran */}
                        <div className="w-full lg:w-[40%] flex flex-col gap-3 lg:gap-4 shrink-0">
                            {/* Card Sentimen */}
                            <SentimentCard
                                sentiment={activeSentiment}
                                isLoading={isSessionTimeLoading}
                                isLive={isCurrentSessionLive}
                            />

                            {/* Card Statistik Performa & Snapshot Titik Terpilih */}
                            <StreamStatsCard
                                isLoading={isSessionTimeLoading}
                                isCurrentSessionLive={isCurrentSessionLive}
                                chartData={chartData}
                                selectedStreamer={selectedStreamer}
                                setSelectedStreamer={setSelectedStreamer}
                                activeSession={activeSession}
                                activeSentiment={activeSentiment}
                                isSnapshotHighlight={isSnapshotHighlight}
                            />
                        </div>

                        {/* Kolom Kanan: Word Cloud (Topik Hangat) */}
                        <div className="w-full lg:flex-1 flex flex-col min-w-0">
                            <WordCloudCard
                                topChatters={activeTopChatters}
                                wordCloud={activeWordCloud}
                                isLoading={isSessionTimeLoading}
                                streamerName={sessionAnalyticsData?.name || selectedStreamer.fullName || selectedStreamer.name}
                                isLive={isCurrentSessionLive}
                            />
                        </div>
                    </div>

                    {/* Distribusi Donasi & Pola Gift */}
                    <GiftDistributionCard
                        giftData={giftDistributionData}
                        isLoading={isGiftDistributionLoading || isSessionTimeLoading}
                        isLive={isCurrentSessionLive}
                        streamerName={sessionAnalyticsData?.name || selectedStreamer.fullName || selectedStreamer.name}
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

                    <div className="flex items-center rounded-lg bg-zinc-900/80 border border-zinc-800/80 p-0.5 shadow-sm">
                        <button
                            onClick={handlePrevDay}
                            title={dateRange.isRange ? "Rentang Sebelumnya" : "Hari Sebelumnya"}
                            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsCalendarOpen(true)}
                            className="px-2.5 sm:px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-md transition cursor-pointer"
                            title="Klik untuk membuka kalender kustom (Pilih 1 hari atau rentang waktu)"
                        >
                            <svg className="w-3.5 h-3.5 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{formattedDateLabel}</span>
                        </button>

                        <button
                            onClick={handleNextDay}
                            disabled={isToday()}
                            title={isToday() ? 'Sudah hari terbaru' : 'Hari berikutnya'}
                            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition cursor-pointer disabled:opacity-30"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        {!isToday() && (
                            <button
                                onClick={handleGoToday}
                                className="ml-1 px-2.5 py-1 text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md transition cursor-pointer"
                                title="Kembali ke Hari Ini"
                            >
                                Hari Ini
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-3 text-zinc-400 text-sm">
                        <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Memuat data analitik...</span>
                    </div>
                ) : !chartData.length ? (
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
            {!selectedStreamer && !loading && chartData.length > 0 && (
                <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-xl p-3.5 sm:p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                    <span>💡</span>
                    <span>
                        <strong className="text-zinc-200">Eksplorasi Sentimen, Topik & Pengirim Chat:</strong> Klik salah satu nama member di grafik atau legenda di atas untuk melihat analisis sentimen mendalam, 50 kata terpopuler, dan daftar 50 pengirim chat terbanyak.
                    </span>
                </div>
            )}

            {/* Custom Dark-Themed Date Range Picker Modal */}
            <DateRangePickerModal
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                initialStartDate={dateRange.startDate}
                initialEndDate={dateRange.endDate}
                initialIsRange={dateRange.isRange}
                onApply={(result) => {
                    setDateRange(result);
                }}
            />
        </div>
    );
}
