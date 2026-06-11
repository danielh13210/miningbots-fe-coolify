export class AssetManager {
    constructor() {
        this.images = {};
        this.resources = {};
        this.resourceById = {};
        this.elements = {};
        this.botVariants = ['kMiningBot', 'kFactoryBot', 'kScoutBot', 'kHaulerBot', 'kAdvancedMinerBot', 'kDisruptorBot'];
        this.BOT_START_IDX = 0;
        
        // Define base elements
        this.elements.unknown = 4;
        this.elements.traversable = 5;
        this.elements.resource = 6;
        
        this.initializeBaseImages();
    }

    initializeBaseImages() {
        this.images.kMiningBot = new Image();
        this.images.kMiningBot.src = "assets/Bot_Mining.png";
        this.images.kFactoryBot = new Image();
        this.images.kFactoryBot.src = "assets/Bot_Factory.png";
        this.images.kFactoryBotIdle = new Image();
        this.images.kFactoryBotIdle.src = "assets/Bot_Factory_Idle.png";
        this.images.kFactoryBotActive = new Image();
        this.images.kFactoryBotActive.src = "assets/Bot_Factory_Active.png";
        this.images.kScoutBot = new Image();
        this.images.kScoutBot.src = "assets/Bot_Scout.png";
        this.images.kHaulerBot = new Image();
        this.images.kHaulerBot.src = "assets/Bot_Hauler.png";
        this.images.kHaulerBotEmpty = new Image();
        this.images.kHaulerBotEmpty.src = "assets/Bot_Hauler_Empty.png";
        this.images.kHaulerBotFull = new Image();
        this.images.kHaulerBotFull.src = "assets/Bot_Hauler_Full.png";
        this.images.kAdvancedMinerBot = new Image();
        this.images.kAdvancedMinerBot.src = "assets/Bot_Mining.png";
        this.images.kDisruptorBot = new Image();
        this.images.kDisruptorBot.src = "assets/Bot_Scout.png";
        this.images.mixed_ore = new Image();
        this.images.mixed_ore.src = "assets/Resource_Mixed_Ore.png";
        this.images.unknown = new Image();
        this.images.unknown.src = "assets/unknown.jpg";
    }

    initializeDynamicAssets(mapConfig) {
        this.resources = {};
        this.resourceById = {};
        this.elements = { unknown: 4, traversable: 5, resource: 6 };

        const resource_element_start_idx = Math.max(...Object.values(this.elements)) + 1;
        const resource_configs = mapConfig.resource_configs || [];

        resource_configs.forEach((resource, idx) => {
            let cleanName = resource.name.toLowerCase().replace(/[\s]+/g, '_');
            this.resources[idx] = cleanName;
            this.resourceById[idx] = resource;
            this.elements[cleanName] = resource_element_start_idx + idx;
            this.images[cleanName] = new Image();

            let isIntermediate = resource.rarity === 0;
            if (isIntermediate) {
                let assetName = 'assets/Intermediate_' + resource.name.replace(/[\s]+/g, '_') + '.png';
                this.images[cleanName].src = assetName;
            } else {
                let newAssetSrc = 'assets/Resource_' + resource.name.replace(/[\s]+/g, '_') + '.png';
                this.images[cleanName].src = newAssetSrc;
            }
        });

        this.BOT_START_IDX = Math.max(...Object.values(this.elements)) + 1;
    }

    getItemInfo(item) {
        let cleanName = this.resources[item.id];
        if (cleanName && this.images[cleanName]) {
            return { itemName: cleanName, itemImageSrc: this.images[cleanName].src };
        }
        return { itemName: "unknown", itemImageSrc: "./assets/Resource_Mixed_Ore.png" };
    }

    // Resolves state-aware bot image depending on current action or cargo
    getBotImage(variant, botJob, botCargo) {
        let img = this.images[variant];
        if (variant === 'kFactoryBot') {
            if (botJob && (botJob.action === 'kBuildBot' || botJob.action === 'kCraft')) {
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
