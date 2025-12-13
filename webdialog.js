function showDialog(text,title,buttons){
//create the winner box
    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.padding = '20px';
    dialog.style.backgroundColor = 'white';
    dialog.style.border = '2px solid silver';
    dialog.style.borderTop = '40px solid silver';
    dialog.style.borderRadius="5px";
    dialog.style.zIndex = '1000';
    dialog.style.minWidth="200px";

    //place the text in the box
    dialog.innerHTML=text?text:"";

    //create the cover board to prevent clicking outside the winner box while it is open
    const coverBoard = document.createElement('div');
    coverBoard.style.position='fixed';
    coverBoard.style.top='0';
    coverBoard.style.left='0';
    coverBoard.style.backgroundColor='transparent';
    coverBoard.style.width="100vw";
    coverBoard.style.height="100vh";


    //create the close button
    const closeButton = document.createElement('button');
    const x = document.createElement('p');
    x.innerHTML="x";
    x.style.top="-4px";
    x.style.position="relative";
    x.style.filter="invert(100%)"; // don't invert the X button; it makes it hard to see
    closeButton.appendChild(x);
    closeButton.style.position = 'absolute';
    closeButton.style.top = `-30px`;
    closeButton.style.left = '3px';
    closeButton.style.width=closeButton.style.height="20px";
    closeButton.style.backgroundColor="red";
    closeButton.style.borderRadius="50%";
    closeButton.style.border="none";
    let overflow_prev=document.body.style.overflow;
    function close_dialog(){
        document.body.removeChild(dialog);
        document.body.removeChild(coverBoard);
        document.body.style.overflow=overflow_prev;
    }
    closeButton.addEventListener('click',close_dialog);

    //create the dialog title
    const dialogTitle=document.createElement("h3");
    dialogTitle.innerText=(typeof title == "string")?title:"[In-page dialog]";
    dialogTitle.style.userSelect="none";
    dialogTitle.style.position="absolute";
    dialogTitle.style.top="-38px";
    dialogTitle.style.left="50%";
    dialogTitle.style.transform="translateX(-50%)";

    //create the button box
    let buttonBox=document.createElement("div");
    buttonBox.style.display="flex";
    buttonBox.style.justifyContent="center";
    buttonBox.style.width="100%";
    if(typeof buttons!="object"){
        buttons=[{"text":"OK","action":"close_dialog"}];
    }
    buttons.forEach(button_descriptor => {
        let button=document.createElement("button");
        button.innerHTML=button_descriptor["text"];
        button.style.marginLeft="3px";
        button.style.marginRight="3px";
        let action=button_descriptor["action"];
        if (typeof action!="function"){
            action=()=>true;
        }
        button.addEventListener("click",(e)=>{
            close_dialog();
            action(e);
        });
        buttonBox.appendChild(button);
    });

    //add the elements
    dialog.appendChild(buttonBox);
    dialog.appendChild(closeButton);
    dialog.appendChild(dialogTitle);
    document.body.appendChild(coverBoard);
    document.body.appendChild(dialog);
    document.body.style.overflow="hidden";
}