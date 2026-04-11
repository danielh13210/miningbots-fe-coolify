function setServerName(name){
    let link=document.getElementById("navbarDropdownMenuLink")
    link.textContent=`Server: ${name}`;
    link.ariaLabel="Server";
    link.ariaDescription=name;
}
