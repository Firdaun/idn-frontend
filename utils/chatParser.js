export const parseIdnChatMessage = (rawLine) => {
    try {
        // 1. Lewati pesan kontrol IRC biasa (JOIN, QUIT, PING, PONG)
        if (!rawLine.includes("PRIVMSG")) return null;

        // 2. Ambil payload JSON setelah tanda ':' terakhir dari perintah PRIVMSG
        const privmsgIndex = rawLine.indexOf("PRIVMSG");
        const jsonStartIndex = rawLine.indexOf(":{", privmsgIndex);

        if (jsonStartIndex === -1) return null;

        const jsonString = rawLine.substring(jsonStartIndex + 1);
        const data = JSON.parse(jsonString);

        const user = {
            name: data.user?.name || "Anonim",
            username: data.user?.username || "",
            avatar: data.user?.avatar_url || "https://cdn.idn.media/idnaccount/avatar/default.png",
            tier: data.user?.level_tier || 1,
        };

        // 3. Klasifikasikan tipe payload
        if (data.chat) {
            return {
                id: data.chat.id || String(Date.now()),
                type: "chat",
                user,
                message: data.chat.message,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
        }

        if (data.system) {
            return {
                id: `sys-${Date.now()}-${Math.random()}`,
                type: "system",
                user,
                message: data.system.message || `${user.name} bergabung`,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
        }

        if (data.gift) {
            return {
                id: `gift-${Date.now()}`,
                type: "gift",
                user,
                message: `Mengirim gift: ${data.gift.name || "Gift"}`,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
        }

        return null;
    } catch (err) {
        return null;
    }
};