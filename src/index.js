import * as THREE from 'three';

// --- GAME STATE ---
let state = {
    cash: 100, // starting capital in Hryvnias (₴)
    cashPerSecond: 0,
    memesPublishedCount: 0,
    totalViews: 0,
    subscribers: 0,
    activeTemplateIndex: 0,
    fontSize: 42,
    fontColor: '#ffffff',
    audioEnabled: true,
    withdrawalAmount: 1000,
    selectedWithdrawMethod: 'mono',
    withdrawCardNumber: '',
    currentTriviaQuestionIndex: 0,
    isMemePublishing: false
};

// --- WEB AUDIO API SYNTHESIZER ---
class BrainrotSynth {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playCoin() {
        if (!state.audioEnabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(1174.66, this.ctx.currentTime + 0.08); // D6

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }

    playCash() {
        if (!state.audioEnabled) return;
        this.init();
        const now = this.ctx.currentTime;

        // Ring 1
        let osc1 = this.ctx.createOscillator();
        let gain1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(880, now); // A5
        gain1.gain.setValueAtTime(0.1, now);
        gain1.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start();
        osc1.stop(now + 0.16);

        // Ring 2 (delayed slightly)
        setTimeout(() => {
            if (!this.ctx) return;
            let osc2 = this.ctx.createOscillator();
            let gain2 = this.ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1318.51, this.ctx.currentTime); // E6
            gain2.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain2.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start();
            osc2.stop(this.ctx.currentTime + 0.26);
        }, 60);
    }

    playUpgrade() {
        if (!state.audioEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const freqs = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 major chord

        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + i * 0.05);
            gain.gain.setValueAtTime(0.1, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.01, now + i * 0.05 + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.26);
        });
    }

    playError() {
        if (!state.audioEnabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, this.ctx.currentTime); // A2 low buzz

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.36);
    }

    playSuccess() {
        if (!state.audioEnabled) return;
        this.init();
        const now = this.ctx.currentTime;

        // Fun retro fanfare sound
        const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.50]; // Pentatonic scale sweep
        notes.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + i * 0.06);
            gain.gain.setValueAtTime(0.12, now + i * 0.06);
            gain.gain.linearRampToValueAtTime(0.01, now + i * 0.06 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.22);
        });
    }
}

const synth = new BrainrotSynth();

// --- UPGRADES SHOP DATA ---
let upgrades = [
    {
        id: 'bot_farm',
        name: '🤖 ТікТок Бот-Ферма',
        desc: 'Автоматично крутить перегляди мемів у тіктоці.',
        cost: 100,
        factor: 1.4,
        incomeBoost: 2,
        count: 0
    },
    {
        id: 'sigma_course',
        name: '🦁 Сігма-Курси Тадеуша',
        desc: 'Курси гринду та різу підвищують заробіток за ручний клік.',
        cost: 250,
        factor: 1.5,
        clickMultiplier: 3, // Each level adds +3₴ per click
        count: 0
    },
    {
        id: 'abobus_ai',
        name: '👁️ ШШІ "Абобус-AI"',
        desc: 'Штучний Інтелект пише божественні брейрот речення.',
        cost: 650,
        factor: 1.6,
        incomeBoost: 12,
        count: 0
    },
    {
        id: 'fanum_protection',
        name: '🍕 Захист від Налогу Фанума',
        desc: 'Захищає холодильник та страхує пасивний дохід.',
        cost: 1800,
        factor: 1.7,
        incomeBoost: 45,
        count: 0
    },
    {
        id: 'gpu_miner',
        name: '⚡ Відеокарта RTX 5090 Ti',
        desc: 'Майнить Sigma-коїни пасивно на фоні з високим ККД.',
        cost: 5000,
        factor: 1.85,
        incomeBoost: 160,
        count: 0
    }
];

