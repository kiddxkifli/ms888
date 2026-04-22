// --- Global Variables and Constants ---
const API_BASE = "http://localhost:8000"; // Assuming backend runs locally on port 8000
const ADMIN_KEY = "your-admin-key-here"; // From backend prompt config

let scene, camera, renderer;
let slotMachine3DGroup = null; // Main group for the slot machine in 3D space
let playerInfo = null;
let gameConfig = null;
let activeSymbols = [];
let reels3D = []; // Array to hold individual reel group objects
let currentBet = 0;
let animationFrameId = null;

// Animation State Variables
let isSpinning = false;
let spinAnimations = []; // Stores data for each reel's animation state

// DOM Elements Cache
let authSection, gameUI, loginForm, signupForm, loginPlayerIdInput, loginButton, showSignupLink, signupButton, showLoginLink, playerIdDisplay, playerCreditsDisplay, gameTitle, logoutButton, slotMachine3DContainer, betAmountInput, currencyUnitDisplay, placeBetButton, spinButton, gameMessages;

// Game State
const gameState = {
    isAuthenticated: false,
    playerId: null,
    credits: 0,
    currencySymbol: 'BND',
    bettingEnabled: false,
    spinning: false,
    bonusSpinsRemaining: 0,
    gameLayout: { reels: 6, rows: 3 } // User specified 3x6
};

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    cacheDOMElements();
    setupAuthUI();
    loadInitialGameConfig();
});

function cacheDOMElements() {
    authSection = document.getElementById('auth-section');
    gameUI = document.getElementById('game-ui');
    loginForm = document.getElementById('login-form');
    signupForm = document.getElementById('signup-form');
    loginPlayerIdInput = document.getElementById('login-player-id');
    loginButton = document.getElementById('login-button');
    showSignupLink = document.getElementById('show-signup');
    signupButton = document.getElementById('signup-button');
    showLoginLink = document.getElementById('show-login');
    playerIdDisplay = document.getElementById('player-id-display');
    playerCreditsDisplay = document.getElementById('player-credits');
    gameTitle = document.getElementById('game-title');
    logoutButton = document.getElementById('logout-button');
    slotMachine3DContainer = document.getElementById('slot-machine-3d-canvas-container');
    betAmountInput = document.getElementById('bet-amount');
    currencyUnitDisplay = document.getElementById('currency-unit');
    placeBetButton = document.getElementById('place-bet-button');
    spinButton = document.getElementById('spin-button');
    gameMessages = document.getElementById('game-messages');
}

async function loadInitialGameConfig() {
    try {
        const response = await axios.get(`${API_BASE}/game/config`);
        gameConfig = response.data.config;
        activeSymbols = response.data.symbols;
        
        document.title = gameConfig.game_name || "Mestika Slot Game";
        gameTitle.textContent = `★ ${gameConfig.game_name}`;
        currencyUnitDisplay.textContent = gameConfig.currency_symbol || "BND";
        gameState.currencySymbol = gameConfig.currency_symbol || "BND";

        betAmountInput.min = gameConfig.min_bet;
        betAmountInput.max = gameConfig.max_bet;
        betAmountInput.value = gameConfig.default_bet;
        currentBet = parseFloat(betAmountInput.value);

        document.body.style.backgroundColor = '#1a0a00';
        document.querySelector('#app-container').style.borderColor = '#C9A84C';
        document.getElementById('spin-button').style.backgroundColor = '#F7E017';
        document.getElementById('spin-button').style.color = '#1a0a00';

        updateBettingControlsState(true);

    } catch (error) {
        console.error("Failed to load game config:", error);
        gameMessages.textContent = "Error loading game config. Please check backend connection.";
    }
}

// --- Authentication Logic ---
async function handleLogin() {
    const playerId = loginPlayerIdInput.value.trim();
    if (!playerId) { gameMessages.textContent = "Please enter your Player ID."; return; }

    try {
        const response = await axios.get(`${API_BASE}/player/${playerId}`);
        if (response.data && response.data.success) {
            playerInfo = response.data;
            gameState.playerId = playerId;
            gameState.credits = playerInfo.credits;
            gameState.currencySymbol = playerInfo.currency;
            gameState.bonusSpinsRemaining = playerInfo.bonus_spins_remaining;
            
            updatePlayerInfoDisplay();
            showGameUI();
            init3DGame();
        } else {
            gameMessages.textContent = response.data.error_en || "Login failed. Invalid Player ID.";
        }
    } catch (error) {
        console.error("Login failed:", error);
        gameMessages.textContent = "Login failed. Please check your Player ID or try signing up.";
    }
}

