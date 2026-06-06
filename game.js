import CookieUtilities from './scripts/utilities/cookie.js';
import SettingsManager from './scripts/settings.js';
import SocketUtilities from './scripts/socketnames.js';
import {in_private_scope,with_value} from './scripts/utilities/functools.js';
import NameMaps from './scripts/ui/human_readable_names.js';
import DialogUtilities from './scripts/ui/webdialog.js';
import LoadingBox from './scripts/ui/loadingbox.js';

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
    "p1.bootcamp.tk.sg": {
        name: "Game 1",
        url: `p1.bootcamp.tk.sg:${gport}`,
    },
    "p2.bootcamp.tk.sg": {
        name: "Game 2",
        url: `p2.bootcamp.tk.sg:${gport}`,
    },
    "p3.bootcamp.tk.sg": {
        name: "Game 3",
        url: `p3.bootcamp.tk.sg:${gport}`,
    },
    "p4.bootcamp.tk.sg": {
        name: "Game 4",
        url: `p4.bootcamp.tk.sg:${gport}`,
    },
    "p5.bootcamp.tk.sg": {
        name: "Game 5",
        url: `p5.bootcamp.tk.sg:${gport}`,
    },
    "p6.bootcamp.tk.sg": {
        name: "Game 6",
        url: `p6.bootcamp.tk.sg:${gport}`,
    },
    "p7.bootcamp.tk.sg": {
        name: "Main Game",
        url: `p7.bootcamp.tk.sg:${gport}`,
    },
    "p8.bootcamp.tk.sg": {
        name: "Game 8",
        url: `p8.bootcamp.tk.sg:${gport}`,
    },
    "p9.bootcamp.tk.sg": {
        name: "Game 9",
        url: `p9.bootcamp.tk.sg:${gport}`,
    },
    "p10.bootcamp.tk.sg": {
        name: "Game 10",
        url: `p10.bootcamp.tk.sg:${gport}`,
    },
    "s1.bootcamp.tk.sg": {
        name: "Staging 1",
        url: `s1.bootcamp.tk.sg:${gport}`,
    },
    "s2.bootcamp.tk.sg": {
        name: "Staging 2",
        url: `s2.bootcamp.tk.sg:${gport}`,
    },
    "s3.bootcamp.tk.sg": {
        name: "Staging 3",
        url: `s3.bootcamp.tk.sg:${gport}`,
    },
    "s4.bootcamp.tk.sg": {
        name: "Staging 4",
        url: `s4.bootcamp.tk.sg:${gport}`,
    },
    "s5.bootcamp.tk.sg": {
        name: "Staging 5",
        url: `s5.bootcamp.tk.sg:${gport}`,
    },
    "s6.bootcamp.tk.sg": {
        name: "Staging 6",
        url: `s6.bootcamp.tk.sg:${gport}`,
    },
    "s7.bootcamp.tk.sg": {
        name: "Staging 7",
        url: `s7.bootcamp.tk.sg:${gport}`,
    },
    "s8.bootcamp.tk.sg": {
        name: "Staging 8",
        url: `s8.bootcamp.tk.sg:${gport}`,
    },
    "s9.bootcamp.tk.sg": {
        name: "Staging 9",
        url: `s9.bootcamp.tk.sg:${gport}`,
    },
    "s10.bootcamp.tk.sg": {
        name: "Staging 10",
        url: `s10.bootcamp.tk.sg:${gport}`,
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
                    setTimeout(NavigationManager.showNavigation,200);
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

// Function to populate the dropdown menu
function populateDropdown() {
    let dropdownMenu = document.querySelector(".dropdown-menu");
    Object.keys(servers).forEach(function (key) {
        let server = servers[key];
        let menuItem = `<a class="dropdown-item" href="#" data-url="${key}">${server.name}</a>`;
        dropdownMenu.innerHTML += menuItem;
    });
}

// Event listener for dropdown item click
document.addEventListener("DOMContentLoaded", function () {
    populateDropdown();

    let dropdownItems = document.querySelectorAll(".dropdown-item");
    dropdownItems.forEach(function (item) {
        item.addEventListener("click", function (event) {
            event.preventDefault();
            selectedServerUrl = this.getAttribute("data-url");
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

function drawGame(hostname, port) {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    //Maybe adjust this to dynamically adapt such that the whole canvas will be shown regardless of map aspect ratio?
    const images = {};
    images.kMiningBot = new Image();
    images.kMiningBot.src = "assets/Mining_Bot.png";
    images.kFactoryBot = new Image();
    images.kFactoryBot.src = "assets/Factory_Bot.png";
    images.mixed_ore = new Image();
    images.mixed_ore.src = "assets/Mixed_Ore.png";
    images.unknown = new Image();
    let terrainImages={};

    //Likely connecting to the server and retrieving initial game state
    fetch(`${http_type}://${hostname}:${port}/games`, {
        method: 'GET'
    })
        .then(response => {
            // console.log(response);
            if (response.ok) {
                // console.log('games:', response);
                return response.json();
            } else {
                throw new Error(response.statusText);
            }
        })
        .then(games => {
            console.log('games:', games);
            let gameId = games[0].game_id;
            let gameStatus = games[0].game_status;
            if (gameStatus == 'kEnded') {
                console.log('failed to subscribe because game has ended');
                throw new GameUnvailableError('Game has ended');
                return;
            }
            let fetch_map_config = fetch(`${http_type}://${hostname}:${port}/map_config?game_id=${gameId}`, {
                method: 'GET'
            });

            return { response: fetch_map_config, game_id: gameId };
        })
        .then(async result => {
            let response = await result.response;

            if (response.ok) {
                console.log('Second fetch response:', response);
                LoadingBox.setStatus(LoadingBox.Status.LOADING_COMPLETED);
                return { map_config: response.json(), game_id: result.game_id };
            } else {
                throw new Error(response.statusText);
            }
        })
        //Map config taken from server data
        .then(async result => {
            let map_config = await result.map_config;
            const matchGameId = result.game_id;
            console.log('map_config:', map_config);
            // rendring information

            // browser window dimensions
            var GRID_SIZE;
            var screenWidth = window.innerWidth;
            var screenHeight = window.innerHeight;
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

            // Update canvas dimensions
            canvas.width = COLS * GRID_SIZE;
            canvas.height = ROWS * GRID_SIZE;

            //Since final canvas dimensions are known, resize the container that holds canvas and DIV for bot-info DIVs
            //This allows the bot-info DIVs to be directly right next to the game canvas without any ugly white space
            document.getElementById("game-info-container").style = "display: grid; grid-template-columns: " + canvas.width + "px " + (screenWidth - canvas.width) + "px"

            function updateDimensions(lazy_render) {
                // browser window dimensions
                screenWidth = window.innerWidth;
                screenHeight = window.innerHeight;
                GRID_SIZE = Math.min(screenWidth / COLS, screenHeight / ROWS); // fit the map on to the screen
                // Update canvas dimensions
                canvas.width = COLS * GRID_SIZE;
                canvas.height = ROWS * GRID_SIZE;

                updateSidebarDimensions();
                if(!lazy_render) render();
            }

            let resource_configs = map_config.resource_configs;

            const elements = {
                /*kMiningBotOne: 0,
                kFactoryBotOne: 1,
                kMiningBotTwo: 2,
                kFactoryBotTwo: 3,*/
                unknown: 4,
                traversable: 5,
                resource: 6,
                /*granite: 7,
                vibranium: 8,
                adamantite: 9,
                unobtanium: 10*/
            };

            const resource_element_start_idx = Math.max(...Object.values(elements))+1; //the index where resource elements start in the elements object

            const resources = {

            }

            // let resource_configs = result.map_config.resource_configs;
            //Adds new game elements from resource_configs if they do not already exist
            resource_configs.forEach(resource => {
                resources[Object.keys(resources).length] = resource.name.toLowerCase();
                elements[resource.name.toLowerCase()] = resource_element_start_idx + Object.keys(resources).length-1;
                images[resource.name.toLowerCase()] = new Image();
                images[resource.name.toLowerCase()].src = 'assets/' + resource.name.toLowerCase() + '.png';
            });
            const BOT_START_IDX=Math.max(...Object.values(elements))+1; //the index where bot elements start in the elements object

            function addTerrain(terrain_name){
                terrainImages[terrain_name] = new Image();
                terrainImages[terrain_name].src = 'assets/' + terrain_name + '.jpg';
            }
            //Adds new terrain images from terrain_configs
            addTerrain('unknown'); //always have unknown terrain
            map_config.terrain_configs.forEach(terrain => {
                addTerrain(terrain.name.toLowerCase());
            });

            let gameState = Array.from({ length: ROWS }, () => Array(COLS).fill(elements.unknown)); //all squares are unknown at the start
            let terrains = Array.from({ length: ROWS }, () => Array(COLS).fill(terrainImages.unknown)); //all squares are unknown at the start

            function updateSidebarDimensions() {
                //Since final canvas dimensions are known, resize the container that holds canvas and DIV for bot-info DIVs
                //This allows the bot-info DIVs to be directly right next to the game canvas without any ugly white space
                document.getElementById("game-info-container").style.gridTemplateColumns = canvas.width + "px " + (screenWidth - canvas.width) + "px";

                //Allows the bot-info container to take up as much remaining space as possible (on the right; not any space of game canvas)
                document.getElementById("bot-info-megacontainer").style.width = screenWidth - canvas.width + "px";
            }

            function drawASquare(c, r, background, image) {
                ctx.drawImage(background, c * GRID_SIZE - borderWidth, r * GRID_SIZE - borderWidth, GRID_SIZE + borderWidth, GRID_SIZE + borderWidth);
                if (image) { //if an element image was given
                    ctx.drawImage(image, c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                }
            }

            //this exists because the bots have a background colour that indicates the player they are attached to, instead of the terrain
            //can remove this if the background is also changed to an image
            function drawABot(c, r, colour, image) {
                ctx.fillStyle = colour;
                ctx.fillRect(c * GRID_SIZE - borderWidth, r * GRID_SIZE - borderWidth, GRID_SIZE + borderWidth, GRID_SIZE + borderWidth);
                ctx.drawImage(image, c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }

            function render() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                for (let row = 0; row < ROWS; row++) {
                    for (let col = 0; col < COLS; col++) {
                        const element = gameState[row][col];
                        const terrain = terrains[row][col];
                        switch (element) {
                            /*case elements.kFactoryBotOne: // Blue
                                drawABot(col, row, '#25537b', images.kFactoryBot);
                                //drawASquare(col, row, terrain, images.kFactoryBot);
                                break;
                            case elements.kMiningBotOne: // Blue
                                drawABot(col, row, '#25537b', images.kMiningBot);
                                //drawASquare(col, row, terrain, images.kMiningBot);
                                break;
                            case elements.kFactoryBotTwo: // Red
                                drawABot(col, row, '#AA4344', images.kFactoryBot);
                                //drawASquare(col, row, terrain, images.kFactoryBot);
                                break;
                            case elements.kMiningBotTwo: // Red
                                drawABot(col, row, '#AA4344', images.kMiningBot);
                                //drawASquare(col, row, terrain, images.kMiningBot);
                                break;*/
                            case elements.unknown:
                                drawASquare(col, row, terrain); //nothing occupying the space, so no additional image
                                break;
                            case elements.traversable:
                                drawASquare(col, row, terrain); //nothing occupying the space, so no additional image
                                break;
                            case elements.resource:
                                ctx.drawImage(images.mixed_ore, col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                                break;
                            /*case elements.granite:
                                drawASquare(col, row, terrain, images.granite);
                                break;
                            case elements.vibranium:
                                drawASquare(col, row, terrain, images.vibranium);
                                break;
                            case elements.adamantite:
                                drawASquare(col, row, terrain, images.adamantite);
                                break;
                            case elements.unobtanium:
                                drawASquare(col, row, terrain, images.unobtanium);
                                break;*/
                            default:
                                if(element < BOT_START_IDX){
                                    const resourceId = resources[element-resource_element_start_idx];
                                    let image=images[resourceId.toLowerCase()];
                                    if(image.complete && image.naturalHeight > 0){
                                        drawASquare(col, row, terrain, image);
                                    } else {
                                        ctx.drawImage(images.mixed_ore, col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                                    }
                                } else {
                                    let playerIndex = Math.floor((element - BOT_START_IDX) / 2);
                                    let variant = (element - BOT_START_IDX) % 2 === 0 ? 'kMiningBot' : 'kFactoryBot';
                                    let color=colors[playerIndex];
                                    drawABot(col, row, color, images[variant]);
                                }
                        }
                        if (COLS < MAX_WHITE_WIDTH && ROWS < MAX_WHITE_HEIGHT) { //if map is small enough, show white grid
                            ctx.strokeStyle = 'white'; // set border color to white
                            ctx.lineWidth = 1; // set border width
                            ctx.strokeRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                        }
                    }
                }
            }

            // randomState();
            render();

            const ws = new WebSocket(`${ws_type}://${hostname}:${port}/observer`);
            const botMap = new Map();
            const jobMap = new Map();
            const players = {};
            const playerNames = {};

            ws.onopen = function () {
                console.log('Connected to WebSocket server');
                const subscribeRequest = JSON.stringify({ game_id: matchGameId, observer_key: CONFIG_.observer_key, observer_name: 'Observer' });
                ws.send(subscribeRequest);
            };

            //When receiving message from the server, parses it and applies updates to game accordingly
            ws.onmessage = function (msg) {
                console.log('before parse:', msg);
                try {
                    function parse_callback(json_string){
                        const data = JSON.parse(json_string);
                        console.log('after parse:', data);
                        switch (data.update_type) {
                            case 'kTickUpdate':
                                console.log('tick update: ', data)
                                if (Array.isArray(data.bot_updates)) {
                                    data.bot_updates.forEach(botUpdate => {
                                        console.log('botUpdate: ', botUpdate);
                                        updateBot(botUpdate, data.player_id);
                                    })
                                }
                                if (Array.isArray(data.job_updates)) {
                                    data.job_updates.forEach(jobUpdate => {
                                        console.log('jobUpdate: ', jobUpdate);
                                        updateJob(jobUpdate);
                                    })
                                }
                                if (Array.isArray(data.land_updates)) {
                                    data.land_updates.forEach(landUpdate => {
                                        console.log('landUpdate: ', landUpdate);
                                        updateLand(landUpdate);
                                    })
                                }
                                updateUI(data.player_id);
                                render();
                                break;
                            case 'kEndInWin':
                                console.log(`game ended player id ${data.player_id} won`);
                                showWinner(data.player_id);
                                break;
                            case 'kEndInDraw':
                                console.log('game ended in draw');
                                break;
                            default:
                                console.log(data.UpdateType);
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

            //Sidebars has to be dynamically added if in the future you want >2 players
            const sidebars = Array.from(document.querySelectorAll('div[id^="bot-sidebar-"]'));
            //Possibly add more colours for >2 players too
            const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink'];

            function ensurePlayer(playerId) {
                if (!players.hasOwnProperty(playerId)) {
                    players[playerId] = Object.keys(players).length;
                    let sidebar=document.createElement("div");
                    sidebar.classList.add("sidebar");
                    sidebar.id="bot-sidebar-"+(Object.keys(players).length);
                    document.getElementById("bot-info-megacontainer").appendChild(sidebar);
                    sidebars.push(sidebar);
                }
                return players[playerId];
            }

            function getPlayerLabel(playerId) {
                return playerNames[playerId] || `Player ${playerId}`;
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
                const chunk = cargo.find(item => item.id === resourceId);
                return chunk ? chunk.amount : 0;
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

                const heading = document.createElement('div');
                heading.classList.add('win-progress-heading');

                const title = document.createElement('span');
                title.textContent = progress.botId === null ? 'Win progress' : `Factory ${progress.botId}`;
                heading.appendChild(title);

                const percent = document.createElement('span');
                percent.textContent = `${progress.percent}%`;
                heading.appendChild(percent);
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

                    const label = document.createElement('span');
                    label.textContent = resource ? resource.name : `Resource ${chunk.id}`;
                    row.appendChild(label);

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
                if (botMap.has(id)) {
                    var oldPosition = botMap.get(id)[0];
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
                botMap.set(id, [position, variant, current_energy, job, cargo, playerIndex]);
                var newRow = ROWS - position.y - 1;
                var newCol = position.x;
                var playerNum = '';
                if (playerIndex == 0) {
                    playerNum = 'One';
                } else {
                    playerNum = 'Two';
                }
                var element = String(variant) + playerNum;
                gameState[newRow][newCol] = elements[element];
                renderBots();
            }

            //?
            function updateJob(data) {
                const { id, action, status } = data;
                var job = { action: action, status: status }
                jobMap.set(id, job);
            }

            //Updates the state of a tile on the map
            function updateLand(data) {
                const { position: { x, y }, is_traversable, resources, terrain_id } = data;
                /*switch (terrain_id) {
                    case 0:
                        terrains[ROWS - y - 1][x] = terrainImages.grassland;
                        break;
                    case 1:
                        terrains[ROWS - y - 1][x] = terrainImages.hills;
                        break
                    case 2:
                        terrains[ROWS - y - 1][x] = terrainImages.mountain;
                        break;
                    default:
                        terrains[ROWS - y - 1][x] = terrainImages.unknown;
                }*/
                let terrain_name = 'unknown';
                if(terrain_id < map_config.terrain_configs.length){
                    terrain_name = map_config.terrain_configs[terrain_id].name.toLowerCase();
                }
                terrains[ROWS - y - 1][x] = terrainImages[terrain_name];

                if (is_traversable) {
                    gameState[ROWS - y - 1][x] = elements.traversable;
                } else {
                    if (Array.isArray(resources)) {
                        var highestId = -1;
                        resources.forEach(resource => {
                            if (resource.id > highestId) {
                                highestId = resource.id;
                            }
                        })

/*                        switch (highestId) {
                            case 0:
                                gameState[ROWS - y - 1][x] = elements.granite;
                                break;
                            case 1:
                                gameState[ROWS - y - 1][x] = elements.vibranium;
                                break;
                            case 2:
                                gameState[ROWS - y - 1][x] = elements.adamantite;
                                break;
                            case 3:
                                gameState[ROWS - y - 1][x] = elements.unobtanium;
                                break;
                            default:
                                gameState[ROWS - y - 1][x] = elements.resource;
                                break;
                        }*/
                        // we have to use map_config because the resources is shadowed here
                        if(map_config.resource_configs[highestId] !== undefined){
                            gameState[ROWS - y - 1][x] = elements[map_config.resource_configs[highestId].name.toLowerCase()];
                        } else {
                            gameState[ROWS - y - 1][x] = elements.resource;
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
                    var playerNum = '';
                    var element = String(variant) + playerNum;
                    //create a mapping from bot variant and player index to gameState element
                    // e.g. kMiningBot and playerIndex 0 -> 500
                    // e.g. kFactoryBot and playerIndex 1 -> 503
                    gameState[ROWS - position.y - 1][position.x] = BOT_START_IDX + playerIndex * 2 + (variant === 'kFactoryBot' ? 1 : 0);
                }
            }
            //shows a row for each player showing each bot and their data
            async function updateUI(player_id) {
                const playerIndex = ensurePlayer(player_id);

                console.log('Players object:', players);
                console.log('Current player ID:', player_id);


                await ensurePlayerName(player_id);

                console.log('playerIndex:', playerIndex);

                const sidebar = sidebars[playerIndex];
                console.log('sidebar:', sidebar);

                const color = colors[playerIndex];

                sidebar.innerHTML = ''; // Clear the existing sidebar content

                const header = document.createElement('div');
                header.classList.add('player-header');
                header.style.color = color;

                const playerName = document.createElement('h4');
                playerName.textContent = getPlayerLabel(player_id);
                header.appendChild(playerName);

                const playerIdText = document.createElement('span');
                playerIdText.textContent = `ID ${player_id}`;
                header.appendChild(playerIdText);
                sidebar.appendChild(header);

                appendWinProgress(sidebar, playerIndex);

                const botBox = document.createElement('div');
                botBox.classList.add('bot-box');
                sidebar.appendChild(botBox);
                for (const [id, [position, variant, current_energy, job, cargo, botPlayerIndex]] of botMap.entries()) {
                    if (playerIndex == botPlayerIndex) { //THIS MIGHT NOT WORK
                        const botDiv = document.createElement('div');
                        console.log('cargo: ', cargo);
                        botDiv.classList.add('bot-info');
                        botDiv.innerHTML = `
                <h4 style="margin: 2px 0; padding: 0;"><b>${NameMaps.mapName("variantMap", variant)}</b> ${id}</h4>
                <hr style="margin: 2px 0;">
                <p style="margin: 2px 0; padding: 0;"><b>Position:</b> ${position.x}, ${position.y}</p>
                <p style="margin: 2px 0; padding: 0;"><b>Energy:</b> ${current_energy}</p>
                <p style="margin: 2px 0; padding: 0;"><b>Job:</b> ${NameMaps.mapName("actionMap", job.action)}</p>
                <hr style="margin: 2px 0;">
            `;
// , ${job.status}
                        const cargoContainer = document.createElement('div');

                        //Creating a grid: left side will be image of mineral, right side will be count of mineral
                        cargoContainer.style = "display: grid; grid-template-columns: auto auto; grid-gap: 0.05vw; padding: 0.1vw"

                        // Add each cargo item as a new paragraph
                        cargo.forEach(item => {
                            //Image of the mineral
                            let mineralImage = document.createElement('img')
                            mineralImage.alt=mineralImage.title=map_config.resource_configs[item.id].name;
                            mineralImage.src = "./assets/" + String(resources[item.id]) + ".png"
                            mineralImage.style = "width: 1vw; height: 1vw"
                            cargoContainer.appendChild(mineralImage);

                            //Text describing how much of the mineral there is
                            let mineralAmt = document.createElement('p')
                            mineralAmt.innerHTML = `${item.amount}`
                            cargoContainer.appendChild(mineralAmt)
                        });

                        // Append the cargo container to the botDiv
                        botDiv.appendChild(cargoContainer);

                        // Append the botDiv to the sidebar
                        botBox.appendChild(botDiv);
                    }
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
