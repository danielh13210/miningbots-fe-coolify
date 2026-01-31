let ModeManager = {
  IS_PRODUCTION_MODE: false,
  toggleFullscreen: ()=>{
    if(document.fullscreenElement)
      document.exitFullscreen();
    else
      document.body.requestFullscreen();
  }
};
document.addEventListener('fullscreenchange', (event) => {
  ModeManager=!!document.fullscreenElement;
});

window.CompetitionManager=ModeManager;
export default ModeManager;
