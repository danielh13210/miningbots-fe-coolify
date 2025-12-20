//Name maps for human readable names
const NameMaps = {
    actionMap: {
        "kNoAction": "None",
        "kMove": "Moving",
        "kScan": "Scanning for nearby resources",
        "kMine": "Mining resources",
        "kTransfer": "Transferring cargo",
        "kBuildBot": "Building new bot",
        "kExplode": "Exploding",
        "kNumberOfActions": "Enumerating actions"
    },
    statusMap: {
        "kNotStarted": "Not Started",
        "kBlocked": "Interrupted",
        "kInProgress": "Running",
        "kReachedInterval": "Resting",
        "kCompleted": "Complete",
        "kCancelledInsufficientEnergy": "Failed -- Insufficient energy",
        "kCancelledPathBlocked": "Failed -- Destination position unreachable",
        "kCancelledBotMovedTooFar": "Failed -- Bot too far from target",
        "kCancelled": "Cancelled"
    },
    variantMap: {
        "kMiningBot": "Mining Bot",
        "kFactoryBot": "Factory Bot"
    }
}
NameMaps.mapName=function(table,key){
    if(typeof NameMaps=="object"        &&
       NameMaps.hasOwnProperty(table)   &&
       typeof NameMaps[table]=="object" &&
       NameMaps[table].hasOwnProperty(key)){
        return NameMaps[table][key];
    } else {
        return key;
    }
}

export default NameMaps;