async function handleSignup() {
    const displayName = document.getElementById('signup-display-name').value.trim() || null;
    try {
        const response = await axios.post(`${API_BASE}/player/create`, { display_name: displayName });
        if (response.data.success) {
            playerInfo = response.data;
            gameState.playerId = playerInfo.player_id;
            gameState.credits = playerInfo.credits;
            gameState.currencySymbol = playerInfo.currency;
            gameState.bonusSpinsRemaining = playerInfo.bonus_spins_remaining;
            
            updatePlayerInfoDisplay();
            showGameUI();
            init3DGame();
        } else {
            gameMessages.textContent = response.data.error_en || "Signup failed.";
        }
    } catch (error) {
        console.error("Signup failed:", error);
        gameMessages.textContent = "Signup failed. Please try again.";
    }
}

function handleLogout() {
    gameState.isAuthenticated = false; gameState.playerId = null; gameState.credits = 0;
    playerInfo = null; gameMessages.textContent = "";
    
    authSection.style.display = 'flex'; gameUI.style.display = 'none';
    loginPlayerIdInput.value = ''; document.getElementById('signup-display-name').value = '';
    signupForm.style.display = 'none'; loginForm.style.display = 'block';
    
    cleanup3DScene();
}

function showGameUI() {
    authSection.style.display = 'none'; gameUI.style.display = 'flex';
    gameState.isAuthenticated = true;
    updateBettingControlsState(true);
}

function updatePlayerInfoDisplay() {
    playerIdDisplay.textContent = gameState.playerId ? gameState.playerId.substring(0, 8) + "..." : "N/A";
    playerCreditsDisplay.textContent = `${gameState.credits.toFixed(2)} ${gameState.currencySymbol}`;
}

function updateBettingControlsState(enable) {
    const betInput = document.getElementById('bet-amount');
    const placeBetBtn = document.getElementById('place-bet-button');
    const spinBtn = document.getElementById('spin-button');

    if (enable) {
        betInput.disabled = false;
        placeBetButton.disabled = false;
        spinButton.disabled = true; // Spin button enabled only after bet is placed
        currentBet = parseFloat(betAmountInput.value);
    } else {
        betInput.disabled = true;
        placeBetButton.disabled = true;
        spinButton.disabled = true;
    }
}

// --- 3D Game Setup ---
function init3DGame() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0a00);
    scene.fog = new THREE.Fog(0x1a0a00, 20, 60);

    camera = new THREE.PerspectiveCamera(75, slotMachine3DContainer.clientWidth / slotMachine3DContainer.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(slotMachine3DContainer.clientWidth, slotMachine3DContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    slotMachine3DContainer.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(10, 20, 15);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    createSlotMachine3D();

    window.addEventListener('resize', onWindowResize, false);
    onWindowResize();

    animate();
}

function createSlotMachine3D() {
    const reelCount = gameState.gameLayout.reels; // 6
    const rowCount = gameState.gameLayout.rows;    // 3
    const reelSpacing = 2.5;
    const reelHeight = 3;
    const symbolDisplayHeight = reelHeight * 0.8;
    const symbolSize = 0.8;

    slotMachine3DGroup = new THREE.Group();
    slotMachine3DGroup.position.y = 1;

    // Slot Machine Frame
    const frameGeometry = new THREE.BoxGeometry(reelCount * reelSpacing, reelHeight + 2, 3);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3010, roughness: 0.5 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, (reelHeight + 2) / 2, 0);
    slotMachine3DGroup.add(frame);

    // Reels and Symbols
    reels3D = [];
    for (let c = 0; c < reelCount; c++) {
        const reelGroup = new THREE.Group();
        reelGroup.position.x = (c - (reelCount - 1) / 2) * reelSpacing;
        slotMachine3DGroup.add(reelGroup);
        reels3D.push(reelGroup);

        for (let r = 0; r < rowCount; r++) {
            const symbolMesh = createSymbolMesh(activeSymbols[0] ? activeSymbols[0].symbol_key : 'kosong', symbolSize);
            const yPos = (rowCount / 2 - r) * symbolDisplayHeight;
            symbolMesh.position.set(0, yPos, 0.5);
            reelGroup.add(symbolMesh);
        }
    }
    
    scene.add(slotMachine3DGroup);
}

