import KeyboardUtilities from '/scripts/utilities/keyboard_utilities.js';

let ModeManager = {
  IS_PRODUCTION_MODE: false,
  toggleFullscreen: () => {
    if (document.fullscreenElement)
      document.exitFullscreen();
    else
      document.body.requestFullscreen();
  }
};
document.addEventListener('fullscreenchange', () => {
  ModeManager.IS_PRODUCTION_MODE = !!document.fullscreenElement;
});

document.addEventListener('keydown', (event) => {
  if (KeyboardUtilities.isMnemonicPressed(event, false, 'f')) {
    event.preventDefault();
    ModeManager.toggleFullscreen();
  }
});

window.CompetitionManager = ModeManager;
export default ModeManager;
