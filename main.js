/* ==========================================================================
   main.js  -  Trang chúc mừng 20/10
   --------------------------------------------------------------------------
   FILE NÀY LÀM GÌ?
   HTML (index.html) chứa "hình dáng" của trang, CSS (style.css) lo "màu sắc
   và chuyển động đẹp mắt". Còn main.js lo phần "biết phản ứng":

     1. Cá nhân hóa  : đọc tên người nhận / lời nhắn từ đường link.
     2. Mức đồ họa   : tự đo máy chạy mượt hay giật, rồi tự giảm bớt hiệu ứng nếu cần.
     3. Đom đóm      : vẽ đàn đom đóm (canvas), bay theo chuột/ngón tay, tụ lại rồi
                       bung ra khi chạm, và ĐỔI MÀU theo 10 cặp màu đặt sẵn.
     4. Nhạc nền     : bật nhạc ở lần chạm đầu, nút biểu tượng sóng âm.
     5. Toàn màn hình: lần chạm đầu tự vào toàn màn hình (nếu thiết bị hỗ trợ).
     6. Khởi động    : lần chạm đầu cho hoa nở (đổi class của trang).
     7. Thiệp        : mở / đóng tấm thiệp lời chúc.

   MẸO ĐỌC CODE: mỗi PHẦN bên dưới có tiêu đề to. Muốn sửa gì, tìm đúng PHẦN.
   ========================================================================== */