// --- BRAINROT TEMPLATES DEFINITIONS ---
const templates = [
    {
        name: "Скібіді Туалет",
        icon: "🚽",
        desc: "Класика брейроту. Голова в унітазі.",
        emoji: "🚽",
        bgGradient: ["#2c3e50", "#0f0f1c"],
        drawSpecial: (ctx, x, y) => {
            // Semicircular toilet bowl
            ctx.fillStyle = "#e6e6e6";
            ctx.beginPath();
            ctx.arc(x, y + 40, 50, 0, Math.PI, false);
            ctx.fill();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#8c8c8c";
            ctx.stroke();

            // Toilet tank
            ctx.fillRect(x - 55, y - 50, 40, 90);
            ctx.strokeRect(x - 55, y - 50, 40, 90);

            // Toilet lid / cover
            ctx.fillStyle = "#cccccc";
            ctx.fillRect(x - 15, y + 35, 30, 10);
            ctx.strokeRect(x - 15, y + 35, 30, 10);

            // Giant smiling head emoji coming out of the toilet
            ctx.font = "80px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("👨", x, y - 10);
        }
    },
    {
        name: "Мюінг Кот",
        icon: "🤫",
        desc: "🤫🏼 Мюїнгуй разом з котиком.",
        emoji: "🐱",
        bgGradient: ["#8a2be2", "#0d021f"],
        drawSpecial: (ctx, x, y) => {
            // Draw background glow rays
            ctx.strokeStyle = "rgba(191, 0, 255, 0.25)";
            ctx.lineWidth = 2;
            for(let i=0; i<12; i++) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                const angle = (i * Math.PI) / 6;
                ctx.lineTo(x + Math.cos(angle) * 200, y + Math.sin(angle) * 200);
                ctx.stroke();
            }

            // Cat emoji
            ctx.font = "95px Arial";
            ctx.fillText("🐱", x - 10, y - 15);

            // Finger over mouth "shh" emoji
            ctx.font = "65px Arial";
            ctx.fillText("🤫", x + 35, y + 30);
        }
    },
    {
        name: "Сігма-Гігачад",
        icon: "🗿",
        desc: "🗿 Кремезний Моаї з лазерними очима.",
        emoji: "🗿",
        bgGradient: ["#333333", "#050505"],
        drawSpecial: (ctx, x, y) => {
            // Glowing neon geometric grid background
            ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
            ctx.lineWidth = 1;
            for(let i = -100; i <= 100; i += 30) {
                ctx.beginPath();
                ctx.moveTo(x + i, y - 120);
                ctx.lineTo(x + i, y + 120);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(x - 120, y + i);
                ctx.lineTo(x + 120, y + i);
                ctx.stroke();
            }

            // Stone Moai
            ctx.font = "110px Arial";
            ctx.fillText("🗿", x, y - 10);

            // Golden Crown
            ctx.font = "45px Arial";
            ctx.fillText("👑", x + 10, y - 75);

            // Laser eye glow beams
            ctx.strokeStyle = "rgba(255, 0, 102, 0.8)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x - 18, y - 22);
            ctx.lineTo(x - 150, y - 30);
            ctx.moveTo(x + 6, y - 22);
            ctx.lineTo(x + 150, y - 30);
            ctx.stroke();

            // Flare points at eyes
            ctx.fillStyle = "#ff0066";
            ctx.beginPath();
            ctx.arc(x - 18, y - 22, 6, 0, Math.PI*2);
            ctx.arc(x + 6, y - 22, 6, 0, Math.PI*2);
            ctx.fill();
        }
    },
    {
        name: "Хок Туа",
        icon: "💦",
        desc: "Сплюнь на це діло! Hawk Tuah!",
        emoji: "👄",
        bgGradient: ["#ff007f", "#30001a"],
        drawSpecial: (ctx, x, y) => {
            // Retro concentric circles
            ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
            for(let r = 160; r > 30; r -= 30) {
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI*2);
                ctx.fill();
            }

            // Big open lips
            ctx.font = "95px Arial";
            ctx.fillText("👄", x - 5, y - 15);

            // Spits/Drops of water flying
            ctx.font = "55px Arial";
            ctx.fillText("💦", x + 50, y - 35);
            ctx.fillText("💦", x - 55, y + 25);
        }
    },
    {
        name: "Італійська Сова",
        icon: "🦉",
        desc: "Брейнрот-пташка співає Bella Ciao! 🇮🇹",
        emoji: "🦉",
        bgGradient: ["#1e3c72", "#111"],
        drawSpecial: (ctx, x, y) => {
            // Italian flag background stripes behind the character
            ctx.fillStyle = "rgba(0, 146, 70, 0.4)"; // Green
            ctx.fillRect(x - 100, y - 80, 60, 160);
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; // White
            ctx.fillRect(x - 40, y - 80, 80, 160);
            ctx.fillStyle = "rgba(206, 43, 55, 0.4)"; // Red
            ctx.fillRect(x + 40, y - 80, 60, 160);

            // Owl Head
            ctx.font = "90px Arial";
            ctx.fillText("🦉", x, y - 15);

            // Pizza slice
            ctx.font = "40px Arial";
            ctx.fillText("🍕", x + 35, y + 35);
        }
    },
    {
        name: "Італійський Кабан",
        icon: "🐷",
        desc: "Porco Dio! Мама мія!",
        emoji: "🐷",
        bgGradient: ["#00bf8f", "#001510"],
        drawSpecial: (ctx, x, y) => {
            // Gold sparkles in background
            ctx.fillStyle = "rgba(255, 204, 0, 0.6)";
            for(let i=0; i<8; i++) {
                const px = x + Math.sin(i * 1.2) * 80;
                const py = y + Math.cos(i * 0.9) * 80;
                ctx.fillText("✨", px, py);
            }

            // Pig face emoji
            ctx.font = "95px Arial";
            ctx.fillText("🐷", x, y - 10);

            // Crown
            ctx.font = "45px Arial";
            ctx.fillText("👑", x, y - 68);
        }
    },
    {
        name: "Грімас Шейк",
        icon: "🥤",
        desc: "Не пий фіолетовий коктейль від МакДональдс...",
        emoji: "🥤",
        bgGradient: ["#4a154b", "#140019"],
        drawSpecial: (ctx, x, y) => {
            // Slime purple pool under the shake
            ctx.fillStyle = "#8a2be2";
            ctx.beginPath();
            ctx.ellipse(x, y + 60, 75, 20, 0, 0, Math.PI*2);
            ctx.fill();

            // Milkshake Cup
            ctx.font = "90px Arial";
            ctx.fillText("🥤", x, y - 20);

            // Ghost face or purple monster emoji
            ctx.font = "50px Arial";
            ctx.fillText("👾", x - 40, y + 30);
            ctx.fillText("😈", x + 45, y + 25);
        }
    },
    {
        name: "Налог Фанума",
        icon: "🍕",
        desc: "Хтось забирає шматок твоєї піци! 🥷",
        emoji: "🍕",
        bgGradient: ["#d35400", "#1e1005"],
        drawSpecial: (ctx, x, y) => {
            // Radial grid
            ctx.strokeStyle = "rgba(241, 196, 15, 0.2)";
            ctx.lineWidth = 1.5;
            for(let r = 20; r < 140; r += 40) {
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI*2);
                ctx.stroke();
            }

            // Big Pizza Slice
            ctx.font = "100px Arial";
            ctx.fillText("🍕", x - 15, y - 10);

            // Bandit or Ninja stealing the pizza
            ctx.font = "65px Arial";
            ctx.fillText("🥷", x + 40, y + 25);
        }
    },
    {
        name: "Абобус",
        icon: "🔴",
        desc: "Червоний космонавт виглядає дуже підозріло.",
        emoji: "🚀",
        bgGradient: ["#c0392b", "#1a0505"],
        drawSpecial: (ctx, x, y) => {
            // Cyber HUD circles
            ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 90, 0, Math.PI*2);
            ctx.stroke();

            // Crosshair lines
            ctx.beginPath();
            ctx.moveTo(x - 120, y); ctx.lineTo(x - 70, y);
            ctx.moveTo(x + 70, y); ctx.lineTo(x + 120, y);
            ctx.moveTo(x, y - 120); ctx.lineTo(x, y - 70);
            ctx.moveTo(x, y + 70); ctx.lineTo(x, y + 120);
            ctx.stroke();

            // Alien red crewmate emoji (substitute with funny red mask)
            ctx.font = "90px Arial";
            ctx.fillText("👽", x, y - 10);

            ctx.fillStyle = "rgba(0, 240, 255, 0.8)";
            ctx.font = "bold 15px monospace";
            ctx.fillText("SUSPECTED", x, y + 55);
        }
    }
];