function createSymbolMesh(symbolKey, size) {
    const symbolData = activeSymbols.find(s => s.symbol_key === symbolKey);
    const color = symbolData ? symbolData.color_hex : '#444444'; // Default color
    const geometry = new THREE.SphereGeometry(size / 2, 32, 32); // Placeholder sphere
    const material = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.3, roughness: 0.2 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { symbolKey: symbolKey }; // Store key for later reference
    return mesh;
}

// Function to update a specific symbol on a reel after spin
function updateSymbolOnReel(reelIndex, rowIndex, symbolKey) {
    if (!reels3D[reelIndex] || !reels3D[reelIndex].children[rowIndex]) return;

    const oldMesh = reels3D[reelIndex].children[rowIndex];
    const newMesh = createSymbolMesh(symbolKey, oldMesh.geometry.parameters.radius * 2);
    newMesh.position.copy(oldMesh.position);
    
    reels3D[reelIndex].remove(oldMesh);
    reels3D[reelIndex].add(newMesh);
}

function onWindowResize() {
    const containerWidth = slotMachine3DContainer.clientWidth;
    const containerHeight = slotMachine3DContainer.clientHeight;
    if (camera && renderer) {
        camera.aspect = containerWidth / containerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(containerWidth, containerHeight);
    }
}

// --- Game Loop ---
function animate() {
    animationFrameId = requestAnimationFrame(animate);
    if (gameState.isAuthenticated && !gameState.spinning && renderer) {
        // Idle animations can be updated here
    }
    if (renderer) {
        renderer.render(scene, camera);
    }
}

// --- Event Listeners and Game Actions ---
betAmountInput.addEventListener('change', (e) => {
    currentBet = parseFloat(e.target.value);
    const minBet = parseFloat(e.target.min);
    const maxBet = parseFloat(e.target.max);

    if (currentBet < minBet || currentBet > maxBet) {
        gameMessages.textContent = `Bet must be between ${minBet} and ${maxBet}.`;
        placeBetButton.disabled = true;
    } else {
        gameMessages.textContent = '';
        placeBetButton.disabled = !gameState.isAuthenticated; // Re-enable if authenticated
    }
});

placeBetButton.addEventListener('click', () => {
    if (!gameState.isAuthenticated || gameState.spinning) return;
    
    currentBet = parseFloat(betAmountInput.value);
    const minBet = parseFloat(betAmountInput.min);
    const maxBet = parseFloat(betAmountInput.max);

    if (isNaN(currentBet) || currentBet < minBet || currentBet > maxBet) {
        gameMessages.textContent = `Invalid bet amount. Must be between ${minBet} and ${maxBet}.`;
        return;
    }

    if (gameState.credits >= currentBet) {
        gameState.credits -= currentBet;
        updatePlayerInfoDisplay();
        spinButton.disabled = false;
        placeBetButton.disabled = true;
        betAmountInput.disabled = true;
        gameMessages.textContent = `Bet placed: ${currentBet.toFixed(2)} ${gameState.currencySymbol}`;
    } else {
        gameMessages.textContent = "Insufficient credits!";
    }
});

spinButton.addEventListener('click', handleSpin);

async function handleSpin() {
    if (!gameState.isAuthenticated || gameState.spinning || currentBet <= 0 || gameState.credits < currentBet) {
        if (gameState.credits < currentBet) gameMessages.textContent = "Insufficient credits!";
        return;
    }

    gameState.spinning = true;
    spinButton.disabled = true;
    placeBetButton.disabled = true;
    betAmountInput.disabled = true;
    gameMessages.textContent = "Spinning...";

    try {
        const response = await axios.post(`${API_BASE}/spin`, {
            player_id: gameState.playerId,
            bet_amount: currentBet,
            is_bonus_spin: gameState.bonusSpinsRemaining > 0
        });

        if (response.data && response.data.success) {
            const result = response.data;
            animateReels(result.reel_grid, result.winning_lines, result.payout_amount, result.bonus_triggered, result.bonus_spins_remaining);
            
            gameState.credits = result.credits_after;
            gameState.bonusSpinsRemaining = result.bonus_spins_remaining;
            updatePlayerInfoDisplay();

            let message = "";
            if (result.payout_amount > 0) {
                message += `You won ${format_currency(result.payout_amount)}! (x${result.win_multiplier.toFixed(2)})`;
            }
            if (result.bonus_triggered) {
                message += (message ? " " : "") + `Bonus round triggered! ${result.bonus_spins_remaining} free spins awarded.`;
            }
            gameMessages.textContent = message || "Spin completed.";
        } else {
            gameMessages.textContent = `Spin failed: ${response.data.error_en || response.data.error || 'Unknown error'}`;
            resetControlsAfterSpin();
        }
    } catch (error) {
        console.error("Spin failed:", error);
        gameMessages.textContent = "Spin failed. Network error.";
        resetControlsAfterSpin();
    }
}

