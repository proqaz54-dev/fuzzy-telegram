import * as THREE from 'three';

// State variables
let scene, camera, renderer;
let ship;
let blasterRifle; // First-person blaster rifle mesh
let asteroids = [];
let crystals = [];
let enemyDrones = []; // Hostile AI drones
let lasers = []; // Player laser bolts
let enemyLasers = []; // Enemy drone laser bolts
let particles = [];
let spaceStation;

// Game stats
let money = 0;
let cargo = 0;
let cargoMax = 20;
let fuel = 100;
let laserDamage = 1;
let shipSpeedMultiplier = 1;

// Shooter Specific Stats
let playerHP = 100;
let playerShield = 100;
let ammoClip = 30;
let ammoClipMax = 30;
let isReloading = false;

// Upgrade costs
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
let frameCount = 0;

// Camera Recoil
let cameraShakeAmount = 0;
let weaponSwayTime = 0;

// Initialize WebGL/Three.js Scene
function init() {
    const container = document.getElementById('canvas-container');

    // Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0505, 0.018); // Dark military red-shaded space fog

    // Camera setup
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4, 15);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(scene.fog.color);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x221111);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff5533, 1.5); // Intense red-orange sun light
    dirLight.position.set(10, 30, 15);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xff3300, 2.0, 60);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Create Space background starfield
    createStarfield();

    // Create Player Spaceship Wrapper
    ship = new THREE.Group();
    ship.position.set(0, 0, 10);
    scene.add(ship);

    // Create 3D Tactical Blaster Rifle attached directly to the camera (First-Person Call of Duty Style)
    createTacticalBlaster();

    // Create Military Defense Space Station (Base)
    createSpaceStation();

    // Populate Asteroids, Crystals & Hostile AI Drones
    for (let i = 0; i < 40; i++) {
        spawnAsteroid();
    }
    for (let i = 0; i < 15; i++) {
        spawnCrystal();
    }
    for (let i = 0; i < 8; i++) {
        spawnEnemyDrone();
    }

    // Setup inputs & UI listeners
    setupControls();
    setupAds();

    // Resize handler
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 1200;
    const starPositions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 600;
        starPositions[i+1] = (Math.random() - 0.5) * 300 - 40;
        starPositions[i+2] = (Math.random() - 0.5) * 600;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffaa66, // Orange-tinted dust stars
        size: 0.9,
        transparent: true,
        opacity: 0.8
    });

    const starfield = new THREE.Points(starsGeometry, starMaterial);
    scene.add(starfield);
}

function createTacticalBlaster() {
    blasterRifle = new THREE.Group();

    // Rifle Main Barrel (Futuristic carbon-metallic box)
    const barrelGeom = new THREE.BoxGeometry(0.3, 0.25, 1.8);
    const metalMat = new THREE.MeshStandardMaterial({
        color: 0x11161b,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x030508
    });
    const barrel = new THREE.Mesh(barrelGeom, metalMat);
    barrel.position.set(0, 0, -0.6);
    blasterRifle.add(barrel);

    // Laser Sight Scope with holographic light
    const scopeGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
    scopeGeom.rotateX(Math.PI / 2);
    const scope = new THREE.Mesh(scopeGeom, metalMat);
    scope.position.set(0, 0.2, -0.4);
    blasterRifle.add(scope);

    const scopeLensGeom = new THREE.CircleGeometry(0.06, 8);
    const redGlowMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const lens = new THREE.Mesh(scopeLensGeom, redGlowMat);
    lens.position.set(0, 0.2, -0.65);
    blasterRifle.add(lens);

    // High-tech heat venting cells
    const ventGeom = new THREE.BoxGeometry(0.34, 0.12, 0.8);
    const ventMat = new THREE.MeshStandardMaterial({
        color: 0x330000,
        emissive: 0xff1100,
        metalness: 0.5
    });
    const vents = new THREE.Mesh(ventGeom, ventMat);
    vents.position.set(0, -0.05, -0.8);
    blasterRifle.add(vents);

    // Attach the weapon group to the camera for true first person shooter weapon modeling
    camera.add(blasterRifle);

    // Position weapon in the bottom-right relative to camera viewport
    blasterRifle.position.set(1.1, -0.9, -1.8);
    blasterRifle.rotation.set(-0.05, -0.15, 0);
    scene.add(camera);
}