// --- HILARIOUS UKRAINIAN CAPTION PRESETS ---
const funnyPresets = [
    { top: "КОЛИ ТИ ЗАЙШОВ В КЛАС", bottom: "ТА ПОЧАВ ПОТУЖНО МЮЇНГУВАТИ 🤫" },
    { top: "СІГМА-САМЕЦЬ ПІСЛЯ ТОГО", bottom: "ЯК НЕ ОПЛАТИВ НАЛОГ ФАНУМА 🍕" },
    { top: "БЕЗКОШТОВНИЙ КУРС ГРИНДУ", bottom: "ВІД СУПЕР СІГМИ ТАДЕУША 🦁" },
    { top: "ХОК ТУА! СПЛЮНЬ СЛИНУ", bottom: "ТА КУПИ КРИПТО-ВІДЕОКАРТУ ⚡" },
    { top: "СУДЬБА МОГО КЕНТЮРІКА", bottom: "ПІСЛЯ ФІОЛЕТОВОГО ГРІМАС ШЕЙКУ 🥤" },
    { top: "ПОРКО ДІО КАБАНЧИК", bottom: "НАЙШОВ КУСОК ЗОЛОТОЇ ПІЦИ 🍕" },
    { top: "СЕКРЕТНИЙ ХОЛОДИЛЬНИК", bottom: "ЯКИЙ ОБОРОНЯЄ СКУФ-ОДРЯД 🥷" },
    { top: "ХОТІВ СТАТИ УСПІШНИМ", bottom: "АЛЕ СТАВ СКІБІДІ-БОСОМ В УНІТАЗІ 🚽" },
    { top: "ЩОДЕННИЙ ГРИНД СЕТ СІГМИ:", bottom: "МЮЇНГ, ЧІНАЗЕС, КЛІК КРИПТИ 🗿" },
    { top: "КОЛИ ІТАЛІЙСЬКА СОВА🦉", bottom: "ВЗЯЛА ДИПЛОМ ГОЛОВНОГО СІГМИ 🎓" },
    { top: "АБОБУС ПІДГЛЯДАЄ ЗА ТОБОЮ", bottom: "ЯК ТИ ТРАТИШ КРЕДИТИ В КЛІКЕРІ 🪙" },
    { top: "СКУФИ НАМАГАЮТЬСЯ", bottom: "ВІДІБРАТИ ПІЦУ У ФАНУМА 🍕" }
];

// --- TRIVIA QUESTIONS FOR CARD WITHDRAWAL ---
const triviaQuestions = [
    {
        q: "Хто такий Справжній Сігма?",
        a: [
            "Той, хто мовчки мюїнгує та гриндить 🗿",
            "Хто дивиться скібіді туалети весь день 🚽",
            "Якийсь невідомий скуф з пивом 🍺"
        ],
        correct: 0
    },
    {
        q: "Що означає 'Податок Фанума' (Fanum Tax)?",
        a: [
            "Податок на житло в ТікТоці 🏠",
            "Коли твій кент без дозволу з'їдає твою їжу 🍕",
            "Реальний податок, затверджений Радою 🏛️"
        ],
        correct: 1
    },
    {
        q: "Яку пісню виконує легендарна італійська брейрот сова?",
        a: [
            "Skibidi Toilet Theme Song 🚽",
            "Italian national anthem 🇮🇹",
            "Bella Ciao! 🦉"
        ],
        correct: 2
    },
    {
        q: "Що треба зробити при зустрічі з кентюріком?",
        a: [
            "Показати потужний Mewing (🤫🏼)",
            "Втекти та заплатити налог фанума 🥷",
            "Сказати 'Чіназес!' та обійняти 🤝"
        ],
        correct: 2
    }
];

// --- AD ROTATION LIST ---
const bannerAds = [
    { title: "КУРСИ СІГМА-ГРИНДУ!", desc: "Стань мільярдером за 3 дні під керівництвом Тадеуша! 📈" },
    { title: "КРЕДИТ 'СЛІД СКУФА'", desc: "Гроші на чіпси та пиво під 0% від Абобус Банку! 🍺" },
    { title: "МОНОБАНК 🐱", desc: "Відкрий сігма-банку та накопичуй на нову RTX 5090!" },
    { title: "МАК-СУПЕР-ШЕЙК", desc: "Ультрафіолетовий напій. Спробуй, якщо не боїшся стати совою! 🥤" },
    { title: "ВГАДАЙ ПОВАРА ЗА ЗВУКОМ", desc: "Нове брейрот ТікТок шоу! Звуки різання цибулі 🧅" }
];

// --- INITIALIZE THE APPLICATION ---
let coinScene, coinCamera, coinRenderer, coinMesh;
let particles3D = [];

function init() {
    setupDomListeners();
    renderTemplateCards();
    drawMeme();
    setupThreeJSCoin();
    renderUpgradeStore();
    startTycoonLoops();
    rotateBannerAds();
}

// --- RENDER CARD SLIDER ---
function renderTemplateCards() {
    const slider = document.getElementById('template-slider');
    slider.innerHTML = '';

    templates.forEach((t, i) => {
        const card = document.createElement('div');
        card.className = `template-card ${i === state.activeTemplateIndex ? 'active' : ''}`;
        card.innerHTML = `
            <span class="template-icon">${t.icon}</span>
            <span class="template-name">${t.name}</span>
        `;

        card.addEventListener('click', () => {
            state.activeTemplateIndex = i;
            // Update active cards
            document.querySelectorAll('.template-card').forEach((c, idx) => {
                c.classList.toggle('active', idx === i);
            });
            drawMeme();
            synth.playCoin();
        });

        slider.appendChild(card);
    });
}

