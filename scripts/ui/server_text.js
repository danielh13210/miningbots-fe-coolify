function setServerName(name){
    let link=document.getElementById("serverMenuButton")
    link.textContent=`Server: ${name}`;
    link.ariaLabel="Server";
    link.ariaDescription=name;
}