function createSpaceStation() {
    spaceStation = new THREE.Group();

    // Heavy military defense armor core ring
    const ringGeom = new THREE.TorusGeometry(10, 1.6, 16, 64);
    const stationMat = new THREE.MeshStandardMaterial({
        color: 0x242b35,
        metalness: 0.85,
        roughness: 0.2
    });
    const ring = new THREE.Mesh(ringGeom, stationMat);
    ring.rotateX(Math.PI / 2);
    spaceStation.add(ring);

    // Defensive laser batteries on station
    const turretGeom = new THREE.CylinderGeometry(0.4, 0.4, 2.5, 8);
    turretGeom.rotateX(Math.PI / 2);
    const turret = new THREE.Mesh(turretGeom, stationMat);
    turret.position.set(0, 3, 0);
    spaceStation.add(turret);

    const coreGeom = new THREE.SphereGeometry(3.5, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0x661100,
        metalness: 0.9,
        roughness: 0.1
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    spaceStation.add(core);

    spaceStation.position.set(0, 0, -30);
    scene.add(spaceStation);

    // Glowing military beacon
    const beaconGeom = new THREE.SphereGeometry(0.8, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
    const beacon = new THREE.Mesh(beaconGeom, beaconMat);
    beacon.position.set(0, 7, -30);
    scene.add(beacon);
}

function spawnAsteroid() {
    const r = 1.2 + Math.random() * 2.8;
    const geom = new THREE.DodecahedronGeometry(r, 1);

    const position = geom.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        const offset = 1 + (Math.random() - 0.5) * 0.28;
        position.setXYZ(i, x * offset, y * offset, z * offset);
    }
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        color: 0x483d35,
        roughness: 0.9,
        metalness: 0.2
    });
    const mesh = new THREE.Mesh(geom, mat);

    resetAsteroidPosition(mesh);

    mesh.userData = {
        radius: r,
        health: Math.ceil(r * 4),
        maxHealth: Math.ceil(r * 4),
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
        x = (Math.random() - 0.5) * 180;
        z = (Math.random() - 0.5) * 180;
    } while (
        Math.hypot(x, z - 10) < 18 ||
        Math.hypot(x, z + 30) < 22
    );
    mesh.position.set(x, 0, z);
}

function spawnCrystal() {
    const geom = new THREE.OctahedronGeometry(0.8, 0);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xffbb00, // Golden glowing core crystal
        emissive: 0x553300,
        metalness: 0.3,
        roughness: 0.1,
        transparent: true,
        opacity: 0.95
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
        x = (Math.random() - 0.5) * 150;
        z = (Math.random() - 0.5) * 150;
    } while (
        Math.hypot(x, z - 10) < 12 ||
        Math.hypot(x, z + 30) < 18
    );
    mesh.position.set(x, 0, z);
}

function spawnEnemyDrone() {
    // Futuristic combat alien drone (sharp Octahedron armor)
    const drone = new THREE.Group();

    const geom = new THREE.OctahedronGeometry(1.2, 0);
    const armorMat = new THREE.MeshStandardMaterial({
        color: 0xff1100, // Blood red military hostile
        emissive: 0x3a0000,
        metalness: 0.9,
        roughness: 0.1
    });
    const hull = new THREE.Mesh(geom, armorMat);
    drone.add(hull);

    // Side plasma wing guards
    const guardGeom = new THREE.BoxGeometry(2.4, 0.2, 0.4);
    const wingGuard = new THREE.Mesh(guardGeom, armorMat);
    drone.add(wingGuard);

    resetEnemyDronePosition(drone);

    drone.userData = {
        health: 5,
        maxHealth: 5,
        velocity: new THREE.Vector3(),
        fireCooldown: Math.random() * 60
    };

    scene.add(drone);
    enemyDrones.push(drone);
}