// --- DRAW MEME ON CANVAS ---
function drawMeme() {
    const canvas = document.getElementById('meme-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const template = templates[state.activeTemplateIndex];

    const w = canvas.width;
    const h = canvas.height;

    // Fill background gradient
    const grad = ctx.createRadialGradient(w/2, h/2, 50, w/2, h/2, w/2);
    grad.addColorStop(0, template.bgGradient[0]);
    grad.addColorStop(1, template.bgGradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw funny grid or stars
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for(let i=0; i<w; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    // Draw central special illustration
    template.drawSpecial(ctx, w / 2, h / 2);

    // Add meme watermarks
    ctx.fillStyle = "rgba(0, 240, 255, 0.3)";
    ctx.font = "bold 12px Courier New";
    ctx.textAlign = "right";
    ctx.fillText("БРЕЙНРОТ AI © СИГМА ТАЙКУН", w - 15, h - 15);

    // Get input texts
    const topVal = document.getElementById('caption-top').value.toUpperCase();
    const bottomVal = document.getElementById('caption-bottom').value.toUpperCase();

    // Text styling settings
    ctx.fillStyle = state.fontColor;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;
    ctx.font = `900 ${state.fontSize}px Impact, Arial Black, sans-serif`;
    ctx.textAlign = 'center';

    // Top text wrap drawing
    if (topVal) {
        ctx.textBaseline = 'top';
        drawWrappedText(ctx, topVal, w / 2, 25, w - 40, state.fontSize * 1.1);
    }

    // Bottom text wrap drawing
    if (bottomVal) {
        ctx.textBaseline = 'bottom';
        drawWrappedText(ctx, bottomVal, w / 2, h - 25, w - 40, state.fontSize * 1.1, true);
    }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, bottomOriented = false) {
    const words = text.split(" ");
    let lines = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);

    if (bottomOriented) {
        // Draw lines from bottom to top
        for (let i = lines.length - 1; i >= 0; i--) {
            const lineY = y - (lines.length - 1 - i) * lineHeight;
            ctx.strokeText(lines[i], x, lineY);
            ctx.fillText(lines[i], x, lineY);
        }
    } else {
        // Draw lines from top to bottom
        for (let i = 0; i < lines.length; i++) {
            const lineY = y + i * lineHeight;
            ctx.strokeText(lines[i], x, lineY);
            ctx.fillText(lines[i], x, lineY);
        }
    }
}

// --- SETUP THREE.JS SPINNING SIGMA COIN ---
function setupThreeJSCoin() {
    const canvas = document.getElementById('coin-3d-canvas');
    if (!canvas) return;

    // Simple orthographic view setup
    coinScene = new THREE.Scene();

    // Transparent camera setup
    coinCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    coinCamera.position.set(0, 0, 8);

    coinRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    coinRenderer.setSize(100, 100);
    coinRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Beautiful lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    coinScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffcc00, 2.5);
    dirLight.position.set(5, 5, 5);
    coinScene.add(dirLight);

    // Thick Golden Coin Mesh
    const coinGeom = new THREE.CylinderGeometry(2, 2, 0.4, 32);
    coinGeom.rotateX(Math.PI / 2); // face front

    const coinMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        metalness: 0.95,
        roughness: 0.1,
        emissive: 0x332200
    });

    coinMesh = new THREE.Group();
    const coreCoin = new THREE.Mesh(coinGeom, coinMat);
    coinMesh.add(coreCoin);

    // Extrude a 3D letter "Σ" (Sigma) on the coin's front face
    // Let's draw it using basic Box Geometries inside coinMesh
    const sigmaColor = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x111111
    });

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.2), sigmaColor);
    topBar.position.set(0, 0.7, 0.21);
    coinMesh.add(topBar);

    const botBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.2), sigmaColor);
    botBar.position.set(0, -0.7, 0.21);
    coinMesh.add(botBar);

    const diagTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.2), sigmaColor);
    diagTop.position.set(0.15, 0.35, 0.21);
    diagTop.rotation.z = -Math.PI / 4;
    coinMesh.add(diagTop);

    const diagBot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.2), sigmaColor);
    diagBot.position.set(0.15, -0.35, 0.21);
    diagBot.rotation.z = Math.PI / 4;
    coinMesh.add(diagBot);

    coinScene.add(coinMesh);

    // Anim loop
    function render() {
        requestAnimationFrame(render);

        // Spin the coin
        if (coinMesh) {
            coinMesh.rotation.y += 0.035;
            // Wobble/tilt slightly
            coinMesh.rotation.x = 0.3 + Math.sin(Date.now() * 0.002) * 0.12;

            // Return size scale slowly
            coinMesh.scale.x = THREE.MathUtils.lerp(coinMesh.scale.x, 1.0, 0.15);
            coinMesh.scale.y = THREE.MathUtils.lerp(coinMesh.scale.y, 1.0, 0.15);
            coinMesh.scale.z = THREE.MathUtils.lerp(coinMesh.scale.z, 1.0, 0.15);
        }

        coinRenderer.render(coinScene, coinCamera);
    }

    render();
}

