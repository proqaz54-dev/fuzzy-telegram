import * as THREE from 'three';

// State variables
let scene, camera, renderer;
let ship;
let asteroids = [];
let crystals = [];
let lasers = [];
let particles = [];
let spaceStation;

// Game stats
let score = 0;
let money = 0;
let cargo = 0;
let cargoMax = 20;
let fuel = 100;
let laserDamage = 1;
let shipSpeedMultiplier = 1;

// Upgrade levels & costs
let upgradeCargoCost = 50;
let upgradeLaserCost = 100;
let upgradeSpeedCost = 75;

// Joystick control state
let moveVector = new THREE.Vector2(0, 0);
let joystickActive = false;
let joystickStartPos = new THREE.Vector2();

// Game states
let isPlaying = false;
let crystalCountVal = 0;

// Ad simulation state
let activeRewardCallback = null;

// Initialize WebGL/Three.js Scene
function init() {
    const container = document.getElementById('canvas-container');

    // Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);

    // Camera setup
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 12, 18);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(scene.fog.color);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x333344);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 20, 10);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x00f0ff, 1.5, 50);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Create Space background starfield
    createStarfield();

    // Create Player Spaceship
    createSpaceship();

    // Create Space Station (Base)
    createSpaceStation();

    // Populate Asteroids & Crystals
    for (let i = 0; i < 40; i++) {
        spawnAsteroid();
    }
    for (let i = 0; i < 15; i++) {
        spawnCrystal();
    }

    // Setup inputs, UI listeners, and ads setup
    setupControls();
    setupAds();

    // Resize handler
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 1000;
    const starPositions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 500;
        starPositions[i+1] = (Math.random() - 0.5) * 200 - 50; // Keep them lower/higher
        starPositions[i+2] = (Math.random() - 0.5) * 500;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.8,
        transparent: true,
        opacity: 0.8
    });

    const starfield = new THREE.Points(starsGeometry, starMaterial);
    scene.add(starfield);
}

function createSpaceship() {
    // Creating a cool futuristic 3D spaceship composite object
    ship = new THREE.Group();

    // Main fuselage (cyan metallic)
    const bodyGeom = new THREE.ConeGeometry(0.8, 3.5, 8);
    bodyGeom.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x00d2ff,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x003344
    });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    ship.add(bodyMesh);

    // Wings
    const wingGeom = new THREE.BoxGeometry(3, 0.15, 1);
    const wingMat = new THREE.MeshStandardMaterial({
        color: 0x111122,
        metalness: 0.9,
        roughness: 0.1
    });
    const wings = new THREE.Mesh(wingGeom, wingMat);
    wings.position.set(0, -0.2, -0.3);
    ship.add(wings);

    // Wingtips (engines/weapons)
    const engineGeom = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 6);
    engineGeom.rotateX(Math.PI / 2);
    const engineMat = new THREE.MeshStandardMaterial({ color: 0xff3300, metalness: 0.5 });

    const leftEngine = new THREE.Mesh(engineGeom, engineMat);
    leftEngine.position.set(-1.5, -0.2, -0.3);
    ship.add(leftEngine);

    const rightEngine = new THREE.Mesh(engineGeom, engineMat);
    rightEngine.position.set(1.5, -0.2, -0.3);
    ship.add(rightEngine);

    // Engine thruster glow
    const thrusterGeom = new THREE.ConeGeometry(0.25, 0.8, 8);
    thrusterGeom.rotateX(-Math.PI / 2);
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.8 });
    const thrusterGlow = new THREE.Mesh(thrusterGeom, thrusterMat);
    thrusterGlow.position.set(0, -0.1, -1.8);
    ship.add(thrusterGlow);

    ship.position.set(0, 0, 10);
    scene.add(ship);
}

function createSpaceStation() {
    spaceStation = new THREE.Group();

    // Central ring
    const ringGeom = new THREE.TorusGeometry(8, 1.2, 12, 48);
    const stationMat = new THREE.MeshStandardMaterial({
        color: 0x3a3a52,
        metalness: 0.7,
        roughness: 0.3
    });
    const ring = new THREE.Mesh(ringGeom, stationMat);
    ring.rotateX(Math.PI / 2);
    spaceStation.add(ring);

    // Central docking sphere
    const sphereGeom = new THREE.SphereGeometry(3, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x003355,
        metalness: 0.9,
        roughness: 0.1
    });
    const core = new THREE.Mesh(sphereGeom, coreMat);
    spaceStation.add(core);

    // Solar panels arms
    const armGeom = new THREE.BoxGeometry(18, 0.3, 1.5);
    const arm = new THREE.Mesh(armGeom, stationMat);
    spaceStation.add(arm);

    // Position station at origin
    spaceStation.position.set(0, 0, -30);
    scene.add(spaceStation);

    // Adding beacon glow
    const beaconGeom = new THREE.SphereGeometry(0.6, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const beacon = new THREE.Mesh(beaconGeom, beaconMat);
    beacon.position.set(0, 5, -30);
    scene.add(beacon);
}

