export class AssetManager {
    constructor() {
        this.images = {};
        this.resources = {};
        this.intermediates = {};
        this.elements = {};
        this.botVariants = ['kMiningBot', 'kFactoryBot', 'kScoutBot', 'kHaulerBot'];
        this.BOT_START_IDX = 0;
        
        // Define base elements
        this.elements.unknown = 4;
        this.elements.traversable = 5;
        this.elements.resource = 6;
        
        this.initializeBaseImages();
    }

    initializeBaseImages() {
        this.images.kMiningBot = new Image();
        this.images.kMiningBot.src = "assets/Mining_Bot.png";
        this.images.kFactoryBot = new Image();
        this.images.kFactoryBot.src = "assets/Factory_Bot.png";
        this.images.kFactoryBotIdle = new Image();
        this.images.kFactoryBotIdle.src = "assets/Factory_Bot_Idle.png";
        this.images.kFactoryBotActive = new Image();
        this.images.kFactoryBotActive.src = "assets/Factory_Bot_Active.png";
        this.images.kScoutBot = new Image();
        this.images.kScoutBot.src = "assets/Scout_Bot.png";
        this.images.kHaulerBot = new Image();
        this.images.kHaulerBot.src = "assets/Hauler_Bot.png";
        this.images.kHaulerBotEmpty = new Image();
        this.images.kHaulerBotEmpty.src = "assets/Hauler_Bot_Empty.png";
        this.images.kHaulerBotFull = new Image();
        this.images.kHaulerBotFull.src = "assets/Hauler_Bot_Full.png";
        this.images.mixed_ore = new Image();
        this.images.mixed_ore.src = "assets/Mixed_Ore.png";
        this.images.unknown = new Image();
    }

    initializeDynamicAssets(mapConfig) {
        const resource_element_start_idx = Math.max(...Object.values(this.elements)) + 1;
        const resource_configs = mapConfig.resource_configs || [];
        
        resource_configs.forEach(resource => {
            let cleanName = resource.name.toLowerCase().replace('resource_', '').replace(/[\s_]+/g, '_');
            this.resources[Object.keys(this.resources).length] = cleanName;
            this.elements[cleanName] = resource_element_start_idx + Object.keys(this.resources).length - 1;
            this.images[cleanName] = new Image();
            // Prefer Resource_Name.png (new assets), fall back to name.png
            const newAssetSrc = 'assets/Resource_' + resource.name + '.png';
            const fallbackSrc = 'assets/' + cleanName + '.png';
            this.images[cleanName].onerror = () => { this.images[cleanName].onerror = null; this.images[cleanName].src = fallbackSrc; };
            this.images[cleanName].src = newAssetSrc;
        });

        const intermediate_configs = mapConfig.intermediate_configs || [
            { name: 'Circuit', id: 0 },
            { name: 'Composite', id: 1 },
            { name: 'Reactor_Core', id: 2 },
            { name: 'Steel', id: 3 },
            { name: 'Rocket_Part', id: 4 }
        ];
        
        const intermediate_element_start_idx = Math.max(...Object.values(this.elements)) + 1;
        intermediate_configs.forEach(intermediate => {
            let cleanName = intermediate.name.toLowerCase().replace('intermediate_', '').replace(/[\s_]+/g, '_');
            this.intermediates[Object.keys(this.intermediates).length] = cleanName;
            this.elements[cleanName] = intermediate_element_start_idx + Object.keys(this.intermediates).length - 1;
            this.images[cleanName] = new Image();
            this.images[cleanName].src = 'assets/' + cleanName + '.png';
        });

        this.BOT_START_IDX = Math.max(...Object.values(this.elements)) + 1;
    }

    // Resolves clean name and image source path for cargo items
    getItemInfo(item, mapConfig) {
        let itemName = "unknown";
        let itemImageSrc = "./assets/mixed_ore.png";
        let isIntermediate = item.type === 'kIntermediate' || item.type === 1;
        
        if (isIntermediate || item.id >= (mapConfig.resource_configs || []).length) {
            let idx = isIntermediate ? item.id : item.id - (mapConfig.resource_configs || []).length;
            let cleanName = this.intermediates[idx];
            if (cleanName) {
                itemName = cleanName;
                itemImageSrc = "./assets/" + cleanName + ".png";
            }
        } else {
            let cleanName = this.resources[item.id];
            if (cleanName) {
                itemName = cleanName;
                itemImageSrc = "./assets/" + cleanName + ".png";
            }
        }
        return { itemName, itemImageSrc };
    }

    // Resolves state-aware bot image depending on current action or cargo
    getBotImage(variant, botJob, botCargo) {
        let img = this.images[variant];
        if (variant === 'kFactoryBot') {
            if (botJob && botJob.action === 'kBuildBot') {
                img = this.images.kFactoryBotActive || this.images.kFactoryBot;
            } else {
                img = this.images.kFactoryBotIdle || this.images.kFactoryBot;
            }
        } else if (variant === 'kHaulerBot') {
            let hasCargo = botCargo && botCargo.length > 0 && botCargo.some(item => item.amount > 0);
            if (hasCargo) {
                img = this.images.kHaulerBotFull || this.images.kHaulerBot;
            } else {
                img = this.images.kHaulerBotEmpty || this.images.kHaulerBot;
            }
        }
        return img;
    }

    // Maps a grid element ID to a resource/intermediate Image object
    getElementImage(element) {
        let elementName = Object.keys(this.elements).find(key => this.elements[key] === element);
        return elementName ? this.images[elementName] : null;
    }
}

const assetManager = new AssetManager();
export default assetManager;