// --- CLICK TO MINE COINS ---
function mineCoin(e) {
    // Punch scale effect
    if (coinMesh) {
        coinMesh.scale.set(1.4, 1.4, 1.4);
    }

    // Get click coordinates for floating text
    let clickX = 100;
    let clickY = 100;
    if (e) {
        const rect = e.target.getBoundingClientRect();
        clickX = e.clientX - rect.left;
        clickY = e.clientY - rect.top;
    }

    // Mine rate calculation based on upgrade
    const courseUpgrade = upgrades.find(u => u.id === 'sigma_course');
    const clickEarnings = 1 + (courseUpgrade ? courseUpgrade.count * courseUpgrade.clickMultiplier : 0);

    state.cash += clickEarnings;
    state.totalViews += Math.ceil(clickEarnings * 5 + Math.random() * 5);
    state.subscribers += Math.ceil(clickEarnings * 0.5 + Math.random() * 1.5);

    updateUI();
    synth.playCoin();

    // Trigger visual float particle HTML element
    createFloatParticle(`+₴${clickEarnings}`, e ? e.clientX : window.innerWidth / 2, e ? e.clientY : window.innerHeight / 2);
}

function createFloatParticle(text, x, y) {
    const p = document.createElement('div');
    p.innerText = text;
    p.style.position = 'fixed';
    p.style.left = `${x - 15}px`;
    p.style.top = `${y - 15}px`;
    p.style.color = '#00ff66';
    p.style.fontWeight = '900';
    p.style.fontSize = '18px';
    p.style.fontFamily = 'monospace';
    p.style.pointerEvents = 'none';
    p.style.zIndex = '9999';
    p.style.textShadow = '0 0 8px #000';
    p.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';

    document.body.appendChild(p);

    setTimeout(() => {
        p.style.transform = `translateY(-60px) scale(1.3)`;
        p.style.opacity = '0';
    }, 15);

    setTimeout(() => {
        p.remove();
    }, 650);
}

// --- RENDER SHOP PRODUCTS ---
function renderUpgradeStore() {
    const store = document.getElementById('upgrades-store');
    if (!store) return;
    store.innerHTML = '';

    upgrades.forEach((u, i) => {
        const cost = Math.ceil(u.cost * Math.pow(u.factor, u.count));
        const item = document.createElement('div');
        item.className = 'store-item';

        // Dynamic stat representation
        let statText = '';
        if (u.incomeBoost) {
            statText = `+₴${u.incomeBoost}/сек пасивно`;
        } else if (u.clickMultiplier) {
            statText = `+₴${u.clickMultiplier} до кліку`;
        }

        item.innerHTML = `
            <div class="item-info">
                <div class="item-title">${u.name} [Рівень ${u.count}]</div>
                <div class="item-desc">${u.desc}</div>
                <div class="item-stats">${statText}</div>
            </div>
            <div class="item-action-wrapper">
                <span class="item-cost">₴${cost}</span>
                <button class="btn-upgrade" id="btn-up-${u.id}" ${state.cash < cost ? 'disabled' : ''}>КУПИТИ</button>
            </div>
        `;

        // Buy trigger
        const buyBtn = item.querySelector(`#btn-up-${u.id}`);
        buyBtn.addEventListener('click', () => {
            if (state.cash >= cost) {
                state.cash -= cost;
                u.count++;

                // Recalculate passive income
                recalculateIncome();
                updateUI();
                renderUpgradeStore();
                synth.playUpgrade();

                // 30% chance of random humorous comment on purchase
                if (Math.random() < 0.3) {
                    addHumorousComment("Монобанк інвестор", `Купив покращення "${u.name}"! Тепер я офіційний інвестор брейроту! 😎💵`);
                }
            }
        });

        store.appendChild(item);
    });
}

function recalculateIncome() {
    let passive = 0;
    upgrades.forEach(u => {
        if (u.incomeBoost) {
            passive += u.count * u.incomeBoost;
        }
    });
    state.cashPerSecond = passive;
}

// --- UPDATE STATS AND BUTTONS ---
function updateUI() {
    // Top Cash Balance
    document.getElementById('cash-balance').innerText = state.cash.toLocaleString();
    document.getElementById('withdrawal-cash-available').innerText = state.cash.toLocaleString();

    // HUD Dashboard metrics
    document.getElementById('cash-per-sec-ui').innerText = `+₴${state.cashPerSecond}/с`;
    document.getElementById('memes-count-ui').innerText = state.memesPublishedCount;
    document.getElementById('views-count-ui').innerText = formatBigNumber(state.totalViews);
    document.getElementById('subs-count-ui').innerText = formatBigNumber(state.subscribers);

    // Disable/Enable store buy buttons dynamically
    upgrades.forEach(u => {
        const cost = Math.ceil(u.cost * Math.pow(u.factor, u.count));
        const btn = document.getElementById(`btn-up-${u.id}`);
        if (btn) {
            btn.disabled = (state.cash < cost);
        }
    });

    // Disable/Enable withdraw trigger button based on balance
    const withdrawBtn = document.getElementById('btn-open-withdraw');
    if (state.cash >= 100) {
        withdrawBtn.style.opacity = '1';
        withdrawBtn.disabled = false;
    } else {
        withdrawBtn.style.opacity = '0.5';
    }
}

function formatBigNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// --- TYCOON LOOPS ---
function startTycoonLoops() {
    // 1. Passive income payout every second
    setInterval(() => {
        if (state.cashPerSecond > 0) {
            state.cash += state.cashPerSecond;
            // Also generate views passively
            state.totalViews += Math.ceil(state.cashPerSecond * 12 + Math.random() * 10);
            state.subscribers += Math.ceil(state.cashPerSecond * 1.5 + Math.random() * 2);
            updateUI();

            // Light coin ring sound occasionally if earning money passively
            if (Math.random() < 0.15) {
                synth.playCash();
            }
        }
    }, 1000);

    // 2. Passive background comments rolling
    setInterval(() => {
        if (state.memesPublishedCount > 0 && Math.random() < 0.45) {
            triggerProceduralComment();
        }
    }, 4500);
}

