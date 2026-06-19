import CookieUtilities from './scripts/utilities/cookie.js';
import SettingsManager from './scripts/settings.js';
import SocketUtilities from './scripts/socketnames.js';
import {in_private_scope,with_value} from './scripts/utilities/functools.js';
import NameMaps from './scripts/ui/human_readable_names.js';
import DialogUtilities from './scripts/ui/webdialog.js';
import LoadingBox from './scripts/ui/loadingbox.js';
import assetManager from './scripts/ui/asset_manager.js';
import tradesPanel from './scripts/ui/trades_panel.js';
import gameTimer from './scripts/ui/game_timer.js';
import setupSidebarResizer from './scripts/ui/sidebar_resizer.js';

console.log("script started");

// Get hostname from cookie, otherwise leave as null
const server = CookieUtilities.getCookie("lastServer");

//Probably some default values for original testing:
// var hostname = "miningbots-api.dev.tk.sg";
// var port = 443;
var hostname, port;
// if (server !== null) hostname = server;

const CONFIG_=SettingsManager.read_settings_cookie();
const GameUnvailableError = class extends Error {
    constructor(message) {
        super(message);
        this.name = "GameUnvailableError";
    }
}

let reconnectPollTimeoutId = null;
let reconnectPollInProgress = false;
let activeDrawSessionId = 0;

let http_type,ws_type;
function set_protocols(upgrade_connection){
    if (CONFIG_["require_security"] || upgrade_connection) {
        http_type = "https";
        ws_type = "wss";
    } else {
        http_type = "http";
        ws_type = "ws";
    }
}
// var http_type = "https";
// var ws_type = "wss";

//Dictionary of servers and respective names, urls
var servers = in_private_scope(()=>{
  let gport=CONFIG_.game_port;
  let lport=CONFIG_.localhost_port;
  let servers = {
    "shared-server": {
        name: "Shared Server",
        url: `trainers.tnkr.be:35000`,
    },
    "team-1-gold-digger": {
        name: "1 / Gold Digger",
        url: `trainers.tnkr.be:35001`,
    },
    "team-2-4sigma": {
        name: "2 / 4sigma",
        url: `trainers.tnkr.be:35002`,
    },
    "team-3-johnson-johnson": {
        name: "3 / Johnson Johnson",
        url: `trainers.tnkr.be:35003`,
    },
    "team-4-resurrection": {
        name: "4 / Resurrection",
        url: `trainers.tnkr.be:35005`,
    },
    "competition": {
        name: "Competition",
        url: `trainers.tnkr.be:35010`,
    },
    "current.invalid": {
        name: "Front-end Host",
        type: "fe_host"
    },
    "localhost": {
        name: "localhost",
        url: `localhost:${lport}`,
    },
    "miningbots-api.dev.tk.sg": {
        name: "miningbots-api.dev.tk.sg",
        url: "miningbots-api.dev.tk.sg",
        require_security: true,
    },
    "custom.invalid": { // invalid special domain by IANA
        name: "Custom / Other server...",
        type: "custom"
    }
  }
  servers["current.invalid"].require_security=servers["localhost"].require_security;
  return servers;
});

// Variable to hold the selected server URL
let selectedServerUrl = null;

if(server && servers[server]){
    const isSpecial=servers[server].hasOwnProperty("type");
    if(isSpecial){
        setServerName(servers[server].name);
        switch(servers[server].type){
            case "custom":
                function empty_handler() {
                    setServerName(servers[server].name.replace(/\.+$/, ""));
                    LoadingBox.setStatus(LoadingBox.Status.SERVER_UNAVAILABLE);
                    setTimeout(window.NavigationManager.showNavigation,200);
                }
                function prompt_socket(previous_socket) {
                    DialogUtilities.prompt("Please enter the socket URL for the custom server:", "Socket URL", previous_socket, socket_obtained, empty_handler);
                }
                function socket_obtained(socket) {
                    socket = socket.trim();
                    try {
                        if(socket.length==0) throw new Error("Socket URL cannot be empty");
                        const url=SocketUtilities.breakUpSocket(socket);
                        hostname = url.hostname;
                        CookieUtilities.setCookie("custom_server",socket,"Fri, 31 Dec 9999 23:59:59 GMT",'/')
                        console.log("URL: " + socket);
                        let protocol=url.protocol.substring(0,url.protocol.length-1);
                        with_value((protocol=="https"||protocol=="wss")||CONFIG_["require_security"],(is_secure_protocol)=>{
                            port=SocketUtilities.applyDefaultPort(is_secure_protocol?"https":"http",url.port);
                            set_protocols(is_secure_protocol);
                        });
                        setServerName(servers["custom.invalid"].name.replace(/\.+$/, "")); // remove trailing dots
                        main();
                    } catch (e){
                        DialogUtilities.showDialog(`Error: ${e.message}`, "Error", empty_handler,[{text: "OK", action: ()=>{prompt_socket(socket)}}], "OK");
                    }
                }
                let socket=CookieUtilities.getCookie("custom_server");
                if(socket && SocketUtilities.isValidSocket(socket)) {
                    socket_obtained(socket);
                } else {
                    //else prompt the user for the socket
                    // "" is so that the field is empty by default
                    prompt_socket("");
                }
                break;
            case "fe_host":
                hostname=location.hostname;
                port=CONFIG_["localhost_port"];
                set_protocols(servers["localhost"].require_security);
                main();
                break;
        }
    } else {
        let url=servers[server].url;
        if(url.indexOf(":")!=-1){
            hostname = url.split(":")[0];
            port = url.split(":")[1];
        } else {
            hostname = url;
            port = (servers[hostname].require_security || CONFIG_['require_security']) ? '443' : '80';
        }
        set_protocols(servers[server].require_security);
        setServerName(servers[hostname].name);
        main();
    }
}

function populateServerMenu() {
    let serverMenu = document.querySelector(".server-menu");
    Object.keys(servers).forEach(function (key) {
        let server = servers[key];
        let menuItem = document.createElement("a");
        menuItem.classList.add("server-menu-item");
        menuItem.href = "#";
        menuItem.dataset.url = key;
        menuItem.textContent = server.name;
        serverMenu.appendChild(menuItem);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    populateServerMenu();
    setupStartGameControl();
    setupSidebarResizer();
    setupBotRowWheelScroll();

    let serverMenuItems = document.querySelectorAll(".server-menu-item");
    serverMenuItems.forEach(function (item) {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedServerUrl = this.getAttribute("data-url");
            window.NavigationManager.hideNavigation();
            console.log(selectedServerUrl);
            let selectedServerName = this.textContent;
            setServerName(selectedServerName);
            // Save to cookie first
            CookieUtilities.setCookie("lastServer", selectedServerUrl, CookieUtilities.never);
            CookieUtilities.deleteCookie("custom_server",'/');
            location.reload();
            // drawGame(selectedServerUrl, port);
        });
    });
});

