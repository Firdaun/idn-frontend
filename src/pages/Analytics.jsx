import { useState, useEffect, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush
} from 'recharts';
import { getMultiLiveData } from '../../utils/backend-api';

const COLORS = ['#e4e4e7', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#fb7185', '#94a3b8', '#f97316'];

export default function Analytics() {
    const [data, setData] = useState({ chartData: [], streamers: [] });
    const [selectedStreamer, setSelectedStreamer] = useState(null);
    const [timeRange, setTimeRange] = useState('all'); // 'all' | '15m' | '30m' | '1h'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            const liveData = await getMultiLiveData();
            setData(liveData || { chartData: [], streamers: [] });
            if (selectedStreamer && liveData?.streamers) {
                const updated = liveData.streamers.find(s => s.name === selectedStreamer.name);
                if (updated) setSelectedStreamer(updated);
            }
        } catch (error) {
            console.error("Error fetching multi-live data:", error);
        } finally {
            setLoading(false);
            if (isManual) setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(), 30000);
        return () => clearInterval(interval);
    }, []);

    const streamers = data.streamers || [];
    const chartData = data.chartData || [];
    const maxPeak = streamers.reduce((max, s) => Math.max(max, s.peakViewers || 0), 0);

    // Filter chart data berdasarkan rentang waktu yang dipilih
    const filteredChartData = useMemo(() => {
        if (!chartData.length || timeRange === 'all') return chartData;

        const lastItem = chartData[chartData.length - 1];
        const lastTime = lastItem?._rawTime;

        if (lastTime) {
            const minutes = timeRange === '15m' ? 15 : timeRange === '30m' ? 30 : 60;
            const threshold = lastTime - minutes * 60 * 1000;
            return chartData.filter(d => (d._rawTime || 0) >= threshold);
        }

        // Fallback jika _rawTime tidak ada (berdasarkan snapshot 30 detik)
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
                <div className="bg-zinc-900/50 border border-zinc-800/50 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="font-semibold text-base sm:text-lg text-zinc-100">{selectedStreamer.fullName}</h3>
                        <p className="text-zinc-400 text-sm mt-0.5">{selectedStreamer.slug}</p>
                    </div>

                    <div className="flex items-center gap-8 text-sm">
                        <div>
                            <span className="text-zinc-400 block text-xs">Peak Viewers</span>
                            <span className="font-semibold text-zinc-100 text-base">{Number(selectedStreamer.peakViewers || 0).toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-zinc-400 block text-xs">Durasi</span>
                            <span className="font-semibold text-zinc-100 text-base">{selectedStreamer.duration || `${selectedStreamer.durationMinutes || 0}m`}</span>
                        </div>
                        <button
                            onClick={() => setSelectedStreamer(null)}
                            className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-800 transition cursor-pointer"
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
                                        setSelectedStreamer(streamerData || null);
                                    }}
                                    wrapperStyle={{ paddingTop: '20px', cursor: 'pointer', fontSize: '13px' }}
                                />

                                {streamers.map((streamer, index) => {
                                    const isSelected = selectedStreamer?.name === streamer.name;
                                    const isDimmed = selectedStreamer && !isSelected;

                                    return (
                                        <Line
                                            key={streamer.name}
                                            type="monotone"
                                            dataKey={streamer.name}
                                            name={streamer.name}
                                            stroke={COLORS[index % COLORS.length]}
                                            strokeWidth={isSelected ? 3 : 1.75}
                                            strokeOpacity={isDimmed ? 0.2 : 1}
                                            dot={false}
                                            connectNulls={true}
                                            activeDot={{
                                                r: isSelected ? 6 : 4,
                                                onClick: () => setSelectedStreamer(streamer),
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