function spawnAsteroid() {
    const r = 1.2 + Math.random() * 2.5;
    const geom = new THREE.DodecahedronGeometry(r, 1);

    const position = geom.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);

        const offset = 1 + (Math.random() - 0.5) * 0.25;
        position.setXYZ(i, x * offset, y * offset, z * offset);
    }
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        color: 0x6d5e53,
        roughness: 0.9,
        metalness: 0.1,
        bumpScale: 0.05
    });
    const mesh = new THREE.Mesh(geom, mat);

    resetAsteroidPosition(mesh);

    mesh.userData = {
        radius: r,
        health: Math.ceil(r * 3),
        maxHealth: Math.ceil(r * 3),
        rotSpeed: {
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.02
        }
    };

    scene.add(mesh);
    asteroids.push(mesh);
}

function resetAsteroidPosition(mesh) {
    let x, z;
    do {
        x = (Math.random() - 0.5) * 160;
        z = (Math.random() - 0.5) * 160;
    } while (
        Math.hypot(x, z - 10) < 15 ||
        Math.hypot(x, z + 30) < 20
    );

    mesh.position.set(x, 0, z);
}

function spawnCrystal() {
    const geom = new THREE.OctahedronGeometry(0.7, 0);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xff00b7,
        emissive: 0x440033,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9
    });
    const mesh = new THREE.Mesh(geom, mat);

    resetCrystalPosition(mesh);

    mesh.userData = {
        rotSpeed: 0.03 + Math.random() * 0.02
    };

    scene.add(mesh);
    crystals.push(mesh);
}

function resetCrystalPosition(mesh) {
    let x, z;
    do {
        x = (Math.random() - 0.5) * 140;
        z = (Math.random() - 0.5) * 140;
    } while (
        Math.hypot(x, z - 10) < 10 ||
        Math.hypot(x, z + 30) < 15
    );

    mesh.position.set(x, 0, z);
}

function fireLaser() {
    if (fuel <= 0 || !isPlaying) return;

    const laserGeom = new THREE.CylinderGeometry(0.1, 0.1, 2, 6);
    laserGeom.rotateX(Math.PI / 2);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const laserMesh = new THREE.Mesh(laserGeom, laserMat);

    laserMesh.position.copy(ship.position);
    laserMesh.rotation.copy(ship.rotation);

    laserMesh.translateZ(2);

    laserMesh.userData = {
        velocity: new THREE.Vector3(0, 0, 1).applyQuaternion(ship.quaternion).multiplyScalar(1.5),
        life: 50
    };

    scene.add(laserMesh);
    lasers.push(laserMesh);

    fuel = Math.max(0, fuel - 0.5);
    updateUI();
}

function triggerExplosion(pos, colorHex, count = 10) {
    const geom = new THREE.SphereGeometry(0.15, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.8 });

    for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(geom, mat);
        p.position.copy(pos);

        p.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4
            ),
            life: 30 + Math.random() * 20
        };

        scene.add(p);
        particles.push(p);
    }
}

