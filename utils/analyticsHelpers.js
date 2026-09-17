export const getTodayStartIso = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
}

export const getDaysAgoIsoRange = (daysAgo) => {
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
}

export const calculateSessionDuration = (liveAt, endAt) => {
    if (!liveAt) return "-";
    const start = new Date(liveAt).getTime();
    const end = endAt ? new Date(endAt).getTime() : Date.now();
    if (isNaN(start) || isNaN(end) || end < start) return "-";

    const diffSeconds = Math.floor((end - start) / 1000);
    if (diffSeconds < 60) {
        return `${diffSeconds} Detik`;
    }

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);

    if (hours > 0) {
        return `${hours} Jam ${minutes} Menit`;
    }
    return `${minutes} Menit`;
}

export const countMemberSnapshots = (chartDataList, memberName, slug) => {
    if (!chartDataList || !memberName) return 0;
    return chartDataList.filter(d => {
        if (slug && d[`_${memberName}_slug`]) {
            return d[`_${memberName}_slug`] === slug;
        }
        return memberName in d;
    }).length;
}

export const calculateDurationAtTime = (liveAt, timestamp) => {
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
}

export const formatLiveTime = (dateStrOrMs) => {
    if (!dateStrOrMs) return "-";
    const d = new Date(Number(dateStrOrMs) || dateStrOrMs);
    if (isNaN(d.getTime())) return "-";
    const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(/\./g, ":");
    const date = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return `${time} (${date})`;
}

export const formatAxisTime = (rawTime) => {
    if (!rawTime) return "";
    const d = new Date(Number(rawTime) || rawTime);
    if (isNaN(d.getTime())) return "";
    const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(/\./g, ":");
    const date = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return `${time} ${date}`;
}