let ModeManager = {
  IS_PRODUCTION_MODE: false,
};
function isFullscreen_() {
  return window.innerWidth>=screen.availWidth &&
          window.innerHeight>=screen.availHeight;
}

if(isFullscreen_()){
  ModeManager.IS_PRODUCTION_MODE = true;
  let navbar=document.querySelector("nav.navbar");
  navbar.classList.add("production-hidden");
}

export default ModeManager;
