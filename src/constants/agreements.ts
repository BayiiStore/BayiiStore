export const REGISTRATION_AGREEMENT = {
  title: "BayiiStore GUARD – Kayıt ve Gizlilik Sözleşmesi",
  content: `### 1. Taraflar ve Amaç
Bu sözleşme, https://bayii-store.vercel.app/ (BayiiStore GUARD) sistemine kayıt olan kullanıcı ile sistem yönetimi arasında, platformun güvenliğini sağlamak, asılsız şikayetleri/dolandırıcılık girişimlerini önlemek ve teslimat kanıtı oluşturmak amacıyla akdedilmiştir.

### 2. Toplanan Veriler ve Kullanım Amacı
Sisteme kayıt olurken ve kodu aktifleştirirken kullanıcılardan; Ad-Soyad, İtemSatış Kullanıcı Adı ve İtemSatış Profilindeki İsim bilgileri talep edilmektedir. Bu bilgiler;
* Satın alınan tek kullanımlık kodun, İtemSatış üzerinden ürünü satın alan asıl kişiye teslim edildiğini doğrulamak,
* "Kod çalışmıyor", "Eksik ürün geldi" veya "Hatalı teslimat" gibi asılsız/sahte şikayetlere karşı adli ve teknik kanıt (log) oluşturmak amacıyla toplanır.

### 3. Veri Güvenliği ve Üçüncü Şahıslarla Paylaşım
Toplanan kimlik ve profil bilgileri kesinlikle ticari amaçla kullanılmaz, satılmaz ve hiçbir üçüncü şahıs veya kurumla paylaşılmaz. Bu veriler yalnızca ve sadece:
* İtemSatış platformu üzerinde doğabilecek olası ihtilaflarda ve haksız iade taleplerinde İtemSatış Yetkililerine teslimat kanıtı sunmak amacıyla,
* Resmi makamlarca (Savcılık, Emniyet vb.) yasal bir soruşturma kapsamında talep edilmesi durumunda hukuki kanıt olarak paylaşılabilir.

### 4. Ürün Teslimatı ve Otomatik Onay Mekanizması
* İtemSatış üzerinden alınan kodlar tek kullanımlıktır (unique) ve guard sistemine girildiği an ürün içeriğine uygun kurulum/eğitim videosu kullanıcıya sunulur.
* Sistemimizdeki ürünler ile İtemSatış'taki ilanlar %100 eşzamanlı ve aynıdır, değiştirilemez.
* Sisteme girilen ve teslimatı yapılan ürünler, kullanıcı tarafından manuel olarak onaylanmazsa 24 saat içerisinde sistem tarafından otomatik olarak onaylanır ve işlem tamamlanmış sayılır.
* Kullanıcı, sistem üzerinde yer alan Canlı Destek, iletişim numarası ve Destek Talebi Formu üzerinden 7/24 yardım alma hakkına sahiptir. Bir sorun yaşanması durumunda öncelikle bu kanallardan iletişime geçilmesi zorunludur.

### 5. Onay ve Yürürlük
Bu sisteme kayıt olan ve kodu aktifleştiren her kullanıcı, kendi rızasıyla bu sözleşme maddelerini, verilerinin güvenlik amacıyla loglanmasını ve İtemSatış yetkililerine kanıt olarak sunulabileceğini kabul, beyan ve taahhüt eder.`
};

export const DIGITAL_CONTENT_AGREEMENT = {
  title: "BayiiStore GUARD – Dijital İçerik ve Kullanım Sözleşmesi",
  content: `### 1. Hizmetin Niteliği ve Teslimat
* İşbu sözleşme, alıcının İtemSatış üzerinden satın aldığı ve https://bayii-store.vercel.app/ (BayiiStore GUARD) sistemine tanımlanan tek kullanımlık dijital lisans/stok kodunun kullanım şartlarını belirler.
* Sistemde yer alan tüm dijital içerikler, rehberler, yapay zeka araçları ve promtlar İtemSatış üzerindeki ilanlarla %100 aynı olup, üzerinde geriye dönük herhangi bir değişiklik yapılması teknik olarak mümkün değildir.

### 2. Cayma Hakkı ve İade Koşulları (6502 Sayılı Kanun Uyarınca)
* Satışı yapılan ürünler "Elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallar" kapsamındadır.
* Tüketici Kanunu ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, tek kullanımlık dijital kodlar guard sistemine girip aktifleştirildiği andan itibaren cayma hakkı ve iade seçeneği tamamen ortadan kalkar.
* Müşteri, guard sistemine kodu girip onay butonuna bastığı an ürünün içini boşaltmış, kurulum videolarına/içeriğe erişmiş sayılır. Bu aşamadan sonra "kod çalışmıyor" veya "iade etmek istiyorum" şeklinde yapılacak talepler asılsız kabul edilecektir.

### 3. Kötüye Kullanım ve Hesap Engelleme (Blacklist)
* Sistemimizdeki tüm stok kodları tek kullanımlıktır (unique). Müşteri tarafından bir kez aktif edilen kod anında geçersiz kılınır.
* Ürünü sorunsuz teslim alıp kurulum videolarını izlemesine rağmen, İtemSatış yetkililerine asılsız şikayette bulunarak haksız kazanç/iade elde etmeye çalışan kullanıcıların guard sistemindeki üyelikleri, IP adresleri ve erişim hakları kalıcı olarak engellenir (Blacklist).
* Sistem üzerinden alınan IP logları, işlem saatleri ve kullanıcı beyanları, bu tarz kötüye kullanım durumlarında İtemSatış destek ekibine ve gerekli yasal mercilere resmi birer kanıt olarak sunulacaktır.

### 4. Teknik Destek ve Mücbir Sebepler
* Müşterinin yaşadığı her türlü teknik aksaklıkta, sistem üzerinde yer alan 7/24 aktif Canlı Destek hattı, doğrudan iletişim numarası veya Destek Talebi Formu üzerinden mağazamızla iletişime geçmesi zorunludur.
* Sistemde olası bir güncelleme veya sunucu kaynaklı kesinti olması durumunda mağazamız siteyi "Bakım Modu"na alma ve tüm kullanıcılara bildirim gönderme hakkını saklı tutar. Bu süreçte yaşanan gecikmeler mağazanın ürünü teslim etmediği anlamına gelemez.

### 5. Beyan ve Kabul
Müşteri, bu sözleşmeyi onaylayarak tek kullanımlık kodu sisteme girdiğinde, ürünün tüm çalışma şartlarını okuduğunu, kurulum rehberine ulaştığını ve dijital ürünlerde aktivasyon sonrası iade hakkının bulunmadığını peşinen kabul ve taahhüt eder.`
};
