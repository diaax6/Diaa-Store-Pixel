// ===== FIERCE DRAGON — Follows Mouse, Long Body =====
(function () {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h, time = 0;
    let mouseX = 0, mouseY = 0;

    // Dragon segments — long serpentine body
    const SEGMENTS = 80;
    const segments = [];
    const segmentLength = 16;

    // Particles
    const particles = [];
    const embers = [];
    const MAX_PARTICLES = 50;
    const MAX_EMBERS = 35;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        if (segments.length === 0) {
            for (let i = 0; i < SEGMENTS; i++) {
                segments.push({ x: w / 2 - i * segmentLength, y: h / 2 });
            }
            mouseX = w / 2;
            mouseY = h / 2;
            initEmbers();
        }
    }

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    document.addEventListener('touchmove', (e) => {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
    }, { passive: true });

    function lerp(a, b, t) { return a + (b - a) * t; }

    // ---- Particle ----
    class Particle {
        constructor(x, y, type) {
            this.x = x; this.y = y;
            this.type = type;
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = -Math.random() * 2 - 0.5;
            this.life = 1;
            this.decay = 0.01 + Math.random() * 0.02;
            this.size = type === 'smoke' ? 6 + Math.random() * 12 : 2 + Math.random() * 4;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy -= 0.015;
            this.life -= this.decay;
        }
        draw() {
            if (this.life <= 0) return;
            ctx.save();
            if (this.type === 'fire') {
                ctx.globalAlpha = this.life * 0.6;
                const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * this.life);
                g.addColorStop(0, `rgba(255,${80 + Math.random() * 80},10,1)`);
                g.addColorStop(0.6, 'rgba(200,30,5,0.5)');
                g.addColorStop(1, 'rgba(80,5,0,0)');
                ctx.fillStyle = g;
            } else if (this.type === 'smoke') {
                ctx.globalAlpha = this.life * 0.12;
                ctx.fillStyle = `rgba(80,30,120,1)`;
            } else {
                ctx.globalAlpha = this.life * 0.9;
                ctx.fillStyle = `rgba(255,${160 + Math.random() * 90},40,1)`;
            }
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0.5, this.size * this.life), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ---- Ember ----
    class Ember {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.size = 0.5 + Math.random() * 1.8;
            this.speedX = (Math.random() - 0.5) * 0.25;
            this.speedY = -0.15 - Math.random() * 0.4;
            this.pulse = Math.random() * Math.PI * 2;
            this.color = Math.random() > 0.5 ? [124, 58, 237] : [180, 60, 40];
            this.maxAlpha = 0.15 + Math.random() * 0.3;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.pulse += 0.025;
            if (this.y < -10) { this.y = h + 10; this.x = Math.random() * w; }
        }
        draw() {
            const a = this.maxAlpha * (0.4 + 0.6 * Math.sin(this.pulse));
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color[0]},${this.color[1]},${this.color[2]},${a})`;
            ctx.fill();
        }
    }

    function initEmbers() {
        for (let i = 0; i < MAX_EMBERS; i++) embers.push(new Ember());
    }

    // ---- Draw the long serpentine body ----
    function drawBody() {
        for (let i = SEGMENTS - 1; i >= 1; i--) {
            const seg = segments[i];
            const prev = segments[i - 1];
            const progress = 1 - (i / SEGMENTS);

            // Body thickness: thin tail → thick middle → slightly thinner near head
            let thickness;
            if (progress < 0.15) {
                thickness = 2 + progress / 0.15 * 8;
            } else if (progress < 0.5) {
                thickness = 10 + ((progress - 0.15) / 0.35) * 22;
            } else if (progress < 0.85) {
                thickness = 32 - ((progress - 0.5) / 0.35) * 6;
            } else {
                thickness = 26;
            }

            // Breathing wave
            thickness += Math.sin(time * 2 + i * 0.15) * 2;

            const alpha = 0.06 + progress * 0.3;

            // Color gradient: dark crimson tail → deep purple → bright violet near head
            let r, g, b;
            if (progress < 0.3) {
                const t = progress / 0.3;
                r = lerp(50, 130, t); g = lerp(8, 15, t); b = lerp(15, 60, t);
            } else if (progress < 0.65) {
                const t = (progress - 0.3) / 0.35;
                r = lerp(130, 124, t); g = lerp(15, 45, t); b = lerp(60, 220, t);
            } else {
                const t = (progress - 0.65) / 0.35;
                r = lerp(124, 70, t); g = lerp(45, 130, t); b = lerp(220, 240, t);
            }

            // Body glow
            ctx.shadowBlur = thickness * 2;
            ctx.shadowColor = `rgba(${r},${g},${b},${alpha * 0.5})`;

            // Connecting line (smooth body)
            ctx.beginPath();
            ctx.moveTo(seg.x, seg.y);
            ctx.lineTo(prev.x, prev.y);
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.7})`;
            ctx.lineWidth = thickness * 1.4;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Main segment circle
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, thickness, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.fill();

            // Inner core highlight
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, thickness * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${Math.min(255, r + 50)},${Math.min(255, g + 30)},${Math.min(255, b + 30)},${alpha * 0.25})`;
            ctx.fill();

            // ---- Dorsal spines — every 3 segments ----
            if (i % 3 === 0 && progress > 0.08 && progress < 0.92) {
                const angle = Math.atan2(seg.y - prev.y, seg.x - prev.x);
                const spikeLen = thickness * 2.2 + Math.sin(time * 2.5 + i * 0.3) * 4;
                const wave = Math.sin(time * 2 + i * 0.4) * 0.12;

                // Top spine (triangle)
                const sA = angle + Math.PI / 2 + wave;
                const baseW = thickness * 0.35;
                const tipX = seg.x + Math.cos(sA) * spikeLen;
                const tipY = seg.y + Math.sin(sA) * spikeLen;

                ctx.beginPath();
                ctx.moveTo(seg.x + Math.cos(sA + Math.PI / 2) * baseW, seg.y + Math.sin(sA + Math.PI / 2) * baseW);
                ctx.lineTo(tipX, tipY);
                ctx.lineTo(seg.x + Math.cos(sA - Math.PI / 2) * baseW, seg.y + Math.sin(sA - Math.PI / 2) * baseW);
                ctx.closePath();
                ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.5})`;
                ctx.fill();

                // Bottom smaller spine
                const sB = angle - Math.PI / 2 - wave;
                const smallLen = spikeLen * 0.5;
                ctx.beginPath();
                ctx.moveTo(seg.x, seg.y);
                ctx.lineTo(seg.x + Math.cos(sB) * smallLen, seg.y + Math.sin(sB) * smallLen);
                ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.4})`;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            // ---- Scale texture ----
            if (i % 2 === 0 && progress > 0.15) {
                const angle = Math.atan2(seg.y - prev.y, seg.x - prev.x);
                ctx.beginPath();
                ctx.arc(
                    seg.x + Math.cos(angle + 0.8) * thickness * 0.3,
                    seg.y + Math.sin(angle + 0.8) * thickness * 0.3,
                    thickness * 0.5, angle - 0.6, angle + 0.6
                );
                ctx.strokeStyle = `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 40)},${alpha * 0.15})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;
    }

    // ---- Draw fierce dragon head ----
    function drawHead() {
        const head = segments[0];
        const neck = segments[1];
        const angle = Math.atan2(head.y - neck.y, head.x - neck.x);
        const headSize = 36;

        // ---- Main skull (elongated ellipse) ----
        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(angle);

        // Outer glow
        ctx.shadowBlur = 50;
        ctx.shadowColor = 'rgba(100,30,200,0.5)';

        // Skull shape
        const skullGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, headSize * 1.3);
        skullGrad.addColorStop(0, 'rgba(90,30,180,0.5)');
        skullGrad.addColorStop(0.5, 'rgba(70,20,150,0.35)');
        skullGrad.addColorStop(1, 'rgba(50,10,100,0.08)');
        ctx.beginPath();
        ctx.ellipse(0, 0, headSize * 1.4, headSize * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = skullGrad;
        ctx.fill();

        // Snout
        const snoutGrad = ctx.createRadialGradient(headSize * 0.9, 0, 0, headSize * 0.9, 0, headSize * 0.75);
        snoutGrad.addColorStop(0, 'rgba(100,35,200,0.4)');
        snoutGrad.addColorStop(1, 'rgba(60,15,120,0.08)');
        ctx.beginPath();
        ctx.ellipse(headSize * 0.9, 0, headSize * 0.75, headSize * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = snoutGrad;
        ctx.fill();

        ctx.shadowBlur = 0;

        // ---- HORNS — large, swept back ----
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(-headSize * 0.15, -headSize * 0.7 * side);
            ctx.quadraticCurveTo(
                -headSize * 1.3, -headSize * 2 * side + Math.sin(time * 1.5) * 3 * side,
                -headSize * 2, -headSize * 2.4 * side + Math.sin(time * 1.2) * 5 * side
            );
            ctx.strokeStyle = 'rgba(140,55,225,0.55)';
            ctx.lineWidth = 5.5;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Horn highlight
            ctx.beginPath();
            ctx.moveTo(-headSize * 0.15, -headSize * 0.65 * side);
            ctx.quadraticCurveTo(
                -headSize * 1.2, -headSize * 1.8 * side + Math.sin(time * 1.5) * 3 * side,
                -headSize * 1.8, -headSize * 2.15 * side + Math.sin(time * 1.2) * 5 * side
            );
            ctx.strokeStyle = 'rgba(190,110,255,0.25)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // ---- FIERCE EYES ----
        const eyeX = headSize * 0.3;
        const eyeYOff = headSize * 0.38;
        const eyeSize = 8;
        const eyePulse = 0.75 + 0.25 * Math.sin(time * 3.5);

        for (const side of [-1, 1]) {
            const ey = eyeYOff * side;

            // Eye aura glow
            ctx.shadowBlur = 30;
            ctx.shadowColor = 'rgba(255,25,5,0.9)';

            const eGrad = ctx.createRadialGradient(eyeX, ey, 0, eyeX, ey, eyeSize * 2.5);
            eGrad.addColorStop(0, `rgba(255,90,20,${0.9 * eyePulse})`);
            eGrad.addColorStop(0.35, `rgba(255,35,0,${0.5 * eyePulse})`);
            eGrad.addColorStop(1, 'rgba(120,0,0,0)');
            ctx.beginPath();
            ctx.arc(eyeX, ey, eyeSize * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = eGrad;
            ctx.fill();

            // Eye core
            ctx.beginPath();
            ctx.arc(eyeX, ey, eyeSize, 0, Math.PI * 2);
            const coreGrad = ctx.createRadialGradient(eyeX, ey, 0, eyeX, ey, eyeSize);
            coreGrad.addColorStop(0, `rgba(255,210,40,${eyePulse})`);
            coreGrad.addColorStop(0.45, `rgba(255,55,5,${0.9 * eyePulse})`);
            coreGrad.addColorStop(1, 'rgba(160,0,0,0.4)');
            ctx.fillStyle = coreGrad;
            ctx.fill();

            // Slit pupil
            ctx.beginPath();
            ctx.ellipse(eyeX + 1, ey, 1.8, eyeSize * 0.75, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.92)';
            ctx.fill();

            ctx.shadowBlur = 0;
        }

        // ---- JAW lines ----
        ctx.beginPath();
        ctx.moveTo(headSize * 0.55, -headSize * 0.32);
        ctx.lineTo(headSize * 1.7, 0);
        ctx.lineTo(headSize * 0.55, headSize * 0.32);
        ctx.strokeStyle = 'rgba(120,40,180,0.35)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // ---- TEETH ----
        const teethCount = 6;
        for (let t = 0; t < teethCount; t++) {
            const tp = t / (teethCount - 1);
            const tx = headSize * 0.55 + tp * headSize * 1;
            const jawW = headSize * 0.32 * (1 - tp * 0.35);
            const toothLen = 7 + (1 - tp) * 12;

            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(tx - 2, jawW * side);
                ctx.lineTo(tx + 1, (jawW + toothLen) * side);
                ctx.lineTo(tx + 4, jawW * side);
                ctx.fillStyle = `rgba(220,215,255,${0.18 + tp * 0.12})`;
                ctx.fill();
            }
        }

        // ---- Nostrils ----
        for (const side of [-1, 1]) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(255,50,15,0.6)';
            ctx.beginPath();
            ctx.ellipse(headSize * 1.2, headSize * 0.1 * side, 3.5, 2.5, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,55,15,0.55)';
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // ---- Forehead ridges ----
        for (let r = 0; r < 4; r++) {
            const rx = -headSize * 0.05 - r * headSize * 0.22;
            ctx.beginPath();
            ctx.moveTo(rx, -headSize * 0.55);
            ctx.quadraticCurveTo(rx + headSize * 0.12, 0, rx, headSize * 0.55);
            ctx.strokeStyle = `rgba(130,55,200,${0.13 - r * 0.025})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // ---- Whiskers / tendrils ----
        const whiskerLen = headSize * 2.5;
        for (const side of [-1, 1]) {
            const wWave = Math.sin(time * 2 + side) * 0.2;
            ctx.beginPath();
            ctx.moveTo(headSize * 0.9, headSize * 0.25 * side);
            ctx.quadraticCurveTo(
                headSize * 1.5, headSize * 0.8 * side + Math.sin(time * 1.8) * 10 * side,
                headSize * 1.2 + whiskerLen * 0.5, headSize * 1.2 * side + Math.sin(time * 1.5 + side) * 15 * side
            );
            ctx.strokeStyle = `rgba(124,58,237,${0.15 + Math.sin(time + side) * 0.05})`;
            ctx.lineWidth = 1.8;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        ctx.restore();

        // ---- FIRE BREATH particles ----
        const snoutTipX = head.x + Math.cos(angle) * headSize * 1.7;
        const snoutTipY = head.y + Math.sin(angle) * headSize * 1.7;

        if (particles.length < MAX_PARTICLES && Math.random() > 0.35) {
            const p = new Particle(snoutTipX, snoutTipY, Math.random() > 0.65 ? 'smoke' : 'fire');
            p.vx = Math.cos(angle) * (2 + Math.random() * 4) + (Math.random() - 0.5) * 2;
            p.vy = Math.sin(angle) * (2 + Math.random() * 4) + (Math.random() - 0.5) * 2;
            particles.push(p);
        }

        // Sparks from nostrils
        if (Math.random() > 0.8) {
            const sp = new Particle(
                head.x + Math.cos(angle) * headSize * 1.2 + (Math.random() - 0.5) * 6,
                head.y + Math.sin(angle) * headSize * 1.2 + (Math.random() - 0.5) * 6,
                'spark'
            );
            sp.vx = Math.cos(angle) * 5 + (Math.random() - 0.5) * 4;
            sp.vy = Math.sin(angle) * 5 - Math.random() * 2;
            sp.decay = 0.025 + Math.random() * 0.03;
            particles.push(sp);
        }
    }

    // ---- Tail effects ----
    function drawTail() {
        const tail = segments[SEGMENTS - 1];
        const preTail = segments[SEGMENTS - 2];
        const angle = Math.atan2(tail.y - preTail.y, tail.x - preTail.x);

        // Tail tip — pointed with small flare
        const tipLen = 18;
        const tipX = tail.x + Math.cos(angle) * tipLen;
        const tipY = tail.y + Math.sin(angle) * tipLen;

        ctx.beginPath();
        ctx.moveTo(tail.x + Math.cos(angle + 0.6) * 5, tail.y + Math.sin(angle + 0.6) * 5);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(tail.x + Math.cos(angle - 0.6) * 5, tail.y + Math.sin(angle - 0.6) * 5);
        ctx.fillStyle = 'rgba(80,15,30,0.2)';
        ctx.fill();

        // Tail fin
        const finWave = Math.sin(time * 3) * 0.3;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y);
            const finAngle = angle + (Math.PI / 2.5) * side + finWave * side;
            const finLen = 20 + Math.sin(time * 2) * 5;
            ctx.quadraticCurveTo(
                tail.x + Math.cos(finAngle) * finLen * 0.6,
                tail.y + Math.sin(finAngle) * finLen * 0.6,
                tail.x + Math.cos(angle + Math.PI * 0.15 * side) * finLen
            , tail.y + Math.sin(angle + Math.PI * 0.15 * side) * finLen);
            ctx.strokeStyle = `rgba(100,20,50,0.15)`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // ---- Main render loop ----
    function draw() {
        time += 0.012;
        ctx.clearRect(0, 0, w, h);

        // ---- Ambient background glows ----
        const bg1 = ctx.createRadialGradient(
            w * 0.55 + Math.sin(time * 0.12) * 80, h * 0.3 + Math.cos(time * 0.08) * 40, 0,
            w * 0.55, h * 0.3, w * 0.55
        );
        bg1.addColorStop(0, 'rgba(80,20,130,0.06)');
        bg1.addColorStop(0.5, 'rgba(50,10,80,0.025)');
        bg1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bg1;
        ctx.fillRect(0, 0, w, h);

        const bg2 = ctx.createRadialGradient(
            w * 0.2 + Math.cos(time * 0.1) * 60, h * 0.75, 0,
            w * 0.2, h * 0.75, w * 0.4
        );
        bg2.addColorStop(0, 'rgba(150,30,20,0.03)');
        bg2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bg2;
        ctx.fillRect(0, 0, w, h);

        // ---- Embers ----
        embers.forEach(e => { e.update(); e.draw(); });

        // ---- Update dragon segments (follow mouse) ----
        segments[0].x = lerp(segments[0].x, mouseX, 0.08);
        segments[0].y = lerp(segments[0].y, mouseY, 0.08);

        for (let i = 1; i < SEGMENTS; i++) {
            const prev = segments[i - 1];
            const curr = segments[i];
            const dx = prev.x - curr.x;
            const dy = prev.y - curr.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > segmentLength) {
                const a = Math.atan2(dy, dx);
                curr.x = prev.x - Math.cos(a) * segmentLength;
                curr.y = prev.y - Math.sin(a) * segmentLength;
            }
        }

        // ---- Draw dragon ----
        drawTail();
        drawBody();
        drawHead();

        // ---- Particles ----
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }

        // ---- Vignette ----
        const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.75);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);

        requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    draw();
})();
