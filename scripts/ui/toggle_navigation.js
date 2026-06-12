let navigationLink = document.getElementById('serverMenuButton');
let serverMenu = document.querySelector('.server-menu[aria-labelledby="serverMenuButton"]');
let navToggle = document.querySelector('.app-nav-toggle');

function setMenuExpanded(expanded) {
  navigationLink?.setAttribute('aria-expanded', String(expanded));
  navToggle?.setAttribute('aria-expanded', String(expanded));
  serverMenu?.classList.toggle('hidden', !expanded);
}

let NavigationManager = {
  toggleNavigation: function () {
    setMenuExpanded(!this.isNavigationExpanded());
  },
  isNavigationExpanded: function () {
    return navigationLink?.getAttribute('aria-expanded') === 'true';
  },
  hideNavigation: function () {
    setMenuExpanded(false);
  },
  showNavigation: function () {
    setMenuExpanded(true);
  }
};

document.addEventListener('click', (event) => {
  if (!serverMenu || !navigationLink) return;
  if (serverMenu.contains(event.target) || navigationLink.contains(event.target)) return;
  NavigationManager.hideNavigation();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    NavigationManager.hideNavigation();
  }
});

navigationLink?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  NavigationManager.toggleNavigation();
});

window.NavigationManager = NavigationManager;
export default NavigationManager;