function setupControls() {
    const joyContainer = document.getElementById('joystick-container');
    const joyKnob = document.getElementById('joystick-knob');

    function handleStart(e) {
        joystickActive = true;
        const pageX = e.touches ? e.touches[0].clientX : e.clientX;
        const pageY = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = joyContainer.getBoundingClientRect();
        joystickStartPos.set(rect.left + rect.width / 2, rect.top + rect.height / 2);

        handleMove(e);
    }

    function handleMove(e) {
        if (!joystickActive) return;
        const pageX = e.touches ? e.touches[0].clientX : e.clientX;
        const pageY = e.touches ? e.touches[0].clientY : e.clientY;

        const offset = new THREE.Vector2(pageX - joystickStartPos.x, pageY - joystickStartPos.y);
        const distance = offset.length();
        const maxDist = 50;

        if (distance > maxDist) {
            offset.normalize().multiplyScalar(maxDist);
        }

        joyKnob.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
        moveVector.set(offset.x / maxDist, -offset.y / maxDist);
    }

    function handleEnd() {
        joystickActive = false;
        joyKnob.style.transform = `translate(0px, 0px)`;
        moveVector.set(0, 0);
    }

    joyContainer.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    joyContainer.addEventListener('touchstart', handleStart);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    const laserBtn = document.getElementById('laser-btn');
    laserBtn.addEventListener('mousedown', (e) => { e.preventDefault(); fireLaser(); });
    laserBtn.addEventListener('touchstart', (e) => { e.preventDefault(); fireLaser(); });

    window.addEventListener('keydown', (e) => {
        if (!isPlaying) return;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') moveVector.y = 1;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') moveVector.y = -1;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveVector.x = -1;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') moveVector.x = 1;
        if (e.code === 'Space') fireLaser();
    });

    window.addEventListener('keyup', (e) => {
        if (!isPlaying) return;
        if (['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown'].includes(e.code)) moveVector.y = 0;
        if (['KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight'].includes(e.code)) moveVector.x = 0;
    });

    const shopBtn = document.getElementById('shop-btn');
    const shopModal = document.getElementById('shop-modal');
    const closeShop = document.getElementById('close-shop');

    shopBtn.addEventListener('click', () => {
        const dist = ship.position.distanceTo(spaceStation.position);
        if (dist < 15) {
            shopModal.style.display = 'block';
            updateShopButtons();

            // Trigger sponsor interstitial occasionally on docking
            if (Math.random() < 0.4) {
                showInterstitialAd();
            }
        } else {
            alert('Підлетить ближче до Космічної Станції щоб зайти в магазин! (Вона позначена яскравим неоновим світлом)');
        }
    });

    closeShop.addEventListener('click', () => {
        shopModal.style.display = 'none';
    });

    document.getElementById('sell-all-btn').addEventListener('click', () => {
        if (cargo > 0) {
            const earnings = cargo * 15 + crystalCountVal * 40;
            money += earnings;
            cargo = 0;
            crystalCountVal = 0;
            triggerExplosion(spaceStation.position, 0x00ff00, 20);
            updateUI();
            updateShopButtons();
        }
    });

    // Rewarded option: sell for 2x cash!
    document.getElementById('sell-all-double-btn').addEventListener('click', () => {
        if (cargo > 0 || crystalCountVal > 0) {
            playRewardedAd(() => {
                const earnings = (cargo * 15 + crystalCountVal * 40) * 2;
                money += earnings;
                cargo = 0;
                crystalCountVal = 0;
                triggerExplosion(spaceStation.position, 0xffff00, 30);
                updateUI();
                updateShopButtons();
                alert(`Подвійний продаж проведено успішно! Отримано $${earnings}! 💰💰`);
            });
        }
    });

    document.getElementById('refuel-btn').addEventListener('click', () => {
        if (money >= 10 && fuel < 100) {
            money -= 10;
            fuel = 100;
            updateUI();
            updateShopButtons();
        }
    });

    // Rewarded option: refuel with a video
    document.getElementById('refuel-ad-btn').addEventListener('click', () => {
        if (fuel < 100) {
            playRewardedAd(() => {
                fuel = 100;
                updateUI();
                updateShopButtons();
                alert('Корабель повністю заправлено за допомогою спонсорського палива! 🚀');
            });
        }
    });

    document.getElementById('upgrade-cargo-btn').addEventListener('click', () => {
        if (money >= upgradeCargoCost) {
            money -= upgradeCargoCost;
            cargoMax += 10;
            upgradeCargoCost = Math.ceil(upgradeCargoCost * 1.8);
            document.getElementById('upgrade-cargo-btn').innerText = `Купити ($${upgradeCargoCost})`;
            updateUI();
            updateShopButtons();
        }
    });

    document.getElementById('upgrade-laser-btn').addEventListener('click', () => {
        if (money >= upgradeLaserCost) {
            money -= upgradeLaserCost;
            laserDamage += 1;
            upgradeLaserCost = Math.ceil(upgradeLaserCost * 2);
            document.getElementById('upgrade-laser-btn').innerText = `Купити ($${upgradeLaserCost})`;
            updateUI();
            updateShopButtons();
        }
    });

    document.getElementById('upgrade-speed-btn').addEventListener('click', () => {
        if (money >= upgradeSpeedCost) {
            money -= upgradeSpeedCost;
            shipSpeedMultiplier += 0.2;
            upgradeSpeedCost = Math.ceil(upgradeSpeedCost * 1.5);
            document.getElementById('upgrade-speed-btn').innerText = `Купити ($${upgradeSpeedCost})`;
            updateUI();
            updateShopButtons();
        }
    });

    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('intro-screen').style.display = 'none';
        isPlaying = true;
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        document.getElementById('gameover-screen').style.display = 'none';
        resetGame();
    });

    // Rewarded option: revive player ship
    document.getElementById('revive-ad-btn').addEventListener('click', () => {
        playRewardedAd(() => {
            document.getElementById('gameover-screen').style.display = 'none';
            fuel = 50; // Give some fuel
            cargo = 0; // Clear cargo
            ship.position.set(0, 0, 10);
            ship.rotation.set(0, 0, 0);
            isPlaying = true;
            updateUI();
            alert('Ваш корабель було відновлено спонсорськими наномашинами! Продовжуємо місію!');
        });
    });
}

