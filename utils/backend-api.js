const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const getLiveStreams = async () => {
    const response = await fetch(`${BASE_URL}/idn/streams`);
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }
    const result = await response.json();
    return result.data || [];
};

export const getStreamDetail = async (slug) => {
    const response = await fetch(`${BASE_URL}/idn/stream/${slug}`);
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }
    const result = await response.json();
    const data = result.data;

    if (data && data.playback_url) {
        data.playback_url = `${BASE_URL}/idn/proxy?url=${encodeURIComponent(data.playback_url)}`;
    }

    return data;
};

export const getMultiLiveData = async (startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    const queryString = params.toString() ? `?${params.toString()}` : ''
    const response = await fetch(`${BASE_URL}/idn/multi-live${queryString}`);
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }
    const result = await response.json();
    return result.data || { chartData: [], streamers: [] };
};

export const getAnalytics = async (slug) => {
    const response = await fetch(`${BASE_URL}/idn/analytics/${slug}`)
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
    }
    const result = await response.json()
    
    return result.data
}