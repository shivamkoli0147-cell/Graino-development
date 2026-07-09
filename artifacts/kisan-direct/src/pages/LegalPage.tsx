import { useRef } from "react";

interface LegalPageProps {
  type: "privacy" | "terms";
  onClose: () => void;
}

// ── Simple full-screen legal document viewer ────────────────────────────────
// Shared by Privacy Policy + Terms of Service so both stay in one place and
// look identical. Content is plain-language Hindi/English mix matching the
// rest of the app's tone.
export function LegalPage({ type, onClose }: LegalPageProps) {
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientY - touchStartY.current > 80) onClose();
  };

  const title = type === "privacy" ? "🔒 Privacy Policy" : "📜 Terms & Conditions";

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", inset: 0, zIndex: 1200,
        background: "#F7F4EF", display: "flex", flexDirection: "column",
        maxWidth: 390, margin: "0 auto",
        paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg,#1a3d1a,#2D6A2D)",
        padding: "16px 16px 14px", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <button onClick={onClose} className="btn-press" style={{
          background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
          padding: "6px 12px", color: "white", fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0,
        }}>← Back</button>
        <div style={{ color: "white", fontWeight: 800, fontSize: 17, fontFamily: "'Baloo 2', sans-serif" }}>
          {title}
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "18px 20px 32px",
        fontFamily: "'Baloo 2', sans-serif", color: "#333", fontSize: 13.5, lineHeight: 1.7,
      }}>
        {type === "privacy" ? <PrivacyContent /> : <TermsContent />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: "#1a3d1a", marginBottom: 6 }}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

function PrivacyContent() {
  return (
    <>
      <div style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>अंतिम अपडेट: जुलाई 2026</div>

      <Section title="1. हम क्या जानकारी लेते हैं">
        Graino ऐप इस्तेमाल करते समय हम आपका नाम, फोन नंबर, गांव, डिलीवरी पता और लोकेशन (जब आप शेयर करते हैं)
        लेते हैं। यह जानकारी सिर्फ आपके ऑर्डर को सही जगह पहुंचाने के लिए इस्तेमाल होती है।
      </Section>

      <Section title="2. जानकारी का इस्तेमाल कैसे होता है">
        आपकी जानकारी का इस्तेमाल — ऑर्डर प्रोसेस करने, डिलीवरी करने, आपसे संपर्क करने और ऑर्डर स्टेटस
        अपडेट भेजने के लिए किया जाता है। हम आपकी जानकारी किसी तीसरे पक्ष को बेचते नहीं हैं।
      </Section>

      <Section title="3. जानकारी कहां स्टोर होती है">
        आपका डेटा सुरक्षित cloud database (Supabase) में स्टोर होता है। हम इसे सुरक्षित रखने की पूरी
        कोशिश करते हैं, लेकिन इंटरनेट पर 100% सुरक्षा की गारंटी कोई नहीं दे सकता।
      </Section>

      <Section title="4. Location Access">
        डिलीवरी एड्रेस सही पिन करने के लिए हम आपकी लोकेशन मांग सकते हैं। यह पूरी तरह वैकल्पिक है — आप बिना
        लोकेशन शेयर किए भी पता खुद लिख सकते हैं।
      </Section>

      <Section title="5. आपके अधिकार">
        आप कभी भी अपनी प्रोफाइल से अपनी जानकारी बदल सकते हैं या हमसे संपर्क करके अपना अकाउंट/डेटा हटाने
        की request कर सकते हैं।
      </Section>

      <Section title="6. संपर्क करें">
        Privacy से जुड़े किसी भी सवाल के लिए Seller (Rohit Mukati) से ऐप के जरिए संपर्क करें।
      </Section>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <div style={{ color: "#888", fontSize: 12, marginBottom: 16 }}>अंतिम अपडेट: जुलाई 2026</div>

      <Section title="1. सेवा के बारे में">
        Graino, Rohit Mukati द्वारा चलाई जाने वाली एक लोकल एग्रीकल्चर डिलीवरी सेवा है, जो चुनिंदा गांवों
        में अनाज/उत्पाद सीधे किसान से ग्राहक तक पहुंचाती है।
      </Section>

      <Section title="2. ऑर्डर व भुगतान">
        सभी ऑर्डर वर्तमान में Cash on Delivery (COD) पर आधारित हैं। ऑर्डर देने के बाद Seller उसे accept,
        dispatch या cancel कर सकता है। कीमतें बिना पूर्व सूचना के बदल सकती हैं।
      </Section>

      <Section title="3. डिलीवरी">
        डिलीवरी सिर्फ चुनी गई गांवों में उपलब्ध है। मौसम, उपलब्धता या अन्य कारणों से डिलीवरी में देरी हो
        सकती है — इसकी कोई निश्चित समय-सीमा गारंटी नहीं है।
      </Section>

      <Section title="4. रद्द करना व रिटर्न">
        ऑर्डर placed/accepted स्टेटस में होने तक ग्राहक उसे cancel कर सकता है। डिलीवरी के बाद किसी समस्या
        के लिए ऐप के अंदर "Return Request" भेजा जा सकता है, जिसे Seller रिव्यू करेगा।
      </Section>

      <Section title="5. जिम्मेदारी की सीमा">
        Graino उत्पाद की गुणवत्ता को बेहतर बनाए रखने की पूरी कोशिश करता है, लेकिन प्राकृतिक उत्पादों में
        मामूली अंतर हो सकता है। किसी भी विवाद की स्थिति में Seller से सीधे संपर्क करें।
      </Section>

      <Section title="6. शर्तों में बदलाव">
        समय-समय पर इन शर्तों को अपडेट किया जा सकता है। ऐप इस्तेमाल जारी रखने का मतलब है कि आप अपडेटेड
        शर्तों से सहमत हैं।
      </Section>
    </>
  );
}
