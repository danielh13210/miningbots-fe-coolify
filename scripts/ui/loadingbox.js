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
if (!document.querySelector('link[href="/styles/tailwind.css"]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/styles/tailwind.css";
    document.head.appendChild(stylesheet);
}
let LB_OBJECT_=document.createElement("div");
LB_OBJECT_.id="loadingbox";
document.body.appendChild(LB_OBJECT_);
LoadingBox.setStatus=function(status) {
    switch (status) {
        case LoadingBox.Status.LOADING_COMPLETED:
        case LoadingBox.Status.SERVER_NO_SELECTION:
            LB_OBJECT_.classList.add("loading-completed");
            LB_OBJECT_.textContent="";
            break;

        case LoadingBox.Status.LOADING:
            LB_OBJECT_.textContent = "Please wait while we connect to the selected server";
            break;

        case LoadingBox.Status.SERVER_UNAVAILABLE:
            LB_OBJECT_.textContent = "Please select another server from the Server Selector";
            break;

        case LoadingBox.Status.NO_INTERNET:
            LB_OBJECT_.textContent = "Please connect to the Internet";
            LB_OBJECT_.classList.remove("loading-completed");
            break;

        case LoadingBox.Status.NO_GAME:
            LB_OBJECT_.textContent = "No active games are available on the server";
            LB_OBJECT_.classList.remove("loading-completed");
            break;


        default:
            break;
    }
}

export default LoadingBox;
