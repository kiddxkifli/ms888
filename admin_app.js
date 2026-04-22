
// --- Constants and Configuration ---
const API_BASE = "http://localhost:8000"; // Assuming backend runs locally on port 8000
const ADMIN_KEY = "your-admin-key-here"; // From backend prompt config

// DOM Elements Cache
let sidebarNavItems, contentSections, pageTitle, adminStats, symbolProbList, rtpMeterValue, rtpProgressBar, theoreticalRtpVal, houseEdgeEstimateVal, biggestWinToday, recentSpinsTable, spinHistoryTbody;
let probabilityConfigForm, gameConfigForm; // Will be populated when sections are loaded

// Admin State
let currentView = 'dashboard'; // Track current active section
let allSymbols = []; // Store symbol data from backend config
let allGameConfigs = []; // Store game config data

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    cacheAdminDOMElements();
    setupSidebarNavigation();
    loadAdminData();
    setInterval(updateLiveStats, 30000); // Refresh stats every 30 seconds
    setInterval(updateBruneiClock, 1000); // Update clock every second
    
    // Initial load for the dashboard
    displayView('dashboard');
});

function cacheAdminDOMElements() {
    sidebarNavItems = document.querySelectorAll('.nav-item');
    contentSections = document.querySelectorAll('.content-section');
    pageTitle = document.getElementById('page-title');
    adminStats = {
        totalPlayers: document.getElementById('total-players'),
        totalSpins: document.getElementById('total-spins'),
        totalWagered: document.getElementById('total-wagered'),
        totalWon: document.getElementById('total-won'),
        actualRtp: document.getElementById('actual-rtp'),
        houseEdgeActual: document.getElementById('house-edge-actual'),
        spinsLast24h: document.getElementById('spins-last-24h'),
        biggestWinEver: document.getElementById('biggest-win-ever'),
        totalBonusTriggers: document.getElementById('total-bonus-triggers')
    };
    symbolProbList = document.getElementById('symbol-probabilities-list');
    rtpMeterValue = document.getElementById('rtp-meter-value');
    rtpProgressBar = document.querySelector('.rtp-progress-bar');
    theoreticalRtpVal = document.getElementById('theoretical-rtp-val');
    houseEdgeEstimateVal = document.getElementById('house-edge-estimate-val');
    biggestWinToday = document.getElementById('biggest-win-today'); // Renamed from 'biggest-win-ever' for dashboard context
    recentSpinsTable = {
        body: document.querySelector('#recent-spins-table tbody')
    };
    
    // Will be populated when respective sections are rendered
    probabilityConfigForm = null; 
    gameConfigForm = null;
}

function setupSidebarNavigation() {
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = e.currentTarget.getAttribute('href').substring(1); // Remove '#'
            displayView(targetView);
            
            // Update active sidebar item
            sidebarNavItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Update page title
            pageTitle.textContent = e.currentTarget.textContent.trim();
        });
    });
}

async function loadAdminData() {
    // Fetch initial data for dashboard and configurations
    try {
        await fetchGameConfigAndSymbols();
        await fetchAdminStats();
        await fetchSpinHistory();
        
        // Render specific sections once data is loaded
        renderProbabilityConfigForm();
        renderGameConfigForm();
        
    } catch (error) {
        console.error("Error loading admin data:", error);
        gameMessages.textContent = "Error loading admin data.";
    }
}

async function fetchGameConfigAndSymbols() {
    try {
        const response = await axios.get(`${API_BASE}/game/config`);
        if (response.data) {
            allGameConfigs = response.data.config;
            allSymbols = response.data.symbols;
            console.log("Game Config & Symbols loaded:", allGameConfigs, allSymbols);
            
            // Update theoretical RTP and house edge estimate based on initial config
            updateRtpEstimates();
        }
    } catch (error) {
        console.error("Error fetching game config:", error);
        throw error; // Rethrow to stop loading if critical
    }
}