// --- 3D Animation Logic ---
function animateReels(reelGrid, winningLines, payoutAmount, bonusTriggered, bonusSpinsRemaining) {
    const reelCount = gameState.gameLayout.reels; // 6
    const rowCount = gameState.gameLayout.rows;    // 3
    const animationDuration = 3000; // ms for main spin
    const stopEaseOutFactor = 0.5; // Ease-out effect on stopping

    spinAnimations = []; // Clear previous animations

    // 1. Initial spin effect (visual cue) - can be added later
    
    // 2. Animate reels to spin
    const startTime = Date.now();
    const reelStopPositions = []; // To store final Y positions for each reel

    // Calculate target stop positions for each reel based on reelGrid
    for (let c = 0; c < reelCount; c++) {
        const targetSymbolKeys = reelGrid.map(row => row[c]); // Symbols for this reel column
        // Determine the 'stop' position based on the symbols that should land.
        // This is simplified: assuming the middle row symbol dictates the stop position.
        // A more complex system might have visual markers or use symbol geometry height.
        const middleRowIndex = Math.floor(rowCount / 2);
        const stopSymbolKey = targetSymbolKeys[middleRowIndex];
        const stopSymbolData = activeSymbols.find(s => s.symbol_key === stopSymbolKey);
        const symbolColor = stopSymbolData ? stopSymbolData.color_hex : '#444444';
        
        // Calculate target Y position so the 'stopSymbolKey' symbol is centered in the view.
        // This requires knowing the size of symbol geometries and reel display area.
        // For placeholder spheres, the position is relative to reel center.
        const symbolDisplayHeight = reelHeight * 0.8;
        const yPosForCenterSymbol = (rowCount / 2 - middleRowIndex) * symbolDisplayHeight;
        
        // The stopping Y position needs to align with the center of the visible area for the target symbol.
        // This is highly dependent on how symbols are positioned in `createSlotMachine3D`.
        // Assuming `yPos = (rowCount / 2 - r) * symbolDisplayHeight` in createSlotMachine3D.
        // The middle row index is `Math.floor(rowCount / 2)`.
        // Target Y = (rowCount / 2 - middleRowIndex) * symbolDisplayHeight.
        const stopY = (rowCount / 2 - middleRowIndex) * symbolDisplayHeight;
        reelStopPositions.push(stopY);
    }

    for (let c = 0; c < reelCount; c++) {
        const reel = reels3D[c];
        const stopY = reelStopPositions[c];
        
        const extraSpinDistance = Math.random() * 5 + 2; // Spin past the stop point
        const totalSpinDistance = (reel.position.y - symbolDisplayHeight) - extraSpinDistance; // Target Y to reach before stopping

        const animation = {
            reelIndex: c,
            reel: reel,
            targetSymbolKeys: reelGrid.map(row => row[c]), // Symbols that should land
            startPos: reel.position.clone(),
            stopY: stopY,
            totalDistance: totalSpinDistance,
            startTime: startTime,
            duration: animationDuration,
            easing: (t) => { // Ease-out function
                t = Math.max(0, t);
                return 1 - Math.pow(1 - t, stopEaseOutFactor);
            },
            symbolsUpdated: false // Flag to ensure symbols are updated only once per animation
        };
        spinAnimations.push(animation);
    }

    // Schedule symbol update and control reset after animation duration
    setTimeout(() => {
        updateSymbolsAfterSpin(reelGrid, winningLines, payoutAmount, bonusTriggered, bonusSpinsRemaining);
    }, animationDuration);

    // Start the animation loop if not already running
    if (!animationFrameId) {
        animateGameLoop();
    }
}

