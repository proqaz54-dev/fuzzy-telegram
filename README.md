# Space Miner 3D

Futuristic 3D space adventure game created using Three.js and Android WebView, optimized for mobile with on-screen virtual joystick and action controls, fully built and ready to be published on APKPure or Google Play Store.

## Features

- **3D Gameplay**: Fully realized 3D space flight with starfield background, procedural asteroids, glowing crystals, lasers, and a giant sci-fi Space Station.
- **Mobile Optimized**: Custom responsive HUD, touch-friendly virtual joystick for orientation/movement, and a physical "LASER" action button.
- **Game Loop**: Shoot and destroy asteroids to harvest ore, collect shiny space crystals, buy ship upgrades (cargo capacity, laser damage, flight speed) and refuel. Watch out for asteroid impacts and complete fuel depletion!
- **Playable on Android**: Implemented inside an Android native container running a highly-optimized full-screen WebView with hardware acceleration enabled.
- **Ready APK**: Fully compiled, zipalign-optimized, and signed production APK (`SpaceMiner3D.apk`) included!

## Project Structure

- `src/index.html`: Main index template with UI layouts, responsive CSS styles, and structural layouts.
- `src/index.js`: Game logic, rendering logic, controls, upgrading mechanics, and collision detection implemented using Three.js.
- `webpack.config.cjs`: Asset compilation configuration.
- `android/`: Native Android project structure wrapper.
- `SpaceMiner3D.apk`: Production Android build of the game, ready for distribution.

## How to build manually

1. Install project dependencies:
   ```bash
   npm install
   ```
2. Build the game assets (HTML + JS bundle):
   ```bash
   npm run build
   ```
3. Open `android/` with Android Studio, or compile directly using gradle:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