async function fetchAdminStats() {
    try {
        const response = await axios.get(`${API_BASE}/admin/stats`, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        if (response.data.success) {
            const stats = response.data;
            document.getElementById('total-spins').textContent = stats.total_spins.toLocaleString();
            document.getElementById('total-wagered').textContent = formatCurrencyAdmin(stats.total_wagered);
            document.getElementById('actual-rtp').textContent = `${stats.actual_rtp.toFixed(2)}%`;
            document.getElementById('house-edge-actual').textContent = `${stats.house_edge_actual.toFixed(2)}%`;
            document.getElementById('spins-last-24h').textContent = stats.spins_last_24h.toLocaleString();
            document.getElementById('biggest-win-ever').textContent = formatCurrencyAdmin(stats.biggest_win_ever);
            document.getElementById('total-bonus-triggers').textContent = stats.total_bonus_triggers.toLocaleString();
            
            // Color code RTP and House Edge for dashboard
            colorCodeRtp(stats.actual_rtp, document.getElementById('actual-rtp'));
            colorCodeHouseEdge(stats.house_edge_actual, document.getElementById('house-edge-actual'));

            // Check for alert banner condition
            const alertBanner = document.querySelector('.alert-banner');
            if (stats.actual_rtp > 98 || stats.house_edge_actual < 2) {
                alertBanner.style.display = 'flex';
                alertBanner.querySelector('span').textContent = "RTP exceeds target threshold. Review probability settings.";
            } else {
                alertBanner.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Error fetching admin stats:", error);
    }
}

async function fetchSpinHistory(filters = {}) {
    try {
        const response = await axios.get(`${API_BASE}/admin/spin-history`, {
            params: { ...filters, page: 1, per_page: 10 }, // Fetching limited recent spins for dashboard
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        if (response.data.success) {
            renderSpinHistory(response.data.spins);
        }
    } catch (error) {
        console.error("Error fetching spin history:", error);
    }
}

function updateLiveStats() {
    // This function is called periodically to refresh stats
    fetchAdminStats();
    fetchSpinHistory({ wins_only: true }); // Example: refresh recent wins
}

function updateBruneiClock() {
    const now = new Date();
    const tzOffset = 8 * 60 * 60 * 1000; // UTC+8 for Brunei
    const bruneiTime = new Date(now.getTime() + tzOffset);
    const options = { timeZone: 'Asia/Brunei', hour12: false };
    const timeString = bruneiTime.toLocaleTimeString('en-BN', options); // Use 'en-BN' for Brunei locale
    document.getElementById('brunei-clock').textContent = `Waktu Brunei: ${timeString}`;
}

function displayView(viewId) {
    contentSections.forEach(section => {
        section.style.display = section.id === viewId ? 'block' : 'none';
    });
    // Update page title if it exists
    const activeNavItem = document.querySelector(`.nav-item[href="#${viewId}"]`);
    if (activeNavItem && pageTitle) {
        pageTitle.textContent = activeNavItem.textContent.trim();
    }
}

// --- Rendering Functions ---

function renderProbabilityConfigForm() {
    const symbols = allSymbols; // Use globally loaded symbols
    const totalWeight = calculate_total_weight(symbols);
    
    let html = `
        <div class="ornament-divider">
          <div class="line"></div>
          <div class="ornament"></div>
          <div class="line"></div>
        </div>
        <form id="probability-form">
    `;

    symbols.forEach(symbol => {
        const probPercent = totalWeight > 0 ? ((symbol.weight / total_weight) * 100).toFixed(1) : '0.0';
        const isActive = symbol.is_active ? 'checked' : '';
        const isWild = symbol.is_wild ? '<span class="badge wild">Liar</span>' : '';
        const isScatter = symbol.is_scatter ? '<span class="badge scatter">Bintang</span>' : '';
        const colorStyle = `background-color: ${symbol.color_hex};`;

        html += `
            <div class="symbol-row">
                <div class="symbol-cell symbol-color" style="${colorStyle}"></div>
                <div class="symbol-cell symbol-name">
                    <strong>${symbol.symbol_name}</strong><br>
                    <span class="symbol-name-en">${symbol.symbol_name_en}</span>
                </div>
                <div class="symbol-cell symbol-toggle">
                    <label class="switch">
                        <input type="checkbox" class="toggle-active" data-symbol-key="${symbol.symbol_key}" ${isActive}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <div class="symbol-cell symbol-weight">
                    <input type="number" class="weight-input" data-symbol-key="${symbol.symbol_key}" value="${symbol.weight}" min="0" max="100">
                    <span class="weight-value">${probPercent}%</span>
                </div>
                <div class="symbol-cell payout-input">
                    <input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_3x" value="${symbol.payout_3x}" min="0">
                </div>
                <div class="symbol-cell payout-input">
                    <input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_4x" value="${symbol.payout_4x}" min="0">
                </div>
                <div class="symbol-cell payout-input">
                    <input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_5x" value="${symbol.payout_5x}" min="0">
                </div>
                <div class="symbol-cell symbol-badges">
                    ${isWild}
                    ${isScatter}
                </div>
            </div>
        `;
    });

    html += `
        <div class="form-actions">
            <button type="button" class="btn-secondary" id="reset-prob-button">Tetapkan Semula</button>
            <button type="submit" class="btn-primary">Simpan Perubahan</button>
        </div>
        </form>
    `;
    
    document.getElementById('probability-section').innerHTML = html; // Assuming a section with id='probability-section' exists or needs to be created
    probabilityConfigForm = document.getElementById('probability-form');
    setupProbabilityFormListeners();
    updateRtpEstimates(); // Initial RTP estimate display
}

function renderGameConfigForm() {
    const configs = allGameConfigs;
    let html = `<form id="game-config-form">`;

    configs.forEach(config => {
        html += `
            <div class="config-row">
                <div class="config-label">
                    <strong>${config.description_ms}</strong><br>
                    <span class="config-label-en">${config.description_en}</span>
                </div>
                <div class="config-input">
                    ${getInputField(config)}
                </div>
            </div>
        `;
    });

    html += `
        <div class="form-actions">
            <button type="submit" class="btn-primary">Simpan Tetapan</button>
        </div>
        </form>
    `;
    document.getElementById('game-config-section').innerHTML = html; // Assuming a section with id='game-config-section'
    gameConfigForm = document.getElementById('game-config-form');
    setupGameConfigFormListeners();
}

function getInputField(config) {
    const value = config.config_value;
    const type = config.value_type;
    const key = config.config_key;
    
    let inputHtml = '';
    if (type === 'number') {
        inputHtml = `<input type="number" name="${key}" value="${value}" step="any">`;
    } else if (type === 'boolean') {
        const isChecked = value.toLowerCase() === 'true';
        inputHtml = `<label class="switch"><input type="checkbox" name="${key}" ${isChecked ? 'checked' : ''}><span class="slider round"></span></label>`;
    } else { // string
        inputHtml = `<input type="text" name="${key}" value="${value}">`;
    }
    return inputHtml;
}

function renderSpinHistory(spins) {
    const tbody = document.getElementById('spin-history-table-body'); // Assuming table body exists
    if (!tbody) return;
    tbody.innerHTML = ''; // Clear existing rows

    spins.forEach(spin => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${spin.created_at_bnt}</td>
            <td>${spin.player_id_short}</td>
            <td>${spin.bet_amount_formatted}</td>
            <td>${spin.payout_amount_formatted}</td>
            <td>${spin.win_multiplier.toFixed(2)}x</td>
            <td>${spin.is_bonus_spin ? '<span class="result-pill win">Yes</span>' : '<span class="result-pill loss">No</span>'}</td>
            <td>${renderResultPill(spin.payout_amount_formatted, spin.bet_amount_formatted)}</td>
        `;
    });
}

function renderResultPill(payoutFormatted, betFormatted) {
    const payoutValue = parseFloat(payoutFormatted.replace(/[B$ ,]/g, ''));
    const betValue = parseFloat(betFormatted.replace(/[B$ ,]/g, ''));
    if (payoutValue > 0) {
        if (payoutValue > betValue * 5) { // Arbitrary threshold for "Big Win"
            return '<span class="result-pill big-win">Big Win</span>';
        }
        return '<span class="result-pill win">Win</span>';
    }
    return '<span class="result-pill loss">Loss</span>';
}

// --- Event Listeners Setup ---
function setupProbabilityFormListeners() {
    if (!probabilityConfigForm) return;
    
    // Handle weight slider changes to update probability percentage live
    probabilityConfigForm.querySelectorAll('.weight-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const symbolKey = e.target.dataset.symbolKey;
            const weight = parseInt(e.target.value);
            const totalWeight = calculateTotalWeightForForm(probabilityConfigForm);
            const probPercent = totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : '0.0';
            e.target.nextElementSibling.textContent = `${probPercent}%`; // Update percentage display
            updateRtpEstimates(); // Update RTP estimates live
        });
    });

    // Handle toggle switches for 'is_active'
    probabilityConfigForm.querySelectorAll('.toggle-active').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const symbolKey = e.target.dataset.symbolKey;
            // Logic to update active status; will be submitted with form
            updateRtpEstimates(); // RTP may change if active status changes
        });
    });

    // Handle payout input changes
    probabilityConfigForm.querySelectorAll('.payout-input').forEach(input => {
        input.addEventListener('input', updateRtpEstimates);
    });

    // Handle form submission
    probabilityConfigForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updates = [];
        const formData = new FormData(probabilityConfigForm);
        const activeSymbolsInForm = []; // To recalculate total weight accurately

        // Process active toggles
        probabilityConfigForm.querySelectorAll('.toggle-active').forEach(toggle => {
            const symbolKey = toggle.dataset.symbolKey;
            const isActive = toggle.checked;
            if (isActive) activeSymbolsInForm.push(symbolKey); // Add to list for weight calculation

            updates.push({
                symbol_key: symbolKey,
                is_active: isActive
            });
        });

        // Process weight and payout inputs
        probabilityConfigForm.querySelectorAll('.symbol-row').forEach(row => {
            const symbolKey = row.querySelector('.weight-input').dataset.symbolKey;
            const weight = parseInt(row.querySelector('.weight-input').value);
            const payout3x = parseFloat(row.querySelector('[data-payout-type="payout_3x"]').value);
            const payout4x = parseFloat(row.querySelector('[data-payout-type="payout_4x"]').value);
            const payout5x = parseFloat(row.querySelector('[data-payout-type="payout_5x"]').value);
            
            updates.push({
                symbol_key: symbolKey,
                weight: weight,
                payout_3x: payout3x,
                payout_4x: payout4x,
                payout_5x: payout5x
            });
        });

        try {
            const response = await axios.post(`${API_BASE}/admin/probability/update`, updates, {
                headers: { 'x-admin-key': ADMIN_KEY }
            });
            if (response.data.success) {
                showToast("success", response.data.message_en);
                // Update RTP estimate display
                theoreticalRtpVal.textContent = `${response.data.theoretical_rtp}%`;
                houseEdgeEstimateVal.textContent = `${response.data.house_edge_estimate}%`;
                updateRtpProgress(); // Update progress bar based on new estimates
            } else {
                showToast("error", response.data.errors.join(", "));
            }
        } catch (error) {
            console.error("Error updating probabilities:", error);
            showToast("error", "Failed to update probabilities. Check console.");
        }
    });

    // Reset button functionality
    document.getElementById('reset-prob-button').addEventListener('click', () => {
        // Logic to reset to seed data - would require fetching seed data again or storing it
        // For now, this is a placeholder.
        console.log("Reset probabilities button clicked.");
        // Example: reload initial config and re-render
        // loadInitialGameConfig().then(() => renderProbabilityConfigForm());
    });
}

function setupGameConfigFormListeners() {
    if (!gameConfigForm) return;

    gameConfigForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updates = {};
        const formData = new FormData(gameConfigForm);

        formData.forEach((value, key) => {
            updates[key] = value;
        });

        try {
            const response = await axios.post(`${API_BASE}/admin/config/update`, updates, {
                headers: { 'x-admin-key': ADMIN_KEY }
            });
            if (response.data.success) {
                showToast("success", `Configuration updated successfully: ${response.data.updated_configs.join(', ')}`);
                // Optionally re-fetch game config to update client-side values if they affect live game
                await fetchGameConfigAndSymbols(); // Refresh config and symbols
                updateRtpEstimates(); // Re-calculate estimates if relevant configs changed
            } else {
                showToast("error", response.data.errors.join(", "));
            }
        } catch (error) {
            console.error("Error updating game config:", error);
            showToast("error", "Failed to update game configuration. Check console.");
        }
    });
}


function calculateTotalWeightForForm(formElement) {
    let totalWeight = 0;
    formElement.querySelectorAll('.weight-input').forEach(input => {
        totalWeight += parseInt(input.value) || 0;
    });
    return totalWeight;
}

function updateRtpEstimates() {
    if (!probabilityConfigForm) return;

    const activeSymbols = [];
    let totalWeight = 0;
    
    // Get active symbols and calculate total weight from the form's current state
    probabilityConfigForm.querySelectorAll('.symbol-row').forEach(row => {
        const isActive = row.querySelector('.toggle-active').checked;
        if (isActive) {
            const symbolKey = row.querySelector('.weight-input').dataset.symbolKey;
            const weight = parseInt(row.querySelector('.weight-input').value) || 0;
            const payout3x = parseFloat(row.querySelector('[data-payout-type="payout_3x"]').value) || 0;
            const payout4x = parseFloat(row.querySelector('[data-payout-type="payout_4x"]').value) || 0;
            const payout5x = parseFloat(row.querySelector('[data-payout-type="payout_5x"]').value) || 0;
            
            activeSymbols.push({ symbol_key: symbolKey, weight: weight, payout_3x, payout_4x, payout_5x });
            totalWeight += weight;
        }
    });

    const theoreticalRtp = calculate_theoretical_rtp(activeSymbols, totalWeight);
    const houseEdgeEstimate = 100 - theoreticalRtp;

    theoreticalRtpVal.textContent = `${theoreticalRtp.toFixed(1)}%`;
    houseEdgeEstimateVal.textContent = `${houseEdgeEstimate.toFixed(1)}%`;
    
    updateRtpProgress(); // Update progress bar based on new estimates
}

function updateRtpProgress() {
    const rtpValue = parseFloat(theoreticalRtpVal.textContent);
    const progressBar = rtpProgressBar;
    const meterValueDisplay = rtpMeterValue;

    if (!isNaN(rtpValue)) {
        let progress = Math.max(0, Math.min(100, rtpValue)); // Clamp between 0 and 100
        progressBar.style.width = `${progress}%`;

        // Color code progress bar
        if (progress > 98) progressBar.style.backgroundColor = '#EF5350'; // Red for high RTP
        else if (progress > 97) progressBar.style.backgroundColor = '#FFEB3B'; // Yellow for warning
        else progressBar.style.backgroundColor = '#4CAF50'; // Green for healthy RTP

        meterValueDisplay.textContent = `${rtpValue.toFixed(1)}%`;
        meterValueDisplay.style.color = progressBar.style.backgroundColor; // Match color
    }
}

function colorCodeRtp(rtp, element) {
    if (!element) return;
    if (rtp > 98) element.style.color = '#EF5350'; // Red
    else if (rtp > 97) element.style.color = '#FFEB3B'; // Yellow
    else element.style.color = '#4CAF50'; // Green
}

function colorCodeHouseEdge(houseEdge, element) {
    if (!element) return;
    if (houseEdge < 2) element.style.color = '#EF5350'; // Red for low house edge
    else if (houseEdge < 3) element.style.color = '#FFEB3B'; // Yellow
    else element.style.color = '#4CAF50'; // Green for healthy house edge
}


function formatCurrencyAdmin(amount) {
    // Use the symbol from loaded config or default
    const symbol = allGameConfigs.find(c => c.config_key === 'currency_symbol')?.config_value || "B$";
    return `${symbol}${amount.toFixed(2)}`;
}


function showToast(type, message) {
    const toastContainer = document.createElement('div');
    toastContainer.className = `toast toast-${type}`;
    toastContainer.textContent = message;
    document.body.appendChild(toastContainer);

    setTimeout(() => {
        toastContainer.remove();
    }, 5000);
}

// --- Placeholder for section rendering functions ---
// These functions will fetch data and render tables/forms for each section (Players, Spin History, etc.)
// For now, we'll focus on Dashboard, Probability Tuner, and Game Config as per initial HTML.

async function renderPlayersPage() {
    // Fetch players, render table, add actions (add credits, deactivate)
}

async function renderSpinHistoryPage(filters = {}) {
    // Fetch spin history with filters, render table
    try {
        const response = await axios.get(`${API_BASE}/admin/spin-history`, {
            params: { ...filters, page: 1, per_page: 50 },
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        if (response.data.success) {
            renderSpinHistory(response.data.spins);
            // TODO: Implement pagination controls
        }
    } catch (error) {
        console.error("Error fetching spin history:", error);
    }
}

// --- Event Listeners for Dynamic Sections (will be attached when sections are rendered) ---
// Example: Add event listeners for form submissions and buttons within rendered sections.

// --- Initial rendering calls (called after data is loaded) ---
// displayView('dashboard'); // Initial view is set in DOMContentLoaded
// ... call specific render functions when their sections are displayed ...

// Placeholder for a more advanced routing system if needed
// For now, simple click handlers on sidebar items trigger displayView and subsequent data loading/rendering.
// Example: When Probability Tuner section is shown, fetch its data and setup its listeners.
document.getElementById('probability-section')?.addEventListener('click', () => { /* renderProbabilityConfigForm() */ });
document.getElementById('game-config-section')?.addEventListener('click', () => { /* renderGameConfigForm() */ });
// ... etc.
// Note: Elements like 'probability-section' would need to be created in admin.html or dynamically loaded.
// For this iteration, probability and game config forms are rendered directly into #main-content-area when page loads.

// Ensure elements exist before trying to add listeners
document.addEventListener('DOMContentLoaded', () => {
    // ... other setup ...
    
    // Ensure sections exist before attempting to render forms
    if (!document.getElementById('probability-section')) {
        const probSection = document.createElement('section');
        probSection.id = 'probability-section';
        probSection.className = 'content-section';
        probSection.style.display = 'none'; // Initially hidden
        document.querySelector('.content-wrapper').appendChild(probSection);
    }
     if (!document.getElementById('game-config-section')) {
        const configSection = document.createElement('section');
        configSection.id = 'game-config-section';
        configSection.className = 'content-section';
        configSection.style.display = 'none'; // Initially hidden
        document.querySelector('.content-wrapper').appendChild(configSection);
    }
     if (!document.getElementById('players-section')) {
        const playersSection = document.createElement('section');
        playersSection.id = 'players-section';
        playersSection.className = 'content-section';
        playersSection.style.display = 'none';
        document.querySelector('.content-wrapper').appendChild(playersSection);
    }
     if (!document.getElementById('spin-history-section')) {
        const spinHistorySection = document.createElement('section');
        spinHistorySection.id = 'spin-history-section';
        spinHistorySection.className = 'content-section';
        spinHistorySection.style.display = 'none';
        document.querySelector('.content-wrapper').appendChild(spinHistorySection);
    }
    
    // Add event listeners to sidebar items to dynamically render content
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const targetView = e.currentTarget.getAttribute('href').substring(1);
            displayView(targetView);
            
            // Update active sidebar item
            sidebarNavItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            pageTitle.textContent = e.currentTarget.textContent.trim();

            // Dynamically load and render content
            if (targetView === 'dashboard') {
                await fetchAdminStats();
                await fetchSpinHistory({ wins_only: true }); // Show recent wins on dashboard
                renderProbabilityConfigForm(); // Always show config for live preview
                renderGameConfigForm();
            } else if (targetView === 'probability') {
                 renderProbabilityConfigForm();
            } else if (targetView === 'game-config') {
                 renderGameConfigForm();
            } else if (targetView === 'players') {
                await renderPlayersPage(); // Placeholder for player page rendering
            } else if (targetView === 'spin-history') {
                await renderSpinHistoryPage(); // Placeholder for spin history page rendering
            }
        });
    });

    // Initialize the clock
    updateBruneiClock();
});

// --- Placeholder Rendering Functions for other sections ---
async function renderPlayersPage() {
    const playersSection = document.getElementById('players-section');
    if (!playersSection) return;
    
    playersSection.innerHTML = `
        <h2 class="section-title">Pemain <span class="section-title-en">Players</span></h2>
        <div class="search-filter-bar">
            <input type="text" id="player-search" placeholder="Cari pemain...">
            <button class="btn-secondary">Search</button>
        </div>
        <div class="action-bar">
            <button class="btn-primary"><i class="fas fa-plus"></i> Tambah Kredit</button>
            <button class="btn-danger"><i class="fas fa-ban"></i> Nyahaktifkan</button>
            <button class="btn-secondary"><i class="fas fa-download"></i> Eksport CSV</button>
        </div>
        <table>
            <thead>
                <tr>
                    <th>ID Pemain</th><th>Nama</th><th>Kredit</th><th>Total Putar</th><th>Diwageri</th>
                    <th>Menang</th><th>RTP Peribadi</th><th>Menang Terbesar</th><th>Aktif Terakhir</th><th>Status</th><th>Tindakan</th>
                </tr>
            </thead>
            <tbody id="players-table-body">
                <tr><td colspan="11">Loading players...</td></tr>
            </tbody>
        </table>
    `;
    // Fetch player data and populate table
    await fetchPlayers();
}

async function fetchPlayers() {
    try {
        const response = await axios.get(`${API_BASE}/admin/players`, { // Assuming /admin/players endpoint exists or can be simulated
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        const playersBody = document.getElementById('players-table-body');
        playersBody.innerHTML = ''; // Clear loading message
        if (response.data.success && response.data.players) {
            response.data.players.forEach(player => {
                const row = playersBody.insertRow();
                row.innerHTML = `
                    <td>${player.player_id.substring(0, 8)}...</td>
                    <td>${player.display_name || '-'}</td>
                    <td>${formatCurrencyAdmin(player.credits)}</td>
                    <td>${player.total_spins.toLocaleString()}</td>
                    <td>${formatCurrencyAdmin(player.total_wagered)}</td>
                    <td>${formatCurrencyAdmin(player.total_won)}</td>
                    <td>${player.personal_rtp.toFixed(2)}%</td>
                    <td>${formatCurrencyAdmin(player.biggest_win)}</td>
                    <td>${new Date(player.last_active).toLocaleString('en-BN', { timeZone: 'Asia/Brunei', hour12: false })}</td>
                    <td><span class="result-pill ${player.is_active ? 'win' : 'loss'}">${player.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn-secondary btn-sm" onclick="handleAddCredits('${player.player_id}')"><i class="fas fa-plus"></i></button>
                        <button class="btn-danger btn-sm" onclick="handleDeactivatePlayer('${player.player_id}')"><i class="fas fa-ban"></i></button>
                    </td>
                `;
                // Color code RTP and Status
                const rtpCell = row.cells[6]; // Index for Personal RTP
                const statusCell = row.cells[9]; // Index for Status
                colorCodeRtp(player.personal_rtp, rtpCell);
                if (statusCell && statusCell.querySelector('.result-pill')) {
                    const pill = statusCell.querySelector('.result-pill');
                    if (!player.is_active) {
                        pill.classList.remove('win'); pill.classList.add('loss');
                        pill.textContent = 'Inactive';
                    } else {
                        pill.classList.remove('loss'); pill.classList.add('win');
                        pill.textContent = 'Active';
                    }
                }
            });
        } else {
            playersBody.innerHTML = '<tr><td colspan="11">Failed to load players.</td></tr>';
        }
    } catch (error) {
        console.error("Error fetching players:", error);
        const playersBody = document.getElementById('players-table-body');
        playersBody.innerHTML = '<tr><td colspan="11">Error loading players.</td></tr>';
    }
}

async function fetchPlayers() {
    // Mock implementation for fetchPlayers, replace with actual API call if endpoint exists
    const mockPlayers = [
        { player_id: uuid.v4(), display_name: "Geng Mesti", credits: 1200.50, total_spins: 150, total_wagered: 750.00, total_won: 600.25, biggest_win: 150.00, personal_rtp: 80.33, last_active: new Date(Date.now() - 3600000).toISOString(), is_active: true },
        { player_id: uuid.v4(), display_name: "Pemain Setia", credits: 950.00, total_spins: 300, total_wagered: 1500.00, total_won: 1400.00, biggest_win: 300.00, personal_rtp: 93.33, last_active: new Date(Date.now() - 7200000).toISOString(), is_active: true },
        { player_id: uuid.v4(), display_name: "Pemain Maya", credits: 50.00, total_spins: 20, total_wagered: 100.00, total_won: 30.00, biggest_win: 30.00, personal_rtp: 30.00, last_active: new Date(Date.now() - 86400000).toISOString(), is_active: false }
    ];
    const playersBody = document.getElementById('players-table-body');
    if (playersBody) playersBody.innerHTML = '';

    mockPlayers.forEach(player => {
        const row = playersBody.insertRow();
        row.innerHTML = `
            <td>${player.player_id.substring(0, 8)}...</td>
            <td>${player.display_name || '-'}</td>
            <td>${formatCurrencyAdmin(player.credits)}</td>
            <td>${player.total_spins.toLocaleString()}</td>
            <td>${formatCurrencyAdmin(player.total_wagered)}</td>
            <td>${formatCurrencyAdmin(player.total_won)}</td>
            <td>${player.personal_rtp.toFixed(2)}%</td>
            <td>${formatCurrencyAdmin(player.biggest_win)}</td>
            <td>${new Date(player.last_active).toLocaleString('en-BN', { timeZone: 'Asia/Brunei', hour12: false })}</td>
            <td><span class="result-pill ${player.is_active ? 'win' : 'loss'}">${player.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn-secondary btn-sm" onclick="handleAddCredits('${player.player_id}')"><i class="fas fa-plus"></i></button>
                <button class="btn-danger btn-sm" onclick="handleDeactivatePlayer('${player.player_id}')"><i class="fas fa-ban"></i></button>
            </td>
        `;
        colorCodeRtp(player.personal_rtp, row.cells[6]);
        if (row.cells[9] && row.cells[9].querySelector('.result-pill')) {
            const pill = row.cells[9].querySelector('.result-pill');
            if (!player.is_active) {
                pill.classList.remove('win'); pill.classList.add('loss'); pill.textContent = 'Inactive';
            } else {
                pill.classList.remove('loss'); pill.classList.add('win'); pill.textContent = 'Active';
            }
        }
    });
}

// Dummy functions for button actions (will need actual API calls)
function handleAddCredits(playerId) { console.log("Add credits for player:", playerId); }
function handleDeactivatePlayer(playerId) { console.log("Deactivate player:", playerId); }

async function renderSpinHistoryPage() {
    const spinHistorySection = document.getElementById('spin-history-section');
    if (!spinHistorySection) return;
    
    spinHistorySection.innerHTML = `
        <h2 class="section-title">Sejarah Putar <span class="section-title-en">Spin History</span></h2>
        <div class="filter-bar">
            <input type="text" id="player-id-filter" placeholder="Player ID (optional)">
            <input type="date" id="date-from-filter">
            <input type="date" id="date-to-filter">
            <label><input type="checkbox" id="wins-only-filter"> Menang Sahaja</label>
            <label><input type="checkbox" id="bonus-only-filter"> Pusingan Bonus</label>
            <button class="btn-secondary" id="apply-filters-btn">Apply Filters</button>
            <button class="btn-secondary"><i class="fas fa-download"></i> Eksport CSV</button>
        </div>
        <table id="spin-history-table">
            <thead>
                <tr>
                    <th>Masa (BNT)</th><th>Pemain</th><th>Pertaruhan</th><th>Bayaran</th><th>Gandaan</th>
                    <th>Bonus</th><th>Keputusan</th><th>Reels</th><th>Scatters</th><th>RTP Snapshot</th>
                </tr>
            </thead>
            <tbody id="spin-history-table-body">
                <tr><td colspan="10">Loading history...</td></tr>
            </tbody>
        </table>
        <div class="pagination">
            <!-- Pagination controls will be added here -->
        </div>
    `;
    
    // Re-cache the tbody element after it's rendered
    const historyTbody = document.getElementById('spin-history-table-body');
    if (historyTbody) {
        // Add event listener for filter button
        document.getElementById('apply-filters-btn').addEventListener('click', () => {
            const filters = {
                player_id: document.getElementById('player-id-filter').value.trim() || undefined,
                date_from: document.getElementById('date-from-filter').value || undefined,
                date_to: document.getElementById('date-to-filter').value || undefined,
                wins_only: document.getElementById('wins-only-filter').checked,
                bonus_only: document.getElementById('bonus-only-filter').checked
            };
            fetchSpinHistory(filters);
        });
        
        // Initial fetch for spin history
        await fetchSpinHistory();
    }
}

// --- Initial Data Loading and Rendering ---
document.addEventListener('DOMContentLoaded', () => {
    // ... existing setup ...
    
    // Ensure sections exist or create them if needed
    if (!document.getElementById('probability-section')) {
        const probSection = document.createElement('section'); probSection.id = 'probability-section'; probSection.className = 'content-section'; probSection.style.display = 'none';
        document.querySelector('.content-wrapper').appendChild(probSection);
    }
     if (!document.getElementById('game-config-section')) {
        const configSection = document.createElement('section'); configSection.id = 'game-config-section'; configSection.className = 'content-section'; configSection.style.display = 'none';
        document.querySelector('.content-wrapper').appendChild(configSection);
    }
     if (!document.getElementById('players-section')) {
        const playersSection = document.createElement('section'); playersSection.id = 'players-section'; playersSection.className = 'content-section'; playersSection.style.display = 'none';
        document.querySelector('.content-wrapper').appendChild(playersSection);
    }
     if (!document.getElementById('spin-history-section')) {
        const spinHistorySection = document.createElement('section'); spinHistorySection.id = 'spin-history-section'; spinHistorySection.className = 'content-section'; spinHistorySection.style.display = 'none';
        document.querySelector('.content-wrapper').appendChild(spinHistorySection);
    }
    
    // Add dynamic rendering for sidebar navigation
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const targetView = e.currentTarget.getAttribute('href').substring(1);
            displayView(targetView);
            
            sidebarNavItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            pageTitle.textContent = e.currentTarget.textContent.trim();

            // Load and render content for the selected view
            if (targetView === 'dashboard') {
                await fetchAdminStats();
                await fetchSpinHistory({ wins_only: true }); // Show recent wins on dashboard
                renderProbabilityConfigForm(); // Re-render for live preview
                renderGameConfigForm();
            } else if (targetView === 'probability') {
                 renderProbabilityConfigForm();
            } else if (targetView === 'game-config') {
                 renderGameConfigForm();
            } else if (targetView === 'players') {
                await renderPlayersPage();
            } else if (targetView === 'spin-history') {
                await renderSpinHistoryPage();
            }
        });
    });

    // Initial load for dashboard
    displayView('dashboard');
    updateBruneiClock();
});

// --- Helper functions for Admin UI ---
function calculateTotalWeightForForm(formElement) {
    let totalWeight = 0;
    formElement.querySelectorAll('.weight-input').forEach(input => {
        totalWeight += parseInt(input.value) || 0;
    });
    return totalWeight;
}

// Live update for RTP estimates in probability tuner
function updateRtpEstimates() {
    if (!probabilityConfigForm) return;

    const activeSymbolsInForm = [];
    let totalWeight = 0;
    
    probabilityConfigForm.querySelectorAll('.symbol-row').forEach(row => {
        const isActive = row.querySelector('.toggle-active').checked;
        if (isActive) {
            const symbolKey = row.querySelector('.weight-input').dataset.symbolKey;
            const weight = parseInt(row.querySelector('.weight-input').value) || 0;
            const payout3x = parseFloat(row.querySelector('[data-payout-type="payout_3x"]').value) || 0;
            const payout4x = parseFloat(row.querySelector('[data-payout-type="payout_4x"]').value) || 0;
            const payout5x = parseFloat(row.querySelector('[data-payout-type="payout_5x"]').value) || 0;
            
            activeSymbolsInForm.push({ symbol_key: symbolKey, weight: weight, payout_3x, payout_4x, payout_5x });
            totalWeight += weight;
        }
    });

    const theoreticalRtp = calculate_theoretical_rtp(activeSymbolsInForm, totalWeight);
    const houseEdgeEstimate = 100 - theoreticalRtp;

    if (theoreticalRtpVal) theoreticalRtpVal.textContent = `${theoreticalRtp.toFixed(1)}%`;
    if (houseEdgeEstimateVal) houseEdgeEstimateVal.textContent = `${houseEdgeEstimate.toFixed(1)}%`;
    
    updateRtpProgress();
}

function updateRtpProgress() {
    const rtpValue = parseFloat(theoreticalRtpVal.textContent);
    const progressBar = rtpProgressBar;
    const meterValueDisplay = rtpMeterValue;

    if (!isNaN(rtpValue) && progressBar && meterValueDisplay) {
        let progress = Math.max(0, Math.min(100, rtpValue));
        progressBar.style.width = `${progress}%`;

        if (progress > 98) progressBar.style.backgroundColor = '#EF5350';
        else if (progress > 97) progressBar.style.backgroundColor = '#FFEB3B';
        else progressBar.style.backgroundColor = '#4CAF50';

        meterValueDisplay.textContent = `${rtpValue.toFixed(1)}%`;
        meterValueDisplay.style.color = progressBar.style.backgroundColor;
    }
}

function colorCodeRtp(rtp, element) {
    if (!element) return;
    if (rtp > 98) element.style.color = '#EF5350';
    else if (rtp > 97) element.style.color = '#FFEB3B';
    else element.style.color = '#4CAF50';
}

function colorCodeHouseEdge(houseEdge, element) {
    if (!element) return;
    if (houseEdge < 2) element.style.color = '#EF5350';
    else if (houseEdge < 3) element.style.color = '#FFEB3B';
    else element.style.color = '#4CAF50';
}

function formatCurrencyAdmin(amount) {
    const symbol = allGameConfigs.find(c => c.config_key === 'currency_symbol')?.config_value || "B$";
    return `${symbol}${amount.toFixed(2)}`;
}

function showToast(type, message) {
    const toastContainer = document.createElement('div');
    toastContainer.className = `toast toast-${type}`;
    toastContainer.textContent = message;
    document.body.appendChild(toastContainer);

    setTimeout(() => {
        toastContainer.remove();
    }, 5000);
}

// --- Form Submission Handlers ---

// Probability Form
async function handleProbabilityFormSubmit(event) {
    event.preventDefault();
    const updates = [];
    const form = event.target;

    form.querySelectorAll('.symbol-row').forEach(row => {
        const symbolKey = row.querySelector('.weight-input').dataset.symbolKey;
        const isActive = row.querySelector('.toggle-active').checked;
        const weight = parseInt(row.querySelector('.weight-input').value);
        const payout3x = parseFloat(row.querySelector('[data-payout-type="payout_3x"]').value);
        const payout4x = parseFloat(row.querySelector('[data-payout-type="payout_4x"]').value);
        const payout5x = parseFloat(row.querySelector('[data-payout-type="payout_5x"]').value);
        
        updates.push({
            symbol_key: symbolKey,
            is_active: isActive,
            weight: weight,
            payout_3x: payout3x,
            payout_4x: payout4x,
            payout_5x: payout5x
        });
    });

    try {
        const response = await axios.post(`${API_BASE}/admin/probability/update`, updates, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        if (response.data.success) {
            showToast("success", response.data.message_en);
            // Update live RTP estimate display
            theoreticalRtpVal.textContent = `${response.data.theoretical_rtp}%`;
            houseEdgeEstimateVal.textContent = `${response.data.house_edge_estimate}%`;
            updateRtpProgress();
            // Potentially re-fetch active symbols to update client-side symbol data if needed
        } else {
            showToast("error", response.data.errors.join(", ") || "Failed to update probabilities.");
        }
    } catch (error) {
        console.error("Error updating probabilities:", error);
        showToast("error", "Failed to update probabilities. Check console.");
    }
}

// Game Config Form
async function handleGameConfigFormSubmit(event) {
    event.preventDefault();
    const updates = {};
    const formData = new FormData(event.target);

    formData.forEach((value, key) => {
        updates[key] = value;
    });

    try {
        const response = await axios.post(`${API_BASE}/admin/config/update`, updates, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        if (response.data.success) {
            showToast("success", `Configuration updated successfully: ${response.data.updated_configs.join(', ')}`);
            // Re-fetch game config to reflect changes if necessary
            await fetchGameConfigAndSymbols();
            updateRtpEstimates(); // Re-calculate estimates if relevant configs changed
        } else {
            showToast("error", response.data.errors.join(", "));
        }
    } catch (error) {
        console.error("Error updating game config:", error);
        showToast("error", "Failed to update game configuration. Check console.");
    }
}

// --- Rendering Functions for Admin Sections ---

function renderDashboard() {
    const dashboardSection = document.getElementById('dashboard');
    if (!dashboardSection) return;

    dashboardSection.innerHTML = `
        <h2 class="section-title">Papan Pemuka <span class="section-title-en">Dashboard</span></h2>
        
        <div class="alert-banner" style="display: none;">
            <i class="fas fa-exclamation-triangle"></i> 
            <span></span>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="card-header">Jumlah Putaran</div>
                <div class="card-value" id="total-spins">0</div>
                <div class="card-accent-bar"></div>
            </div>
            <div class="stat-card">
                <div class="card-header">Jumlah Diwageri</div>
                <div class="card-value" id="total-wagered">B$0.00</div>
                <div class="card-accent-bar"></div>
            </div>
            <div class="stat-card">
                <div class="card-header">RTP Sebenar</div>
                <div class="card-value" id="actual-rtp">0.00%</div>
                <div class="card-accent-bar"></div>
            </div>
            <div class="stat-card">
                <div class="card-header">Kelebihan Rumah</div>
                <div class="card-value" id="house-edge-actual">100.00%</div>
                <div class="card-accent-bar"></div>
            </div>
        </div>

        <div class="two-panel-row">
            <div class="panel-left">
                <h3>Kebarangkalian Simbol <span class="panel-title-en">Symbol Probabilities</span></h3>
                <div id="symbol-probabilities-list">
                    <!-- Symbol probability bars will be loaded here -->
                </div>
            </div>
            <div class="panel-right">
                <h3>Meter RTP <span class="panel-title-en">RTP Meter</span></h3>
                <div class="rtp-meter">
                    <div class="rtp-value" id="rtp-meter-value">0.00%</div>
                    <div class="rtp-progress-bar-container">
                        <div class="rtp-progress-bar"></div>
                    </div>
                    <div class="rtp-comparison">
                        Theoretical RTP: <span id="theoretical-rtp-val">--.--%</span><br>
                        House Edge: <span id="house-edge-estimate-val">--.--%</span>
                    </div>
                    <div class="rtp-info">
                        Biggest Win Ever: <span id="biggest-win-ever">B$0.00</span>
                    </div>
                </div>
            </div>
        </div>

        <h4>Sejarah Putar Terkini <span class="table-subtitle">Recent Spins</span></h4>
        <table id="recent-spins-table">
            <thead>
                <tr>
                    <th>Masa</th><th>Pemain</th><th>Pertaruhan</th><th>Bayaran</th><th>Gandaan</th>
                    <th>Bonus</th><th>Keputusan</th>
                </tr>
            </thead>
            <tbody id="recent-spins-table-body">
                <tr><td colspan="7">Loading recent spins...</td></tr>
            </tbody>
        </table>
    `;
    // Re-cache elements after rendering
    Object.assign(adminStats, {
        totalSpins: document.getElementById('total-spins'),
        totalWagered: document.getElementById('total-wagered'),
        actualRtp: document.getElementById('actual-rtp'),
        houseEdgeActual: document.getElementById('house-edge-actual'),
        spinsLast24h: document.getElementById('spins-last-24h'),
        biggestWinEver: document.getElementById('biggest-win-ever')
    });
    // Need to re-render probability list and RTP meter if they are part of dashboard
    renderSymbolProbabilitiesList(); // Render list for live preview
    updateRtpProgress(); // Update progress bar color/width
    fetchAdminStats(); // Fetch live stats
    fetchSpinHistory({ wins_only: true }); // Fetch recent wins
}

function renderSymbolProbabilitiesList() {
    const symbols = allSymbols;
    const totalWeight = calculateTotalWeight(symbols);
    let html = `<div class="symbol-list-container">`;

    symbols.forEach(symbol => {
        const probPercent = totalWeight > 0 ? ((symbol.weight / totalWeight) * 100).toFixed(1) : '0.0';
        const isActive = symbol.is_active ? 'checked' : '';
        const isWild = symbol.is_wild ? '<span class="badge wild">Liar</span>' : '';
        const isScatter = symbol.is_scatter ? '<span class="badge scatter">Bintang</span>' : '';
        const colorStyle = `background-color: ${symbol.color_hex};`;

        html += `
            <div class="symbol-row-display">
                <div class="symbol-cell symbol-color" style="${colorStyle}"></div>
                <div class="symbol-cell symbol-name">
                    <strong>${symbol.symbol_name}</strong><br>
                    <span class="symbol-name-en">${symbol.symbol_name_en}</span>
                </div>
                <div class="symbol-cell symbol-prob">${probPercent}%</div>
                <div class="symbol-cell symbol-weight-bar-container">
                    <div class="symbol-weight-bar" style="width: ${probPercent}%;"></div>
                </div>
                <div class="symbol-cell symbol-badges">
                    ${isWild}
                    ${isScatter}
                </div>
            </div>
        `;
    });
    html += `</div>`;
    if (symbolProbList) symbolProbList.innerHTML = html;
}


function renderProbabilityConfigForm() {
    const symbols = allSymbols;
    let totalWeight = calculate_total_weight(symbols); // Initial total weight
    
    let html = `<form id="probability-form">`;

    symbols.forEach(symbol => {
        const probPercent = totalWeight > 0 ? ((symbol.weight / totalWeight) * 100).toFixed(1) : '0.0';
        const isActive = symbol.is_active ? 'checked' : '';
        const isWild = symbol.is_wild ? '<span class="badge wild">Liar</span>' : '';
        const isScatter = symbol.is_scatter ? '<span class="badge scatter">Bintang</span>' : '';
        const colorStyle = `background-color: ${symbol.color_hex};`;

        html += `
            <div class="symbol-row">
                <div class="symbol-cell symbol-color" style="${colorStyle}"></div>
                <div class="symbol-cell symbol-name">
                    <strong>${symbol.symbol_name}</strong><br>
                    <span class="symbol-name-en">${symbol.symbol_name_en}</span>
                </div>
                <div class="symbol-cell symbol-toggle">
                    <label class="switch">
                        <input type="checkbox" class="toggle-active" data-symbol-key="${symbol.symbol_key}" ${isActive}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <div class="symbol-cell symbol-weight">
                    <input type="number" class="weight-input" data-symbol-key="${symbol.symbol_key}" value="${symbol.weight}" min="0" max="100">
                    <span class="weight-value">${probPercent}%</span>
                </div>
                <div class="symbol-cell payout-input">
                    <input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_3x" value="${symbol.payout_3x}" min="0">
                </div>
                <div class="symbol-cell payout-input">
                    <input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_4x" value="${symbol.payout_4x}" min="0">
                </div>
                <div class="symbol-cell payout-input">
                    <input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_5x" value="${symbol.payout_5x}" min="0">
                </div>
                <div class="symbol-cell symbol-badges">
                    ${isWild}
                    ${isScatter}
                </div>
            </div>
        `;
    });

    html += `
        <div class="form-actions">
            <button type="button" class="btn-secondary" id="reset-prob-button">Tetapkan Semula</button>
            <button type="submit" class="btn-primary">Simpan Perubahan</button>
        </div>
        </form>
    `;
    
    const probabilitySection = document.getElementById('probability-section');
    if (probabilitySection) probabilitySection.innerHTML = html;
    probabilityConfigForm = document.getElementById('probability-form');
    if(probabilityConfigForm) setupProbabilityFormListeners();
    updateRtpEstimates(); // Initial RTP estimate display
}

function renderGameConfigForm() {
    const configs = allGameConfigs;
    let html = `<form id="game-config-form">`;

    configs.forEach(config => {
        html += `
            <div class="config-row">
                <div class="config-label">
                    <strong>${config.description_ms}</strong><br>
                    <span class="config-label-en">${config.description_en}</span>
                </div>
                <div class="config-input">
                    ${getInputField(config)}
                </div>
            </div>
        `;
    });

    html += `
        <div class="form-actions">
            <button type="submit" class="btn-primary">Simpan Tetapan</button>
        </div>
        </form>
    `;
    const gameConfigSection = document.getElementById('game-config-section');
    if(gameConfigSection) gameConfigSection.innerHTML = html;
    gameConfigForm = document.getElementById('game-config-form');
    if(gameConfigForm) setupGameConfigFormListeners();
}

function getInputField(config) {
    const value = config.config_value;
    const type = config.value_type;
    const key = config.config_key;
    
    let inputHtml = '';
    if (type === 'number') {
        inputHtml = `<input type="number" name="${key}" value="${value}" step="any">`;
    } else if (type === 'boolean') {
        const isChecked = value.toLowerCase() === 'true';
        inputHtml = `<label class="switch"><input type="checkbox" name="${key}" ${isChecked ? 'checked' : ''}><span class="slider round"></span></label>`;
    } else { // string
        inputHtml = `<input type="text" name="${key}" value="${value}">`;
    }
    return inputHtml;
}

function renderSpinHistory(spins) {
    const tbody = document.getElementById('spin-history-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    spins.forEach(spin => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${spin.created_at_bnt ? new Date(spin.created_at_bnt).toLocaleString('en-BN', { timeZone: 'Asia/Brunei', hour12: false }) : '-'}</td>
            <td>${spin.player_id_short || '-'}</td>
            <td>${spin.bet_amount_formatted}</td>
            <td>${spin.payout_amount_formatted}</td>
            <td>${spin.win_multiplier !== undefined ? `${spin.win_multiplier.toFixed(2)}x` : '-'}</td>
            <td>${spin.is_bonus_spin ? '<span class="result-pill win">Yes</span>' : '<span class="result-pill loss">No</span>'}</td>
            <td>${renderResultPill(spin.payout_amount_formatted, spin.bet_amount_formatted)}</td>
            <td>${spin.reel_grid ? JSON.stringify(spin.reel_grid) : '-'}</td>
            <td>${spin.scatter_positions ? JSON.stringify(spin.scatter_positions) : '-'}</td>
            <td>${spin.rtp_snapshot !== undefined ? `${spin.rtp_snapshot.toFixed(2)}%` : '-'}</td>
        `;
    });
}

function renderResultPill(payoutFormatted, betFormatted) {
    const payoutValue = parseFloat(payoutFormatted.replace(/[B$ ,]/g, ''));
    const betValue = parseFloat(betFormatted.replace(/[B$ ,]/g, ''));
    if (!isNaN(payoutValue) && payoutValue > 0) {
        if (payoutValue > betValue * 5) { // Threshold for "Big Win"
            return '<span class="result-pill big-win">Big Win</span>';
        }
        return '<span class="result-pill win">Win</span>';
    }
    return '<span class="result-pill loss">Loss</span>';
}

// --- Event Listeners Setup ---
function setupProbabilityFormListeners() {
    if (!probabilityConfigForm) return;
    
    probabilityConfigForm.querySelectorAll('.weight-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const symbolKey = e.target.dataset.symbolKey;
            const weight = parseInt(e.target.value);
            const totalWeight = calculateTotalWeightForForm(probabilityConfigForm);
            const probPercent = totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : '0.0';
            e.target.nextElementSibling.textContent = `${probPercent}%`;
            updateRtpEstimates();
        });
    });

    probabilityConfigForm.querySelectorAll('.toggle-active').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            updateRtpEstimates();
        });
    });

    probabilityConfigForm.querySelectorAll('.payout-input').forEach(input => {
        input.addEventListener('input', updateRtpEstimates);
    });

    probabilityConfigForm.addEventListener('submit', handleProbabilityFormSubmit);

    document.getElementById('reset-prob-button').addEventListener('click', () => {
        console.log("Reset probabilities button clicked. Requires loading initial seed data.");
        // In a real app, this would fetch seed data or revert to a saved state.
        // For now, it's a placeholder.
    });
}

