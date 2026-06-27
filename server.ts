import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. API: AI Assistant Chat
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Mesaj alanı boş olamaz" });
    }

    const ai = getGeminiClient();

    // Construct systemic prompt context to make it fully specialized
    const systemInstruction = `
      Sen KingLoBayii E-pin Guard sisteminin uzman AI Asistanısın.
      Sadece Türkçe dilinde yanıt vermelisin.
      Kullanıcılara e-pin, stok kodlarını onaylama, ItemSatış ödemesi yapma, teslimat dosyalarını (APK, ZIP, anlatım videoları) indirme, Papara ve IBAN ile ödeme yöntemleri ve destek (Instagram, WhatsApp) kanalları hakkında yardımcı olursun.
      
      Sistem Çalışma Mantığı:
      1. Müşteri, sitemizde beğendiği bir ürünün detay sayfasındaki "ItemSatış Satın Al" linkine tıklar.
      2. ItemSatış üzerinden ödemesini tamamlar ve oradan kendisine verilen "Stok Kodu"nu (E-pin kodu) kopyalar.
      3. Sitemizdeki ürünün detay sayfasında bulunan "Stok Kodu Doğrulama" (Onay kutusu) alanına bu kodu yapıştırır.
      4. Kod geçerliyse sistem anında ürünü (APK linki, öğretici video, premium dosya veya talimat metni) kullanıcıya açar ve teslim eder.
      
      Yardımcı kanallar:
      - WhatsApp ve Instagram bağlantıları her zaman alt kısımda mevcuttur.
      
      Kullanıcı ile konuşurken son derece kibar, modern, profesyonel ve çözüm odaklı ol.
    `;

    // Format chat history for @google/genai SDK
    // The SDK expects contents to have role and parts
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH
        }
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "AI Asistanı şu anda yanıt veremiyor. Lütfen daha sonra tekrar deneyin." });
  }
});

// 2. API: Admin Description & Auto Product Enhancer (Gemini 3.5 Flash with Emojis)
app.post("/api/gemini/generate-description", async (req, res) => {
  try {
    const { productName, category, price } = req.body;
    if (!productName) {
      return res.status(400).json({ error: "Ürün adı boş olamaz" });
    }

    const ai = getGeminiClient();

    const prompt = `
      Ürün Adı: ${productName}
      Kategori: ${category || "Belirtilmemiş"}
      Fiyat: ${price || "Belirtilmemiş"} TL
      
      Bu KingLoBayii ürünü için etkileyici, son derece modern, profesyonel, zengin içerikli ve bol emojili bir Türkçe ürün açıklaması oluştur. 
      Açıklama her bölüme ve önemli kelimeye uygun emojilerle süslenmiş olmalıdır.
      Açıklamada şunlar bulunsun:
      - 🌟 Ürünün genel bir öne çıkan tanıtımı
      - 🛠️ Teknik özellikleri ve kullanıcıya sağlayacağı harika avantajlar
      - 🔒 E-pin (Stok Kodu) korumasıyla anında ve güvenli otomatik teslimat süreci
      - 🛒 ItemSatış veya Papara/IBAN üzerinden güvenli satın alım vurgusu
      
      Yanıtı sadece temiz, doğrudan, emojili ve paragraflara/maddelere ayrılmış bir açıklama metni olarak döndür. Başka hiçbir ekstra giriş veya çıkış cümlesi ekleme.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });

    res.json({ description: response.text });
  } catch (error: any) {
    console.error("Gemini API Description Error:", error);
    res.status(500).json({ error: error.message || "Açıklama üretilemedi." });
  }
});

// 3. API: Nano Banana 2 Listing Image Generator (gemini-3.1-flash-image)
app.post("/api/gemini/generate-image", async (req, res) => {
  try {
    const { productName, category, template } = req.body;
    if (!productName) {
      return res.status(400).json({ error: "Ürün adı boş olamaz" });
    }

    const ai = getGeminiClient();
    
    // Choose detailed prompt based on the template selection (3 templates)
    let promptText = "";
    if (template === "cyberpunk") {
      promptText = `A professional cyberpunk, neon-infused e-sports styled gaming listing banner or listing card for a digital asset/mod titled '${productName}' inside category '${category || "Gaming"}'. It features a futuristic dark sci-fi background, glowing cyan and magenta laser accents, high-tech interface lines, 3D render style, highly detailed, eye-catching gaming icon graphics, centered design, no text except potentially the abstract emblem.`;
    } else if (template === "minimalist") {
      promptText = `A premium, elegant, and clean studio catalog product photo for '${productName}' within the category '${category || "Digital Product"}'. Soft ambient studio lighting, beautiful light grey and charcoal clean gradient background, minimal geometric podium, elegant subtle shadow, professional product showcase shot, high-end commercial style, photorealistic 3D render.`;
    } else {
      // Default to "promo" (Vibrant Promotion)
      promptText = `A high-energy, vibrant promotional listing card layout for '${productName}' in the category '${category || "Premium Service"}'. Intricate dark glassmorphism card design, surrounding dust particles, golden glowing fire/spark or electric energy elements, dramatic epic lighting, extremely premium cinematic feel, bold contrasts, professional digital product presentation banner.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [
          {
            text: promptText,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      },
    });

    let base64Image = "";
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Image) {
      return res.status(500).json({ error: "Görsel oluşturulamadı veya görsel verisi alınamadı." });
    }

    res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
  } catch (error: any) {
    console.error("Gemini Image Generation Error:", error);
    res.status(500).json({ error: error.message || "Görsel üretilemedi." });
  }
});