function triggerProceduralComment() {
    const users = ["@vlad_sigma", "@boss_skibidi", "@king_mewing", "@fanum_taxer", "@kenturik_40", "@hawk_spit", "@bella_owl", "@abobus_red", "@gigachad_ua", "@tadeush_monetka", "@chinazes_bro", "@scuf_scufich", "@mamma_mia_cat"];
    const quotes = [
        "Це реально сігма! Поважаю! 🗿",
        "Я змюїнгував від цього мему прямо на уроці 🤫",
        "Доп доп єс єс, найкращий мем тижня!",
        "Заберіть у нього телефон, він занадто потужно різить 😂",
        "Це ж белла чао сова! Легенда TikTok!",
        "Податкова служба Фанума схвалює цей контент 🍕",
        "Абобус дивиться на тебе з повагою... 👽",
        "Хок туа! Сплюнь і забудь, це шедевр! 💦",
        "Скільки коштує твій курс по гринду?",
        "Вже вивів 50,000₴ на монобанк, дякую!",
        "Чи є реф посилання на клікер? Хочу більше!",
        "Це імба, я підписався!",
        "Кабан каже мама мія! 🐷👑",
        "Та за що налог фанума 😭 я тільки почав їсти піцу!",
        "Чисто я в 3 години ночі дивлюся ці шедеври",
        "Чіназес! Сюди гроші!"
    ];

    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    addHumorousComment(randomUser, randomQuote);
}

function addHumorousComment(user, text) {
    const feed = document.getElementById('comments-feed-box');
    if (!feed) return;

    const item = document.createElement('div');
    item.className = 'comment-item';
    item.innerHTML = `<span class="comment-user">${user}:</span> ${text}`;

    feed.appendChild(item);

    // Auto scroll bottom
    feed.scrollTop = feed.scrollHeight;

    // Keep feed clean (limit to 12 items)
    if (feed.children.length > 12) {
        feed.children[0].remove();
    }
}

// --- BANNER ADS ROTATION & ACTIONS ---
function rotateBannerAds() {
    let adIndex = 0;

    setInterval(() => {
        adIndex = (adIndex + 1) % bannerAds.length;
        document.getElementById('banner-ad-title').innerText = bannerAds[adIndex].title;
        document.getElementById('banner-ad-desc').innerText = bannerAds[adIndex].desc;
    }, 8000);

    // Banner ad interaction
    document.getElementById('banner-ad-action-btn').addEventListener('click', () => {
        synth.playCash();
        const bonus = 25 + Math.floor(Math.random() * 50);
        state.cash += bonus;
        updateUI();
        alert(`🤑 Дякуємо за перехід по спонсорському оголошенню! Ви підтримали розробників брейроту та отримали Sigma-бонус: +₴${bonus}!`);
    });

    document.getElementById('banner-ad-close-btn').addEventListener('click', () => {
        document.getElementById('top-ad-banner').style.display = 'none';
        // Re-appear after 20 seconds
        setTimeout(() => {
            document.getElementById('top-ad-banner').style.display = 'flex';
        }, 20000);
    });
}

// --- TRIGGER INTERSTITIAL ADS ---
function showInterstitialAd(onCloseCallback) {
    const modal = document.getElementById('interstitial-ad');
    const closeBtn = document.getElementById('interstitial-ad-close-btn');
    const clickBtn = document.getElementById('interstitial-ad-click-btn');

    modal.style.display = 'flex';
    synth.playError();

    // Random ad texts
    const adTitles = ["Курс 'Завтра ти Сігма'", "Казино 'Скібіді 777'", "Пиво 'Скуфське добірне'"];
    const adDescs = [
        "Навчися правильно мюїнгувати з нашими відеолекціями всього за 499₴!",
        "Крути слоти з головою в унітазі! Отримай +100 фріспінів при реєстрації!",
        "Освіжаючий напій для справжніх кентюріків. Захист від налогу фанума в подарунок!"
    ];
    const randIdx = Math.floor(Math.random() * adTitles.length);
    document.getElementById('interstitial-title').innerText = adTitles[randIdx];
    document.getElementById('interstitial-desc').innerText = adDescs[randIdx];

    function handleClose() {
        modal.style.display = 'none';
        closeBtn.removeEventListener('click', handleClose);
        clickBtn.removeEventListener('click', handleAction);

        // Give small compensation
        state.cash += 20;
        updateUI();
        createFloatParticle("+₴20 за рекламу", window.innerWidth / 2, window.innerHeight / 2);

        if (onCloseCallback) onCloseCallback();
    }

    function handleAction() {
        alert("Redirecting to Sponsor...");
        handleClose();
    }

    closeBtn.addEventListener('click', handleClose);
    clickBtn.addEventListener('click', handleAction);
}

// --- TRIGGER REWARDED AD VIDEO ---
function showRewardedAd(onRewardedCallback) {
    const modal = document.getElementById('rewarded-ad');
    const timerText = document.getElementById('rewarded-ad-timer');
    modal.style.display = 'flex';

    let countdown = 5;
    timerText.innerText = `Зачекайте: ${countdown}с`;

    const adTitles = ["SKIBIDI WAR 3D ⚔️", "RAID: SHADOW LEGENDS 🚀", "МНОЖНИК БАГАТСТВА ТАДЕУША 💵"];
    const adDescs = [
        "Обороняй базу камераменів від нашестя туалетів нового покоління! Завантаж зараз безкоштовно!",
        "Грай за кращих героїв з унікальним скіном Сігма-Мавпи! 100+ рівнів тактичного гринду!",
        "Хочеш подвоїти свій пасивний прибуток? Подивись це відео до кінця та отримай подвійний кеш!"
    ];
    const randIdx = Math.floor(Math.random() * adTitles.length);
    document.getElementById('rewarded-ad-title').innerText = adTitles[randIdx];
    document.getElementById('rewarded-ad-desc').innerText = adDescs[randIdx];

    const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            timerText.innerText = `Зачекайте: ${countdown}с`;
            // play small beep
            synth.playCoin();
        } else {
            clearInterval(interval);
            modal.style.display = 'none';
            synth.playSuccess();
            onRewardedCallback();
        }
    }, 1000);
}