// Player Name fetch code
async function fetchPlayerNames(gameId, playerIds) {
    const url = `${http_type}://${hostname}:${port}/players`;
    const playerRequest = { game_id: gameId, player_ids: playerIds };

    try {
        const response = await fetch(`${url}?request=${encodeURIComponent(JSON.stringify(playerRequest))}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const playerUpdates = await response.json();
        return playerUpdates;
    } catch (error) {
        console.error('Failed to fetch player names:', error);
    }
}

function formatServerStatus(status) {
    return String(status || '-').replace(/^k/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatDisplayStatus(game, hasObservedTick) {
    switch (game?.game_status) {
        case 'kOpen':
            return hasObservedTick ? 'Running' : 'Open / waiting for updates';
        case 'kFull':
            return hasObservedTick ? 'Running / full' : 'Full / waiting for updates';
        case 'kNotStarted':
            return 'Not started';
        case 'kEnded':
            return 'Ended';
        default:
            return formatServerStatus(game?.game_status);
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function renderGameStatus(game, mapConfig, hasObservedTick = false) {
    if (!game) return;
    const serverName = servers[server]?.name || server || `${hostname}:${port}`;
    const gameName = game.game_name || `Game ${game.game_id}`;
    const playerText = `${game.current_players ?? '-'} / ${game.max_players ?? mapConfig?.max_players ?? '-'}`;
    const mapText = mapConfig ? `${mapConfig.max_x} x ${mapConfig.max_y}` : '-';
    const statusText = formatDisplayStatus(game, hasObservedTick);
    const statusState = document.getElementById('status-state');

    setText('status-server', serverName);
    setText('status-game', gameName);
    setText('status-state', statusText);
    setText('status-players', playerText);
    setText('status-map', mapText);

    if (statusState) {
        statusState.dataset.status = hasObservedTick ? 'kRunning' : (game.game_status || '');
        statusState.title = `Server status: ${formatServerStatus(game.game_status)}`;
    }

    // A kNotStarted game is joinable but frozen; offer the observer-only start control.
    if (!hasObservedTick && game.game_status === 'kNotStarted') {
        showStartGameControl(game.game_id);
    } else {
        hideStartGameControl();
    }
}

function selectActiveGame(games, currentGameId = null) {
    if (!Array.isArray(games) || games.length === 0) return null;
    const candidates = games.filter(game => game.game_status !== 'kEnded');
    if (currentGameId !== null) {
        const replacement = candidates.find(game => game.game_id !== currentGameId);
        if (replacement) return replacement;
    }
    return candidates[0] || games[0];
}

async function fetchGames() {
    const response = await fetch(`${http_type}://${hostname}:${port}/games`, { method: 'GET' });
    if (!response.ok) throw new Error(response.statusText);
    return response.json();
}

async function refreshGameStatus(matchGameId, mapConfig, hasObservedTick = false) {
    const games = await fetchGames();
    const game = games.find(g => g.game_id === matchGameId);
    if (game) renderGameStatus(game, mapConfig, hasObservedTick);
    return game;
}

function showStartGameControl(gameId) {
    const row = document.getElementById('start-game-row');
    const button = document.getElementById('start-game-button');
    if (!row || !button) return;
    button.dataset.gameId = String(gameId);
    button.disabled = false;
    setText('start-game-button-text', 'Start Game');
    row.classList.remove('hidden');
}

function hideStartGameControl() {
    document.getElementById('start-game-row')?.classList.add('hidden');
}

// Observer-only POST /start_game. The whole request rides in a single
// url-encoded `request` query param (same convention as /move, /join_game).
// Success is the bare JSON string "kSuccess"; "already started" is treated as
// success since the call is effectively idempotent.
async function startGame(gameId) {
    const request = encodeURIComponent(JSON.stringify({
        game_id: gameId,
        observer_key: CONFIG_.observer_key,
    }));
    const response = await fetch(`${http_type}://${hostname}:${port}/start_game?request=${request}`, { method: 'POST' });
    let body;
    try {
        body = await response.json();
    } catch (e) {
        throw new Error('Unexpected response from server.');
    }
    if (body === 'kSuccess') return { ok: true };
    if (body && body.error === 'kCannotStartGameAlreadyStarted') return { ok: true, alreadyStarted: true };
    const message = (body && (body.error_message || body.error)) || 'Unknown error';
    return { ok: false, error: body && body.error, message };
}

// Wired once on load; the active game id is stashed on the button's dataset by
// renderGameStatus whenever the game is joinable-but-frozen (kNotStarted).
function setupStartGameControl() {
    const button = document.getElementById('start-game-button');
    if (!button) return;
    button.addEventListener('click', async () => {
        const gameId = Number(button.dataset.gameId);
        if (!Number.isFinite(gameId) || gameId === 0) return;
        button.disabled = true;
        setText('start-game-button-text', 'Starting…');
        try {
            const result = await startGame(gameId);
            if (result.ok) {
                // The observer feed / status poll will flip the UI to Running shortly.
                setText('start-game-button-text', result.alreadyStarted ? 'Already started' : 'Started');
                hideStartGameControl();
            } else {
                DialogUtilities.showDialog(`Could not start game: ${result.message}`, 'Start Game');
                setText('start-game-button-text', 'Start Game');
                button.disabled = false;
            }
        } catch (error) {
            DialogUtilities.showDialog(`Could not start game: ${error.message}`, 'Start Game');
            setText('start-game-button-text', 'Start Game');
            button.disabled = false;
        }
    });
}

// Each team's bots live on a single horizontal-scrolling row (.bot-box). A
// horizontal-only strip doesn't react to the mouse wheel by default, so users
// can't reach the off-screen bots. Delegate a wheel handler from the stable
// list container (the per-team rows are rebuilt every tick) that turns a
// vertical wheel into a horizontal scroll — but only while the row actually has
// somewhere to go, so at the ends the wheel falls back to scrolling the list.
function setupBotRowWheelScroll() {
    const list = document.getElementById('player-sidebar-list');
    if (!list) return;
    list.addEventListener('wheel', (event) => {
        const box = event.target.closest?.('.bot-box');
        if (!box || box.scrollWidth <= box.clientWidth || event.deltaY === 0) return;
        const before = box.scrollLeft;
        box.scrollLeft += event.deltaY;
        if (box.scrollLeft !== before) event.preventDefault();
    }, { passive: false });
}

function startGameStatusPolling(matchGameId, mapConfig, getHasObservedTick, onGame, onStaleGame) {
    const BASE_INTERVAL = 3000;
    const MAX_INTERVAL = 30000;
    let interval = BASE_INTERVAL;
    let timeoutId = null;

    const poll = async () => {
        try {
            const game = await refreshGameStatus(matchGameId, mapConfig, getHasObservedTick());
            if (!game || game.game_status === 'kEnded') {
                if (typeof onStaleGame === 'function') onStaleGame('status-poll');
                return;
            }
            if (game && typeof onGame === 'function') onGame(game);
            interval = BASE_INTERVAL;
        } catch (error) {
            interval = Math.min(interval * 2, MAX_INTERVAL);
            console.warn(`Game status poll failed, retrying in ${interval / 1000}s:`, error.message);
        }
        timeoutId = setTimeout(poll, interval);
    };

    timeoutId = setTimeout(poll, 0);
    return { stop: () => clearTimeout(timeoutId) };
}

function pollForReplacementGame(currentGameId, reason) {
    if (!window.GameObserverControls?.isAutoRefreshEnabled?.()) {
        console.log(`Game became stale after ${reason}; auto-connect is disabled.`);
        return;
    }
    if (reconnectPollInProgress) return;
    reconnectPollInProgress = true;
    if (reconnectPollTimeoutId) clearTimeout(reconnectPollTimeoutId);

    const poll = async () => {
        try {
            const games = await fetchGames();
            const replacement = selectActiveGame(games, currentGameId);
            if (replacement && replacement.game_id !== currentGameId && replacement.game_status !== 'kEnded') {
                console.log(`Found replacement game ${replacement.game_id} after ${reason}; reloading observer.`);
                window.location.reload();
                return;
            }
        } catch (error) {
            console.warn(`Waiting for replacement game after ${reason}:`, error.message);
        }
        reconnectPollTimeoutId = setTimeout(poll, 3000);
    };

    LoadingBox.setStatus(LoadingBox.Status.LOADING);
    poll();
}

function drawGame(hostname, port) {
    const drawSessionId = ++activeDrawSessionId;
    gameTimer.reset();
    const canvas = document.getElementById("gameCanvas");
    const mapViewport = document.getElementById("map-viewport");
    const mapStage = document.getElementById("map-canvas-stage");
    const zoomLabel = document.getElementById("map-zoom-label");
    const zoomInButton = document.getElementById("zoom-in-button");
    const zoomOutButton = document.getElementById("zoom-out-button");
    const zoomResetButton = document.getElementById("zoom-reset-button");
    const ctx = canvas.getContext("2d");

    //Maybe adjust this to dynamically adapt such that the whole canvas will be shown regardless of map aspect ratio?
    const images = assetManager.images;
    let terrainImages={};

    //Likely connecting to the server and retrieving initial game state
    fetchGames()
        .then(games => {
            console.log('games:', games);
            let selectedGame = selectActiveGame(games);
            if (!selectedGame) {
                throw new GameUnvailableError('No games available');
            }
            let gameId = selectedGame.game_id;
            let gameStatus = selectedGame.game_status;
            renderGameStatus(selectedGame);
            if (gameStatus == 'kEnded') {
                console.log('failed to subscribe because game has ended');
                throw new GameUnvailableError('Game has ended');
                return;
            }
            let fetch_map_config = fetch(`${http_type}://${hostname}:${port}/map_config?game_id=${gameId}`, {
                method: 'GET'
            });

            return { response: fetch_map_config, game_id: gameId, game: selectedGame };
        })
        .then(async result => {
            let response = await result.response;

            if (response.ok) {
                console.log('Second fetch response:', response);
                LoadingBox.setStatus(LoadingBox.Status.LOADING_COMPLETED);
                return { map_config: response.json(), game_id: result.game_id, game: result.game };
            } else {
                throw new Error(response.statusText);
            }
        })
        //Map config taken from server data
        .then(async result => {
            let map_config = await result.map_config;
            const matchGameId = result.game_id;
            let selectedGameInfo = result.game;
            let hasObservedTick = false;
            renderGameStatus(selectedGameInfo, map_config, hasObservedTick);
            const statusPolling = startGameStatusPolling(
                matchGameId,
                map_config,
                () => hasObservedTick,
                game => { selectedGameInfo = game; },
                reason => {
                    statusPolling.stop();
                    pollForReplacementGame(matchGameId, reason);
                }
            );
            console.log('map_config:', map_config);
            // rendring information

            // browser window dimensions
            var GRID_SIZE;
            var mapViewportWidth = mapViewport?.clientWidth || window.innerWidth;
            var mapViewportHeight = mapViewport?.clientHeight || window.innerHeight;
            var mapZoom = 1;
            var minMapZoom = 1;
            var animationFrameId = null;
            const MAX_MAP_ZOOM = 4;
            const MAP_ZOOM_STEP = 0.25;
            const MOVEMENT_ANIMATION_MS = 420;
            const ORE_MAX_OPACITY = 0.8;
            const ORE_MIN_OPACITY = 0.1;
            // map dimensions
            const COLS = map_config.max_x;
            const ROWS = map_config.max_y;
            const MAX_WHITE_WIDTH = 60;
            const MAX_WHITE_HEIGHT = 60;
            const borderWidth = 1;
            updateDimensions(true);

            let resizeTimeout = null;
            window.addEventListener("resize",(_e)=>{
                if(resizeTimeout) clearTimeout(resizeTimeout); // clear the timeout if it exists
                resizeTimeout = setTimeout(()=>{
                    updateDimensions();
                    resizeTimeout=null;
                },100);
            });
            console.log(COLS);

            function updateDimensions(lazy_render) {
                mapViewportWidth = mapViewport?.clientWidth || window.innerWidth;
                mapViewportHeight = mapViewport?.clientHeight || window.innerHeight;
                const squareViewportSize = Math.min(mapViewportWidth, mapViewportHeight);
                GRID_SIZE = Math.max(4, Math.floor(Math.min(squareViewportSize / COLS, squareViewportSize / ROWS))); // fit the map on to the square map viewport
                minMapZoom = Math.max(1, squareViewportSize / Math.min(COLS * GRID_SIZE, ROWS * GRID_SIZE));
                mapZoom = clampMapZoom(mapZoom);
                applyMapZoom();
                if(!lazy_render) render();
            }

            function clampMapZoom(value) {
                return Math.max(minMapZoom, Math.min(MAX_MAP_ZOOM, value));
            }

            function applyMapZoom() {
                const pixelRatio = window.devicePixelRatio || 1;
                const scaledWidth = Math.max(1, Math.round(COLS * GRID_SIZE * mapZoom));
                const scaledHeight = Math.max(1, Math.round(ROWS * GRID_SIZE * mapZoom));
                canvas.width = Math.max(1, Math.round(scaledWidth * pixelRatio));
                canvas.height = Math.max(1, Math.round(scaledHeight * pixelRatio));
                canvas.style.width = `${scaledWidth}px`;
                canvas.style.height = `${scaledHeight}px`;
                ctx.setTransform(pixelRatio * mapZoom, 0, 0, pixelRatio * mapZoom, 0, 0);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                if (mapStage) {
                    mapStage.style.width = `${scaledWidth}px`;
                    mapStage.style.height = `${scaledHeight}px`;
                }
                if (zoomLabel) {
                    zoomLabel.textContent = `${Math.round(mapZoom * 100)}%`;
                }
            }

            function setMapZoom(nextZoom, focalPoint) {
                const oldZoom = mapZoom;
                const clampedZoom = clampMapZoom(nextZoom);
                if (oldZoom === clampedZoom) return;

                const viewport = mapViewport;
                const focus = focalPoint || {
                    x: viewport ? viewport.scrollLeft + viewport.clientWidth / 2 : 0,
                    y: viewport ? viewport.scrollTop + viewport.clientHeight / 2 : 0
                };
                const mapX = focus.x / oldZoom;
                const mapY = focus.y / oldZoom;

                mapZoom = clampedZoom;
                applyMapZoom();
                render();

                if (viewport) {
                    viewport.scrollLeft = mapX * mapZoom - viewport.clientWidth / 2;
                    viewport.scrollTop = mapY * mapZoom - viewport.clientHeight / 2;
                }
            }

            function focusMapOnPosition(position, targetZoom = Math.max(1.5, mapZoom)) {
                if (!mapViewport || !position) return;
                if (targetZoom > mapZoom) {
                    setMapZoom(targetZoom);
                }

                const centerX = (position.x + 0.5) * GRID_SIZE * mapZoom;
                const centerY = (ROWS - position.y - 0.5) * GRID_SIZE * mapZoom;
                mapViewport.scrollTo({
                    left: Math.max(0, centerX - mapViewport.clientWidth / 2),
                    top: Math.max(0, centerY - mapViewport.clientHeight / 2),
                    behavior: 'smooth'
                });
            }

            zoomInButton?.addEventListener('click', () => setMapZoom(mapZoom + MAP_ZOOM_STEP));
            zoomOutButton?.addEventListener('click', () => setMapZoom(mapZoom - MAP_ZOOM_STEP));
            zoomResetButton?.addEventListener('click', () => setMapZoom(1));
            mapViewport?.addEventListener('wheel', event => {
                if (!event.ctrlKey && !event.metaKey) return;
                event.preventDefault();
                const rect = mapViewport.getBoundingClientRect();
                const focalPoint = {
                    x: mapViewport.scrollLeft + event.clientX - rect.left,
                    y: mapViewport.scrollTop + event.clientY - rect.top
                };
                setMapZoom(mapZoom + (event.deltaY < 0 ? MAP_ZOOM_STEP : -MAP_ZOOM_STEP), focalPoint);
            }, { passive: false });
            mapViewport?.addEventListener('mousemove', event => updateMapTooltip(event));
            mapViewport?.addEventListener('mouseleave', () => hideMapTooltip());

            let resource_configs = map_config.resource_configs;

            // Initialize assets dynamically from map_config using the assetManager
            assetManager.initializeDynamicAssets(map_config);

            const elements = assetManager.elements;
            const resources = assetManager.resources;
            const botVariants = assetManager.botVariants;
            const BOT_START_IDX = assetManager.BOT_START_IDX;

            function addTerrain(terrain_name, filename){
                terrainImages[terrain_name] = new Image();
                terrainImages[terrain_name].src = 'assets/' + (filename || terrain_name) + '.jpg';
            }
            //Adds new terrain images from terrain_configs
            addTerrain('unknown'); //always have unknown terrain
            map_config.terrain_configs.forEach(terrain => {
                addTerrain(terrain.name.toLowerCase(), 'Terrain_' + terrain.name);
            });

            let gameState = Array.from({ length: ROWS }, () => Array(COLS).fill(elements.unknown)); //all squares are unknown at the start
            let terrains = Array.from({ length: ROWS }, () => Array(COLS).fill(terrainImages.unknown)); //all squares are unknown at the start
            let resourceCells = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
            const resourceMaxByCell = new Map();
            const mapTooltip = document.createElement('div');
            mapTooltip.classList.add('map-tooltip', 'hidden');
            document.body.appendChild(mapTooltip);

            function drawASquare(c, r, background, image, opacity = 1) {
                ctx.drawImage(background, c * GRID_SIZE - borderWidth, r * GRID_SIZE - borderWidth, GRID_SIZE + borderWidth, GRID_SIZE + borderWidth);
                if (image) { //if an element image was given
                    ctx.save();
                    ctx.globalAlpha = opacity;
                    ctx.drawImage(image, c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                    ctx.restore();
                }
            }

            function transparentColor(colour) {
                return String(colour).replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgba($1,$2,$3,0)');
            }

            function drawABot(c, r, colour, image) {
                const x = c * GRID_SIZE;
                const y = r * GRID_SIZE;
                ctx.drawImage(image || images.unknown, x, y, GRID_SIZE, GRID_SIZE);

                const gradient = ctx.createRadialGradient(
                    x + GRID_SIZE / 2,
                    y + GRID_SIZE / 2,
                    GRID_SIZE * 0.08,
                    x + GRID_SIZE / 2,
                    y + GRID_SIZE / 2,
                    GRID_SIZE * 0.56
                );
                gradient.addColorStop(0, colour);
                gradient.addColorStop(0.58, colour);
                gradient.addColorStop(1, transparentColor(colour));

                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
                ctx.restore();
            }

            function resourceCellKey(row, col, resourceId) {
                return `${row}:${col}:${resourceId}`;
            }

            function resourceOpacity(row, col, resource) {
                const key = resourceCellKey(row, col, resource.id);
                const currentAmount = Number(resource.amount || 0);
                const maxAmount = Math.max(resourceMaxByCell.get(key) || 0, currentAmount, 1);
                resourceMaxByCell.set(key, maxAmount);
                const ratio = Math.max(0, Math.min(1, currentAmount / maxAmount));
                return ORE_MIN_OPACITY + (ORE_MAX_OPACITY - ORE_MIN_OPACITY) * ratio;
            }

            function drawResourceCell(col, row, terrain, fallbackImage) {
                const cell = resourceCells[row][col];
                if (!cell || !cell.primary || Number(cell.primary.amount || 0) <= 0) {
                    drawASquare(col, row, terrain);
                    return;
                }

                const image = assetManager.getElementImage(cell.element) || fallbackImage;
                drawASquare(col, row, terrain, image, resourceOpacity(row, col, cell.primary));
            }

            function drawDisruptEffects(now) {
                const duration = 900;
                let active = false;
                for (let i = disruptEffects.length - 1; i >= 0; i--) {
                    const effect = disruptEffects[i];
                    const progress = Math.min(1, Math.max(0, (now - effect.startedAt) / duration));
                    if (progress >= 1) {
                        disruptEffects.splice(i, 1);
                        continue;
                    }

                    active = true;
                    const alpha = 1 - progress;
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const centerX = (effect.position.x + 0.5) * GRID_SIZE;
                    const centerY = (ROWS - effect.position.y - 0.5) * GRID_SIZE;
                    const radiusPx = (effect.radius + 0.5) * GRID_SIZE;

                    ctx.save();
                    ctx.fillStyle = `rgba(236, 72, 153, ${0.18 * alpha})`;
                    ctx.strokeStyle = `rgba(236, 72, 153, ${0.85 * alpha})`;
                    ctx.lineWidth = Math.max(2, GRID_SIZE * 0.08);

                    for (let dy = -effect.radius; dy <= effect.radius; dy++) {
                        for (let dx = -effect.radius; dx <= effect.radius; dx++) {
                            if ((dx * dx + dy * dy) > (effect.radius * effect.radius)) continue;
                            const x = effect.position.x + dx;
                            const y = effect.position.y + dy;
                            if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
                            ctx.fillRect(x * GRID_SIZE, (ROWS - y - 1) * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                        }
                    }

                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radiusPx * eased, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
                return active;
            }

            function render(now = performance.now()) {
                if (animationFrameId !== null) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
                let isAnimating = false;
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.restore();

                function drawTerrainCell(col, row, element, terrain) {
                    if (element >= BOT_START_IDX) {
                        drawASquare(col, row, terrain);
                        return;
                    }

                    switch (element) {
                        case elements.unknown:
                            ctx.fillStyle = '#1a3320';
                            ctx.fillRect(col * GRID_SIZE - borderWidth, row * GRID_SIZE - borderWidth, GRID_SIZE + borderWidth, GRID_SIZE + borderWidth);
                            break;
                        case elements.traversable:
                            drawASquare(col, row, terrain); //nothing occupying the space, so no additional image
                            break;
                        case elements.resource:
                            drawResourceCell(col, row, terrain, images.mixed_ore);
                            break;
                        default: {
                            let image = assetManager.getElementImage(element);
                            if(image && image.complete && image.naturalHeight > 0){
                                drawResourceCell(col, row, terrain, image);
                            } else {
                                drawResourceCell(col, row, terrain, images.mixed_ore);
                            }
                        }
                    }
                }

                for (let row = 0; row < ROWS; row++) {
                    for (let col = 0; col < COLS; col++) {
                        const element = gameState[row][col];
                        const terrain = terrains[row][col];
                        drawTerrainCell(col, row, element, terrain);
                        if (COLS < MAX_WHITE_WIDTH && ROWS < MAX_WHITE_HEIGHT) { //if map is small enough, show white grid
                            ctx.strokeStyle = 'rgba(144,238,144,0.4)'; // light green gridlines
                            ctx.lineWidth = 1; // set border width
                            ctx.strokeRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                        }
                    }
                }

                if (drawDisruptEffects(now)) {
                    isAnimating = true;
                }

                for (const entry of botMap.values()) {
                    const display = displayPositionForBot(entry, now);
                    const [position, variant, _currentEnergy, job, cargo, playerIndex] = entry;
                    const color = colors[playerIndex];
                    const img = assetManager.getBotImage(variant, job, cargo);
                    if (display.animating) isAnimating = true;
                    drawABot(display.x, ROWS - display.y - 1, color, img);
                }

                if (isAnimating) {
                    animationFrameId = requestAnimationFrame(render);
                } else {
                    animationFrameId = null;
                }
            }

            // randomState();
            // Declared before the first render() call: render() reads botMap
            // (and the resize handler can call render() too), so these must be
            // initialized first to avoid a temporal-dead-zone ReferenceError.
            const botMap = new Map();
            const jobMap = new Map();
            const disruptEffects = [];
            const players = {};
            const playerNames = {};
            render();

            const ws = new WebSocket(`${ws_type}://${hostname}:${port}/observer`);

            // Live market-data view (top-left). Connects to the public /trades feed;
            // a no-op against servers that don't have the trading pack enabled.
            tradesPanel.connect(`${ws_type}://${hostname}:${port}/trades`, matchGameId, map_config.resource_configs);

            ws.onopen = function () {
                if (drawSessionId !== activeDrawSessionId) {
                    ws.close();
                    return;
                }
                console.log('Connected to WebSocket server');
                const subscribeRequest = JSON.stringify({ game_id: matchGameId, observer_key: CONFIG_.observer_key, observer_name: 'Observer' });
                ws.send(subscribeRequest);

                // Pre-create placeholder sidebars for all players currently in the game.
                // Without this, idle players never appear because the observer only learns
                // about a player when it receives a tick update for them.
                refreshGameStatus(matchGameId, map_config, hasObservedTick)
                    .then(game => {
                        if (!game) return;
                        selectedGameInfo = game;
                        const megacontainer = document.getElementById('player-sidebar-list');
                        while (sidebars.length < game.current_players) {
                            const idx = sidebars.length;
                            const sidebar = createPlayerSidebar(idx, 'Waiting for updates...');
                            megacontainer.appendChild(sidebar);
                            sidebars.push(sidebar);
                        }
                    })
                    .catch(e => console.error('Failed to pre-create player sidebars:', e));
            };

            //When receiving message from the server, parses it and applies updates to game accordingly
            ws.onmessage = function (msg) {
                if (drawSessionId !== activeDrawSessionId) return;
                try {
                    function parse_callback(json_string){
                        const data = JSON.parse(json_string);
                        switch (data.update_type) {
                            case 'kTickUpdate':
                                // The first tick means the game is actually live;
                                // start the elapsed-time clock from here.
                                if (!hasObservedTick) gameTimer.start();
                                hasObservedTick = true;
                                renderGameStatus(selectedGameInfo, map_config, hasObservedTick);
                                if (Array.isArray(data.bot_updates)) {
                                    data.bot_updates.forEach(botUpdate => {
                                        updateBot(botUpdate, data.player_id);
                                    })
                                }
                                if (Array.isArray(data.job_updates)) {
                                    data.job_updates.forEach(jobUpdate => {
                                        updateJob(jobUpdate);
                                    })
                                }
                                if (Array.isArray(data.land_updates)) {
                                    data.land_updates.forEach(landUpdate => {
                                        updateLand(landUpdate);
                                    })
                                }
                                updateUI(data.player_id);
                                render();
                                break;
                            case 'kEndInWin':
                                console.log(`game ended player id ${data.player_id} won`);
                                gameTimer.stop();
                                showWinner(data.player_id);
                                statusPolling.stop();
                                pollForReplacementGame(matchGameId, 'game-ended');
                                break;
                            case 'kEndInDraw':
                                console.log('game ended in draw');
                                gameTimer.stop();
                                statusPolling.stop();
                                pollForReplacementGame(matchGameId, 'game-ended');
                                break;
                            default:
                                console.log('Unhandled update_type:', data.update_type);
                                break;
                        }
                    }
                    if (msg.data instanceof Blob) {
                        msg.data.text().then(text => parse_callback(text));
                    } else if (typeof msg.data === 'string') {
                        parse_callback(msg.data);
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            }

            ws.onclose = function () {
                if (drawSessionId !== activeDrawSessionId) return;
                console.log('Observer websocket closed; checking for replacement game.');
                statusPolling.stop();
                tradesPanel.disconnect();
                tradesPanel.hide();
                pollForReplacementGame(matchGameId, 'websocket-close');
            };

            ws.onerror = function (error) {
                console.warn('Observer websocket error:', error);
            };

            //Sidebars has to be dynamically added if in the future you want >2 players
            const sidebars = Array.from(document.querySelectorAll('div[id^="bot-sidebar-"]'));
            //Possibly add more colours for >2 players too
            const colors = ['rgba(0,100,255,0.35)', 'rgba(220,50,50,0.35)', 'rgba(0,190,0,0.35)', 'rgba(220,200,0,0.35)', 'rgba(170,0,230,0.35)', 'rgba(230,130,0,0.35)', 'rgba(230,80,160,0.35)'];

            function createPlayerSummary(name, color, statusText) {
                const playerSummary = document.createElement('div');
                playerSummary.classList.add('player-summary');

                const header = document.createElement('div');
                header.classList.add('player-header');
                if (color) header.style.color = color;

                const playerName = document.createElement('h4');
                playerName.textContent = name;
                header.appendChild(playerName);

                if (statusText) {
                    const status = document.createElement('span');
                    status.textContent = statusText;
                    header.appendChild(status);
                }

                playerSummary.appendChild(header);
                return playerSummary;
            }

            function createPlayerSidebar(playerIndex, statusText) {
                const sidebar = document.createElement('div');
                sidebar.classList.add('sidebar');
                sidebar.id = 'bot-sidebar-' + (playerIndex + 1);
                sidebar.appendChild(createPlayerSummary(`Player ${playerIndex + 1}`, null, statusText));
                return sidebar;
            }

            function ensurePlayer(playerId) {
                if (!players.hasOwnProperty(playerId)) {
                    const playerIndex = Object.keys(players).length;
                    players[playerId] = playerIndex;
                    if (playerIndex >= sidebars.length) {
                        // No pre-created placeholder available, create one now
                        const sidebar = createPlayerSidebar(playerIndex);
                        document.getElementById('player-sidebar-list').appendChild(sidebar);
                        sidebars.push(sidebar);
                    }
                }
                return players[playerId];
            }

            function getPlayerLabel(playerId) {
                return playerNames[playerId] || `Player ${playerId}`;
            }

            function samePosition(a, b) {
                return a && b && a.x === b.x && a.y === b.y;
            }

            function easeInOut(t) {
                return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            }

            function displayPositionForBot(entry, now = performance.now()) {
                const position = entry[0];
                const previousPosition = entry[6];
                const animationStartedAt = entry[7] || 0;
                if (!previousPosition || samePosition(previousPosition, position)) {
                    return { x: position.x, y: position.y, animating: false };
                }

                const progress = Math.min(1, Math.max(0, (now - animationStartedAt) / MOVEMENT_ANIMATION_MS));
                const eased = easeInOut(progress);
                return {
                    x: previousPosition.x + (position.x - previousPosition.x) * eased,
                    y: previousPosition.y + (position.y - previousPosition.y) * eased,
                    animating: progress < 1
                };
            }

            function variantConfig(variant) {
                return (map_config.variant_configs || []).find(item => item.variant === variant) || null;
            }

            function mapCellFromEvent(event) {
                if (!mapViewport) return null;
                const rect = canvas.getBoundingClientRect();
                const x = (event.clientX - rect.left) / mapZoom;
                const y = (event.clientY - rect.top) / mapZoom;
                const col = Math.floor(x / GRID_SIZE);
                const row = Math.floor(y / GRID_SIZE);
                if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return null;
                return { col, row, position: { x: col, y: ROWS - row - 1 } };
            }

            function botAtCell(row, col) {
                for (const [id, entry] of botMap.entries()) {
                    const display = displayPositionForBot(entry);
                    const botCol = Math.floor(display.x + 0.5);
                    const botRow = ROWS - Math.floor(display.y + 0.5) - 1;
                    if (botCol === col && botRow === row) {
                        return { id, entry };
                    }
                }
                return null;
            }

            function resourceName(resourceId) {
                return map_config.resource_configs[resourceId]?.name || `Resource ${resourceId}`;
            }

            function formatCargo(cargo) {
                if (!cargo || cargo.length === 0) return 'empty';
                return cargo.map(item => `${resourceName(item.id)} ${item.amount}`).join(', ');
            }

            function tooltipRows(title, rows) {
                return `<strong>${escapeHTML(title)}</strong>${rows.map(row => `<span>${escapeHTML(row)}</span>`).join('')}`;
            }

            function updateMapTooltip(event) {
                const cell = mapCellFromEvent(event);
                if (!cell) {
                    hideMapTooltip();
                    return;
                }

                const bot = botAtCell(cell.row, cell.col);
                if (bot) {
                    const [_position, variant, currentEnergy, job, cargo, playerIndex] = bot.entry;
                    const capacity = variantCapacity(variant);
                    const rows = [
                        getPlayerLabel(Object.keys(players).find(id => players[id] === playerIndex) || playerIndex),
                        `Position ${cell.position.x}, ${cell.position.y}`,
                        `Energy ${currentEnergy}/${map_config.max_bot_energy}`,
                        capacity > 0 ? `Cargo ${cargoLoad(cargo)}/${capacity}` : `Cargo ${cargoLoad(cargo)}`,
                        `Job ${NameMaps.mapName("actionMap", job.action)}`,
                        `Items ${formatCargo(cargo)}`
                    ];
                    showMapTooltip(event, tooltipRows(NameMaps.mapName("variantMap", variant), rows));
                    return;
                }

                const resourceCell = resourceCells[cell.row][cell.col];
                if (resourceCell && resourceCell.resources.length > 0) {
                    const rows = resourceCell.resources
                        .filter(resource => Number(resource.amount || 0) > 0)
                        .map(resource => `${resourceName(resource.id)} ${resource.amount} left`);
                    if (rows.length > 0) {
                        showMapTooltip(event, tooltipRows('Ore', rows));
                        return;
                    }
                }

                hideMapTooltip();
            }

            function showMapTooltip(event, html) {
                mapTooltip.innerHTML = html;
                mapTooltip.classList.remove('hidden');
                const offset = 14;
                const tooltipRect = mapTooltip.getBoundingClientRect();
                const left = Math.min(window.innerWidth - tooltipRect.width - 8, event.clientX + offset);
                const top = Math.min(window.innerHeight - tooltipRect.height - 8, event.clientY + offset);
                mapTooltip.style.left = `${Math.max(8, left)}px`;
                mapTooltip.style.top = `${Math.max(8, top)}px`;
            }

            function hideMapTooltip() {
                mapTooltip.classList.add('hidden');
            }

            function escapeHTML(value) {
                return String(value).replace(/[&<>"']/g, char => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                })[char]);
            }

            async function ensurePlayerName(playerId) {
                if (playerNames[playerId]) {
                    return playerNames[playerId];
                }

                const playerInfo = await fetchPlayerNames(matchGameId, [playerId]);
                if (Array.isArray(playerInfo) && playerInfo.length > 0 && playerInfo[0].name) {
                    playerNames[playerId] = playerInfo[0].name;
                }
                return getPlayerLabel(playerId);
            }

            function cargoAmount(cargo, resourceId) {
                const chunk = (cargo || []).find(item => item.id === resourceId);
                return chunk ? chunk.amount : 0;
            }

            function cargoLoad(cargo) {
                return (cargo || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
            }

            function isMineableResource(resourceId) {
                const resource = map_config.resource_configs[resourceId];
                if (!resource) return false;
                return Number(resource.mine_interval) > 0 && Number(resource.mine_amount_per_interval) > 0;
            }

            function variantCapacity(variant) {
                const config = (map_config.variant_configs || []).find(item => item.variant === variant);
                return config ? Number(config.cargo_capacity) : -1;
            }

            function progressForFactory(factoryCargo) {
                const totalRequired = map_config.win_condition.reduce((sum, chunk) => sum + chunk.amount, 0);
                if (totalRequired <= 0) {
                    return { percent: 0, current: 0, total: 0, chunks: [] };
                }

                const chunks = map_config.win_condition.map(chunk => {
                    const amount = cargoAmount(factoryCargo, chunk.id);
                    return {
                        id: chunk.id,
                        amount,
                        required: chunk.amount,
                        complete: amount >= chunk.amount
                    };
                });
                const current = chunks.reduce((sum, chunk) => sum + Math.min(chunk.amount, chunk.required), 0);

                return {
                    percent: Math.floor((current / totalRequired) * 100),
                    current,
                    total: totalRequired,
                    chunks
                };
            }

            function bestWinProgress(playerIndex) {
                let best = null;
                for (const [id, [_position, variant, _current_energy, _job, cargo, botPlayerIndex]] of botMap.entries()) {
                    if (playerIndex !== botPlayerIndex || variant !== 'kFactoryBot') {
                        continue;
                    }
                    const progress = progressForFactory(cargo);
                    if (best === null || progress.percent > best.percent) {
                        best = { botId: id, ...progress };
                    }
                }
                return best || { botId: null, percent: 0, current: 0, total: 0, chunks: [] };
            }

            function appendWinProgress(parent, playerIndex) {
                const progress = bestWinProgress(playerIndex);
                const progressBox = document.createElement('div');
                progressBox.classList.add('win-progress');
                progressBox.title = progress.total > 0
                    ? `Win progress ${progress.current}/${progress.total}`
                    : 'No win condition configured';

                const heading = document.createElement('div');
                heading.classList.add('win-progress-heading');

                const title = document.createElement('span');
                title.textContent = 'Win';
                heading.appendChild(title);
                progressBox.appendChild(heading);

                const bar = document.createElement('div');
                bar.classList.add('win-progress-bar');
                const fill = document.createElement('div');
                fill.classList.add('win-progress-fill');
                fill.style.width = `${Math.min(progress.percent, 100)}%`;
                bar.appendChild(fill);
                progressBox.appendChild(bar);

                const quotaGrid = document.createElement('div');
                quotaGrid.classList.add('win-quota-grid');
                progress.chunks.forEach(chunk => {
                    const resource = map_config.resource_configs[chunk.id];
                    const row = document.createElement('div');
                    row.classList.add('win-quota-row');
                    if (chunk.complete) {
                        row.classList.add('complete');
                    }

                    const { itemName, itemImageSrc } = assetManager.getItemInfo({ id: chunk.id, amount: chunk.amount });
                    const icon = document.createElement('img');
                    icon.classList.add('cargo-icon');
                    icon.src = itemImageSrc;
                    icon.alt = icon.title = resource ? resource.name : itemName;
                    icon.width = 16;
                    icon.height = 16;
                    row.appendChild(icon);

                    const amount = document.createElement('span');
                    amount.textContent = `${chunk.amount}/${chunk.required}`;
                    row.appendChild(amount);
                    quotaGrid.appendChild(row);
                });

                if (progress.chunks.length === 0) {
                    const row = document.createElement('div');
                    row.classList.add('win-quota-row');
                    row.textContent = 'No win condition configured';
                    quotaGrid.appendChild(row);
                }

                progressBox.appendChild(quotaGrid);
                parent.appendChild(progressBox);
            }

            //Updates the bot's position and its job?
            function updateBot(botUpdate, playerId) {
                const effectivePlayerId = botUpdate.player_id ?? playerId;
                const playerIndex = ensurePlayer(effectivePlayerId);

                const { id, position, variant, current_energy, current_job_id, cargo } = botUpdate;
                const existingBot = botMap.get(id);
                const now = performance.now();
                let previousPosition = position;
                if (botMap.has(id)) {
                    var oldPosition = existingBot[0];
                    previousPosition = displayPositionForBot(existingBot, now);
                    var oldRow = ROWS - oldPosition.y - 1;
                    var oldCol = oldPosition.x;
                    gameState[oldRow][oldCol] = elements.traversable;
                }
                var job;
                if (current_job_id == 0) {
                    job = { action: 'kNoAction', status: 'kNotStarted' };
                } else if (jobMap.has(current_job_id)) {
                    job = jobMap.get(current_job_id);
                } else {
                    job = { action: 'kNoAction', status: 'kNotStarted' };
                }
                botMap.set(id, [position, variant, current_energy, job, cargo || [], playerIndex, previousPosition, now, current_job_id]);
                var newRow = ROWS - position.y - 1;
                var newCol = position.x;
                let variantIdx = botVariants.indexOf(variant);
                if (variantIdx === -1) variantIdx = 0;
                gameState[newRow][newCol] = BOT_START_IDX + playerIndex * botVariants.length + variantIdx;
                renderBots();
            }

            //?
            function updateJob(data) {
                const { id, action, status } = data;
                var job = { action: action, status: status }
                jobMap.set(id, job);
                if (action === 'kExplode' && status === 'kCompleted') {
                    for (const entry of botMap.values()) {
                        const [position, variant, _energy, _job, _cargo, playerIndex] = entry;
                        const currentJobId = entry[8];
                        if (currentJobId !== id || variant !== 'kDisruptorBot') continue;

                        disruptEffects.push({
                            position: { ...position },
                            radius: Number(variantConfig(variant)?.blast_radius || 0),
                            playerIndex,
                            startedAt: performance.now()
                        });
                        render();
                        break;
                    }
                }
            }

            //Updates the state of a tile on the map
            function updateLand(data) {
                const { position: { x, y }, is_traversable, resources, terrain_id } = data;
                let terrain_name = 'unknown';
                if(terrain_id < map_config.terrain_configs.length){
                    terrain_name = map_config.terrain_configs[terrain_id].name.toLowerCase();
                }
                const row = ROWS - y - 1;
                const col = x;
                terrains[row][col] = terrainImages[terrain_name];

                if (is_traversable) {
                    gameState[row][col] = elements.traversable;
                    resourceCells[row][col] = null;
                } else {
                    if (Array.isArray(resources)) {
                        var highestId = -1;
                        const mineableResources = resources.filter(resource => isMineableResource(resource.id) && Number(resource.amount || 0) > 0);
                        mineableResources.forEach(resource => {
                            if (resource.id > highestId) {
                                highestId = resource.id;
                            }
                        })
                        let cleanName = assetManager.resources[highestId];
                        if(cleanName !== undefined && elements[cleanName] !== undefined){
                            gameState[row][col] = elements[cleanName];
                            resourceCells[row][col] = {
                                element: elements[cleanName],
                                primary: mineableResources.find(resource => resource.id === highestId),
                                resources: mineableResources
                            };
                        } else {
                            gameState[row][col] = elements.traversable;
                            resourceCells[row][col] = null;
                        }
                    }
                }
                renderBots();
            }

            //Display a dialog box in the middle of the screen indicating the winner
            async function showWinner(playerId) {
                await ensurePlayerName(playerId);
                let text = `<h1>${escapeHTML(getPlayerLabel(playerId))} Won!</h1>`;
                DialogUtilities.showDialog(text,"We have a winner!");
            }

            function renderBots() {
                for (const [id, [position, variant, current_energy, job, cargo, playerIndex]] of botMap.entries()) {
                    let variantIdx = botVariants.indexOf(variant);
                    if (variantIdx === -1) variantIdx = 0; // Fallback
                    gameState[ROWS - position.y - 1][position.x] = BOT_START_IDX + playerIndex * botVariants.length + variantIdx;
                }
            }

            function energyFillClass(energyPct) {
                if (energyPct <= 25) return 'energy-fill-low';
                if (energyPct <= 55) return 'energy-fill-mid';
                return 'energy-fill-high';
            }

            function createEnergyBar(currentEnergy) {
                const energyWrap = document.createElement('div');
                energyWrap.classList.add('energy-meter');

                const energyFill = document.createElement('div');
                energyFill.classList.add('energy-fill');
                energyWrap.appendChild(energyFill);

                const energyText = document.createElement('span');
                energyText.classList.add('energy-label');
                energyWrap.appendChild(energyText);

                updateEnergyBar(energyWrap, currentEnergy);
                return energyWrap;
            }

            // Update an existing .energy-meter in place (no DOM recreation).
            function updateEnergyBar(energyWrap, currentEnergy) {
                const maxEnergy = Math.max(Number(map_config.max_bot_energy) || 0, currentEnergy, 1);
                const energyPct = Math.max(0, Math.min(100, (currentEnergy / maxEnergy) * 100));
                energyWrap.setAttribute('title', `Energy ${currentEnergy}/${maxEnergy}`);
                energyWrap.setAttribute('aria-label', `Energy ${currentEnergy} of ${maxEnergy}`);

                const energyFill = energyWrap.querySelector('.energy-fill');
                energyFill.className = `energy-fill ${energyFillClass(energyPct)}`;
                energyFill.style.width = `${energyPct}%`;

                energyWrap.querySelector('.energy-label').textContent = `${currentEnergy}/${maxEnergy}`;
            }

            function createCargoBar(cargo, variant) {
                const cargoWrap = document.createElement('div');
                cargoWrap.classList.add('cargo-meter');

                const fill = document.createElement('div');
                fill.classList.add('cargo-fill');
                cargoWrap.appendChild(fill);

                const label = document.createElement('span');
                label.classList.add('cargo-label');
                cargoWrap.appendChild(label);

                updateCargoBar(cargoWrap, cargo, variant);
                return cargoWrap;
            }

            // Update an existing .cargo-meter in place (no DOM recreation).
            function updateCargoBar(cargoWrap, cargo, variant) {
                const currentLoad = cargoLoad(cargo);
                const capacity = variantCapacity(variant);
                const remainingCapacity = capacity > 0 ? Math.max(0, capacity - currentLoad) : 0;
                const remainingPct = capacity > 0
                    ? Math.max(0, Math.min(100, (remainingCapacity / capacity) * 100))
                    : 0;
                cargoWrap.setAttribute('title', capacity > 0 ? `Capacity ${remainingCapacity}/${capacity} free; cargo ${currentLoad}/${capacity}` : `Cargo ${currentLoad}`);
                cargoWrap.setAttribute('aria-label', capacity > 0 ? `Capacity ${remainingCapacity} of ${capacity} free` : `Cargo ${currentLoad}`);

                cargoWrap.querySelector('.cargo-fill').style.width = `${remainingPct}%`;
                cargoWrap.querySelector('.cargo-label').textContent = capacity > 0 ? `${remainingCapacity}/${capacity} free` : `${currentLoad}`;
            }

            function createCargoGrid(cargo) {
                const cargoContainer = document.createElement('div');
                cargoContainer.classList.add('cargo-grid');
                updateCargoChips(cargoContainer, cargo);
                return cargoContainer;
            }

            // The cargo list is variable-length, so rebuild the chips inside the
            // (persistent) .cargo-grid. This sits inside a fixed-width card, so it
            // never disturbs the bot row's horizontal scroll.
            function updateCargoChips(cargoContainer, cargo) {
                cargoContainer.replaceChildren();

                if (!cargo || cargo.length === 0) {
                    const empty = document.createElement('span');
                    empty.classList.add('cargo-empty');
                    empty.textContent = 'No cargo';
                    cargoContainer.appendChild(empty);
                    return;
                }

                cargo.forEach(item => {
                    let { itemName, itemImageSrc } = assetManager.getItemInfo(item);
                    const chip = document.createElement('span');
                    chip.classList.add('cargo-chip');

                    let mineralImage = document.createElement('img');
                    mineralImage.alt = mineralImage.title = itemName;
                    mineralImage.src = itemImageSrc;
                    mineralImage.classList.add('cargo-icon');
                    mineralImage.width = 16;
                    mineralImage.height = 16;
                    chip.appendChild(mineralImage);

                    let mineralAmt = document.createElement('span');
                    mineralAmt.textContent = item.amount;
                    chip.appendChild(mineralAmt);

                    cargoContainer.appendChild(chip);
                });
            }

            // Build a bot card's static skeleton once. All values (and the click
            // target) are filled in by renderBotCard, which is also what runs on
            // every later tick — so a card is created once and updated in place,
            // and the bot row's horizontal scroll is never reset.
            function createBotCard(id, position, variant, currentEnergy, job, cargo) {
                const botDiv = document.createElement('button');
                botDiv.classList.add('bot-info');
                botDiv.type = 'button';

                const cardHeader = document.createElement('div');
                cardHeader.classList.add('bot-card-header');

                const image = document.createElement('img');
                image.classList.add('bot-sidebar-icon');
                image.width = 28;
                image.height = 28;
                cardHeader.appendChild(image);

                const titleGroup = document.createElement('div');
                titleGroup.classList.add('bot-title-group');
                const title = document.createElement('h4');
                title.classList.add('bot-title');
                titleGroup.appendChild(title);
                cardHeader.appendChild(titleGroup);
                botDiv.appendChild(cardHeader);

                const metaRow = document.createElement('div');
                metaRow.classList.add('bot-meta-row');
                metaRow.append(document.createElement('span'), document.createElement('span'));
                botDiv.appendChild(metaRow);

                botDiv.appendChild(createEnergyBar(currentEnergy));
                botDiv.appendChild(createCargoBar(cargo, variant));
                botDiv.appendChild(createCargoGrid(cargo));

                // Single click handler reads the latest position stashed by renderBotCard.
                botDiv.addEventListener('click', () => {
                    if (botDiv._focusPosition) focusMapOnPosition(botDiv._focusPosition);
                });

                renderBotCard(botDiv, id, position, variant, currentEnergy, job, cargo);
                return botDiv;
            }

            // Update an existing bot card's contents in place.
            function renderBotCard(botDiv, id, position, variant, currentEnergy, job, cargo) {
                const variantName = NameMaps.mapName("variantMap", variant);
                const jobName = NameMaps.mapName("actionMap", job.action);

                botDiv.dataset.botId = id;
                botDiv.title = `Focus bot #${id}`;
                botDiv.setAttribute('aria-label', `Focus ${variantName} bot ${id} at ${position.x}, ${position.y}`);
                botDiv._focusPosition = position;

                const image = botDiv.querySelector('.bot-sidebar-icon');
                const botImage = assetManager.getBotImage(variant, job, cargo) || assetManager.images.unknown;
                const nextSrc = botImage.src || './assets/unknown.jpg';
                if (image.getAttribute('src') !== nextSrc) image.setAttribute('src', nextSrc);
                image.alt = variantName;

                botDiv.querySelector('.bot-title').textContent = variantName;

                const metaSpans = botDiv.querySelectorAll('.bot-meta-row > span');
                metaSpans[0].textContent = `${position.x}, ${position.y}`;
                metaSpans[1].textContent = jobName;

                updateEnergyBar(botDiv.querySelector('.energy-meter'), currentEnergy);
                updateCargoBar(botDiv.querySelector('.cargo-meter'), cargo, variant);
                updateCargoChips(botDiv.querySelector('.cargo-grid'), cargo);
            }

            //shows a row for each player showing each bot and their data
            async function updateUI(player_id) {
                const playerIndex = ensurePlayer(player_id);

                await ensurePlayerName(player_id);

                const sidebar = sidebars[playerIndex];

                const color = colors[playerIndex];

                // Update the row in place rather than rebuilding it: the .bot-box
                // element persists across ticks, so its horizontal scroll offset
                // is preserved naturally and stays scrollable while ticks arrive.

                // --- Player summary (separate from the bot row; safe to rebuild) ---
                let summary = sidebar.querySelector('.player-summary');
                if (!summary) {
                    summary = createPlayerSummary(getPlayerLabel(player_id), color);
                    sidebar.insertBefore(summary, sidebar.firstChild);
                } else {
                    // Replace just the header + win progress (no status placeholder).
                    summary.replaceChildren(...createPlayerSummary(getPlayerLabel(player_id), color).children);
                }
                appendWinProgress(summary, playerIndex);

                // --- Bot row: reuse the persistent .bot-box and reconcile cards by id ---
                let botBox = sidebar.querySelector('.bot-box');
                if (!botBox) {
                    botBox = document.createElement('div');
                    botBox.classList.add('bot-box');
                    sidebar.appendChild(botBox);
                }

                const existingCards = new Map();
                for (const card of botBox.children) existingCards.set(card.dataset.botId, card);

                const seenIds = new Set();
                let slot = 0;
                for (const [id, [position, variant, current_energy, job, cargo, botPlayerIndex]] of botMap.entries()) {
                    if (playerIndex != botPlayerIndex) continue;
                    const key = String(id);
                    seenIds.add(key);

                    let card = existingCards.get(key);
                    if (card) {
                        renderBotCard(card, id, position, variant, current_energy, job, cargo);
                    } else {
                        card = createBotCard(id, position, variant, current_energy, job, cargo);
                    }
                    // Move the card into its correct slot only if it isn't already there.
                    if (botBox.children[slot] !== card) {
                        botBox.insertBefore(card, botBox.children[slot] || null);
                    }
                    slot++;
                }

                // Drop cards for bots that are no longer this player's.
                for (const [key, card] of existingCards) {
                    if (!seenIds.has(key)) card.remove();
                }
            }


        })
        .catch((error) => {
            console.error("Error:", error);
            if(error instanceof GameUnvailableError){
                LoadingBox.setStatus(LoadingBox.Status.NO_GAME);
            } else {
                LoadingBox.setStatus(LoadingBox.Status.SERVER_UNAVAILABLE);
            }
        });
}
function main(){
    LoadingBox.setStatus(LoadingBox.Status.LOADING);
    console.log(servers["localhost"].name);
    if (hostname !== null) {
        drawGame(hostname, port);
    }
}