(function () {

  /* ======================================================================
     PHẦN 0. CẤU HÌNH  (những thứ bạn có thể muốn chỉnh)
     ====================================================================== */
  var BGM = 'nhac.mp3';     // Tên file nhạc nền (cùng thư mục với index.html). Để '' nếu không muốn nhạc.
  var MUSIC_VOLUME = 0.5;   // Âm lượng nhạc, từ 0 (im) đến 1 (to nhất).
  var FADE_MS = 2500;       // Nhạc nhỏ dần lên trong bao nhiêu mili-giây khi mới bật.
  var GATHER_MS = 1000;     // Đom đóm tụ lại trong bao lâu (mili-giây) trước khi bung ra.
  var LATE_MS = 2200;       // Sau khi bó hoa chính nở bao lâu thì các hoa nhỏ phụ mới mọc.
  var COLOR_FADE_MS = 700;  // Đom đóm chuyển từ màu cũ sang màu mới trong bao lâu.


  /* ======================================================================
     PHẦN 1. CÁ NHÂN HÓA QUA ĐƯỜNG LINK
     Ví dụ link:  index.html?ten=Lan&loi=Chúc em vui&tu=Minh
       - ten : tên người nhận (hiện ở đầu thiệp: "Gửi Lan,")
       - loi : lời nhắn riêng (hiện thêm một đoạn trong thiệp)
       - tu  : tên người gửi (hiện ở cuối thiệp: "— Minh")
     Trang tao-thiep.html giúp tạo link này mà không cần tự gõ.
     ====================================================================== */
  (function () {
    var q = new URLSearchParams(location.search);   // đọc phần sau dấu "?" của link
    var ten = (q.get('ten') || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    var loi = (q.get('loi') || '').trim().slice(0, 300);
    var tu  = (q.get('tu')  || '').replace(/\s+/g, ' ').trim().slice(0, 30);

    // Dùng textContent (không dùng innerHTML) để người khác không thể chèn mã độc vào link
    if (ten) {
      document.getElementById('to').textContent = ten;
      document.title = 'Gửi ' + ten + ' - Chúc mừng 20/10';
    }
    if (loi) {
      var mine = document.getElementById('mine');
      mine.textContent = loi;
      mine.hidden = false;                           // đoạn lời nhắn riêng mặc định đang ẩn
    }
    if (tu) document.getElementById('from').textContent = '— ' + tu;
  })();


  /* ======================================================================
     PHẦN 2. LẤY CÁC PHẦN TỬ TRONG TRANG
     (getElementById = "tìm thẻ HTML có id này")
     ====================================================================== */
  var stage   = document.getElementById('stage');   // toàn bộ sân khấu
  var c       = document.getElementById('fx');      // tấm vải (canvas) để vẽ đom đóm
  var g       = c.getContext('2d');                 // "cây bút" để vẽ lên canvas
  var modal   = document.getElementById('modal');   // lớp phủ chứa tấm thiệp
  var audio   = document.getElementById('bgm');     // thẻ phát nhạc
  var snd     = document.getElementById('snd');     // nút nhạc (biểu tượng sóng âm)
  var fsBtn   = document.getElementById('fs');      // nút toàn màn hình
  var openBtn = document.getElementById('openBtn'); // nút "Mở lời chúc"
  var docEl   = document.documentElement;           // thẻ <html>
  var htmlCls = docEl.classList;                    // danh sách class của thẻ <html>

  var bloomed = false;   // hoa đã nở chưa? (false = chưa chạm lần đầu)


  /* ======================================================================
     PHẦN 3. MỨC ĐỒ HỌA TỰ ĐIỀU CHỈNH
     Ý tưởng: máy mạnh thì giữ mọi hiệu ứng đẹp nhất, máy yếu thì tự bớt dần
     cho khỏi giật. Có 4 mức:
        3 = đẹp nhất | 2 = vừa | 1 = thấp | 0 = tối thiểu
     Mỗi mức gắn class lên thẻ <html> (lv1, lv2, lv3). CSS (style.css, mục B12)
     nhìn các class đó để ẩn bớt hiệu ứng. Ở đây JS còn chỉnh thêm 2 thứ:
     số đom đóm và độ nét của canvas.
     ====================================================================== */
  var tier = 3;            // mức hiện tại
  var maxTier = 3;         // mức cao nhất được phép (giảm xuống nếu từng bị giật ở mức cao)
  var dprCap = 2;          // độ nét tối đa của canvas (1 = nhẹ nhất)
  var fireFactor = 1;      // tỉ lệ số đom đóm so với đầy đủ
  var quietUntil = 0;      // trước thời điểm này thì chưa đánh giá (để máy kịp khởi động)
  var badRun = 0;          // đã có bao nhiêu lần liên tiếp bị chậm
  var goodRun = 0;         // đã có bao nhiêu lần liên tiếp chạy tốt
  var upgradedTo = -1;     // mức vừa mới được nâng lên (để biết nếu nâng lên mà giật thì đừng thử lại)
  // Muốn tự thử một mức cố định? Thêm ?q=3 (đẹp nhất) ... ?q=0 (tối thiểu) vào cuối link; khi đó trang không tự đổi mức nữa.
  var forced = new URLSearchParams(location.search).get('q');
  forced = (forced !== null && /^[0-3]$/.test(forced)) ? +forced : null;

  // Đoán mức khởi điểm theo loại máy (điện thoại bắt đầu ở mức vừa cho chắc)
  function pickStartTier() {
    if (forced !== null) return forced;
    var coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;   // màn hình cảm ứng
    var small = Math.min(screen.width, screen.height) < 700;                    // màn hình nhỏ
    var cores = navigator.hardwareConcurrency || 4;                             // số nhân CPU
    var mem = navigator.deviceMemory || 4;                                      // RAM (GB), nếu trình duyệt cho biết
    var t = (coarse || small) ? 2 : 3;
    if (cores <= 4 || mem <= 3) t = Math.min(t, 2);
    if (cores <= 2 || mem <= 2) t = Math.min(t, 1);
    if (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) t = Math.min(t, 1);
    return t;
  }

  // Áp dụng một mức đồ họa
  function applyTier(t) {
    tier = t;
    htmlCls.toggle('lv1', t <= 2);    // toggle(tên, đúng/sai) = bật hoặc tắt class
    htmlCls.toggle('lv2', t <= 1);
    htmlCls.toggle('lv3', t <= 0);
    var isMobileDevice = window.matchMedia && matchMedia('(pointer:coarse)').matches;
    dprCap = [1, 1, isMobileDevice ? 1.25 : 1.5, 2][t];
    fireFactor = [0.3, 0.5, 0.75, 1][t];
    fit();                // đặt lại độ nét canvas
    matchFlyCount();      // thêm/bớt đom đóm cho đúng số lượng
  }

  // Được gọi sau mỗi ~45 khung hình với "avg" = thời gian trung bình của một khung hình (mili-giây).
  // 16,7ms = 60 khung/giây (mượt). Trên 26ms (dưới ~38 khung/giây) = giật.
  function judge(avg, now) {
    if (forced !== null || now < quietUntil || now - lastChange < 1500) return;   // đã chọn mức cố định thì không tự đổi
    if (avg > 26) {                                  // đang chậm
      badRun++; goodRun = 0;
      if (badRun >= 2 && tier > 0) {                 // chậm 2 lần liên tiếp -> giảm 1 mức
        if (upgradedTo === tier) maxTier = tier - 1; // vừa nâng lên đã giật -> không nâng lại mức này
        applyTier(tier - 1);
        badRun = 0;
      }
    } else if (avg < 19.5) {                         // chạy tốt
      goodRun++; badRun = 0;
      if (goodRun >= 8 && tier < maxTier) {          // tốt khoảng 6 giây liên tục -> thử nâng 1 mức
        upgradedTo = tier + 1;
        applyTier(tier + 1);
        goodRun = 0;
      }
    } else { badRun = 0; goodRun = 0; }
  }
  var lastChange = 0;     // lần đổi mức gần nhất


  /* ======================================================================
     PHẦN 4. ĐÀN ĐOM ĐÓM (vẽ bằng canvas)
     ====================================================================== */

  /* ---- 4.1 Kích thước canvas & tạo đàn đom đóm ---- */
  var W = 1, H = 1;       // chiều rộng, chiều cao của canvas (đơn vị: điểm ảnh CSS)
  var F = [];             // F = danh sách các con đom đóm
  var seeded = false;     // đã rải đom đóm ra màn hình chưa?
  var baseN = 40;         // số đom đóm ở mức đầy đủ
  var rect = { l: 0, t: 0, sx: 1, sy: 1 };   // vị trí canvas trên màn hình (lưu sẵn cho đỡ tính lại)

  // Tạo một con đom đóm mới ở vị trí ngẫu nhiên
  function makeFly() {
    return {
      x: Math.random() * W, y: Math.random() * H,   // vị trí
      vx: 0, vy: 0,                                  // vận tốc ngang, dọc
      p: Math.random() * 6.28,                       // "pha" để mỗi con nhấp nháy lệch nhau
      s: 0.8 + Math.random() * 1.8,                  // kích cỡ
      a: Math.random() * 6.28,                       // góc để quay quanh con trỏ
      r: 20 + Math.random() * 70,                    // bán kính quay quanh con trỏ
      k: Math.random() < 0.4                         // k = thuộc màu thứ 2 của cặp màu (40%) hay màu thứ 1 (60%)
    };
  }

  // Thêm hoặc bớt đom đóm cho đúng số lượng theo mức đồ họa
  function matchFlyCount() {
    if (!seeded) return;
    var n = Math.max(8, Math.round(baseN * fireFactor));
    while (F.length > n) F.pop();
    while (F.length < n) F.push(makeFly());
  }

  // Rải đom đóm lần đầu. Chỉ làm khi canvas đã có kích thước thật,
  // nếu không đom đóm sẽ bị dồn vào một góc.
  function seed() {
    if (seeded || W <= 2 || H <= 2) return;
    seeded = true;
    baseN = Math.round(Math.min(90, Math.max(40, W * H / 16000)));   // màn hình càng to càng nhiều
    F.length = 0;
    matchFlyCount();
  }

  // Đặt kích thước canvas bằng đúng kích thước đang hiển thị (và sắc nét theo mức đồ họa)
  function fit() {
    var d = Math.min(dprCap, window.devicePixelRatio || 1);
    W = c.clientWidth || 1;
    H = c.clientHeight || 1;
    c.width = Math.round(W * d);
    c.height = Math.round(H * d);
    g.setTransform(d, 0, 0, d, 0, 0);
    var r = c.getBoundingClientRect();              // lưu sẵn vị trí canvas để PHẦN 6 dùng
    rect.l = r.left; rect.t = r.top;
    rect.sx = r.width ? W / r.width : 1;
    rect.sy = r.height ? H / r.height : 1;
    seed();
    fitBouquet();
  }
  window.addEventListener('resize', fit);   // xoay màn hình / đổi cỡ cửa sổ / vào toàn màn hình -> tính lại
  // ResizeObserver: "người canh gác" báo ngay khi canvas đổi kích thước (kể cả khi layout trễ)
  try { if (window.ResizeObserver) new ResizeObserver(fit).observe(c); } catch (e) {}

  // Tính độ phóng to --bs của bó hoa để nó vừa khít phần màn hình bên dưới nút "Mở lời chúc".
  // 87 = chiều cao bó hoa tính theo đơn vị vmin (thân 70 + cánh hoa + chân); 82px = phần đệm đáy và khoảng hở.
  function fitBouquet() {
    var vmin = Math.min(window.innerWidth, window.innerHeight) / 100;
    var btn = openBtn.getBoundingClientRect();
    var avail = H - btn.bottom - 82;                       // chiều cao còn trống bên dưới nút
    var s = Math.max(0.45, Math.min(1.15, avail / (87 * vmin)));
    docEl.style.setProperty('--bs', s.toFixed(3));
  }

  /* ---- 4.2 Mười cặp màu đom đóm ----
     Mỗi cặp gồm 2 màu hợp với nhau và hợp với cảnh (nền đêm xanh đậm, hoa hồng,
     lá xanh ngọc, trăng vàng kem). Mỗi lần chạm, đàn đom đóm chuyển sang cặp kế tiếp,
     đi hết 10 cặp thì quay lại cặp đầu. Muốn thêm/sửa màu, chỉ cần sửa danh sách này.
     Mỗi màu viết dạng [đỏ, xanh lá, xanh dương], mỗi số từ 0 đến 255. */
  var PAIRS = [
    ['Vàng ấm + Hồng đào',        [255, 226, 130], [255, 170, 210]],   // màu mặc định lúc mới vào
    ['Xanh ngọc + Hồng phấn',     [125, 235, 240], [255, 170, 208]],
    ['Tím lavender + Vàng kem',   [200, 172, 255], [255, 236, 166]],
    ['Xanh bạc hà + Hồng sen',    [165, 245, 205], [255, 176, 205]],
    ['Cam đào + Tím nhạt',        [255, 188, 142], [208, 178, 255]],
    ['Xanh da trời + Vàng nắng',  [150, 214, 255], [255, 224, 140]],
    ['Hồng đậm + Xanh ngọc',      [255, 140, 190], [130, 236, 230]],
    ['Vàng chanh + Xanh lá non',  [236, 246, 150], [158, 240, 190]],
    ['Trắng ngọc trai + Hồng',    [246, 240, 255], [255, 176, 205]],
    ['Hổ phách + Hồng cánh sen',  [255, 200, 120], [255, 150, 175]]
  ];

  /* ---- 4.3 Ảnh "quầng sáng" cho mỗi con đom đóm ----
     Thay vì dùng hiệu ứng đổ bóng (rất nặng cho điện thoại), ta vẽ sẵn 1 hình
     tròn mờ dần ra rìa, rồi chỉ việc "dán" hình đó lên canvas. Nhẹ hơn nhiều. */
  function sprite(col) {
    var o = document.createElement('canvas');
    o.width = o.height = 64;
    var q = o.getContext('2d');
    var gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);   // chuyển màu từ tâm ra rìa
    var c0 = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',';
    gr.addColorStop(0, 'rgba(255,255,255,1)');   // tâm: trắng sáng
    gr.addColorStop(0.18, c0 + '.95)');          // gần tâm: màu đậm
    gr.addColorStop(0.5, c0 + '.28)');           // giữa: mờ
    gr.addColorStop(1, c0 + '0)');               // rìa: trong suốt
    q.fillStyle = gr;
    q.fillRect(0, 0, 64, 64);
    return o;
  }
  // SP[i] = hai hình quầng sáng của cặp màu thứ i
  var SP = PAIRS.map(function (p) { return [sprite(p[1]), sprite(p[2])]; });

  // Trộn một màu với màu trắng cho sáng dịu hơn (dùng cho vòng sáng và cánh hoa rơi)
  function pastel(col, t) {
    return [Math.round(col[0] + (255 - col[0]) * t), Math.round(col[1] + (255 - col[1]) * t), Math.round(col[2] + (255 - col[2]) * t)];
  }

  var palCur = 0;     // cặp màu hiện tại
  var palPrev = 0;    // cặp màu trước đó (để chuyển màu từ từ)
  var palMix = 1;     // 0 = vẫn màu cũ ... 1 = đã sang hẳn màu mới

  // Chuyển sang cặp màu kế tiếp
  function nextPalette() {
    palPrev = palCur;
    palCur = (palCur + 1) % PAIRS.length;
    palMix = 0;
  }

  /* ---- 4.4 Trạng thái chung của hiệu ứng ---- */
  var fx = {
    t: { x: 0, y: 0, on: false },  // t = vị trí con trỏ/ngón tay; on = đã có chuyển động chưa
    mode: 'free',                  // 'free' = bay tự do (hoặc đi theo con trỏ), 'gather' = đang tụ lại
    gp: null,                      // gp = điểm mà đom đóm đang tụ về
    rings: [],                     // các vòng sáng lan ra sau khi bung
    pet: [],                       // các cánh hoa rơi xuống khi chạm (sau lần đầu)
    n: 0, last: 0, wacc: 0         // dùng để đo độ mượt (PHẦN 3)
  };

  /* ---- 4.5 Vòng lặp vẽ: hàm step() chạy ~60 lần mỗi giây ---- */
  function step() {
    try {
      // (a) Đo thời gian giữa 2 khung hình. Cứ ~45 khung thì báo cho judge() ở PHẦN 3 đánh giá.
      var now = performance.now();
      var dt = fx.last ? now - fx.last : 16;
      fx.last = now;
      if (dt > 250) { fx.n = 0; fx.wacc = 0; }       // vừa rời tab hoặc treo máy: bỏ qua, đo lại
      else {
        fx.wacc += dt; fx.n++;
        if (fx.n >= 45) { judge(fx.wacc / fx.n, now); fx.n = 0; fx.wacc = 0; }
      }

      // (b) Đang đổi màu thì tăng dần palMix từ 0 lên 1
      if (palMix < 1) palMix = Math.min(1, palMix + Math.min(dt, 50) / COLOR_FADE_MS);

      // (c) Xóa hình cũ, chuẩn bị vẽ khung hình mới. 'lighter' = ánh sáng chồng lên nhau thì sáng hơn
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';

      // (d) Với từng con đom đóm: tính lực kéo -> cập nhật vị trí -> vẽ
      for (var j = 0; j < F.length; j++) {
        var f = F[j];
        f.p += 0.02;                                  // thời gian trôi để nhấp nháy
        f.a += 0.01 * (0.5 + f.s * 0.3);              // quay dần quanh con trỏ

        // Lực bay lơ lửng ngẫu nhiên (luôn có)
        var ax = Math.cos(f.p * 1.3 + f.s) * 0.03;
        var ay = Math.sin(f.p * 0.9 + f.s * 2) * 0.03;
        var k = 0, tx = 0, ty = 0;                    // k = độ mạnh của lực kéo, (tx,ty) = điểm bị kéo tới

        if (fx.mode === 'gather' && fx.gp) {
          // Đang tụ lại: kéo mạnh về điểm vừa chạm
          tx = fx.gp.x + Math.cos(f.a * 3) * 8;
          ty = fx.gp.y + Math.sin(f.a * 3) * 8;
          k = 0.012;
        } else if (fx.t.on) {
          // Bình thường: kéo nhẹ về quanh con trỏ -> trông như đom đóm "đi theo"
          tx = fx.t.x + Math.cos(f.a) * f.r;
          ty = fx.t.y + Math.sin(f.a) * f.r;
          k = 0.0016;
        }
        if (k) { ax += (tx - f.x) * k; ay += (ty - f.y) * k; }   // càng xa điểm đến, lực kéo càng mạnh

        f.vx = (f.vx + ax) * 0.96;                    // 0.96 = ma sát, giúp chuyển động mượt, không bị quá đà
        f.vy = (f.vy + ay) * 0.96;
        f.x += f.vx;
        f.y += f.vy;

        // Bay ra khỏi mép màn hình thì xuất hiện lại từ mép đối diện
        if (f.x < -20) f.x = W + 20;
        if (f.x > W + 20) f.x = -20;
        if (f.y < -20) f.y = H + 20;
        if (f.y > H + 20) f.y = -20;

        // Vẽ: độ sáng thay đổi theo thời gian (nhấp nháy)
        var alpha = 0.55 + 0.45 * Math.sin(f.p * 3);
        var d = f.s * 10;                             // kích cỡ hình quầng sáng
        var slot = f.k ? 1 : 0;                       // màu thứ 1 hay màu thứ 2 của cặp
        if (palMix < 1) {
          // Đang đổi màu: vẽ chồng màu cũ (mờ dần) và màu mới (rõ dần)
          g.globalAlpha = alpha * (1 - palMix);
          g.drawImage(SP[palPrev][slot], f.x - d / 2, f.y - d / 2, d, d);
          g.globalAlpha = alpha * palMix;
          g.drawImage(SP[palCur][slot], f.x - d / 2, f.y - d / 2, d, d);
        } else {
          g.globalAlpha = alpha;
          g.drawImage(SP[palCur][slot], f.x - d / 2, f.y - d / 2, d, d);
        }
      }
      g.globalAlpha = 1;

      // (e) Vẽ các vòng sáng lan ra (màu theo màu thứ 1 của cặp hiện tại, làm dịu bớt)
      var rc = pastel(PAIRS[palCur][1], 0.45);
      fx.rings = fx.rings.filter(function (q) { return q.a > 0.02; });   // bỏ vòng đã mờ hẳn
      fx.rings.forEach(function (q) {
        q.r += 5;          // vòng to dần
        q.a *= 0.95;       // và mờ dần
        g.strokeStyle = 'rgba(' + rc[0] + ',' + rc[1] + ',' + rc[2] + ',' + q.a + ')';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(q.x, q.y, q.r, 0, 6.283);
        g.stroke();
      });

      // (g) Vẽ cánh hoa rơi (chỉ xuất hiện khi chạm từ lần thứ hai trở đi), màu theo màu thứ 2 của cặp
      var pc = pastel(PAIRS[palCur][2], 0.2);
      fx.pet = fx.pet.filter(function (q) { return q.a > 0.03; });
      fx.pet.forEach(function (q) {
        q.vy += 0.09;      // trọng lực: rơi nhanh dần
        q.vx *= 0.992;
        q.x += q.vx;
        q.y += q.vy;
        q.rot += q.vr;     // xoay
        q.a -= 0.007;      // mờ dần
        g.save();
        g.translate(q.x, q.y);
        g.rotate(q.rot);
        g.fillStyle = 'rgba(' + pc[0] + ',' + pc[1] + ',' + pc[2] + ',' + q.a + ')';
        g.beginPath();
        g.ellipse(0, 0, q.s, q.s * 0.55, 0, 0, 6.283);
        g.fill();
        g.restore();
      });

      g.globalCompositeOperation = 'source-over';
    } catch (err) {
      // Nếu có lỗi nhỏ ở một khung hình, bỏ qua để hiệu ứng không bị dừng hẳn
    }
    requestAnimationFrame(step);   // hẹn trình duyệt gọi lại step() ở khung hình kế tiếp
  }

  /* ---- 4.6 Hiệu ứng khi chạm: TỤ LẠI -> ĐỔI MÀU -> BUNG RA ---- */

  // Bắn ra 16 cánh hoa từ điểm (x, y)
  fx.petalBurst = function (x, y) {
    for (var m = 0; m < 16; m++) {
      fx.pet.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 8, vy: -2 - Math.random() * 5,   // văng lên rồi rơi xuống
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2,
        s: 5 + Math.random() * 5, a: 1
      });
    }
  };

  // Cho đom đóm tụ về (x, y); sau GATHER_MS thì đổi cặp màu rồi bung ra tứ phía, sau đó gọi hàm done()
  fx.gather = function (x, y, done) {
    fx.mode = 'gather';
    fx.gp = { x: x, y: y };
    setTimeout(function () {
      nextPalette();                               // đổi sang cặp màu kế tiếp đúng lúc bung ra
      F.forEach(function (f) {
        // Mỗi con bị "bắn" ra xa điểm tụ với tốc độ ngẫu nhiên
        var d = Math.atan2(f.y - y, f.x - x) + (Math.random() - 0.5);
        var v = 5 + Math.random() * 9;
        f.vx = Math.cos(d) * v;
        f.vy = Math.sin(d) * v;
      });
      fx.mode = 'free';
      fx.gp = null;
      fx.rings.push({ x: x, y: y, r: 4, a: 1 });   // thêm một vòng sáng lan ra
      if (done) done();
    }, GATHER_MS);
  };


  /* ======================================================================
     PHẦN 5. TỌA ĐỘ CON TRỎ / NGÓN TAY
     Đổi vị trí trên màn hình thành vị trí trên canvas (kể cả khi trang bị phóng to/thu nhỏ).
     Dùng vị trí canvas đã lưu sẵn trong "rect" để không phải tính lại mỗi lần di chuột.
     ====================================================================== */
  function pos(e) {
    return { x: (e.clientX - rect.l) * rect.sx, y: (e.clientY - rect.t) * rect.sy };
  }


  /* ======================================================================
     PHẦN 6. NHẠC NỀN
     Khi nào nhạc phát?  -> Ở LẦN CHẠM ĐẦU TIÊN (cùng lúc đom đóm tụ lại).
     Vì sao không tự phát khi vừa vào trang?  -> Trình duyệt (Chrome, Safari...) cấm
     trang web tự phát tiếng khi người dùng chưa chạm vào. Nên phải đợi lần chạm đầu.
     Nút nhạc là biểu tượng sóng âm: nhảy khi đang phát, đứng im khi tắt.
     ====================================================================== */
  var nhacDaPhat = false;    // đã phát thành công lần đầu chưa
  var nhacDangBat = false;   // người nghe đang bật nhạc? (quyết định biểu tượng)
  var tamDungVi = false;     // nhạc bị tạm dừng vì người dùng rời tab/ứng dụng?
  var timerFade = null;      // bộ đếm cho hiệu ứng nhạc nhỏ dần lên

  // Có file nhạc thì gắn vào thẻ <audio> và cho hiện nút nhạc
  if (BGM) {
    audio.src = BGM;
    snd.hidden = false;
  }

  // Cập nhật biểu tượng: class "on" = sóng nhảy; aria-... để người dùng đọc màn hình (người khiếm thị) hiểu nút
  function capNhatNut() {
    snd.classList.toggle('on', nhacDangBat);
    snd.setAttribute('aria-pressed', nhacDangBat ? 'true' : 'false');
    snd.setAttribute('aria-label', nhacDangBat ? 'Tắt nhạc' : 'Bật nhạc');
  }

  // Tăng âm lượng từ 0 lên MUSIC_VOLUME trong khoảng FADE_MS (nghe êm tai hơn là bật to đột ngột)
  function fadeIn() {
    var v = 0, buoc = MUSIC_VOLUME / (FADE_MS / 100);
    clearInterval(timerFade);
    timerFade = setInterval(function () {
      v = Math.min(MUSIC_VOLUME, v + buoc);
      audio.volume = v;
      if (v >= MUSIC_VOLUME) clearInterval(timerFade);
    }, 100);
  }

  // Phát nhạc lần đầu (gọi khi người dùng chạm lần đầu)
  function startMusic() {
    if (!BGM || nhacDaPhat) return;
    audio.volume = 0;
    var thanhCong = function () { nhacDaPhat = true; nhacDangBat = true; capNhatNut(); fadeIn(); };
    var p = audio.play();
    if (p && p.then) p.then(thanhCong, function () { /* trình duyệt chặn: sẽ thử lại ở lần chạm sau */ });
    else thanhCong();
  }

  // Bấm nút nhạc: đang phát thì tắt, đang tắt thì bật
  snd.addEventListener('click', function () {
    if (nhacDangBat) {
      audio.pause();
      nhacDangBat = false;
    } else {
      clearInterval(timerFade);
      audio.volume = MUSIC_VOLUME;
      var p = audio.play();
      nhacDangBat = true;
      nhacDaPhat = true;
      if (p && p.catch) p.catch(function () { nhacDangBat = false; capNhatNut(); });
    }
    capNhatNut();
  });
  capNhatNut();

  // Người dùng chuyển sang ứng dụng/tab khác -> tạm dừng nhạc; quay lại -> phát tiếp
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (nhacDangBat && !audio.paused) { audio.pause(); tamDungVi = true; }
    } else if (tamDungVi) {
      tamDungVi = false;
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    }
  });


  /* ======================================================================
     PHẦN 7. TOÀN MÀN HÌNH
     Lần chạm đầu tiên sẽ xin vào toàn màn hình. Trình duyệt chỉ cho phép khi người
     dùng vừa chạm, nên phải gọi đúng trong lúc xử lý sự kiện chạm.
     iPhone không hỗ trợ toàn màn hình cho trang web, khi đó nút sẽ tự ẩn.
     ====================================================================== */
  // Mỗi trình duyệt gọi hàm này một tên khác nhau, ta thử lần lượt các tên
  var reqFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
  var exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  var fsDaThu = false;       // đã tự xin toàn màn hình ở lần chạm đầu chưa

  function dangToanManHinh() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function vaoToanManHinh() {
    if (!reqFS || dangToanManHinh()) return;
    try {
      var p = reqFS.call(docEl);
      if (p && p.catch) p.catch(function () {});   // bị từ chối thì thôi, không báo lỗi
    } catch (e) {}
  }
  function capNhatNutFS() {
    var on = dangToanManHinh();
    fsBtn.classList.toggle('on', on);
    fsBtn.setAttribute('aria-label', on ? 'Thoát toàn màn hình' : 'Toàn màn hình');
  }

  if (reqFS) fsBtn.hidden = false;                 // thiết bị hỗ trợ thì mới hiện nút
  fsBtn.addEventListener('click', function () {
    if (dangToanManHinh()) { try { exitFS.call(document); } catch (e) {} }
    else vaoToanManHinh();
  });
  document.addEventListener('fullscreenchange', capNhatNutFS);
  document.addEventListener('webkitfullscreenchange', capNhatNutFS);


  /* ======================================================================
     PHẦN 8. SỰ KIỆN CHẠM / DI CHUỘT TRÊN SÂN KHẤU
     "pointer" = cách gọi chung cho chuột, ngón tay và bút cảm ứng.
     ====================================================================== */

  // Chạm / nhấn chuột
  stage.addEventListener('pointerdown', function (e) {
    // Bỏ qua nếu chạm vào nút, thiệp (những thứ này có việc riêng) hoặc đang tụ dở
    if (e.target.closest('.openbtn, .modal, .snd, .fs') || fx.mode === 'gather') return;

    var p = pos(e);
    try { navigator.vibrate && navigator.vibrate(12); } catch (err) {}   // điện thoại rung nhẹ

    if (!bloomed) {                                // lần chạm đầu tiên: bật nhạc và vào toàn màn hình
      startMusic();
      fsDaThu = true;
      vaoToanManHinh();
    }

    fx.gather(p.x, p.y, function () {              // đom đóm tụ lại, đổi màu, bung ra, sau đó:
      if (!bloomed) {
        // Lần chạm ĐẦU TIÊN: cho hoa nở.
        // Chỉ cần đổi class của sân khấu, CSS sẽ tự chạy mọi animation (xem style.css).
        bloomed = true;
        quietUntil = performance.now() + 2500;     // lúc hoa bắt đầu nở máy hơi bận, chưa đánh giá độ mượt
        stage.classList.remove('not-loaded');      // thôi "đóng băng" animation
        stage.classList.add('is-bloomed');         // bó hoa chính nở, đèn trời & bướm xuất hiện...
        setTimeout(function () {
          stage.classList.add('is-late');          // ...rồi các hoa nhỏ phụ mới mọc
        }, LATE_MS);
      } else {
        fx.petalBurst(p.x, p.y);                   // Các lần sau: bắn thêm cánh hoa
      }
    });
  });

  // Mẹo cho iPad/iPhone: Safari chỉ cho phát nhạc / toàn màn hình ở sự kiện "click",
  // nên nếu lần trước chưa được thì thử lại ở đây (chỉ ở lần chạm đầu)
  stage.addEventListener('click', function (e) {
    if (e.target.closest('.openbtn, .modal, .snd, .fs')) return;
    if (!nhacDaPhat) startMusic();
    if (fsDaThu && !dangToanManHinh()) { fsDaThu = false; vaoToanManHinh(); }
  });

  // Di chuột / kéo ngón tay: cập nhật vị trí để đom đóm bay theo
  stage.addEventListener('pointermove', function (e) {
    var p = pos(e);
    fx.t.x = p.x;
    fx.t.y = p.y;
    fx.t.on = true;
  });


  /* ======================================================================
     PHẦN 9. TẤM THIỆP LỜI CHÚC
     Thiệp chỉ là một lớp phủ (.modal) luôn có sẵn trong HTML nhưng đang ẩn.
     Thêm class "on" -> CSS làm nó hiện ra mờ dần. Bỏ class "on" -> ẩn đi.
     ====================================================================== */
  openBtn.addEventListener('click', function () {
    modal.classList.add('on');
  });

  // Bấm nền tối ngoài thiệp, nút ×, hoặc nút "Đóng" -> đóng thiệp
  modal.addEventListener('click', function (e) {
    if (e.target === modal || e.target.closest('.x, .done')) modal.classList.remove('on');
  });

  // Nhấn phím Esc trên máy tính -> đóng thiệp
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') modal.classList.remove('on');
  });


  /* ======================================================================
     PHẦN 10. KHỞI ĐỘNG
     Đặt mức đồ họa khởi điểm và bắt đầu vòng lặp vẽ.
     ====================================================================== */
  applyTier(pickStartTier());
  quietUntil = performance.now() + 1500;           // chờ 1,5 giây cho trang tải xong rồi mới đánh giá độ mượt
  requestAnimationFrame(step);

})();