function setupAds() {
    // Banner Close click handler
    document.getElementById('close-banner-btn').addEventListener('click', () => {
        document.getElementById('ad-banner').style.display = 'none';
    });

    // Interstitial Close click handler
    document.getElementById('close-interstitial-btn').addEventListener('click', () => {
        document.getElementById('ad-interstitial').style.display = 'none';
        isPlaying = true;
    });

    // Rotation of banner ad texts to make it live!
    const bannerAds = [
        { title: "КосмоЛот Казино! 🎰", desc: "Вигравай реальні мільйони на рахунок!" },
        { title: "Новий Тариф Лайфселл 📱", desc: "Безлімітний інтернет за 120 грн/місяць!" },
        { title: "Доставка Rozetka 📦", desc: "Купуй будь-що з безкоштовною доставкою!" },
        { title: "Glovo Доставка 🍕", desc: "Знижка -20% на перше замовлення їжі!" }
    ];
    let currentAdIdx = 0;
    setInterval(() => {
        currentAdIdx = (currentAdIdx + 1) % bannerAds.length;
        document.getElementById('banner-title').innerText = bannerAds[currentAdIdx].title;
        document.getElementById('banner-desc').innerText = bannerAds[currentAdIdx].desc;
    }, 10000);
}

function showInterstitialAd() {
    isPlaying = false;
    document.getElementById('ad-interstitial').style.display = 'flex';
}

function playRewardedAd(callback) {
    isPlaying = false;
    // Pause other modals
    document.getElementById('shop-modal').style.display = 'none';

    const adRewarded = document.getElementById('ad-rewarded');
    const timerText = document.getElementById('ad-rewarded-timer');
    adRewarded.style.display = 'flex';

    let countdown = 5;
    timerText.innerText = `Зачекайте: ${countdown}с`;

    const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            timerText.innerText = `Зачекайте: ${countdown}с`;
        } else {
            clearInterval(interval);
            adRewarded.style.display = 'none';
            isPlaying = true;
            callback();
        }
    }, 1000);
}

function updateShopButtons() {
    document.getElementById('sell-all-btn').disabled = (cargo === 0 && crystalCountVal === 0);
    document.getElementById('sell-all-double-btn').disabled = (cargo === 0 && crystalCountVal === 0);
    document.getElementById('refuel-btn').disabled = (money < 10 || fuel === 100);
    document.getElementById('refuel-ad-btn').disabled = (fuel === 100);
    document.getElementById('upgrade-cargo-btn').disabled = (money < upgradeCargoCost);
    document.getElementById('upgrade-laser-btn').disabled = (money < upgradeLaserCost);
    document.getElementById('upgrade-speed-btn').disabled = (money < upgradeSpeedCost);
}

function updateUI() {
    document.getElementById('crystal-count').innerText = crystalCountVal;
    document.getElementById('money-count').innerText = money;
    document.getElementById('fuel-count').innerText = Math.round(fuel);
    document.getElementById('cargo-count').innerText = cargo;
    document.getElementById('cargo-max').innerText = cargoMax;
}

