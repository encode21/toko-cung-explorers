# Konsep Lokasi Pegunungan — Toko Cung Explorer

**Status:** rancangan untuk dibaca dan ditinjau; belum diimplementasikan.  
**Arah visual:** dunia 3D bergaya kotak-kotak ala Roblox, dengan suasana petualangan gunung Indonesia.

## 1. Gambaran utama

Pemain bisa menjelajahi dua lokasi: **Pusat Kota** dan **Pegunungan**. Perjalanan antar lokasi menggunakan helikopter yang tersedia di helipad. Setelah tiba di basecamp pegunungan, pemain melanjutkan pendakian dengan berjalan kaki hingga mencapai puncak.

Pegunungan dibuat rimbun dengan banyak pepohonan, rumput, dan bebatuan. Sepanjang jalur terdapat checkpoint (CP) yang menarik secara visual dan mengeluarkan bunyi saat diaktifkan. Pemain juga memiliki item senter yang bisa dinyalakan untuk membantu melihat area gelap.

## 2. Map dan perpindahan lokasi

Saat map dunia dibuka, tampil **tepat dua tujuan utama**:

1. **Pusat Kota:** area pertama, dengan helipad keberangkatan.
2. **Pegunungan:** area kedua, dengan helipad kedatangan di basecamp.

Kedua lokasi dihubungkan garis rute penerbangan. Lokasi pemain saat ini diberi penanda yang jelas. Basecamp, checkpoint, dan puncak merupakan bagian dari Pegunungan, bukan lokasi utama tambahan.

Alur perjalanan:

1. Pemain mendekati helikopter di helipad kota.
2. Muncul interaksi **“Naik Helikopter”**.
3. Pemain memilih berangkat menuju Pegunungan.
4. Transisi penerbangan singkat mengantar pemain ke helipad basecamp.
5. Pemain turun dan mulai mendaki melalui gerbang jalur pendakian.

Helikopter di basecamp menyediakan perjalanan kembali ke Pusat Kota. Helikopter hanya mengantar sampai basecamp; perjalanan ke puncak tetap dilakukan dengan mendaki.

## 3. Lingkungan pegunungan

Gunung memiliki jalur pendakian yang berkelok dan naik secara bertahap. Jalur utama tetap mudah dikenali meskipun lingkungan dibuat rimbun.

### Pepohonan

- Banyak pohon dengan variasi tinggi, ukuran, dan jarak tanam agar hutan terasa alami.
- Bagian bawah gunung lebih lebat; mendekati puncak pepohonan semakin jarang dan pemandangan semakin terbuka.
- Pohon besar menjadi penanda beberapa tikungan dan area istirahat.
- Batang atau daun tidak menutupi checkpoint, papan petunjuk, maupun pandangan pemain secara berlebihan.

### Rumput dan tanaman

- Rumpun rumput, semak, dan tanaman kecil menghiasi sisi jalur serta sekitar bebatuan.
- Permukaan jalur berupa tanah atau pijakan batu yang terlihat berbeda dari area berumput.
- Rumput lebih pendek di basecamp dan checkpoint agar tempat berdiri serta interaksi mudah terlihat.

### Bebatuan dan medan

- Batu kecil di tepi jalan, bongkahan besar sebagai dekorasi, serta tebing batu untuk memperkuat bentuk gunung.
- Beberapa bagian menggunakan pijakan batu dan jembatan kayu sebagai variasi tantangan.
- Batu yang menjadi pijakan dibuat mudah dibedakan dari dekorasi di luar jalur.
- Kabut tipis, suara angin, burung, dan gemerisik daun memperkuat suasana tanpa menghalangi arah perjalanan.

## 4. Checkpoint yang menarik dan memiliki bunyi

Checkpoint dibuat seperti **pos pendakian kecil**, bukan sekadar kotak atau lingkaran di tanah. Setiap pos memiliki papan nama, area pijakan yang jelas, lampu, dan dekorasi yang menyatu dengan lingkungan.

### Usulan tema checkpoint

- **CP 1 — Pos Rimba:** di bawah pohon besar, dengan papan kayu, bangku, dan lentera.
- **CP 2 — Pos Jembatan:** setelah jembatan kayu, dengan pagar pembatas dan pemandangan lembah.
- **CP 3 — Pos Batu:** di antara tebing dan bongkahan batu, dengan lampu jalur serta tempat istirahat kecil.
- **CP 4 — Pos Awan:** dekat puncak, dengan gardu pandang, rumput pendek, dan kabut tipis.
- **Puncak:** area finis dengan bendera dan tempat berfoto.

Empat CP tersebut adalah usulan awal; jumlah akhirnya dapat disesuaikan dengan panjang jalur.

### Respons saat checkpoint disentuh

