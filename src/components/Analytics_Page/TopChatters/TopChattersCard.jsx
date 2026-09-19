import { useState, useMemo } from 'react';
import TopChattersTab from './TopChattersTab';
import TopGiftersTab from './TopGiftersTab';

export default function TopChattersCard({
    topChatters = [],
    topGifters = [],
    topGifts = [],
    isLoading = false,
    streamerName = '',
    isLive = false
}) {
    const hasChatters = Boolean(topChatters && topChatters.length > 0);
    const hasGifters = Boolean(topGifters && topGifters.length > 0);

    const [activeTab, setActiveTab] = useState(hasChatters ? 'chatters' : (hasGifters ? 'gifters' : 'chatters'));
    const [searchQuery, setSearchQuery] = useState('');

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchQuery('');
    };

    const totalMessagesByTop = useMemo(() => {
        return topChatters.reduce((sum, c) => sum + (Number(c.count) || 0), 0);
    }, [topChatters]);

    const totalGoldByTop = useMemo(() => {
        return topGifters.reduce((sum, g) => sum + (Number(g.totalGold) || 0), 0);
    }, [topGifters]);

    if (isLoading) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-5 w-48 bg-zinc-800 rounded"></div>
                    <div className="h-8 w-36 bg-zinc-800 rounded-lg"></div>
                </div>
                <div className="grid grid-cols-3 gap-3 h-36">
                    <div className="bg-zinc-800/40 rounded-xl"></div>
                    <div className="bg-zinc-800/50 rounded-xl"></div>
                    <div className="bg-zinc-800/40 rounded-xl"></div>
                </div>
                <div className="h-40 bg-zinc-800/20 rounded-xl"></div>
            </div>
        );
    }

    if (!hasChatters && !hasGifters) {
        return (
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-5 text-center text-zinc-400 text-sm space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-zinc-800/80 border-zinc-700/80 text-zinc-300">
                    <span>🏆 Papan Peringkat Pesan & Donasi Gift</span>
                </div>
                {isLive ? (
                    <div>
                        <p className="text-zinc-200 font-medium text-sm">🔴 Siaran Sedang Berlangsung</p>
                        <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                            Daftar 50 Pengirim Pesan & Donatur Gift sedang dikumpulkan dan akan otomatis tersedia setelah sesi siaran ini selesai.
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-zinc-300 font-medium text-sm">Belum ada data interaksi penonton atau gift untuk siaran ini.</p>
                        <p className="text-xs text-zinc-500 mt-1">Data pengirim pesan dan donatur gift akan muncul saat penonton berinteraksi di obrolan langsung.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 lg:p-5 space-y-5">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-2">
                            {activeTab === 'chatters' ? (
                                <span>🏆 50 Pengirim Pesan Terbanyak</span>
                            ) : (
                                <span>🎁 50 Donatur Gift Terbanyak</span>
                            )}
                        </h3>
                        <span className="text-xs text-zinc-400">
                            {activeTab === 'chatters'
                                ? `(${topChatters.length} pengguna • ${totalMessagesByTop.toLocaleString('id-ID')} pesan)`
                                : `(${topGifters.length} donatur • ${totalGoldByTop.toLocaleString('id-ID')} Gold)`}
                        </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        {activeTab === 'chatters'
                            ? `Daftar penonton yang paling banyak mengirimkan pesan selama siaran langsung ${streamerName ? `• ${streamerName}` : ''}`
                            : `Daftar penonton yang paling banyak mengirimkan virtual gift (Gold) selama siaran langsung ${streamerName ? `• ${streamerName}` : ''}`}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-60">
                        <input
                            type="text"
                            placeholder={activeTab === 'chatters' ? "Cari nama penonton..." : "Cari nama donatur..."}
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

                    {/* Mode Switcher */}
                    <div className="flex p-0.5 w-full sm:w-auto rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
                        <button
                            onClick={() => handleTabChange('chatters')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer flex justify-center items-center w-full sm:w-auto gap-1.5 ${activeTab === 'chatters'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                        >
                            <span>💬 Top Chatters</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('gifters')}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer flex justify-center items-center w-full sm:w-auto gap-1.5 ${activeTab === 'gifters'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                        >
                            <span>🎁 Top Gifters</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Tab Content */}
            {activeTab === 'chatters' ? (
                <TopChattersTab
                    topChatters={topChatters}
                    searchQuery={searchQuery}
                    streamerName={streamerName}
                />
            ) : (
                <TopGiftersTab
                    topGifters={topGifters}
                    topGifts={topGifts}
                    searchQuery={searchQuery}
                    streamerName={streamerName}
                />
            )}
        </div>
    );
}
