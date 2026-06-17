let LoadingBox = {
    Status: {
        LOADING_COMPLETED: 0,
        LOADING: 1,
        SERVER_UNAVAILABLE: 2,
        NO_INTERNET: 3,
        SERVER_NO_SELECTION: 4,
        NO_GAME: 5
    }
}
document.head.insertAdjacentHTML("beforeend", `
<link rel="stylesheet" href="/styles/tailwind.css" type="text/css" />
`);
let LB_OBJECT_=document.createElement("span");
LB_OBJECT_.id="loadingbox";
LB_OBJECT_.classList.add("flex");
document.querySelector(".sidebar-chrome").appendChild(LB_OBJECT_);
LoadingBox.setStatus=function(status) {
    switch (status) {
        case LoadingBox.Status.LOADING_COMPLETED:
        case LoadingBox.Status.SERVER_NO_SELECTION:
            LB_OBJECT_.classList.add("hidden");
            LB_OBJECT_.classList.remove("flex");
            break;

        case LoadingBox.Status.LOADING:
            LB_OBJECT_.innerHTML = "Please wait while we connect to the selected server";
            break;

        case LoadingBox.Status.SERVER_UNAVAILABLE:
            LB_OBJECT_.innerHTML = "Please select another server from the Server Selector";
            break;

        case LoadingBox.Status.NO_INTERNET:
            LB_OBJECT_.innerHTML = "Please connect to the Internet";

        case LoadingBox.Status.NO_GAME:
            LB_OBJECT_.innerHTML = "No active games are available on the server";
            LB_OBJECT_.classList.remove("hidden");
            break;


        default:
            break;
    }
}

export default LoadingBox;
