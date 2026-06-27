function setServerName(name){
    let link=document.getElementById("serverMenuButton")
    link.title=link.textContent=`Server: ${name}`; // should become tooltip too to avoid clipping text
    link.ariaLabel="Server";
    link.ariaDescription=name;
}