// 3.5 API: İtemSatış User Profile exists checker proxy
app.get("/api/itemsatis/verify/:username", async (req, res) => {
  try {
    const { username } = req.params;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Kullanıcı adı gereklidir." });
    }

    const cleanUsername = username.trim().replace(/[^a-zA-Z0-9\-_]/g, "");
    if (!cleanUsername) {
      return res.json({ exists: false, reason: "Geçersiz kullanıcı adı formatı." });
    }

    const url = `https://www.itemsatis.com/profil/${cleanUsername}.html`;
    console.log("Checking İtemSatış profile:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    console.log(`İtemSatış response status for ${cleanUsername}: ${response.status}`);

    if (response.status === 404) {
      return res.json({ exists: false, reason: "İtemSatış profili bulunamadı." });
    }

    const html = await response.text();
    
    if (
      html.includes("Böyle Bir Kullanıcı Bulunamadı") || 
      html.includes("Hata") || 
      html.includes("Sayfa Bulunamadı") ||
      html.includes("404 - Sayfa Bulunamadı") ||
      html.includes("böyle bir profil") ||
      response.url.includes("404") ||
      response.url.includes("hata") ||
      html.length < 500
    ) {
      return res.json({ exists: false, reason: "Böyle bir İtemSatış profili mevcut değil." });
    }

    return res.json({ exists: true, profileUrl: url });
  } catch (err: any) {
    console.error("İtemSatış verify error:", err);
    // Return exists: true with warning so network/CORS/CF blocking doesn't completely block legitimate clients
    return res.json({ 
      exists: true, 
      warning: "İtemSatış sunucusuna bağlanılamadı. Doğrulama başarılı sayıldı." 
    });
  }
});

// 4. API: AI Deposit Receipt (Dekont) Verifier (gemini-3.5-flash with Multimodal Vision)
app.post("/api/gemini/verify-dekont", async (req, res) => {
  try {
    const { image, mimeType, expectedPrice, customerName } = req.body;
    if (!image || !mimeType) {
      return res.status(400).json({ error: "Görsel verisi ve dosya türü gereklidir." });
    }

    const ai = getGeminiClient();

    const prompt = `
      Sen KingLoBayii E-pin Guard sisteminin ödeme doğrulama yapay zekasısın.
      Sana bir banka/Papara ödeme dekontu/ekran görüntüsü gönderildi.
      Görevin, bu dekontun geçerli olduğunu ve belirtilen bilgilere uyduğunu kontrol etmektir.
      
      Kontrol edilecek kriterler:
      1. Alıcı (Receiver) ismi "Canet Karabacak" olmalıdır (küçük/büyük harf veya kısmi eşleşme: örn. "Canet", "Karabacak" içermelidir).
      2. Gönderen (Sender) ismi, müşterinin girdiği "${customerName}" ismi ile uyumlu olmalıdır (kısmi eşleşme, ilk isim/soyisim eşleşmesi yeterlidir. Bankalarda bazen soyadın bir kısmı yıldızlı olabilir, örn. "Canet K*", bunu esnek bir şekilde kabul et).
      3. Gönderilen Tutar (Amount), en az "${expectedPrice} TL" olmalıdır. Ondalık kısımları esnek kontrol et.
      4. Dekont başarılı, tamamlanmış, gönderildi veya onaylandı durumunda olmalıdır. Başarısız veya iptal edilmiş işlemler geçersizdir.
      
      Yalnızca aşağıdaki JSON şemasında yanıt ver. Başka hiçbir açıklama metni, markdown bloğu veya süslü parantez dışı yazı ekleme:
      {
        "success": boolean (tüm kontroller başarıyla geçildiyse true, aksi halde false),
        "reason": "Türkçe olarak kontrol sonucunun detaylı açıklaması (örneğin: 'Tutar eşleşmiyor', 'Alıcı ismi yanlış', 'Gönderen ismi ${customerName} ile uyuşmuyor' veya 'Ödeme başarıyla doğrulandı')",
        "extractedReceiver": "dekonttan okunan alıcı adı",
        "extractedSender": "dekonttan okunan gönderen adı",
        "extractedAmount": dekonttan okunan sayısal tutar değeri (sayısal formatta, örn: 150 veya 0 eğer okunamadıysa)
      }
    `;

    let contentsPayload: any[] = [];
    if (mimeType === "text/plain" || mimeType.startsWith("text/")) {
      const decodedText = Buffer.from(image, "base64").toString("utf-8");
      contentsPayload = [
        {
          text: `Aşağıda müşterinin yüklediği banka transfer/ödeme dekont belgesinin METİN içeriği yer almaktadır:\n\n---\n${decodedText}\n---\n\nBu metin belgesini inceleyerek doğrulamayı gerçekleştir.`
        },
        {
          text: prompt
        }
      ];
    } else {
      contentsPayload = [
        {
          inlineData: {
            data: image,
            mimeType: mimeType
          }
        },
        {
          text: prompt
        }
      ];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentsPayload,
      config: {
        responseMimeType: "application/json"
      }
    });

    let jsonStr = response.text || "";
    // Clean up potential markdown formatting block if returned by any chance
    jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(jsonStr);
      res.json(parsed);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", jsonStr);
      res.json({
        success: false,
        reason: "Yapay zeka yanıtı çözümlenemedi. Lütfen net bir dekont görseli yükleyin.",
        extractedReceiver: "",
        extractedSender: "",
        extractedAmount: 0
      });
    }
  } catch (error: any) {
    console.error("Gemini Dekont Verify Error:", error);
    res.status(500).json({ error: error.message || "Dekont doğrulanamadı." });
  }
});

// Vite server integrations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