function resetEnemyDronePosition(drone) {
    let x, z;
    do {
        x = (Math.random() - 0.5) * 160;
        z = (Math.random() - 0.5) * 160;
    } while (
        Math.hypot(x, z - 10) < 25 ||
        Math.hypot(x, z + 30) < 25
    );
    drone.position.set(x, (Math.random() - 0.5) * 10, z);
}

function triggerHitmarker() {
    const h = document.getElementById('hitmarker');
    h.style.display = 'block';
    setTimeout(() => {
        h.style.display = 'none';
    }, 120);
}

function triggerDamageFlash() {
    const d = document.getElementById('damage-indicator');
    d.style.border = '20px solid rgba(255, 0, 0, 0.8)';
    d.style.background = 'rgba(255, 0, 0, 0.15)';
    setTimeout(() => {
        d.style.border = '0px solid rgba(255, 0, 0, 0)';
        d.style.background = 'rgba(255, 0, 0, 0)';
    }, 150);
}

function fireLaser() {
    if (fuel <= 0 || !isPlaying || isReloading) return;
    if (ammoClip <= 0) {
        reloadBlaster();
        return;
    }

    // Firing Recoil Shake & Sway Pull-Up
    cameraShakeAmount = 0.15;
    blasterRifle.position.z += 0.25; // Visual recoil kick back
    blasterRifle.position.y += 0.1;  // Recoil pull up

    // Spawn player plasma tracer bolt
    const laserGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6);
    laserGeom.rotateX(Math.PI / 2);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const laserMesh = new THREE.Mesh(laserGeom, laserMat);

    // Position at gun barrel tip
    const gunTip = new THREE.Vector3(0, 0, -1).applyMatrix4(blasterRifle.matrixWorld);
    laserMesh.position.copy(gunTip);
    laserMesh.rotation.copy(camera.rotation);

    // Direct forward bullet speed vector
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    laserMesh.userData = {
        velocity: dir.multiplyScalar(2.2),
        life: 55
    };

    scene.add(laserMesh);
    lasers.push(laserMesh);

    ammoClip--;
    fuel = Math.max(0, fuel - 0.4);
    updateUI();
}

function reloadBlaster() {
    if (isReloading || ammoClip === ammoClipMax) return;
    isReloading = true;
    document.getElementById('reload-btn').innerText = 'RELOADING...';

    // Spin/Rotational reload animations
    let spinAngle = 0;
    const reloadInterval = setInterval(() => {
        if (!isPlaying) {
            clearInterval(reloadInterval);
            return;
        }
        spinAngle += 0.2;
        blasterRifle.rotation.z = spinAngle;
        blasterRifle.position.y = -0.9 - Math.sin(spinAngle) * 0.15;

        if (spinAngle >= Math.PI * 2) {
            clearInterval(reloadInterval);
            blasterRifle.rotation.set(-0.05, -0.15, 0);
            blasterRifle.position.set(1.1, -0.9, -1.8);
            ammoClip = ammoClipMax;
            isReloading = false;
            document.getElementById('reload-btn').innerText = 'RELOAD (R)';
            updateUI();
        }
    }, 45);
}

function fireEnemyLaser(drone) {
    const laserGeom = new THREE.CylinderGeometry(0.1, 0.1, 1.8, 6);
    laserGeom.rotateX(Math.PI / 2);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
    const laserMesh = new THREE.Mesh(laserGeom, laserMat);

    laserMesh.position.copy(drone.position);

    // Vector pointing directly to player ship
    const dir = new THREE.Vector3().subVectors(ship.position, drone.position).normalize();
    laserMesh.lookAt(ship.position);

    laserMesh.userData = {
        velocity: dir.multiplyScalar(1.1),
        life: 80
    };

    scene.add(laserMesh);
    enemyLasers.push(laserMesh);
}

