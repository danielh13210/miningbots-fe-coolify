let navigation_link_;
let dropdownMenu_;
let navigation_dropdown_;

document.addEventListener("DOMContentLoaded",()=>{
  navigation_link_=document.getElementById('navbarDropdownMenuLink');
  dropdownMenu_=document.getElementById('dropdown-menu');
  navigation_dropdown_ = bootstrap.Dropdown.getOrCreateInstance(navigation_link_);
})

let NavigationManager = {
  toggleNavigation: function () {
    setTimeout(()=>{navigation_dropdown_.toggle()}, 0);
  },
  isNavigationExpanded:function(){
    return navigation_link_.classList.contains('show');
  },
  hideNavigation: function () {
    navigation_dropdown_.hide();
  },
  showNavigation: function () {
    navigation_dropdown_.show();
  }
}

window.matchMedia("(max-width: 992px)").addEventListener('change', e => {
  if (!e.matches) { // switched to desktop mode
    dropdownMenu_.style.marginTop = ""; // reset margin
    dropdownMenu_.style.marginLeft = "";
  } else {
    let toggler=document.querySelector(".navbar-toggler").getBoundingClientRect();
    dropdownMenu_.style.marginTop = toggler.height/2+"px";
    dropdownMenu_.style.marginLeft = "-"+toggler.width+"px";
  }
});