function setupGameConfigFormListeners() {
    if (!gameConfigForm) return;

    gameConfigForm.addEventListener('submit', handleGameConfigFormSubmit);
}

async function handleProbabilityFormSubmit(event) {
    event.preventDefault();
    const updates = [];
    const form = event.target;

    form.querySelectorAll('.symbol-row').forEach(row => {
        const symbolKey = row.querySelector('.weight-input').dataset.symbolKey;
        const isActive = row.querySelector('.toggle-active').checked;
        const weight = parseInt(row.querySelector('.weight-input').value);
        const payout3x = parseFloat(row.querySelector('[data-payout-type="payout_3x"]').value);
        const payout4x = parseFloat(row.querySelector('[data-payout-type="payout_4x"]').value);
        const payout5x = parseFloat(row.querySelector('[data-payout-type="payout_5x"]').value);
        
        updates.push({
            symbol_key: symbolKey,
            is_active: isActive,
            weight: weight,
            payout_3x: payout3x,
            payout_4x: payout4x,
            payout_5x: payout5x
        });
    });

    try {
        const response = await axios.post(`${API_BASE}/admin/probability/update`, updates, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        if (response.data.success) {
            showToast("success", response.data.message_en);
            theoreticalRtpVal.textContent = `${response.data.theoretical_rtp}%`;
            houseEdgeEstimateVal.textContent = `${response.data.house_edge_estimate}%`;
            updateRtpProgress();
            // Update global activeSymbols and gameConfig if they affect client-side rendering
            await fetchGameConfigAndSymbols(); 
        } else {
            showToast("error", response.data.errors.join(", ") || "Failed to update probabilities.");
        }
    } catch (error) {
        console.error("Error updating probabilities:", error);
        showToast("error", "Failed to update probabilities. Check console.");
    }
}

async function handleGameConfigFormSubmit(event) {
    event.preventDefault();
    const updates = {};
    const formData = new FormData(event.target);

    formData.forEach((value, key) => {
        updates[key] = value;
    });

    try {
        const response = await axios.post(`${API_BASE}/admin/config/update`, updates, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        if (response.data.success) {
            showToast("success", `Configuration updated successfully: ${response.data.updated_configs.join(', ')}`);
            await fetchGameConfigAndSymbols(); // Refresh config
            updateRtpEstimates();
        } else {
            showToast("error", response.data.errors.join(", "));
        }
    } catch (error) {
        console.error("Error updating game config:", error);
        showToast("error", "Failed to update game configuration. Check console.");
    }
}

// --- Rendering Functions for Admin Sections ---

function renderDashboard() {
    const dashboardSection = document.getElementById('dashboard');
    if (!dashboardSection) return;

    dashboardSection.innerHTML = `
        <h2 class="section-title">Papan Pemuka <span class="section-title-en">Dashboard</span></h2>
        <div class="alert-banner" style="display: none;">
            <i class="fas fa-exclamation-triangle"></i> <span></span>
        </div>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="card-header">Jumlah Putaran</div><div class="card-value" id="total-spins">0</div><div class="card-accent-bar"></div>
            </div>
            <div class="stat-card">
                <div class="card-header">Jumlah Diwageri</div><div class="card-value" id="total-wagered">B$0.00</div><div class="card-accent-bar"></div>
            </div>
            <div class="stat-card">
                <div class="card-header">RTP Sebenar</div><div class="card-value" id="actual-rtp">0.00%</div><div class="card-accent-bar"></div>
            </div>
            <div class="stat-card">
                <div class="card-header">Kelebihan Rumah</div><div class="card-value" id="house-edge-actual">100.00%</div><div class="card-accent-bar"></div>
            </div>
        </div>
        <div class="two-panel-row">
            <div class="panel-left">
                <h3>Kebarangkalian Simbol <span class="panel-title-en">Symbol Probabilities</span></h3>
                <div id="symbol-probabilities-list"></div>
            </div>
            <div class="panel-right">
                <h3>Meter RTP <span class="panel-title-en">RTP Meter</span></h3>
                <div class="rtp-meter">
                    <div class="rtp-value" id="rtp-meter-value">0.00%</div>
                    <div class="rtp-progress-bar-container">
                        <div class="rtp-progress-bar"></div>
                    </div>
                    <div class="rtp-comparison">
                        Theoretical RTP: <span id="theoretical-rtp-val">--.--%</span><br>
                        House Edge: <span id="house-edge-estimate-val">--.--%</span>
                    </div>
                    <div class="rtp-info">
                        Biggest Win Ever: <span id="biggest-win-ever">B$0.00</span>
                    </div>
                </div>
            </div>
        </div>
        <h4>Sejarah Putar Terkini <span class="table-subtitle">Recent Spins</span></h4>
        <table id="recent-spins-table">
            <thead>
                <tr>
                    <th>Masa</th><th>Pemain</th><th>Pertaruhan</th><th>Bayaran</th><th>Gandaan</th>
                    <th>Bonus</th><th>Keputusan</th>
                </tr>
            </thead>
            <tbody id="recent-spins-table-body">
                <tr><td colspan="7">Loading recent spins...</td></tr>
            </tbody>
        </table>
    `;
    // Re-cache elements for dashboard
    Object.assign(adminStats, {
        totalSpins: document.getElementById('total-spins'),
        totalWagered: document.getElementById('total-wagered'),
        actualRtp: document.getElementById('actual-rtp'),
        houseEdgeActual: document.getElementById('house-edge-actual'),
        spinsLast24h: document.getElementById('spins-last-24h'),
        biggestWinEver: document.getElementById('biggest-win-ever')
    });
    recentSpinsTable.body = document.getElementById('recent-spins-table-body');
    
    fetchAdminStats();
    fetchSpinHistory({ wins_only: true });
    renderSymbolProbabilitiesList(); // Render for live preview
    updateRtpProgress();
}

function renderSymbolProbabilitiesList() {
    const symbols = allSymbols;
    const totalWeight = calculateTotalWeight(symbols);
    let html = `<div class="symbol-list-container">`;

    symbols.forEach(symbol => {
        const probPercent = totalWeight > 0 ? ((symbol.weight / totalWeight) * 100).toFixed(1) : '0.0';
        const isActive = symbol.is_active ? 'checked' : '';
        const isWild = symbol.is_wild ? '<span class="badge wild">Liar</span>' : '';
        const isScatter = symbol.is_scatter ? '<span class="badge scatter">Bintang</span>' : '';
        const colorStyle = `background-color: ${symbol.color_hex};`;

        html += `
            <div class="symbol-row-display">
                <div class="symbol-cell symbol-color" style="${colorStyle}"></div>
                <div class="symbol-cell symbol-name"><strong>${symbol.symbol_name}</strong><br><span class="symbol-name-en">${symbol.symbol_name_en}</span></div>
                <div class="symbol-cell symbol-prob">${probPercent}%</div>
                <div class="symbol-cell symbol-weight-bar-container"><div class="symbol-weight-bar" style="width: ${probPercent}%;"></div></div>
                <div class="symbol-cell symbol-badges">${isWild}${isScatter}</div>
            </div>
        `;
    });
    html += `</div>`;
    if (symbolProbList) symbolProbList.innerHTML = html;
}

function renderProbabilityConfigForm() {
    const symbols = allSymbols;
    let totalWeight = calculateTotalWeight(symbols);
    
    let html = `<form id="probability-form">`;
    symbols.forEach(symbol => {
        const probPercent = totalWeight > 0 ? ((symbol.weight / totalWeight) * 100).toFixed(1) : '0.0';
        const isActive = symbol.is_active ? 'checked' : '';
        const isWild = symbol.is_wild ? '<span class="badge wild">Liar</span>' : '';
        const isScatter = symbol.is_scatter ? '<span class="badge scatter">Bintang</span>' : '';
        const colorStyle = `background-color: ${symbol.color_hex};`;

        html += `
            <div class="symbol-row">
                <div class="symbol-cell symbol-color" style="${colorStyle}"></div>
                <div class="symbol-cell symbol-name"><strong>${symbol.symbol_name}</strong><br><span class="symbol-name-en">${symbol.symbol_name_en}</span></div>
                <div class="symbol-cell symbol-toggle"><label class="switch"><input type="checkbox" class="toggle-active" data-symbol-key="${symbol.symbol_key}" ${isActive}><span class="slider round"></span></label></div>
                <div class="symbol-cell symbol-weight"><input type="number" class="weight-input" data-symbol-key="${symbol.symbol_key}" value="${symbol.weight}" min="0" max="100"><span class="weight-value">${probPercent}%</span></div>
                <div class="symbol-cell payout-input"><input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_3x" value="${symbol.payout_3x}" min="0"></div>
                <div class="symbol-cell payout-input"><input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_4x" value="${symbol.payout_4x}" min="0"></div>
                <div class="symbol-cell payout-input"><input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_5x" value="${symbol.payout_5x}" min="0"></div>
                <div class="symbol-cell symbol-badges">${isWild}${isScatter}</div>
            </div>
        `;
    });

    html += `
        <div class="form-actions">
            <button type="button" class="btn-secondary" id="reset-prob-button">Tetapkan Semula</button>
            <button type="submit" class="btn-primary">Simpan Perubahan</button>
        </div>
        </form>
    `;
    
    const probabilitySection = document.getElementById('probability-section');
    if (probabilitySection) probabilitySection.innerHTML = html;
    probabilityConfigForm = document.getElementById('probability-form');
    if(probabilityConfigForm) setupProbabilityFormListeners();
    updateRtpEstimates();
}

function renderGameConfigForm() {
    const configs = allGameConfigs;
    let html = `<form id="game-config-form">`;

    configs.forEach(config => {
        html += `
            <div class="config-row">
                <div class="config-label">
                    <strong>${config.description_ms}</strong><br>
                    <span class="config-label-en">${config.description_en}</span>
                </div>
                <div class="config-input">
                    ${getInputField(config)}
                </div>
            </div>
        `;
    });

    html += `
        <div class="form-actions">
            <button type="submit" class="btn-primary">Simpan Tetapan</button>
        </div>
        </form>
    `;
    const gameConfigSection = document.getElementById('game-config-section');
    if(gameConfigSection) gameConfigSection.innerHTML = html;
    gameConfigForm = document.getElementById('game-config-form');
    if(gameConfigForm) setupGameConfigFormListeners();
}

function getInputField(config) {
    const value = config.config_value;
    const type = config.value_type;
    const key = config.config_key;
    
    let inputHtml = '';
    if (type === 'number') {
        inputHtml = `<input type="number" name="${key}" value="${value}" step="any">`;
    } else if (type === 'boolean') {
        const isChecked = value.toLowerCase() === 'true';
        inputHtml = `<label class="switch"><input type="checkbox" name="${key}" ${isChecked ? 'checked' : ''}><span class="slider round"></span></label>`;
    } else { // string
        inputHtml = `<input type="text" name="${key}" value="${value}">`;
    }
    return inputHtml;
}

function renderSpinHistory(spins) {
    const tbody = document.getElementById('spin-history-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    spins.forEach(spin => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${spin.created_at_bnt ? new Date(spin.created_at_bnt).toLocaleString('en-BN', { timeZone: 'Asia/Brunei', hour12: false }) : '-'}</td>
            <td>${spin.player_id_short || '-'}</td>
            <td>${spin.bet_amount_formatted}</td>
            <td>${spin.payout_amount_formatted}</td>
            <td>${spin.win_multiplier !== undefined ? `${spin.win_multiplier.toFixed(2)}x` : '-'}</td>
            <td>${spin.is_bonus_spin ? '<span class="result-pill win">Yes</span>' : '<span class="result-pill loss">No</span>'}</td>
            <td>${renderResultPill(spin.payout_amount_formatted, spin.bet_amount_formatted)}</td>
            <!-- More columns for reelGrid, scatters, RTP snapshot can be added if needed -->
        `;
    });
}

function renderResultPill(payoutFormatted, betFormatted) {
    const payoutValue = parseFloat(payoutFormatted.replace(/[B$ ,]/g, ''));
    const betValue = parseFloat(betFormatted.replace(/[B$ ,]/g, ''));
    if (!isNaN(payoutValue) && payoutValue > 0) {
        if (payoutValue > betValue * 5) {
            return '<span class="result-pill big-win">Big Win</span>';
        }
        return '<span class="result-pill win">Win</span>';
    }
    return '<span class="result-pill loss">Loss</span>';
}

// --- Event Listeners Setup ---
function setupProbabilityFormListeners() {
    if (!probabilityConfigForm) return;
    
    probabilityConfigForm.querySelectorAll('.weight-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const weight = parseInt(e.target.value);
            const totalWeight = calculateTotalWeightForForm(probabilityConfigForm);
            const probPercent = totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : '0.0';
            e.target.nextElementSibling.textContent = `${probPercent}%`;
            updateRtpEstimates();
        });
    });

    probabilityConfigForm.querySelectorAll('.toggle-active').forEach(toggle => {
        toggle.addEventListener('change', () => {
            updateRtpEstimates();
        });
    });

    probabilityConfigForm.querySelectorAll('.payout-input').forEach(input => {
        input.addEventListener('input', updateRtpEstimates);
    });

    probabilityConfigForm.addEventListener('submit', handleProbabilityFormSubmit);

    document.getElementById('reset-prob-button')?.addEventListener('click', () => {
        console.log("Reset probabilities button clicked. Reverting to initial values...");
        // Placeholder: Fetch initial seed data or revert to last saved state
        // For now, just reload initial config and re-render the form
        fetchGameConfigAndSymbols().then(() => renderProbabilityConfigForm());
    });
}

function setupGameConfigFormListeners() {
    if (!gameConfigForm) return;
    gameConfigForm.addEventListener('submit', handleGameConfigFormSubmit);
}

// --- Rendering Functions for Admin Sections ---

function renderDashboard() {
    const dashboardSection = document.getElementById('dashboard');
    if (!dashboardSection) return;

    dashboardSection.innerHTML = `
        <h2 class="section-title">Papan Pemuka <span class="section-title-en">Dashboard</span></h2>
        <div class="alert-banner" style="display: none;">
            <i class="fas fa-exclamation-triangle"></i> <span></span>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="card-header">Jumlah Putaran</div><div class="card-value" id="total-spins">0</div><div class="card-accent-bar"></div></div>
            <div class="stat-card"><div class="card-header">Jumlah Diwageri</div><div class="card-value" id="total-wagered">B$0.00</div><div class="card-accent-bar"></div></div>
            <div class="stat-card"><div class="card-header">RTP Sebenar</div><div class="card-value" id="actual-rtp">0.00%</div><div class="card-accent-bar"></div></div>
            <div class="stat-card"><div class="card-header">Kelebihan Rumah</div><div class="card-value" id="house-edge-actual">100.00%</div><div class="card-accent-bar"></div></div>
        </div>
        <div class="two-panel-row">
            <div class="panel-left">
                <h3>Kebarangkalian Simbol <span class="panel-title-en">Symbol Probabilities</span></h3>
                <div id="symbol-probabilities-list"></div>
            </div>
            <div class="panel-right">
                <h3>Meter RTP <span class="panel-title-en">RTP Meter</span></h3>
                <div class="rtp-meter">
                    <div class="rtp-value" id="rtp-meter-value">0.00%</div>
                    <div class="rtp-progress-bar-container">
                        <div class="rtp-progress-bar"></div>
                    </div>
                    <div class="rtp-comparison">
                        Theoretical RTP: <span id="theoretical-rtp-val">--.--%</span><br>
                        House Edge: <span id="house-edge-estimate-val">--.--%</span>
                    </div>
                    <div class="rtp-info">
                        Biggest Win Ever: <span id="biggest-win-ever">B$0.00</span>
                    </div>
                </div>
            </div>
        </div>
        <h4>Sejarah Putar Terkini <span class="table-subtitle">Recent Spins</span></h4>
        <table id="recent-spins-table">
            <thead>
                <tr>
                    <th>Masa</th><th>Pemain</th><th>Pertaruhan</th><th>Bayaran</th><th>Gandaan</th>
                    <th>Bonus</th><th>Keputusan</th>
                </tr>
            </thead>
            <tbody id="recent-spins-table-body">
                <tr><td colspan="7">Loading recent spins...</td></tr>
            </tbody>
        </table>
    `;
    // Re-cache elements after rendering
    Object.assign(adminStats, {
        totalSpins: document.getElementById('total-spins'), totalWagered: document.getElementById('total-wagered'),
        actualRtp: document.getElementById('actual-rtp'), houseEdgeActual: document.getElementById('house-edge-actual'),
        spinsLast24h: document.getElementById('spins-last-24h'), biggestWinEver: document.getElementById('biggest-win-ever')
    });
    recentSpinsTable.body = document.getElementById('recent-spins-table-body');
    symbolProbList = document.getElementById('symbol-probabilities-list');
    rtpMeterValue = document.getElementById('rtp-meter-value');
    rtpProgressBar = document.querySelector('.rtp-progress-bar');
    theoreticalRtpVal = document.getElementById('theoretical-rtp-val');
    houseEdgeEstimateVal = document.getElementById('house-edge-estimate-val');
    biggestWinToday = document.getElementById('biggest-win-ever'); // Dashboard uses this span

    fetchAdminStats();
    fetchSpinHistory({ wins_only: true });
    renderSymbolProbabilitiesList();
    updateRtpProgress();
}

function renderSymbolProbabilitiesList() {
    const symbols = allSymbols;
    const totalWeight = calculateTotalWeight(symbols);
    let html = `<div class="symbol-list-container">`;

    symbols.forEach(symbol => {
        const probPercent = totalWeight > 0 ? ((symbol.weight / totalWeight) * 100).toFixed(1) : '0.0';
        const isActive = symbol.is_active ? 'checked' : '';
        const isWild = symbol.is_wild ? '<span class="badge wild">Liar</span>' : '';
        const isScatter = symbol.is_scatter ? '<span class="badge scatter">Bintang</span>' : '';
        const colorStyle = `background-color: ${symbol.color_hex};`;

        html += `
            <div class="symbol-row-display">
                <div class="symbol-cell symbol-color" style="${colorStyle}"></div>
                <div class="symbol-cell symbol-name"><strong>${symbol.symbol_name}</strong><br><span class="symbol-name-en">${symbol.symbol_name_en}</span></div>
                <div class="symbol-cell symbol-prob">${probPercent}%</div>
                <div class="symbol-cell symbol-weight-bar-container"><div class="symbol-weight-bar" style="width: ${probPercent}%;"></div></div>
                <div class="symbol-cell symbol-badges">${isWild}${isScatter}</div>
            </div>
        `;
    });
    html += `</div>`;
    if (symbolProbList) symbolProbList.innerHTML = html;
}

function renderProbabilityConfigForm() {
    const symbols = allSymbols;
    let totalWeight = calculateTotalWeight(symbols);
    
    let html = `<form id="probability-form">`;
    symbols.forEach(symbol => {
        const probPercent = totalWeight > 0 ? ((symbol.weight / totalWeight) * 100).toFixed(1) : '0.0';
        const isActive = symbol.is_active ? 'checked' : '';
        const isWild = symbol.is_wild ? '<span class="badge wild">Liar</span>' : '';
        const isScatter = symbol.is_scatter ? '<span class="badge scatter">Bintang</span>' : '';
        const colorStyle = `background-color: ${symbol.color_hex};`;

        html += `
            <div class="symbol-row">
                <div class="symbol-cell symbol-color" style="${colorStyle}"></div>
                <div class="symbol-cell symbol-name"><strong>${symbol.symbol_name}</strong><br><span class="symbol-name-en">${symbol.symbol_name_en}</span></div>
                <div class="symbol-cell symbol-toggle"><label class="switch"><input type="checkbox" class="toggle-active" data-symbol-key="${symbol.symbol_key}" ${isActive}><span class="slider round"></span></label></div>
                <div class="symbol-cell symbol-weight"><input type="number" class="weight-input" data-symbol-key="${symbol.symbol_key}" value="${symbol.weight}" min="0" max="100"><span class="weight-value">${probPercent}%</span></div>
                <div class="symbol-cell payout-input"><input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_3x" value="${symbol.payout_3x}" min="0"></div>
                <div class="symbol-cell payout-input"><input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_4x" value="${symbol.payout_4x}" min="0"></div>
                <div class="symbol-cell payout-input"><input type="number" class="payout-input" data-symbol-key="${symbol.symbol_key}" data-payout-type="payout_5x" value="${symbol.payout_5x}" min="0"></div>
                <div class="symbol-cell symbol-badges">${isWild}${isScatter}</div>
            </div>
        `;
    });

    html += `
        <div class="form-actions">
            <button type="button" class="btn-secondary" id="reset-prob-button">Tetapkan Semula</button>
            <button type="submit" class="btn-primary">Simpan Perubahan</button>
        </div>
        </form>
    `;
    const probabilitySection = document.getElementById('probability-section');
    if (probabilitySection) probabilitySection.innerHTML = html;
    probabilityConfigForm = document.getElementById('probability-form');
    if(probabilityConfigForm) setupProbabilityFormListeners();
    updateRtpEstimates();
}

function renderGameConfigForm() {
    const configs = allGameConfigs;
    let html = `<form id="game-config-form">`;

    configs.forEach(config => {
        html += `
            <div class="config-row">
                <div class="config-label"><strong>${config.description_ms}</strong><br><span class="config-label-en">${config.description_en}</span></div>
                <div class="config-input">${getInputField(config)}</div>
            </div>
        `;
    });

    html += `
        <div class="form-actions">
            <button type="submit" class="btn-primary">Simpan Tetapan</button>
        </div>
        </form>
    `;
    const gameConfigSection = document.getElementById('game-config-section');
    if(gameConfigSection) gameConfigSection.innerHTML = html;
    gameConfigForm = document.getElementById('game-config-form');
    if(gameConfigForm) setupGameConfigFormListeners();
}

function getInputField(config) {
    const value = config.config_value;
    const type = config.value_type;
    const key = config.config_key;
    
    let inputHtml = '';
    if (type === 'number') {
        inputHtml = `<input type="number" name="${key}" value="${value}" step="any">`;
    } else if (type === 'boolean') {
        const isChecked = value.toLowerCase() === 'true';
        inputHtml = `<label class="switch"><input type="checkbox" name="${key}" ${isChecked ? 'checked' : ''}><span class="slider round"></span></label>`;
    } else { // string
        inputHtml = `<input type="text" name="${key}" value="${value}">`;
    }
    return inputHtml;
}

function renderSpinHistory(spins) {
    const tbody = document.getElementById('spin-history-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    spins.forEach(spin => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${spin.created_at_bnt ? new Date(spin.created_at_bnt).toLocaleString('en-BN', { timeZone: 'Asia/Brunei', hour12: false }) : '-'}</td>
            <td>${spin.player_id_short || '-'}</td>
            <td>${spin.bet_amount_formatted}</td>
            <td>${spin.payout_amount_formatted}</td>
            <td>${spin.win_multiplier !== undefined ? `${spin.win_multiplier.toFixed(2)}x` : '-'}</td>
            <td>${spin.is_bonus_spin ? '<span class="result-pill win">Yes</span>' : '<span class="result-pill loss">No</span>'}</td>
            <td>${renderResultPill(spin.payout_amount_formatted, spin.bet_amount_formatted)}</td>
        `;
    });
}

// --- Fetching and Displaying Data ---
async function fetchAdminStats() {
    try {
        const response = await axios.get(`${API_BASE}/admin/stats`, {
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        if (response.data.success) {
            const stats = response.data;
            if (adminStats.totalSpins) adminStats.totalSpins.textContent = stats.total_spins.toLocaleString();
            if (adminStats.totalWagered) adminStats.totalWagered.textContent = formatCurrencyAdmin(stats.total_wagered);
            if (adminStats.actualRtp) adminStats.actualRtp.textContent = `${stats.actual_rtp.toFixed(2)}%`;
            if (adminStats.houseEdgeActual) adminStats.houseEdgeActual.textContent = `${stats.house_edge_actual.toFixed(2)}%`;
            if (adminStats.spinsLast24h) adminStats.spinsLast24h.textContent = stats.spins_last_24h.toLocaleString();
            if (adminStats.biggestWinEver) adminStats.biggestWinEver.textContent = formatCurrencyAdmin(stats.biggest_win_ever);
            
            colorCodeRtp(stats.actual_rtp, adminStats.actualRtp);
            colorCodeHouseEdge(stats.house_edge_actual, adminStats.houseEdgeActual);

            const alertBanner = document.querySelector('.alert-banner');
            if (stats.actual_rtp > 98 || stats.house_edge_actual < 2) {
                alertBanner.style.display = 'flex';
                alertBanner.querySelector('span').textContent = "RTP exceeds target threshold. Review probability settings.";
            } else {
                alertBanner.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Error fetching admin stats:", error);
    }
}

async function fetchSpinHistory(filters = {}) {
    try {
        const response = await axios.get(`${API_BASE}/admin/spin-history`, {
            params: { ...filters, page: 1, per_page: 10 }, // Fetching limited recent spins
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        if (response.data.success) {
            renderSpinHistory(response.data.spins);
            // TODO: Implement pagination controls
        }
    } catch (error) {
        console.error("Error fetching spin history:", error);
        if (recentSpinsTable.body) recentSpinsTable.body.innerHTML = '<tr><td colspan="7">Error loading history.</td></tr>';
    }
}

// --- Event Listeners and Live Updates ---
document.addEventListener('DOMContentLoaded', () => {
    // ... existing setup ...
    
    // Ensure sections are present
    if (!document.getElementById('probability-section')) { const sec = document.createElement('section'); sec.id = 'probability-section'; sec.className = 'content-section'; sec.style.display = 'none'; document.querySelector('.content-wrapper').appendChild(sec); }
    if (!document.getElementById('game-config-section')) { const sec = document.createElement('section'); sec.id = 'game-config-section'; sec.className = 'content-section'; sec.style.display = 'none'; document.querySelector('.content-wrapper').appendChild(sec); }
    if (!document.getElementById('players-section')) { const sec = document.createElement('section'); sec.id = 'players-section'; sec.className = 'content-section'; sec.style.display = 'none'; document.querySelector('.content-wrapper').appendChild(sec); }
    if (!document.getElementById('spin-history-section')) { const sec = document.createElement('section'); sec.id = 'spin-history-section'; sec.className = 'content-section'; sec.style.display = 'none'; document.querySelector('.content-wrapper').appendChild(sec); }
    
    // Dynamically render content on sidebar navigation
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const targetView = e.currentTarget.getAttribute('href').substring(1);
            displayView(targetView);
            
            sidebarNavItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            pageTitle.textContent = e.currentTarget.textContent.trim();

            // Load and render content for the selected view
            if (targetView === 'dashboard') {
                await fetchAdminStats();
                await fetchSpinHistory({ wins_only: true });
                renderSymbolProbabilitiesList();
                updateRtpProgress();
            } else if (targetView === 'probability') {
                 renderProbabilityConfigForm();
            } else if (targetView === 'game-config') {
                 renderGameConfigForm();
            } else if (targetView === 'players') {
                await renderPlayersPage();
            } else if (targetView === 'spin-history') {
                await renderSpinHistoryPage();
            }
        });
    });

    // Initial rendering and updates
    displayView('dashboard');
    updateBruneiClock();
    setInterval(updateBruneiClock, 1000);
    setInterval(updateLiveStats, 30000); // Refresh stats periodically
}

// --- Rendering Functions for Other Sections ---

async function renderPlayersPage() {
    const playersSection = document.getElementById('players-section');
    if (!playersSection) return;
    
    playersSection.innerHTML = `
        <h2 class="section-title">Pemain <span class="section-title-en">Players</span></h2>
        <div class="search-filter-bar">
            <input type="text" id="player-search" placeholder="Cari pemain...">
            <button class="btn-secondary"><i class="fas fa-search"></i> Cari</button>
        </div>
        <div class="action-bar">
            <button class="btn-primary" id="add-credits-btn"><i class="fas fa-plus"></i> Tambah Kredit</button>
            <button class="btn-danger" id="deactivate-player-btn"><i class="fas fa-ban"></i> Nyahaktifkan</button>
            <button class="btn-secondary"><i class="fas fa-download"></i> Eksport CSV</button>
        </div>
        <table id="players-table">
            <thead>
                <tr>
                    <th>ID Pemain</th><th>Nama</th><th>Kredit</th><th>Total Putar</th><th>Diwageri</th>
                    <th>Menang</th><th>RTP Peribadi</th><th>Menang Terbesar</th><th>Aktif Terakhir</th><th>Status</th><th>Tindakan</th>
                </tr>
            </thead>
            <tbody id="players-table-body">
                <tr><td colspan="11">Loading players...</td></tr>
            </tbody>
        </table>
    `;
    
    // Re-cache elements after rendering
    const playersBody = document.getElementById('players-table-body');
    const addCreditsBtn = document.getElementById('add-credits-btn');
    const deactivatePlayerBtn = document.getElementById('deactivate-player-btn');
    const playerSearchInput = document.getElementById('player-search');
    const searchBtn = document.querySelector('.search-filter-bar button');
    const exportCsvBtn = document.querySelector('.action-bar .btn-secondary[title*="Eksport"]');


    // Add event listeners for new buttons/inputs
    if (addCreditsBtn) addCreditsBtn.addEventListener('click', () => handleAdminAction('add-credits'));
    if (deactivatePlayerBtn) deactivatePlayerBtn.addEventListener('click', () => handleAdminAction('deactivate'));
    if (searchBtn) searchBtn.addEventListener('click', () => fetchPlayers({ search: playerSearchInput.value }));
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportPlayersCsv());

    await fetchPlayers(); // Initial fetch
}

async function fetchPlayers(filters = {}) {
    try {
        const response = await axios.get(`${API_BASE}/admin/players`, { // Assuming /admin/players endpoint exists
            params: filters,
            headers: { 'x-admin-key': ADMIN_KEY }
        });
        const playersBody = document.getElementById('players-table-body');
        if (playersBody) playersBody.innerHTML = ''; // Clear loading message
        
        if (response.data.success && response.data.players) {
            response.data.players.forEach(player => {
                const row = playersBody.insertRow();
                row.innerHTML = `
                    <td>${player.player_id.substring(0, 8)}...</td>
                    <td>${player.display_name || '-'}</td>
                    <td>${formatCurrencyAdmin(player.credits)}</td>
                    <td>${player.total_spins.toLocaleString()}</td>
                    <td>${formatCurrencyAdmin(player.total_wagered)}</td>
                    <td>${formatCurrencyAdmin(player.total_won)}</td>
                    <td>${player.personal_rtp.toFixed(2)}%</td>
                    <td>${formatCurrencyAdmin(player.biggest_win)}</td>
                    <td>${player.last_active ? new Date(player.last_active).toLocaleString('en-BN', { timeZone: 'Asia/Brunei', hour12: false }) : '-'}</td>
                    <td><span class="result-pill ${player.is_active ? 'win' : 'loss'}">${player.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                        <button class="btn-secondary btn-sm" onclick="handleAddCredits('${player.player_id}')"><i class="fas fa-plus"></i></button>
                        <button class="btn-danger btn-sm" onclick="handleDeactivatePlayer('${player.player_id}')"><i class="fas fa-ban"></i></button>
                    </td>
                `;
                colorCodeRtp(player.personal_rtp, row.cells[6]);
                if (row.cells[9] && row.cells[9].querySelector('.result-pill')) {
                    const pill = row.cells[9].querySelector('.result-pill');
                    if (!player.is_active) {
                        pill.classList.remove('win'); pill.classList.add('loss'); pill.textContent = 'Inactive';
                    } else {
                        pill.classList.remove('loss'); pill.classList.add('win'); pill.textContent = 'Active';
                    }
                }
            });
        } else {
            playersBody.innerHTML = '<tr><td colspan="11">Failed to load players.</td></tr>';
        }
    } catch (error) {
        console.error("Error fetching players:", error);
        const playersBody = document.getElementById('players-table-body');
        playersBody.innerHTML = '<tr><td colspan="11">Error loading players.</td></tr>';
    }
}

async function renderSpinHistoryPage() {
    const spinHistorySection = document.getElementById('spin-history-section');
    if (!spinHistorySection) return;
    
    spinHistorySection.innerHTML = `
        <h2 class="section-title">Sejarah Putar <span class="section-title-en">Spin History</span></h2>
        <div class="filter-bar">
            <input type="text" id="player-id-filter" placeholder="Player ID (optional)">
            <input type="date" id="date-from-filter">
            <input type="date" id="date-to-filter">
            <label><input type="checkbox" id="wins-only-filter"> Menang Sahaja</label>
            <label><input type="checkbox" id="bonus-only-filter"> Pusingan Bonus</label>
            <button class="btn-secondary" id="apply-filters-btn">Apply Filters</button>
            <button class="btn-secondary"><i class="fas fa-download"></i> Eksport CSV</button>
        </div>
        <table id="spin-history-table">
            <thead>
                <tr>
                    <th>Masa (BNT)</th><th>Pemain</th><th>Pertaruhan</th><th>Bayaran</th><th>Gandaan</th>
                    <th>Bonus</th><th>Keputusan</th><th>Reels</th><th>Scatters</th><th>RTP Snapshot</th>
                </tr>
            </thead>
            <tbody id="spin-history-table-body">
                <tr><td colspan="10">Loading history...</td></tr>
            </tbody>
        </table>
        <div class="pagination"></div>
    `;
    
    // Re-cache elements
    const historyTbody = document.getElementById('spin-history-table-body');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const exportCsvBtn = document.querySelector('#spin-history-section .filter-bar .btn-secondary[title*="Eksport"]');

    if (historyTbody) {
        applyFiltersBtn.addEventListener('click', () => {
            const filters = {
                player_id: document.getElementById('player-id-filter').value.trim() || undefined,
                date_from: document.getElementById('date-from-filter').value || undefined,
                date_to: document.getElementById('date-to-filter').value || undefined,
                wins_only: document.getElementById('wins-only-filter').checked,
                bonus_only: document.getElementById('bonus-only-filter').checked
            };
            fetchSpinHistory(filters);
        });
        if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportSpinHistory());
        
        fetchSpinHistory(); // Initial fetch
    }
}

// Dummy functions for admin actions
function handleAddCredits(playerId) {
    console.log("Handle Add Credits for player:", playerId);
    // Show a modal or prompt for amount and reason, then call API
    const amount = prompt("Enter amount to add:");
    const reason = prompt("Enter reason:");
    if (amount && !isNaN(parseFloat(amount))) {
        axios.post(`${API_BASE}/admin/player/add-credits`, { player_id: playerId, amount: parseFloat(amount), reason: reason }, { headers: { 'x-admin-key': ADMIN_KEY } })
            .then(response => {
                if (response.data.success) {
                    showToast("success", `Credits added successfully to ${playerId.substring(0, 8)}...`);
                    // Potentially refresh player list or relevant data
                    fetchPlayers(); 
                } else {
                    showToast("error", response.data.error_en || "Failed to add credits.");
                }
            })
            .catch(error => {
                console.error("Error adding credits:", error);
                showToast("error", "Failed to add credits. Check console.");
            });
    } else {
        showToast("error", "Invalid amount entered.");
    }
}

function handleDeactivatePlayer(playerId) {
    console.log("Handle Deactivate Player for:", playerId);
    if (!confirm(`Are you sure you want to deactivate player ${playerId.substring(0, 8)}...?`)) {
        return;
    }
    axios.post(`${API_BASE}/admin/player/deactivate`, { player_id: playerId }, { headers: { 'x-admin-key': ADMIN_KEY } })
        .then(response => {
            if (response.data.success) {
                showToast("success", response.data.message_en);
                fetchPlayers(); // Refresh player list
            } else {
                showToast("error", response.data.error_en || "Failed to deactivate player.");
            }
        })
        .catch(error => {
            console.error("Error deactivating player:", error);
            showToast("error", "Failed to deactivate player. Check console.");
        });
}

function exportSpinHistory() {
    console.log("Export spin history to CSV...");
    // This would require fetching all relevant history and formatting it as CSV
    showToast("info", "CSV export functionality is a placeholder.");
}

// --- Initial rendering and setup when DOM is ready ---
document.addEventListener('DOMContentLoaded', () => {
    // ... existing setup ...

    // Dynamically create sections if they don't exist in HTML
    if (!document.getElementById('probability-section')) { const sec = document.createElement('section'); sec.id = 'probability-section'; sec.className = 'content-section'; sec.style.display = 'none'; document.querySelector('.content-wrapper').appendChild(sec); }
    if (!document.getElementById('game-config-section')) { const sec = document.createElement('section'); sec.id = 'game-config-section'; sec.className = 'content-section'; sec.style.display = 'none'; document.querySelector('.content-wrapper').appendChild(sec); }
    if (!document.getElementById('players-section')) { const sec = document.createElement('section'); sec.id = 'players-section'; sec.className = 'content-section'; sec.style.display = 'none'; document.querySelector('.content-wrapper').appendChild(sec); }
    if (!document.getElementById('spin-history-section')) { const sec = document.createElement('section'); sec.id = 'spin-history-section'; sec.className = 'content-section'; sec.style.display = 'none'; document.querySelector('.content-wrapper').appendChild(sec); }
    
    // Sidebar navigation listeners
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const targetView = e.currentTarget.getAttribute('href').substring(1);
            displayView(targetView);
            
            sidebarNavItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            pageTitle.textContent = e.currentTarget.textContent.trim();

            // Load and render content for the selected view
            if (targetView === 'dashboard') {
                await fetchAdminStats();
                await fetchSpinHistory({ wins_only: true });
                renderSymbolProbabilitiesList();
                updateRtpProgress();
            } else if (targetView === 'probability') {
                 renderProbabilityConfigForm();
            } else if (targetView === 'game-config') {
                 renderGameConfigForm();
            } else if (targetView === 'players') {
                await renderPlayersPage();
            } else if (targetView === 'spin-history') {
                await renderSpinHistoryPage();
            }
        });
    });

    // Initial rendering and updates
    displayView('dashboard');
    updateBruneiClock();
});
// --- Helper Functions for Admin UI ---
function calculateTotalWeightForForm(formElement) {
    let totalWeight = 0;
    formElement.querySelectorAll('.weight-input').forEach(input => {
        totalWeight += parseInt(input.value) || 0;
    });
    return totalWeight;
}

