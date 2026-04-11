let SocketUtilities = {
    applyDefaultPort: function(protocol, port) {
        if (port && (typeof port == "number" || (typeof port == "string" && port.length >= 0))) {
            if(typeof port == "string")
                return parseInt(port);
            else
                return port;
        } else {
            if (protocol === "https") {
                return 443;
            } else {
                return 80;
            }
        }
    },
    breakUpSocket: function(url) {
        if(!(url.startsWith("http")||url.startsWith("ws")))
            url=`http://${url}`;
        if(url.endsWith(':'))
            throw new Error("Port missing after :");
        let brokenUpSocket=new URL(url);
        if(brokenUpSocket.pathname!="/" || url.endsWith('/'))
            throw new Error("Path name not allowed");
        return brokenUpSocket;
    }
};

SocketUtilities.isValidSocket=function(socket){
    try {
        SocketUtilities.breakUpSocket(socket);
        return true;
    } catch(e) {
        return false;
    }
}

export default SocketUtilities;