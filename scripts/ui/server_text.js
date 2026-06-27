function setServerName(name){
    let text=`Instance: ${name}`;
    let name_el=document.getElementById("serverMenuButton");
    name_el.textContent=text;
    name_el.title=text;
    document.title=`Mining Bots — ${name}`;
}
