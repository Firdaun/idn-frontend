## Spesifikasi Response API untuk Frontend (`GET /idn/analytics/:slug`)

### Endpoint Information
* **Method**: `GET`
* **Path**: `/idn/analytics/:slug`
* **URL Param**: `:slug` *(string, contoh: `ayo-ngobrol-bareng-260915214721`)*

### Contoh Response JSON (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "name": "Cynthia",
    "sessions": [
      {
        "slug": "ayo-ngobrol-bareng-260914183109",
        "liveAt": "2026-09-14T11:31:14.000Z",
        "endAt": "2026-09-14T12:39:51.775Z",
        "avgViewers": 3290.04,
        "avgChat": 16.4,
        "peakViewers": 5964,
        "peakChat": 37,
        "totalGold": 1252
      },
      {
        "slug": "ayo-ngobrol-bareng-260915214721",
        "liveAt": "2026-09-15T14:47:27.000Z",
        "endAt": "2026-09-15T14:59:19.243Z",
        "avgViewers": 490.83,
        "avgChat": 19,
        "peakViewers": 1027,
        "peakChat": 43,
        "totalGold": 5
      }
    ],
    "sentiment": {
      "totalChat": 493,
      "positive": 53,
      "neutral": 398,
      "negative": 42,
      "positivePercentage": 10.8,
      "neutralPercentage": 80.7,
      "negativePercentage": 8.5
    },
    "wordCloud": [
      {
        "text": "halo",
        "value": 45
      },
      {
        "text": "semangat",
        "value": 32
      }
    ],
    "topChatters": [
      {
        "userName": "Budi Santoso",
        "userAvatar": "https://cdn.idn.media/idnaccount/avatar/500/sample.webp",
        "count": 18
      }
    ],
    "topGifters": [
      {
        "userUuid": "bf815e2a-31f8-4dc1-b024-bb575c6bac17",
        "userName": "Agn An",
        "userAvatar": "https://cdn.idn.media/idnaccount/avatar/500/sample.webp",
        "totalGold": 5,
        "giftCount": 1,
        "gifts": [
          {
            "name": "Toa",
            "count": 1,
            "gold": 5,
            "iconUrl": "https://cdn.idntimes.com/content-images/icons/virtual-gifts/icons-3bc952d047271d90d06e00fa81655981.png"
          }
        ]
      }
    ],
    "topGifts": [
      {
        "giftName": "Toa",
        "giftIconUrl": "https://cdn.idntimes.com/content-images/icons/virtual-gifts/icons-3bc952d047271d90d06e00fa81655981.png",
        "goldPerItem": 5,
        "totalGold": 5,
        "totalCount": 1
      }
    ]
  }
}
```

### Kamus Data & Panduan Frontend Developer

| Field | Tipe Data | Keterangan & Panduan Tampilan |
| :--- | :--- | :--- |
| `name` | `string` | Nama panggilan streamer (contoh: `"Cynthia"`). |
| `sessions` | `Array<Session>` | Riwayat seluruh sesi live streamer. Cocok untuk **grafik perbandingan / tren penonton**. Tiap objek memiliki: `slug`, `liveAt`, `endAt`, `avgViewers`, `peakViewers`, `avgChat`, `peakChat`, `totalGold`. |
| `sentiment` | `Object \| null` | Hasil analisis sentimen. **Bernilai `null` jika live masih berlangsung**, terisi otomatis setelah live selesai. Properti: `totalChat`, `positive`, `neutral`, `negative`, serta `positivePercentage`, `neutralPercentage`, `negativePercentage`. |
| `wordCloud` | `Array<{ text, value }>` | 50 kata paling populer di chat. Format sudah standar `{ text: string, value: number }` siap pakai untuk komponen WordCloud. |
| `topChatters` | `Array<Chatter>` | Top 50 penonton teraktif di chat. Memiliki properti `userName`, `userAvatar`, dan `count`. |
| `topGifters` | `Array<Gifter>` | Top 50 donatur gift terbanyak. Memiliki: `userUuid`, `userName`, `userAvatar`, `totalGold`, `giftCount`, dan rincian `gifts` yang dikirim. |
| `topGifts` | `Array<Gift>` | Daftar virtual gift terpopuler. **`giftIconUrl` dijamin berupa link gambar PNG CDN resmi** yang langsung bisa ditampilkan menggunakan `<img src={item.giftIconUrl} alt={item.giftName} />`. |

#### Response Error (HTTP 404)
Jika slug tidak ditemukan atau belum ada data snapshot:
```json
{
  "errors": "Data snapshot penonton belum tersedia."
}
```

---