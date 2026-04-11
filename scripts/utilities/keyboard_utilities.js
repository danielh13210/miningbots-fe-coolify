import { map } from "/scripts/utilities/functools.js";

let KeyboardUtilities = {
    isMac : navigator.userAgent.includes("Macintosh")
}

KeyboardUtilities.isPrimaryPressed=function (event){
    return (KeyboardUtilities.isMac ? event.metaKey:event.ctrlKey);
}

KeyboardUtilities.isMnemonicBasePressed = function(event,usesSecondary) {
    if(usesSecondary) {
        return KeyboardUtilities.isPrimaryPressed(event) && event.shiftKey;
    } else {
        return KeyboardUtilities.isPrimaryPressed(event);
    }
}

KeyboardUtilities.isMnemonicPressed = function(event, usesSecondary, letter) {
    return KeyboardUtilities.isMnemonicBasePressed(event, usesSecondary) && event.key.toLowerCase() === letter.toLowerCase();
}

KeyboardUtilities.joinKeys = function(...keys) {
    let output = "";
    if(KeyboardUtilities.isMac){
        Array.from(keys).forEach((key) => {
            output += key.replace("Primary", "⌘").replace("Alt", "⌥").replace("Shift", "⇧");
        });
    } else {
        let ported_keys = map(keys, (key) => {
            if(key === "Primary") return "Ctrl";
            return key;
        });
        output = ported_keys.join(" + ");
    }
    return output;
}

KeyboardUtilities.joinMnemonic = function(useSecondary, letter) {
    if(useSecondary === true)
        return KeyboardUtilities.joinKeys('Primary', 'Shift', letter);
    else
        return KeyboardUtilities.joinKeys('Primary',letter);
}

function setTabIndices() {
    document.querySelectorAll("a[role='button']").forEach((button) => {
        button.setAttribute('tabindex', '0');
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); // Prevent scrolling on Space
                button.click();     // Simulate click
            }
        });
    });
}

setTabIndices();

export default KeyboardUtilities;