function updateRtpEstimates() {
    if (!probabilityConfigForm) return;

    const activeSymbolsInForm = [];
    let totalWeight = 0;
    
    probabilityConfigForm.querySelectorAll('.symbol-row').forEach(row => {
        const isActive = row.querySelector('.toggle-active').checked;
        if (isActive) {
            const symbolKey = row.querySelector('.weight-input').dataset.symbolKey;
            const weight = parseInt(row.querySelector('.weight-input').value) || 0;
            const payout3x = parseFloat(row.querySelector('[data-payout-type="payout_3x"]').value) || 0;
            const payout4x = parseFloat(row.querySelector('[data-payout-type="payout_4x"]').value) || 0;
            const payout5x = parseFloat(row.querySelector('[data-payout-type="payout_5x"]').value) || 0;
            
            activeSymbolsInForm.push({ symbol_key: symbolKey, weight: weight, payout_3x, payout_4x, payout_5x });
            totalWeight += weight;
        }
    });

    const theoreticalRtp = calculate_theoretical_rtp(activeSymbolsInForm, totalWeight);
    const houseEdgeEstimate = 100 - theoreticalRtp;

    if (theoreticalRtpVal) theoreticalRtpVal.textContent = `${theoreticalRtp.toFixed(1)}%`;
    if (houseEdgeEstimateVal) houseEdgeEstimateVal.textContent = `${houseEdgeEstimate.toFixed(1)}%`;
    
    updateRtpProgress();
}