1. Pemain masuk ke area pijakan checkpoint sesuai urutan pendakian.
2. Lampu penanda berubah dari warna netral menjadi hijau.
3. Efek cahaya singkat muncul di sekitar pijakan.
4. Terdengar bunyi keberhasilan pendek, misalnya **“ting–ding!”**.
5. Muncul pesan **“CP 2 aktif — Pos Jembatan”**, sesuai pos yang dicapai.
6. Pos tersebut menjadi titik kembali jika pemain jatuh atau memilih mengulang dari checkpoint.

**Usulan perilaku:** bunyi keberhasilan dan efek muncul sekali saat CP baru diaktifkan oleh pemain. Berdiam atau keluar-masuk CP yang sama tidak mengulang bunyi terus-menerus. Aktivasi berlaku per pemain, sehingga progres pemain lain tidak ikut berubah.

Lampu, simbol centang, dan pesan tetap menunjukkan keberhasilan ketika suara dimatikan. Volume bunyi CP mengikuti pengaturan efek suara. Saat mencapai puncak, terdengar bunyi kemenangan yang berbeda dan muncul pesan **“Selamat, kamu sampai di puncak!”**.

Untuk versi awal, progres CP berlaku selama sesi bermain dan direset ketika memulai pendakian baru. Penyimpanan progres setelah keluar dari game menjadi pengembangan terpisah.

## 5. Item senter yang bisa digunakan

Senter menjadi perlengkapan pemain untuk menerangi jalur yang teduh, celah bebatuan, atau area berkabut saat pencahayaan redup. Jalur utama tetap cukup terlihat ketika senter mati.

### Cara menggunakan

- Senter tersedia sejak pemain tiba di basecamp.
- Pemain memilih ikon **Senter** pada daftar perlengkapan untuk memegangnya.
- Saat dipegang, tersedia tombol **“Nyalakan”** atau **“Matikan”** sesuai kondisi senter.
- Cahaya berbentuk kerucut mengarah mengikuti arah pandang pemain dan membantu memperjelas jalan, batu, serta papan petunjuk di depan.
- Model senter terlihat di tangan karakter, dengan bunyi klik pendek saat dinyalakan atau dimatikan.
- Menyimpan senter mematikan cahayanya. Setelah kembali ke checkpoint, senter tetap tersedia dan bisa digunakan lagi.

Kontrol disesuaikan dengan perangkat: tombol layar untuk sentuh dan tombol interaksi untuk keyboard. Petunjuk tombol ditampilkan di dekat ikon senter.

**Usulan versi awal:** senter tidak menggunakan baterai agar mudah digunakan. Jangkauan cahaya dibatasi, cukup untuk membaca jalur di depan tanpa menerangi seluruh gunung atau menyilaukan pemain.

## 6. Contoh pengalaman pemain

Pemain membuka map dan melihat Pusat Kota serta Pegunungan. Dari helipad kota, pemain naik helikopter menuju basecamp. Sesampainya di sana, pemain menyiapkan senter dan berjalan melalui jalur tanah yang dikelilingi pepohonan, rumput, serta bebatuan.

Di Pos Rimba, lampu checkpoint menyala hijau, terdengar “ting–ding!”, dan muncul pesan bahwa CP sudah aktif. Pemain melanjutkan perjalanan melewati jembatan dan jalur berbatu. Saat memasuki bagian yang lebih gelap, pemain menyalakan senter. Jika jatuh, pemain kembali ke CP terakhir yang sudah aktif.

Setelah mencapai puncak, pemain mendapat penanda keberhasilan dan dapat menikmati pemandangan. Untuk kembali ke kota, pemain turun menuju helipad basecamp dan naik helikopter.

## 7. Lingkup versi awal

- Map dunia dengan dua lokasi utama.
- Helipad dan perjalanan helikopter dua arah antara kota dan basecamp.
- Satu jalur pendakian lengkap dari basecamp ke puncak.
- Pepohonan, rumput, bebatuan, dan papan petunjuk sepanjang jalur.
- Checkpoint bertema dengan perubahan visual, bunyi, dan titik kembali.
- Item senter yang dapat dipegang, dinyalakan, dimatikan, dan disimpan.
- Penanda keberhasilan ketika mencapai puncak.

Siklus siang–malam, baterai senter, banyak jalur alternatif, serta penyimpanan progres lintas sesi belum termasuk versi awal.

## 8. Hal yang perlu dipastikan saat implementasi

- Map hanya memiliki dua tujuan utama dan menandai lokasi pemain dengan benar.
- Perjalanan helikopter bisa digunakan untuk berangkat dan pulang.
- Jalur, rintangan, dan checkpoint tetap terbaca di antara vegetasi yang rimbun.
- CP aktif sesuai urutan, tidak membunyikan efek berulang, dan mengembalikan pemain ke titik yang aman.
- Senter berfungsi pada perangkat yang didukung dan tetap tersedia setelah pemain jatuh.
- Suara dapat diatur; informasi penting tetap terlihat tanpa audio.
- Banyaknya pohon, rumput, serta efek cahaya disesuaikan agar permainan tetap lancar.