// --- PUBLISH MEME CAMPAIGN ---
function publishMeme() {
    if (state.isMemePublishing) return;
    state.isMemePublishing = true;

    const btn = document.getElementById('btn-publish-meme');
    btn.disabled = true;
    btn.innerText = "ОБРОБКА ТА ПУБЛІКАЦІЯ У ТІКТОК... 📡";

    synth.playCoin();

    // Delayed publication
    setTimeout(() => {
        state.memesPublishedCount++;

        // Calculate viral views based on upgrades (especially abobus AI)
        const aiUpgrade = upgrades.find(u => u.id === 'abobus_ai');
        const viewsMultiplier = 1 + (aiUpgrade ? aiUpgrade.count * 1.5 : 0);

        const gainedViews = Math.floor((100 + Math.random() * 500) * viewsMultiplier);
        const gainedSubs = Math.floor((gainedViews * 0.15) + Math.random() * 10);
        const earnedCash = Math.floor((gainedViews * 0.25) + Math.random() * 5);

        state.totalViews += gainedViews;
        state.subscribers += gainedSubs;
        state.cash += earnedCash;

        updateUI();

        btn.disabled = false;
        btn.innerText = "🚀 ОПУБЛІКУВАТИ МЕМ ТА ЗАРОБИТИ 💸";
        state.isMemePublishing = false;

        // Success sound
        synth.playCash();

        // Feed comments update
        triggerProceduralComment();
        addHumorousComment("@tiktok_trends_bot", `Ваш мем потрапив у тренди! 📈 Отримано +${gainedViews} переглядів та +₴${earnedCash}!`);

        // Trigger float notification
        createFloatParticle(`+₴${earnedCash}`, window.innerWidth / 2, window.innerHeight / 2 - 100);

        // 35% chance of showing an interstitial ad after publication
        if (Math.random() < 0.35) {
            showInterstitialAd();
        }

    }, 1200);
}

// --- WITHDRAWAL MODULE AND TRIVIA VERIFICATION ---
function openWithdrawalModal() {
    const modal = document.getElementById('withdrawal-modal');
    modal.style.display = 'flex';
    document.getElementById('withdrawal-main-form').style.display = 'block';
    document.getElementById('withdrawal-trivia').style.display = 'none';

    // Default placeholder card
    document.getElementById('withdraw-card-input').value = '4441 1144 2255 ' + Math.floor(1000 + Math.random() * 9000);
    // Set balance inside input
    document.getElementById('withdraw-amount-input').value = Math.min(state.cash, 1000);
}

function handleWithdrawalRequest() {
    const card = document.getElementById('withdraw-card-input').value.trim();
    const amount = parseFloat(document.getElementById('withdraw-amount-input').value);

    if (!card) {
        alert("Введіть правильний номер картки або гаманця!");
        synth.playError();
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        alert("Введіть правильну суму виведення!");
        synth.playError();
        return;
    }

    if (amount > state.cash) {
        alert("Недостатньо коштів на балансі!");
        synth.playError();
        return;
    }

    // Save info
    state.withdrawalAmount = amount;
    state.withdrawCardNumber = card;

    // Switch to Trivia mode
    document.getElementById('withdrawal-main-form').style.display = 'none';
    const triviaBox = document.getElementById('withdrawal-trivia');
    triviaBox.style.display = 'block';

    // Choose random trivia question
    state.currentTriviaQuestionIndex = Math.floor(Math.random() * triviaQuestions.length);
    loadTriviaQuestion();
}

function loadTriviaQuestion() {
    const question = triviaQuestions[state.currentTriviaQuestionIndex];
    document.getElementById('trivia-question-text').innerText = question.q;

    const wrapper = document.getElementById('trivia-options-wrapper');
    wrapper.innerHTML = '';

    question.a.forEach((optionText, index) => {
        const btn = document.createElement('button');
        btn.className = 'trivia-option';
        btn.innerText = `${index + 1}) ${optionText}`;

        btn.addEventListener('click', () => {
            if (index === question.correct) {
                // Correct! Show Rewarded Ad as simulated bank processing
                synth.playSuccess();
                alert("✅ Відповідь правильна! Ви підтвердили статус Сігми. Запускаємо захищений шлюз обробки транзакції...");

                showRewardedAd(() => {
                    // Payout Successful! Show license certificate!
                    state.cash -= state.withdrawalAmount;
                    updateUI();

                    document.getElementById('withdrawal-modal').style.display = 'none';
                    showSigmaCertificate();
                });
            } else {
                // Wrong answer
                synth.playError();
                alert("❌ Неправильно! Справжній Сігма знає брейрот матчастину! Транзакцію заблоковано. Спробуйте ще раз.");
                // Reset back to main form
                document.getElementById('withdrawal-main-form').style.display = 'block';
                document.getElementById('withdrawal-trivia').style.display = 'none';
            }
        });

        wrapper.appendChild(btn);
    });
}

