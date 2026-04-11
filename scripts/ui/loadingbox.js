let LoadingBox = {
    Status: {
        LOADING_COMPLETED: 0,
        LOADING: 1,
        SERVER_UNAVAILABLE: 2,
        NO_INTERNET: 3,
        SERVER_NO_SELECTION: 4,
        NO_GAME: 5,
        MISSING_QUERY_PARAMS: 6
    }
}
document.head.insertAdjacentHTML("beforeend", `
<link rel="stylesheet" href="/styles/loadingbox.css" type="text/css" />
`);
let LB_OBJECT_=document.createElement("div");
LB_OBJECT_.id="loadingbox";
document.body.appendChild(LB_OBJECT_);
LoadingBox.setStatus=function(status) {
    switch (status) {
        case LoadingBox.Status.LOADING_COMPLETED:
        case LoadingBox.Status.SERVER_NO_SELECTION:
            LB_OBJECT_.classList.add("loading-completed");
            LB_OBJECT_.innerHTML="";
            break;

        case LoadingBox.Status.LOADING:
            LB_OBJECT_.innerHTML = "Please wait while we connect to the server";
            break;

        case LoadingBox.Status.SERVER_UNAVAILABLE:
            LB_OBJECT_.innerHTML = "The current instance is not available";
            break;

        case LoadingBox.Status.NO_INTERNET:
            LB_OBJECT_.innerHTML = "Please connect to the Internet";

        case LoadingBox.Status.NO_GAME:
            LB_OBJECT_.innerHTML = "No active games are available on the server";
            LB_OBJECT_.classList.remove("loading-completed");
            break;
        case LoadingBox.Status.MISSING_QUERY_PARAMS:
            LB_OBJECT_.innerHTML = "Required query parameters are missing, please set them as in the&nbsp;<a href=\"https://github.com/danielh13210/miningbots-fe-coolify/wiki/Query-parameters\" target=\"_blank\">wiki</a>";

        default:
            break;
    }
}

export default LoadingBox;