function resetGame() {
    score = 0;
    money = 0;
    cargo = 0;
    cargoMax = 20;
    fuel = 100;
    laserDamage = 1;
    shipSpeedMultiplier = 1;
    crystalCountVal = 0;

    upgradeCargoCost = 50;
    upgradeLaserCost = 100;
    upgradeSpeedCost = 75;

    document.getElementById('upgrade-cargo-btn').innerText = 'Купити';
    document.getElementById('upgrade-laser-btn').innerText = 'Купити';
    document.getElementById('upgrade-speed-btn').innerText = 'Купити';

    ship.position.set(0, 0, 10);
    ship.rotation.set(0, 0, 0);

    asteroids.forEach(ast => resetAsteroidPosition(ast));
    crystals.forEach(cry => resetCrystalPosition(cry));

    isPlaying = true;
    updateUI();

    // Occasional fullscreen ad on new game start
    if (Math.random() < 0.5) {
        showInterstitialAd();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Game Animation Loop
function animate() {
    requestAnimationFrame(animate);

    if (isPlaying) {
        updateGameLogic();
    }

    if (spaceStation) {
        spaceStation.rotation.y += 0.002;
    }

    renderer.render(scene, camera);
}

function updateGameLogic() {
    if (moveVector.length() > 0.05) {
        const speed = 0.25 * shipSpeedMultiplier;

        ship.rotation.y -= moveVector.x * 0.05;

        const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.quaternion);
        ship.position.addScaledVector(direction, moveVector.y * speed);

        fuel = Math.max(0, fuel - 0.03);
        updateUI();
    }

    if (fuel <= 0) {
        gameOver("У вас закінчилось паливо!");
    }

    const offset = new THREE.Vector3(0, 8, -14).applyQuaternion(ship.quaternion);
    const targetCamPos = ship.position.clone().add(offset);
    camera.position.lerp(targetCamPos, 0.1);
    camera.lookAt(ship.position.clone().add(new THREE.Vector3(0, 1, 4).applyQuaternion(ship.quaternion)));

    asteroids.forEach(ast => {
        ast.rotation.x += ast.userData.rotSpeed.x;
        ast.rotation.y += ast.userData.rotSpeed.y;
        ast.rotation.z += ast.userData.rotSpeed.z;
    });

    crystals.forEach(cry => {
        cry.rotation.y += cry.userData.rotSpeed;
    });

    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.position.add(laser.userData.velocity);
        laser.userData.life--;

        let removed = false;

        for (let j = asteroids.length - 1; j >= 0; j--) {
            const ast = asteroids[j];
            const dist = laser.position.distanceTo(ast.position);

            if (dist < ast.userData.radius) {
                ast.userData.health -= laserDamage;
                triggerExplosion(laser.position, 0xffaa00, 5);

                scene.remove(laser);
                lasers.splice(i, 1);
                removed = true;

                if (ast.userData.health <= 0) {
                    triggerExplosion(ast.position, 0x8d7e73, 15);

                    if (cargo < cargoMax) {
                        cargo = Math.min(cargoMax, cargo + Math.ceil(ast.userData.radius));
                        updateUI();
                    }

                    resetAsteroidPosition(ast);
                    ast.userData.health = ast.userData.maxHealth;
                }
                break;
            }
        }

        if (removed) continue;

        if (laser.userData.life <= 0) {
            scene.remove(laser);
            lasers.splice(i, 1);
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.velocity);
        p.userData.life--;
        p.material.opacity = p.userData.life / 50;

        if (p.userData.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }

    for (let i = crystals.length - 1; i >= 0; i--) {
        const cry = crystals[i];
        const dist = ship.position.distanceTo(cry.position);

        if (dist < 1.8) {
            if (cargo < cargoMax) {
                crystalCountVal++;
                cargo = Math.min(cargoMax, cargo + 1);
                triggerExplosion(cry.position, 0xff00b7, 12);
                resetCrystalPosition(cry);
                updateUI();
            }
        }
    }

    for (let i = 0; i < asteroids.length; i++) {
        const ast = asteroids[i];
        const dist = ship.position.distanceTo(ast.position);

        if (dist < (ast.userData.radius + 0.8)) {
            triggerExplosion(ship.position, 0xff3300, 30);
            gameOver("Ваш корабель розбився об астероїд!");
            break;
        }
    }
}

function gameOver(message) {
    isPlaying = false;
    document.getElementById('gameover-stats').innerHTML = `${message}<br><br>Зібрано кристалів: ${crystalCountVal}<br>Баланс: $${money}`;
    document.getElementById('gameover-screen').style.display = 'flex';
}

// Start game setup
window.onload = () => {
    init();
    updateUI();
};