function animateGameLoop() {
    const currentTime = Date.now();
    let allAnimationsComplete = true;

    for (const anim of spinAnimations) {
        const elapsedTime = currentTime - anim.startTime;
        const t = Math.min(elapsedTime / anim.duration, 1);
        const easedT = anim.easing(t);

        // Calculate new Y position based on eased progress
        let currentY = THREE.MathUtils.lerp(anim.startPos.y, anim.startPos.y + anim.totalDistance, t);

        // After initial spin duration, begin easing back to the stop position
        if (t >= 1) {
            const stopPhaseDuration = anim.duration * stopEaseOutFactor;
            const stopPhaseT = (elapsedTime - anim.duration) / stopPhaseDuration;
            const easedStopPhaseT = anim.easing(stopPhaseT);
            currentY = THREE.MathUtils.lerp(anim.startPos.y + anim.totalDistance, anim.stopY, easedStopPhaseT);
            
            if (easedStopPhaseT < 1) allAnimationsComplete = false;
        } else {
            allAnimationsComplete = false;
        }
        
        anim.reel.position.y = currentY;

        // Update symbols visually as reels slow down/stop
        // This logic needs to be tied to the visual stopping point of the reels
        // For simplicity, we'll update them all at the end of the animation duration
    }

    if (!allAnimationsComplete) {
        animationFrameId = requestAnimationFrame(animateGameLoop);
    } else {
        // Animation is complete visually
        spinAnimations = []; // Clear animation states
        // Ensure final symbol positions are set correctly if needed
    }
}

function updateSymbolsAfterSpin(reelGrid, winningLines, payoutAmount, bonusTriggered, bonusSpinsRemaining) {
    const reelCount = gameState.gameLayout.reels;
    const rowCount = gameState.gameLayout.rows;
    
    if (reelGrid && reelGrid.length === rowCount) {
        for(let r = 0; r < rowCount; r++) {
            if (reelGrid[r] && reelGrid[r].length === reelCount) {
                for(let c = 0; c < reelCount; c++) {
                    updateSymbolOnReel(c, r, reelGrid[r][c]);
                }
            }
        }
    }

    highlightWinningLines(winningLines);
    if (bonusTriggered) {
        // Show bonus animation/notification
        gameMessages.textContent += (gameMessages.textContent ? " " : "") + `Bonus round! ${bonusSpinsRemaining} free spins awarded.`;
    }

    // Reset controls and state after a delay to allow viewing results
    setTimeout(() => {
        gameState.spinning = false;
        resetControlsAfterSpin();
    }, 3000); // Delay for viewing animation/results
}

function resetControlsAfterSpin() {
    spinButton.disabled = false;
    betAmountInput.disabled = false;
    placeBetButton.disabled = false;
    
    if (gameState.credits < parseFloat(betAmountInput.min)) {
        updateBettingControlsState(false);
        gameMessages.textContent = "Insufficient credits to bet.";
    } else {
        updateBettingControlsState(true);
        currentBet = parseFloat(betAmountInput.value);
    }
}

// --- Placeholder for Win Line Highlighting and Effects ---
function highlightWinningLines(winningLines) {
    console.log("Highlighting winning lines:", winningLines);
    // This function would visually indicate winning lines on the 3D reels.
    // E.g., draw lines, change symbol appearances, play effects.
    // For now, winning lines data is available.
}

// --- Utility Functions ---
function format_currency(amount, symbol = gameState.currencySymbol) {
    return `${symbol}${amount.toFixed(2)}`;
}

// --- Initial Setup ---
// DOMContentLoaded listener already calls loadInitialGameConfig and sets up auth UI.
// init3DGame is called after successful authentication.
// animate() loop is started from init3DGame.
// HTML and CSS are linked. API_BASE should be configured correctly.

// Example of how to integrate theme colors into 3D materials if needed
function getSymbolMaterial(symbolKey) {
    const symbolData = activeSymbols.find(s => s.symbol_key === symbolKey);
    const color = symbolData ? symbolData.color_hex : '#444444';
    return new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.3, roughness: 0.2 });
}

// Ensure proper cleanup when logging out or changing scenes
function cleanup3DScene() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (renderer) {
        renderer.dispose();
        renderer = null;
    }
    if (scene) {
        scene.traverse(function (object) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            if (object.texture) object.texture.dispose();
        });
        scene.clear();
        scene = null;
    }
    reels3D = [];
    slotMachine3DGroup = null;
}