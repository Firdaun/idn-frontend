const BASE_URL = "http://192.168.1.7:3000";

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