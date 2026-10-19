import { useState, useMemo, useEffect, useRef } from 'react';

// Format helper YYYY-MM-DD for reliable day-only comparison
const toDateKey = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default function DateRangePickerModal({
    isOpen,
    onClose,
    initialStartDate,
    initialEndDate = null,
    initialIsRange = false,
    onApply
}) {
    const today = useMemo(() => new Date(), []);
    const todayKey = useMemo(() => toDateKey(today), [today]);

    // Internal navigation month
    const [navDate, setNavDate] = useState(() => {
        const base = initialStartDate

        return new Date(base.getFullYear(), base.getMonth(), 1);
    });

    // Draft selection states
    const [tempStart, setTempStart] = useState(initialStartDate);
    const [tempEnd, setTempEnd] = useState(() => (initialIsRange && initialEndDate) ? initialEndDate : null);

    // Sync draft states when modal opens
    useEffect(() => {
        if (isOpen) {
            setTempStart(initialStartDate);
            setTempEnd((initialIsRange && initialEndDate) ? new Date(initialEndDate) : null);
            setNavDate(new Date(initialStartDate.getFullYear(), initialStartDate.getMonth(), 1));
        }
    }, [isOpen, initialStartDate, initialEndDate, initialIsRange]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const modalRef = useRef(null);

    if (!isOpen) return null;

    const startKey = toDateKey(tempStart);
    const endKey = toDateKey(tempEnd);

    // Month Navigation
    const handlePrevMonth = () => {
        setNavDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setNavDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    // Calendar Grid Days Calculation
    const year = navDate.getFullYear();
    const month = navDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIdx = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const calendarCells = [];

    // Prev month padding
    for (let i = firstDayIdx - 1; i >= 0; i--) {
        const d = new Date(year, month - 1, daysInPrevMonth - i);
        calendarCells.push({
            date: d,
            isCurrentMonth: false,
            key: toDateKey(d)
        });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        calendarCells.push({
            date: d,
            isCurrentMonth: true,
            key: toDateKey(d)
        });
    }

    // Next month padding to fill grid
    const remaining = (7 - (calendarCells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        calendarCells.push({
            date: d,
            isCurrentMonth: false,
            key: toDateKey(d)
        });
    }

    // Handle date click
    const handleDateClick = (clickedDate) => {
        const clickedKey = toDateKey(clickedDate);
        if (clickedKey > todayKey) return; // Future date blocked

        // If currently both start and end exist: start new selection
        if (tempStart && tempEnd) {
            setTempStart(clickedDate);
            setTempEnd(null);
            return;
        }

        // If only start exists
        if (tempStart && !tempEnd) {
            if (clickedKey === startKey) {
                // Clicked same date: keep as single day selection
                setTempEnd(null);
            } else if (clickedDate < tempStart) {
                // Clicked earlier date: set clicked as start, previous start as end
                setTempEnd(tempStart);
                setTempStart(clickedDate);
            } else {
                // Clicked later date: set as end date
                setTempEnd(clickedDate);
            }
        }
    };

    // Quick Presets
    const handlePresetToday = () => {
        setTempStart(new Date());
        setTempEnd(null);
        setNavDate(new Date(today.getFullYear(), today.getMonth(), 1));
    };

    const handlePresetYesterday = () => {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        setTempStart(y);
        setTempEnd(null);
        setNavDate(new Date(y.getFullYear(), y.getMonth(), 1));
    };

    const handlePresetLast7Days = () => {
        const s = new Date();
        s.setDate(s.getDate() - 6);
        setTempStart(s);
        setTempEnd(new Date());
        setNavDate(new Date(today.getFullYear(), today.getMonth(), 1));
    };

    const handlePresetLast30Days = () => {
        const s = new Date();
        s.setDate(s.getDate() - 29);
        setTempStart(s);
        setTempEnd(new Date());
        setNavDate(new Date(today.getFullYear(), today.getMonth(), 1));
    };

    // Range preview check
    const isDateInRange = (cellKey) => {
        if (!tempStart) return false;

        // When both start and end are set
        if (tempEnd) {
            return cellKey >= startKey && cellKey <= endKey;
        }

        return false;
    };

    // Apply action
    const handleApply = () => {
        if (!tempStart) return;

        const isRange = Boolean(tempEnd && toDateKey(tempStart) !== toDateKey(tempEnd));
        onApply({
            startDate: tempStart,
            endDate: isRange ? tempEnd : null,
            isRange
        });
        onClose();
    };

    // Label for current selection summary
    const selectionSummary = (() => {
        if (!tempStart) return 'Pilih tanggal pada kalender';

        const fmt = (d) => d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        if (tempEnd && toDateKey(tempStart) !== toDateKey(tempEnd)) {
            const diffDays = Math.round((tempEnd - tempStart) / (1000 * 60 * 60 * 24)) + 1;
            return (
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-sky-400 font-semibold">{fmt(tempStart)} — {fmt(tempEnd)}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-medium w-fit">
                        Rentang {diffDays} Hari
                    </span>
                </div>
            );
        }

        const isTodaySelected = startKey === todayKey;
        return (
            <div className="flex items-center gap-2">
                <span className="text-sky-400 font-semibold">{fmt(tempStart)}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium">
                    {isTodaySelected ? 'Hari Ini (1 Hari)' : 'Pilihan 1 Hari'}
                </span>
            </div>
        );
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            {/* Click outside backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Modal Dialog */}
            <div
                ref={modalRef}
                className="relative w-full max-w-sm sm:max-w-md bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col select-none"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                        <span className="text-base">📅</span>
                        <h3 className="text-sm font-semibold text-zinc-100">
                            Pilih Tanggal & Rentang Waktu
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                        title="Tutup (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Quick Presets Bar */}
                <div className="flex items-center gap-1.5 p-3 px-4 border-b border-zinc-800/60 overflow-x-auto no-scrollbar bg-zinc-900/30">
                    <button
                        onClick={handlePresetToday}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
                    >
                        Hari Ini
                    </button>
                    <button
                        onClick={handlePresetYesterday}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
                    >
                        Kemarin
                    </button>
                    <button
                        onClick={handlePresetLast7Days}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
                    >
                        7 Hari Terakhir
                    </button>
                    <button
                        onClick={handlePresetLast30Days}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
                    >
                        30 Hari Terakhir
                    </button>
                </div>

                {/* Calendar Body */}
                <div className="p-3 space-y-3">
                    {/* Month Navigator */}
                    <div className="flex items-center justify-between pb-1">
                        <button
                            onClick={handlePrevMonth}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition cursor-pointer"
                            title="Bulan Sebelumnya"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="text-sm font-semibold text-zinc-100 tracking-wide">
                            {MONTH_NAMES[month]} {year}
                        </div>

                        <button
                            onClick={handleNextMonth}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition cursor-pointer"
                            title="Bulan Berikutnya"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Day Names Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {DAY_NAMES.map((name) => (
                            <div key={name} className="text-[11px] font-semibold text-zinc-500 py-1">
                                {name}
                            </div>
                        ))}
                    </div>

                    {/* Days Cells Grid */}
                    <div className="grid grid-cols-7 gap-y-1">
                        {calendarCells.map((cell) => {
                            const isFuture = cell.key > todayKey;
                            const isCurrentDay = cell.key === todayKey;
                            const isStart = cell.key === startKey;
                            const isEnd = cell.key === endKey;
                            const inRange = isDateInRange(cell.key);

                            // 1. Atur Background Strip Rentang agar pas di tengah lingkaran
                            let rangeBg = null;
                            if (endKey) {
                                if (isStart) {
                                    rangeBg = <div className="absolute top-1/2 -translate-y-1/2 left-1/2 right-0 h-9 bg-sky-500/20 z-0" />;
                                } else if (isEnd) {
                                    rangeBg = <div className="absolute top-1/2 -translate-y-1/2 left-0 right-1/2 h-9 bg-sky-500/20 z-0" />;
                                } else if (inRange) {
                                    rangeBg = <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-9 bg-sky-500/20 z-0" />;
                                }
                            }

                            // 2. Style untuk Tombol Tanggal (Tetap bulat sempurna & di atas background)
                            let buttonStyle = 'relative z-10 h-9 w-9 rounded-full flex flex-col items-center justify-center text-xs transition cursor-pointer select-none text-zinc-300 hover:bg-zinc-800/80 hover:text-white';

                            if (isFuture) {
                                buttonStyle = 'relative z-10 h-9 w-9 rounded-full text-zinc-500 opacity-40 cursor-default flex flex-col items-center justify-center text-xs';
                            } else if (!cell.isCurrentMonth) {
                                buttonStyle = 'relative z-10 h-9 w-9 rounded-full text-zinc-500 opacity-40 hover:bg-zinc-900 flex flex-col items-center justify-center text-xs transition cursor-pointer select-none';
                            }

                            if (isStart || isEnd) {
                                buttonStyle = 'relative z-10 h-9 w-9 rounded-full bg-sky-500 text-white font-bold shadow-md shadow-sky-500/30 flex flex-col items-center justify-center text-xs transition cursor-pointer select-none scale-102';
                            } else if (inRange && endKey) {
                                buttonStyle = 'relative z-10 h-9 w-9 rounded-full text-sky-200 font-medium flex flex-col items-center justify-center text-xs transition cursor-pointer select-none hover:bg-sky-500/30';
                            }

                            return (
                                <div key={cell.key} className="relative h-9 w-full flex items-center justify-center">
                                    {rangeBg}
                                    <button
                                        type="button"
                                        disabled={isFuture}
                                        onClick={() => handleDateClick(cell.date)}
                                        onMouseEnter={() => !isFuture}
                                        className={buttonStyle}
                                    >
                                        <span>{cell.date.getDate()}</span>
                                        {isCurrentDay && !isStart && !isEnd && (
                                            <span className="w-1 h-1 rounded-full bg-sky-400 absolute bottom-1" />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer with Summary & Actions */}
                <div className="p-3.5 px-4 bg-zinc-900/60 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                        <span className="text-[11px] text-zinc-500 block">Status Pilihan:</span>
                        <div className="mt-0.5 text-xs">
                            {selectionSummary}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-200 font-medium transition cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleApply}
                            className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-md shadow-sky-500/25 transition cursor-pointer"
                        >
                            Terapkan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
