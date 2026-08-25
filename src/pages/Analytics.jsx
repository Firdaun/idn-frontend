import { useState, useEffect, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush
} from 'recharts';
import { getMultiLiveData, getAnalytics } from '../../utils/backend-api';
import { formatDurationIndo } from './Home';

const COLORS = ['#e4e4e7', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#94a3b8', '#f97316'];

export default function Analytics() {
    const [data, setData] = useState({ chartData: [], streamers: [] });
    const [selectedStreamer, setSelectedStreamer] = useState(null);
    const [streamerAnalytics, setStreamerAnalytics] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [timeRange, setTimeRange] = useState('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            const liveData = await getMultiLiveData();
            setData(liveData || { chartData: [], streamers: [] });
            if (selectedStreamer && liveData?.streamers) {
                const updated = liveData.streamers.find(s => s.name === selectedStreamer.name);
                if (updated) setSelectedStreamer(prev => ({ ...updated, clickedTime: prev?.clickedTime }));
            }
        } catch (error) {
            console.error("Error fetching multi-live data:", error);
        } finally {
            setLoading(false);
            if (isManual) setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        if (!selectedStreamer?.slug) {
            setStreamerAnalytics(null);
            return;
        }

        let isSubscribed = true;
        const fetchStreamerDetail = async () => {
            setLoadingDetail(true);
            try {
                const res = await getAnalytics(selectedStreamer.slug);
                if (isSubscribed) {
                    setStreamerAnalytics(res);
                }
            } catch (err) {
                console.error("Gagal mengambil detail analytics streamer:", err);
                if (isSubscribed) setStreamerAnalytics(null);
            } finally {
                if (isSubscribed) setLoadingDetail(false);
            }
        };

        fetchStreamerDetail();
        return () => {
            isSubscribed = false;
        };
    }, [selectedStreamer?.slug]);

    const streamers = data.streamers || [];
    const chartData = data.chartData || [];
    const maxPeak = streamers.reduce((max, s) => Math.max(max, s.peakViewers || 0), 0);

    const calculateDurationAtTime = (liveAt, pointTimeLabel) => {
        if (!liveAt || !pointTimeLabel) return null;
        const startDate = new Date(liveAt);
        if (isNaN(startDate.getTime())) return null;

        const parts = String(pointTimeLabel).split(/[:.]/).map(Number);
        if (parts.length < 2) return null;

        const targetDate = new Date(startDate);
        targetDate.setHours(parts[0], parts[1], parts[2] || 0, 0);
        
        if (targetDate.getTime() < startDate.getTime()) {
            targetDate.setDate(targetDate.getDate() + 1);
        }

        const totalSeconds = Math.max(0, Math.floor((targetDate.getTime() - startDate.getTime()) / 1000));
        if (totalSeconds < 60) return `${totalSeconds} Detik`;

        const totalMinutes = Math.floor(totalSeconds / 60);
        if (totalMinutes < 60) return `${totalMinutes} Menit`;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes > 0 ? `${hours} Jam ${minutes} Menit` : `${hours} Jam`;
    };

    const handleDotClick = (streamer, event, dotPayload) => {
        const dataPoint = dotPayload?.payload || event?.payload || (event?.timeLabel ? event : null);
        const clickedTime = dataPoint?.timeLabel;
        setSelectedStreamer({
            ...streamer,
            clickedTime: clickedTime || null
        });
    };

    const filteredChartData = useMemo(() => {
        if (!chartData.length || timeRange === 'all') return chartData;

        const lastItem = chartData[chartData.length - 1];
        const lastTime = lastItem?._rawTime;

        if (lastTime) {
            const minutes = timeRange === '15m' ? 15 : timeRange === '30m' ? 30 : 60;
            const threshold = lastTime - minutes * 60 * 1000;
            return chartData.filter(d => (d._rawTime || 0) >= threshold);
        }

        const limit = timeRange === '15m' ? 30 : timeRange === '30m' ? 60 : 120;
        return chartData.slice(-limit);
    }, [chartData, timeRange]);

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
                    onClick={() => fetchData(true)}
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
                        {filteredChartData.length} <span className="text-sm font-normal text-zinc-400">titik ({timeRange === 'all' ? 'Semua' : timeRange})</span>
                    </p>
                </div>
            </div>

            {/* Selected Detail */}
            {selectedStreamer && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 p-5 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                            <h3 className="font-semibold text-base sm:text-lg text-zinc-100 truncate">{selectedStreamer.fullName}</h3>
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                selectedStreamer.endAt
                                    ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}>
                                {selectedStreamer.endAt ? "Selesai Live" : "Sedang Live"}
                            </span>
                        </div>
                        <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 truncate">{selectedStreamer.slug}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-5 sm:gap-8 text-sm">
                        <div>
                            <span className="text-zinc-400 block text-xs">Peak Viewers</span>
                            <span className="font-semibold text-zinc-100 text-base">
                                {Number(streamerAnalytics?.peakViewers ?? selectedStreamer.peakViewers ?? 0).toLocaleString()}
                            </span>
                        </div>
                        <div>
                            <span className="text-zinc-400 block text-xs">Rata-rata (Avg)</span>
                            <span className="font-semibold text-zinc-100 text-base">
                                {loadingDetail ? (
                                    <span className="text-zinc-500">...</span>
                                ) : streamerAnalytics?.avgViewers !== undefined ? (
                                    Math.round(streamerAnalytics.avgViewers).toLocaleString()
                                ) : (
                                    "-"
                                )}
                            </span>
                        </div>
                        <div>
                            <span className="text-zinc-400 block text-xs">Total Snapshot</span>
                            <span className="font-semibold text-zinc-100 text-base">
                                {loadingDetail ? (
                                    <span className="text-zinc-500">...</span>
                                ) : streamerAnalytics?.totalSnapshots !== undefined ? (
                                    `${streamerAnalytics.totalSnapshots}x`
                                ) : (
                                    "-"
                                )}
                            </span>
                        </div>
                        <div>
                            <span className="text-zinc-400 block text-xs">
                                {selectedStreamer.clickedTime ? `Durasi (@${String(selectedStreamer.clickedTime).replace(/\./g, ":")})` : "Durasi"}
                            </span>
                            <span className="font-semibold text-zinc-100 text-base">
                                {selectedStreamer.clickedTime
                                    ? (calculateDurationAtTime(selectedStreamer.liveAt, selectedStreamer.clickedTime) || formatDurationIndo(selectedStreamer.duration))
                                    : formatDurationIndo(selectedStreamer.duration)}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedStreamer(null);
                                setStreamerAnalytics(null);
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-medium text-zinc-400">Rentang Waktu:</span>
                        <div className="inline-flex p-1 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                            {[
                                { id: 'all', label: 'Semua' },
                                { id: '15m', label: '15 Menit' },
                                { id: '30m', label: '30 Menit' },
                                { id: '1h', label: '1 Jam' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setTimeRange(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                                        timeRange === tab.id
                                            ? 'bg-zinc-800 text-white shadow-sm'
                                            : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <span className="text-xs text-zinc-500 hidden sm:inline-block">
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
                            <LineChart data={filteredChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.4} />

                                <XAxis
                                    dataKey="timeLabel"
                                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                                    tickMargin={12}
                                    stroke="#27272a"
                                    tickFormatter={(tick) => {
                                        if (!tick) return "";
                                        const parts = String(tick).split(/[:.]/);
                                        return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : tick;
                                    }}
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
                                        const cleanLabel = String(label).replace(/\./g, ":");
                                        return `Waktu: ${cleanLabel} WIB`;
                                    }}
                                />

                                <Legend
                                    onClick={(e) => {
                                        const streamerData = streamers.find(s => s.name === e.dataKey);
                                        setSelectedStreamer(streamerData ? { ...streamerData, clickedTime: null } : null);
                                    }}
                                    wrapperStyle={{ paddingTop: '20px', cursor: 'pointer', fontSize: '13px' }}
                                />

                                {streamers.map((streamer, index) => {
                                    const isSelected = selectedStreamer?.name === streamer.name;
                                    const isDimmed = selectedStreamer && !isSelected;

                                    return (
                                        <Line
                                            key={streamer.name}
                                            type="linear"
                                            dataKey={streamer.name}
                                            name={streamer.name}
                                            stroke={COLORS[index % COLORS.length]}
                                            strokeWidth={isSelected ? 3 : 1.75}
                                            strokeOpacity={isDimmed ? 0.2 : 1}
                                            dot={false}
                                            connectNulls={true}
                                            activeDot={{
                                                r: isSelected ? 6 : 4,
                                                onClick: (e, payload) => handleDotClick(streamer, e, payload),
                                                cursor: 'pointer',
                                                strokeWidth: 0
                                            }}
                                        />
                                    );
                                })}

                                {filteredChartData.length > 5 && (
                                    <Brush
                                        dataKey="timeLabel"
                                        height={32}
                                        stroke="#3f3f46"
                                        fill="#121214"
                                        tickFormatter={(tick) => {
                                            if (!tick) return "";
                                            const parts = String(tick).split(/[:.]/);
                                            return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : tick;
                                        }}
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
