import KeyboardUtilities from "/scripts/utilities/keyboard_utilities.js";
import SettingsManager from "/scripts/settings.js";

function setMnemonic(element, useSecondary, key, additionalKey) {
  if (!element) return;
  const keyTag = KeyboardUtilities.joinMnemonic(useSecondary, key) + (additionalKey ? ` or ${additionalKey}` : "");
  element.title += ` (${keyTag})`;
  const describerId = `${element.id}-description`;
  element.setAttribute("aria-labelledby", `${element.id}-label`);
  document.getElementById(describerId).textContent = `Shortcut: (${keyTag})`;
  element.setAttribute("aria-describedby", describerId);
}

const buttonActions = {
  "reset-all-button": () => SettingsManager.ClickHandlers.reset_settings_clicked(),
  "ok-button": () => SettingsManager.ClickHandlers.ok_clicked(),
  "cancel-button": () => SettingsManager.ClickHandlers.cancel_clicked(),
  "apply-button": () => SettingsManager.ClickHandlers.apply_clicked(),
  "export-button": () => SettingsManager.export_settings(),
  "import-button": () => SettingsManager.import_settings()
};

Object.entries(buttonActions).forEach(([id, action]) => {
  document.getElementById(id)?.addEventListener("click", action);
});

setMnemonic(document.getElementById("reset-all-button"), false, "D");
setMnemonic(document.getElementById("ok-button"), false, "O");
setMnemonic(document.getElementById("cancel-button"), false, "C", "Escape");
setMnemonic(document.getElementById("apply-button"), false, "A");
setMnemonic(document.getElementById("export-button"), true, "X");
setMnemonic(document.getElementById("import-button"), true, "M");

SettingsManager.initialize_popup();
