let LoadingBox = {
    Status: {
        LOADING_COMPLETED: 0,
        SERVER_NO_SELECTION: 4,
        LOADING: 1,
        SERVER_UNAVAILABLE: 2,
        NO_INTERNET: 3,
        NO_GAME: 5
    }
}
document.head.insertAdjacentHTML("beforeend", `
<link rel="stylesheet" href="/styles/loadingbox.css" type="text/css" />
`);
let LB_OBJECT_ = document.getElementById("loadingbox");
LoadingBox.setStatus=function(status) {
    switch (status) {
        case LoadingBox.Status.LOADING_COMPLETED:
        case LoadingBox.Status.SERVER_NO_SELECTION:
            LB_OBJECT_.classList.add("loading-completed");
            LB_OBJECT_.innerHTML="";
            break;

        case LoadingBox.Status.LOADING:
            LB_OBJECT_.innerHTML = "Please wait while we connect to the selected server";
            break;

        case LoadingBox.Status.NO_GAME:
            LB_OBJECT_.innerHTML = "No active games are available on the server";
            LB_OBJECT_.classList.remove("loading-completed");
            break;

        case LoadingBox.Status.SERVER_UNAVAILABLE:
            LB_OBJECT_.innerHTML = "Please select another server from the Server Selector";
            break;

        case LoadingBox.Status.NO_INTERNET:
            LB_OBJECT_.innerHTML = "Please connect to the Internet";
        

        default:
            break;
    }
}

export default LoadingBox;