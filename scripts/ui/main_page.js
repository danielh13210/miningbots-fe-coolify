import KeyboardUtilities from "/scripts/utilities/keyboard_utilities.js";
import CompetitionManager from "/scripts/ui/competition_mode.js";
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

function updateFullscreenButton() {
  const fullscreenButton = document.getElementById("fullscreen-button");
  const fullscreenIcon = document.getElementById("fullscreen-icon");
  const isFullscreen = !!document.fullscreenElement;
  const title = isFullscreen ? "Exit Competition Mode" : "Enter Competition Mode";
  fullscreenButton.title = `${title} (${KeyboardUtilities.joinMnemonic(false, "F")})`;
  fullscreenIcon.classList.toggle("fa-expand", !isFullscreen);
  fullscreenIcon.classList.toggle("fa-compress", isFullscreen);
}

function autoRefreshEnabled() {
  return localStorage.getItem("miningbots.autoRefreshNextGame") === "true";
}

function updateAutoRefreshButton() {
  const button = document.getElementById("auto-refresh-button");
  if (!button) return;
  const enabled = autoRefreshEnabled();
  button.setAttribute("aria-pressed", String(enabled));
  button.title = `${enabled ? "Disable" : "Enable"} auto-connect to next game (${KeyboardUtilities.joinMnemonic(false, "R")})`;
}

window.GameObserverControls = {
  isAutoRefreshEnabled: autoRefreshEnabled,
};

document.getElementById("app-nav-toggle")?.addEventListener("click", (event) => {
  event.stopPropagation();
  window.NavigationManager?.toggleNavigation();
});

document.getElementById("fullscreen-button")?.addEventListener("click", () => {
  CompetitionManager.toggleFullscreen();
});

document.getElementById("settings-button")?.addEventListener("click", () => {
  SettingsManager.open_popup();
});

document.getElementById("auto-refresh-button")?.addEventListener("click", () => {
  localStorage.setItem("miningbots.autoRefreshNextGame", String(!autoRefreshEnabled()));
  updateAutoRefreshButton();
});

document.addEventListener("fullscreenchange", updateFullscreenButton);

setMnemonic(document.getElementById("settings-button"), true, "C");
setMnemonic(document.getElementById("fullscreen-button"), false, "F");
setMnemonic(document.getElementById("auto-refresh-button"), false, "R");
updateAutoRefreshButton();
SettingsManager.initialize_main();