function updateRtpProgress() {
    const rtpValue = parseFloat(theoreticalRtpVal.textContent);
    const progressBar = rtpProgressBar;
    const meterValueDisplay = rtpMeterValue;

    if (!isNaN(rtpValue) && progressBar && meterValueDisplay) {
        let progress = Math.max(0, Math.min(100, rtpValue));
        progressBar.style.width = `${progress}%`;

        if (progress > 98) progressBar.style.backgroundColor = '#EF5350'; // Red
        else if (progress > 97) progressBar.style.backgroundColor = '#FFEB3B'; // Yellow
        else progressBar.style.backgroundColor = '#4CAF50'; // Green

        meterValueDisplay.textContent = `${rtpValue.toFixed(1)}%`;
        meterValueDisplay.style.color = progressBar.style.backgroundColor;
    }
}

function colorCodeRtp(rtp, element) {
    if (!element) return;
    if (rtp > 98) element.style.color = '#EF5350';
    else if (rtp > 97) element.style.color = '#FFEB3B';
    else element.style.color = '#4CAF50';
}

function colorCodeHouseEdge(houseEdge, element) {
    if (!element) return;
    if (houseEdge < 2) element.style.color = '#EF5350';
    else if (houseEdge < 3) element.style.color = '#FFEB3B';
    else element.style.color = '#4CAF50';
}