function triggerExplosion(pos, colorHex, count = 12) {
    const geom = new THREE.SphereGeometry(0.12, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });

    for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(geom, mat);
        p.position.copy(pos);

        p.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.45,
                (Math.random() - 0.5) * 0.45,
                (Math.random() - 0.5) * 0.45
            ),
            life: 25 + Math.random() * 20
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

    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
        if (!isPlaying) return;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') moveVector.y = 1;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') moveVector.y = -1;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveVector.x = -1;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') moveVector.x = 1;
        if (e.code === 'Space') fireLaser();
        if (e.code === 'KeyR') reloadBlaster();
    });

    window.addEventListener('keyup', (e) => {
        if (!isPlaying) return;
        if (['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown'].includes(e.code)) moveVector.y = 0;
        if (['KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight'].includes(e.code)) moveVector.x = 0;
    });

    document.getElementById('reload-btn').addEventListener('click', reloadBlaster);

    const shopBtn = document.getElementById('shop-btn');
    const shopModal = document.getElementById('shop-modal');
    const closeShop = document.getElementById('close-shop');

    shopBtn.addEventListener('click', () => {
        const dist = ship.position.distanceTo(spaceStation.position);
        if (dist < 15) {
            shopModal.style.display = 'block';
            updateShopButtons();

            if (Math.random() < 0.4) {
                showInterstitialAd();
            }
        } else {
            alert('Підлетить ближче до Військової Станції! (Вона позначена яскравим неоновим світлом)');
        }
    });

    closeShop.addEventListener('click', () => {
        shopModal.style.display = 'none';
    });

    document.getElementById('sell-all-btn').addEventListener('click', () => {
        if (cargo > 0 || crystalCountVal > 0) {
            const earnings = cargo * 15 + crystalCountVal * 40;
            money += earnings;
            cargo = 0;
            crystalCountVal = 0;
            triggerExplosion(spaceStation.position, 0x00ff00, 20);
            updateUI();
            updateShopButtons();
        }
    });

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
                alert(`Подвійний продаж проведено успішно! Отримано $${earnings} кредитів! 💰`);
            });
        }
    });

    document.getElementById('refuel-btn').addEventListener('click', () => {
        if (money >= 10 && (fuel < 100 || playerShield < 100)) {
            money -= 10;
            fuel = 100;
            playerShield = 100;
            updateUI();
            updateShopButtons();
        }
    });

    document.getElementById('refuel-ad-btn').addEventListener('click', () => {
        if (fuel < 100 || playerShield < 100) {
            playRewardedAd(() => {
                fuel = 100;
                playerShield = 100;
                updateUI();
                updateShopButtons();
                alert('Щити відновлено та корабель повністю заправлено безкоштовно! 🛡️🚀');
            });
        }
    });

    document.getElementById('upgrade-cargo-btn').addEventListener('click', () => {
        if (money >= upgradeCargoCost) {
            money -= upgradeCargoCost;
            ammoClipMax += 10;
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

    document.getElementById('revive-ad-btn').addEventListener('click', () => {
        playRewardedAd(() => {
            document.getElementById('gameover-screen').style.display = 'none';
            playerHP = 100;
            playerShield = 100;
            fuel = 100;
            cargo = 0;
            ship.position.set(0, 0, 10);
            ship.rotation.set(0, 0, 0);
            isPlaying = true;
            updateUI();
            alert('Ваш корабель відроджено! Продовжуємо бій! ⚔️');
        });
    });
}

function setupAds() {
    document.getElementById('close-banner-btn').addEventListener('click', () => {
        document.getElementById('ad-banner').style.display = 'none';
    });
    document.getElementById('close-interstitial-btn').addEventListener('click', () => {
        document.getElementById('ad-interstitial').style.display = 'none';
        isPlaying = true;
    });

    const bannerAds = [
        { title: "Black Ops 6! 💥", desc: "Грай у найнапруженішу гру року прямо зараз!" },
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
    const cargoFull = (cargo === 0 && crystalCountVal === 0);
    document.getElementById('sell-all-btn').disabled = cargoFull;
    document.getElementById('sell-all-double-btn').disabled = cargoFull;
    document.getElementById('refuel-btn').disabled = (money < 10 || (fuel === 100 && playerShield === 100));
    document.getElementById('refuel-ad-btn').disabled = (fuel === 100 && playerShield === 100);
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

    // Tactical HUD bars
    document.getElementById('hp-bar-fill').style.width = `${Math.max(0, playerHP)}%`;
    document.getElementById('shield-bar-fill').style.width = `${Math.max(0, playerShield)}%`;
    document.getElementById('ammo-clip').innerText = ammoClip;
    document.getElementById('ammo-max').innerText = ammoClipMax;
}

function resetGame() {
    money = 0;
    cargo = 0;
    cargoMax = 20;
    fuel = 100;
    laserDamage = 1;
    shipSpeedMultiplier = 1;
    crystalCountVal = 0;
    playerHP = 100;
    playerShield = 100;
    ammoClip = ammoClipMax;
    isReloading = false;

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
    enemyDrones.forEach(drone => resetEnemyDronePosition(drone));

    isPlaying = true;
    updateUI();

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
    frameCount++;

    // Weapon Recoil Recovery & Sway breathing physics
    if (cameraShakeAmount > 0.01) {
        cameraShakeAmount *= 0.9;
        // Apply micro shake to camera
        camera.position.x += (Math.random() - 0.5) * cameraShakeAmount;
        camera.position.y += (Math.random() - 0.5) * cameraShakeAmount;
    }

    // Smooth weapon recoil return
    blasterRifle.position.z = THREE.MathUtils.lerp(blasterRifle.position.z, -1.8, 0.15);
    blasterRifle.position.y = THREE.MathUtils.lerp(blasterRifle.position.y, -0.9, 0.15);

    // Idle breathing sway
    weaponSwayTime += 0.03;
    if (!isReloading) {
        blasterRifle.position.x = 1.1 + Math.sin(weaponSwayTime) * 0.02;
        blasterRifle.position.y += Math.cos(weaponSwayTime * 2) * 0.008;
    }

    // 1. Ship movement & controls
    if (moveVector.length() > 0.05) {
        const speed = 0.28 * shipSpeedMultiplier;

        ship.rotation.y -= moveVector.x * 0.055;

        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
        ship.position.addScaledVector(direction, -moveVector.y * speed);

        fuel = Math.max(0, fuel - 0.04);
        updateUI();
    }

    if (fuel <= 0) {
        gameOver("У вас закінчилось паливо!");
    }

    // Camera follow player (Rigid 1st Person Shooter Mode)
    camera.position.copy(ship.position);
    camera.rotation.copy(ship.rotation);

    // 2. Rotate obstacles
    asteroids.forEach(ast => {
        ast.rotation.x += ast.userData.rotSpeed.x;
        ast.rotation.y += ast.userData.rotSpeed.y;
        ast.rotation.z += ast.userData.rotSpeed.z;
    });

    crystals.forEach(cry => {
        cry.rotation.y += cry.userData.rotSpeed;
    });

    // 3. AI Combat Sentry Drones tracking & firing
    enemyDrones.forEach(drone => {
        // Fly towards player
        const dist = drone.position.distanceTo(ship.position);
        if (dist > 15 && dist < 70) {
            const dir = new THREE.Vector3().subVectors(ship.position, drone.position).normalize();
            drone.position.addScaledVector(dir, 0.1);
        }

        // Face player
        drone.lookAt(ship.position);

        // Fire laser cooldowns
        drone.userData.fireCooldown--;
        if (drone.userData.fireCooldown <= 0 && dist < 50 && isPlaying) {
            fireEnemyLaser(drone);
            drone.userData.fireCooldown = 90 + Math.random() * 50;
        }
    });

    // 4. Update Player Lasers
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.position.add(laser.userData.velocity);
        laser.userData.life--;

        let removed = false;

        // Collide with asteroids
        for (let j = asteroids.length - 1; j >= 0; j--) {
            const ast = asteroids[j];
            const dist = laser.position.distanceTo(ast.position);

            if (dist < ast.userData.radius) {
                ast.userData.health -= laserDamage;
                triggerExplosion(laser.position, 0xffaa00, 5);
                triggerHitmarker();

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

        // Collide with Enemy Drones
        for (let j = enemyDrones.length - 1; j >= 0; j--) {
            const drone = enemyDrones[j];
            const dist = laser.position.distanceTo(drone.position);

            if (dist < 1.8) {
                drone.userData.health -= laserDamage;
                triggerExplosion(laser.position, 0xff3300, 8);
                triggerHitmarker();

                scene.remove(laser);
                lasers.splice(i, 1);
                removed = true;

                if (drone.userData.health <= 0) {
                    triggerExplosion(drone.position, 0xff1100, 25);
                    money += 35; // Award credits for destroying hostiles
                    resetEnemyDronePosition(drone);
                    drone.userData.health = drone.userData.maxHealth;
                    updateUI();
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

    // 5. Update Enemy Lasers (Hits player)
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        const elaser = enemyLasers[i];
        elaser.position.add(elaser.userData.velocity);
        elaser.userData.life--;

        const dist = elaser.position.distanceTo(ship.position);
        if (dist < 1.6) {
            // Player hit!
            scene.remove(elaser);
            enemyLasers.splice(i, 1);
            triggerExplosion(ship.position, 0xff0000, 10);
            triggerDamageFlash();

            // Damage Shields first, then Health
            if (playerShield > 0) {
                playerShield = Math.max(0, playerShield - 15);
            } else {
                playerHP = Math.max(0, playerHP - 10);
            }
            updateUI();

            if (playerHP <= 0) {
                gameOver("Вас знищили ворожі дрони прибульців!");
            }
            continue;
        }

        if (elaser.userData.life <= 0) {
            scene.remove(elaser);
            enemyLasers.splice(i, 1);
        }
    }

    // 6. Update particle system
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

    // 7. Collisions: Ship with Crystals
    for (let i = crystals.length - 1; i >= 0; i--) {
        const cry = crystals[i];
        const dist = ship.position.distanceTo(cry.position);

        if (dist < 1.8) {
            if (cargo < cargoMax) {
                crystalCountVal++;
                cargo = Math.min(cargoMax, cargo + 1);
                triggerExplosion(cry.position, 0xffbb00, 12);
                resetCrystalPosition(cry);
                updateUI();
            }
        }
    }

    // 8. Collisions: Ship with Asteroids (Crashing)
    for (let i = 0; i < asteroids.length; i++) {
        const ast = asteroids[i];
        const dist = ship.position.distanceTo(ast.position);

        if (dist < (ast.userData.radius + 1.2)) {
            triggerExplosion(ship.position, 0xff3300, 30);
            triggerDamageFlash();
            gameOver("Ви розбилися об астероїд!");
            break;
        }
    }
}

function gameOver(message) {
    isPlaying = false;
    document.getElementById('gameover-stats').innerHTML = `${message}<br><br>Зібрано кристалів: ${crystalCountVal}<br>Баланс: $${money} кредитів`;
    document.getElementById('gameover-screen').style.display = 'flex';
}

// Start game setup
window.onload = () => {
    init();
    updateUI();
};
