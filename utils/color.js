// Pemetaan warna unik 60 Member JKT48 berdasarkan tema tim masing-masing
// - Tim Dream: Varian Teal / Cyan / Mint
// - Tim Passion: Varian Orange / Amber / Coral / Gold
// - Tim Love: Varian Pink / Rose / Fuchsia
// - Trainee: Varian Ungu / Indigo / Sky / Silver / Lime

export const MEMBERS_DATA = [
    // === TIM DREAM (Teal / Cyan / Mint / Aqua) ===
    { name: "delynn", team: "dream", color: "#14b8a6" },
    { name: "olla", team: "dream", color: "#06b6d4" },
    { name: "freya", team: "dream", color: "#2dd4bf" },
    { name: "ella", team: "dream", color: "#38bdf8" },
    { name: "gita", team: "dream", color: "#0d9488" },
    { name: "greesel", team: "dream", color: "#22d3ee" },
    { name: "eli", team: "dream", color: "#10b981" },
    { name: "lyn", team: "dream", color: "#5eead4" },
    { name: "nachia", team: "dream", color: "#0891b2" },
    { name: "oline", team: "dream", color: "#00f2fe" },
    { name: "marsha", team: "dream", color: "#34d399" },
    { name: "nala", team: "dream", color: "#67e8f9" },

    // === TIM PASSION (Orange / Amber / Coral / Gold) ===
    { name: "aralie", team: "passion", color: "#f97316" },
    { name: "christy", team: "passion", color: "#fb923c" },
    { name: "erine", team: "passion", color: "#f59e0b" },
    { name: "oniel", team: "passion", color: "#ea580c" },
    { name: "dena", team: "passion", color: "#fbbf24" },
    { name: "desy", team: "passion", color: "#ff7849" },
    { name: "feni", team: "passion", color: "#d97706" },
    { name: "jessi", team: "passion", color: "#fdba74" },
    { name: "kathrina", team: "passion", color: "#ff6b35" },
    { name: "lulu", team: "passion", color: "#eab308" },
    { name: "levi", team: "passion", color: "#f43f5e" },
    { name: "muthe", team: "passion", color: "#ff9f1c" },
    { name: "raisha", team: "passion", color: "#fde047" },
    { name: "ribka", team: "passion", color: "#c2410c" },
    { name: "kimmy", team: "passion", color: "#ffa600" },

    // === TIM LOVE (Pink / Rose / Fuchsia / Magenta) ===
    { name: "alya", team: "love", color: "#ec4899" },
    { name: "anin", team: "love", color: "#f472b6" },
    { name: "lia", team: "love", color: "#e11d48" },
    { name: "lana", team: "love", color: "#fb7185" },
    { name: "elin", team: "love", color: "#d946ef" },
    { name: "cynthia", team: "love", color: "#f87171" },
    { name: "fiony", team: "love", color: "#db2777" },
    { name: "fritzy", team: "love", color: "#fda4af" },
    { name: "gracie", team: "love", color: "#c026d3" },
    { name: "lily", team: "love", color: "#f43f85" },
    { name: "indah", team: "love", color: "#e879f9" },
    { name: "trisha", team: "love", color: "#be185d" },
    { name: "michie", team: "love", color: "#ff66b2" },
    { name: "nayla", team: "love", color: "#f9a8d4" },

    // === TRAINEE (Kuning & Ungu) ===
    { name: "virgi", team: "trainee", color: "#a78bfa" },
    { name: "auwia", team: "trainee", color: "#8b5cf6" },
    { name: "rily", team: "trainee", color: "#c084fc" },
    { name: "giaa", team: "trainee", color: "#7c3aed" },
    { name: "maira", team: "trainee", color: "#facc15" },
    { name: "ekin", team: "trainee", color: "#a855f7" },
    { name: "jemima", team: "trainee", color: "#6366f1" },
    { name: "mikaela", team: "trainee", color: "#eab308" },
    { name: "intan", team: "trainee", color: "#9333ea" },
    { name: "fera", team: "trainee", color: "#fde047" },
    { name: "carissa", team: "trainee", color: "#4f46e5" },
    { name: "bella", team: "trainee", color: "#ca8a04" },
    { name: "fahira", team: "trainee", color: "#c4b5fd" },
    { name: "rara", team: "trainee", color: "#fbbf24" },
    { name: "heidi", team: "trainee", color: "#d8b4fe" },
    { name: "maxine", team: "trainee", color: "#581c87" },
    { name: "jazzy", team: "trainee", color: "#f59e0b" },
    { name: "ralyne", team: "trainee", color: "#7e22ce" },
    { name: "sona", team: "trainee", color: "#fef08a" },
    // === JKT48 Official ===
    { name: "jkt48", team: "Admin", color: "#ef4444" },
];

// Map lookup cepat berdasarkan nama & alias
export const MEMBER_COLOR_MAP = {};

MEMBERS_DATA.forEach((member) => {
    MEMBER_COLOR_MAP[member.name.toLowerCase()] = member.color;
});

export const FALLBACK_COLORS = [
    '#38bdf8', '#f97316', '#ec4899', '#34d399', '#a78bfa', '#fbbf24', '#fb7185', '#e4e4e7'
];

/**
 * Mendapatkan warna unik member berdasarkan nama (case-insensitive & alias aware)
 * @param {string} streamerName - Nama member (contoh: "Freya", "Freya JKT48", "Kathrina", "JKT48")
 * @param {number} fallbackIndex - Indeks warna cadangan jika member tidak terdaftar
 * @returns {string} Hex color code
 */
export function getMemberColor(streamerName, fallbackIndex = 0) {
    if (!streamerName) return FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];

    const raw = String(streamerName).toLowerCase().trim();

    // 1. Cek langsung akun Official JKT48 / Admin
    if (raw === "jkt48") {
        if (MEMBER_COLOR_MAP["jkt48"]) return MEMBER_COLOR_MAP["jkt48"];
    }

    // 2. Bersihkan nama member: lowercase, hapus "jkt48", spasi, karakter spesial
    const clean = raw
        .replace(/jkt48/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();

    // 3. Cocokkan langsung nama member
    if (MEMBER_COLOR_MAP[clean]) {
        return MEMBER_COLOR_MAP[clean];
    }

    // 4. Cocokkan parsial
    for (const [key, color] of Object.entries(MEMBER_COLOR_MAP)) {
        if (clean && (clean.includes(key) || key.includes(clean))) {
            return color;
        }
    }

    return FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
}