function formatCurrencyAdmin(amount) {
    const symbol = allGameConfigs.find(c => c.config_key === 'currency_symbol')?.config_value || "B$";
    return `${symbol}${amount.toFixed(2)}`;
}

// --- Event Listeners for Forms and Actions ---
// Probability Form Submit Handler (defined above in setup)
// Game Config Form Submit Handler (defined above in setup)

// Placeholder for Export CSV functionality
function exportSpinHistory() {
    console.log("Export spin history to CSV...");
    showToast("info", "CSV export functionality is a placeholder.");
}

// Placeholder functions for admin actions (will need API calls)
async function handleAddCredits(playerId) {
    console.log("Handle Add Credits for player:", playerId);
    const amount = prompt("Enter amount to add:");
    const reason = prompt("Enter reason:");
    if (amount && !isNaN(parseFloat(amount))) {
        try {
            const response = await axios.post(`${API_BASE}/admin/player/add-credits`, { player_id: playerId, amount: parseFloat(amount), reason: reason }, { headers: { 'x-admin-key': ADMIN_KEY } });
            if (response.data.success) {
                showToast("success", `Credits added successfully to ${playerId.substring(0, 8)}...`);
                fetchPlayers(); // Refresh player list
            } else {
                showToast("error", response.data.error_en || "Failed to add credits.");
            }
        } catch (error) {
            console.error("Error adding credits:", error);
            showToast("error", "Failed to add credits. Check console.");
        }
    } else {
        showToast("error", "Invalid amount entered.");
    }
}

async function handleDeactivatePlayer(playerId) {
    console.log("Handle Deactivate Player for:", playerId);
    if (!confirm(`Are you sure you want to deactivate player ${playerId.substring(0, 8)}...?`)) return;
    try {
        const response = await axios.post(`${API_BASE}/admin/player/deactivate`, { player_id: playerId }, { headers: { 'x-admin-key': ADMIN_KEY } });
        if (response.data.success) {
            showToast("success", response.data.message_en);
            fetchPlayers(); // Refresh player list
        } else {
            showToast("error", response.data.error_en || "Failed to deactivate player.");
        }
    } catch (error) {
        console.error("Error deactivating player:", error);
        showToast("error", "Failed to deactivate player. Check console.");
    }
}

// --- Main View Switching Logic ---
function displayView(viewId) {
    contentSections.forEach(section => {
        section.style.display = section.id === viewId ? 'block' : 'none';
    });
}

// --- Initial rendering calls ---
// DOMContentLoaded listener handles initial setup and dashboard render.
// Specific section rendering is triggered by sidebar navigation.