// --- RENDER SIGMA LICENSE CERTIFICATE ---
function showSigmaCertificate() {
    const modal = document.getElementById('cert-modal');
    modal.style.display = 'flex';

    const canvas = document.getElementById('cert-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const w = canvas.width;
    const h = canvas.height;

    // White paper certificate background with security grid
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Decorative double border (Gold/Green)
    ctx.strokeStyle = '#bf00ff';
    ctx.lineWidth = 12;
    ctx.strokeRect(15, 15, w - 30, h - 30);

    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 4;
    ctx.strokeRect(26, 26, w - 52, h - 52);

    // Security background lines
    ctx.strokeStyle = '#f4e8ff';
    ctx.lineWidth = 1;
    for(let i=0; i<w; i += 25) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(w - i, h);
        ctx.stroke();
    }

    // Title Header
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px "Times New Roman", Georgia, serif';
    ctx.fillText("ГІЛЬДІЯ СУПЕР СІГМА-ГРИНДЕРІВ УКРАЇНИ", w / 2, 70);

    // Subtitle
    ctx.fillStyle = '#bf00ff';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillText("★ ОФІЦІЙНА ЛІЦЕНЗІЯ ГОЛОВНОГО СІГМИ ★", w / 2, 105);

    // Body text
    ctx.fillStyle = '#333';
    ctx.font = 'italic 16px Georgia, serif';
    ctx.fillText("Цей сертифікат засвідчує, що власник картки рахунку", w / 2, 160);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px Courier New, monospace';
    ctx.fillText(`ID Card: [${state.withdrawCardNumber}]`, w / 2, 195);

    ctx.fillStyle = '#333';
    ctx.font = 'italic 16px Georgia, serif';
    ctx.fillText("успішно пройшов брейрот-верифікацію, згриндив мільйони переглядів", w / 2, 235);
    ctx.fillText("та здійснив успішний вивід у розмірі", w / 2, 260);

    ctx.fillStyle = '#00cc44';
    ctx.font = '900 32px Arial, sans-serif';
    ctx.fillText(`₴${state.withdrawalAmount.toLocaleString()} ГРИВЕНЬ`, w / 2, 310);

    ctx.fillStyle = '#333';
    ctx.font = 'italic 15px Georgia, serif';
    ctx.fillText("Йому надається статус Почесного Скібідіста та Майстра Мюїнгу 1-го ступеня.", w / 2, 355);

    // Gold Seal Medal
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(w / 2 - 180, 420, 35, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#cc8800';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ribbon tails
    ctx.fillStyle = '#ff3300';
    ctx.beginPath();
    ctx.moveTo(w/2 - 200, 440);
    ctx.lineTo(w/2 - 210, 475);
    ctx.lineTo(w/2 - 190, 465);
    ctx.lineTo(w/2 - 180, 440);
    ctx.fill();

    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(w/2 - 165, 440);
    ctx.lineTo(w/2 - 150, 475);
    ctx.lineTo(w/2 - 170, 465);
    ctx.lineTo(w/2 - 180, 440);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText("SIGMA", w / 2 - 180, 418);
    ctx.fillText("APPROVED", w / 2 - 180, 430);

    // Signatures
    ctx.fillStyle = '#111';
    ctx.font = '13px Courier New';
    ctx.fillText("Голова Мюінг-Гільдії: Кот 🤫", w / 2 + 150, 410);
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2;
    ctx.beginPath(); // Fake handwritten signature line
    ctx.moveTo(w / 2 + 70, 415);
    ctx.bezierCurveTo(w / 2 + 120, 395, w / 2 + 180, 425, w / 2 + 230, 405);
    ctx.stroke();

    ctx.fillText("Спонсор гринда: Тадеуш Карабас 🦁", w / 2 + 150, 445);
    ctx.beginPath(); // Fake handwritten signature 2
    ctx.moveTo(w / 2 + 65, 450);
    ctx.bezierCurveTo(w / 2 + 110, 435, w / 2 + 170, 460, w / 2 + 225, 438);
    ctx.stroke();
}

function downloadSigmaCertificate() {
    const canvas = document.getElementById('cert-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Sigma_Certificate_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    synth.playSuccess();
}

function downloadMeme() {
    const canvas = document.getElementById('meme-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Brainrot_Meme_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    synth.playCoin();
}

// --- RANDOM CAPTION GENERATION ---
function randomizeMemeText() {
    const rand = funnyPresets[Math.floor(Math.random() * funnyPresets.length)];
    document.getElementById('caption-top').value = rand.top;
    document.getElementById('caption-bottom').value = rand.bottom;
    drawMeme();
    synth.playCoin();
}

// --- SETUP EVENT LISTENERS ---
function setupDomListeners() {
    // Canvas update on text input
    document.getElementById('caption-top').addEventListener('input', drawMeme);
    document.getElementById('caption-bottom').addEventListener('input', drawMeme);

    // Font sliders
    const fSize = document.getElementById('caption-font-size');
    fSize.addEventListener('input', (e) => {
        state.fontSize = parseInt(e.target.value);
        document.getElementById('font-size-val').innerText = state.fontSize;
        drawMeme();
    });

    const fColor = document.getElementById('caption-color');
    fColor.addEventListener('input', (e) => {
        state.fontColor = e.target.value;
        drawMeme();
    });

    // Randomizer and download
    document.getElementById('btn-randomize-text').addEventListener('click', randomizeMemeText);
    document.getElementById('btn-download-meme').addEventListener('click', downloadMeme);

    // Publish meme trigger
    document.getElementById('btn-publish-meme').addEventListener('click', publishMeme);

    // 3D Coin click miner
    document.getElementById('coin-3d-canvas').addEventListener('mousedown', mineCoin);
    document.getElementById('btn-mine-coin').addEventListener('click', (e) => mineCoin(null));

    // Audio controller toggle
    const audioBtn = document.getElementById('sound-toggle');
    audioBtn.addEventListener('click', () => {
        state.audioEnabled = !state.audioEnabled;
        audioBtn.innerText = state.audioEnabled ? "🔊" : "🔇";
        if (state.audioEnabled) {
            synth.init();
            synth.playCoin();
        }
    });

    // Modals controls
    document.getElementById('btn-start-game').addEventListener('click', () => {
        document.getElementById('intro-modal').style.display = 'none';
        synth.init();
        synth.playSuccess();
    });

    // Withdrawal triggers
    document.getElementById('btn-open-withdraw').addEventListener('click', openWithdrawalModal);
    document.getElementById('withdrawal-close-btn').addEventListener('click', () => {
        document.getElementById('withdrawal-modal').style.display = 'none';
    });

    document.getElementById('btn-request-withdrawal-action').addEventListener('click', handleWithdrawalRequest);

    // Certificate downloads & closure
    document.getElementById('cert-close-btn').addEventListener('click', () => {
        document.getElementById('cert-modal').style.display = 'none';
    });
    document.getElementById('cert-download-btn').addEventListener('click', downloadSigmaCertificate);
}

// --- BOOTSTRAP WINDOW ONLOAD ---
window.onload = () => {
    init();
    updateUI();
};
