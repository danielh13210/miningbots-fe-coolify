export default {
    never: new Date("9999-12-31T23:59:59Z"),
    epoch: new Date(0),
    getCookie: function (name) {
        return document.cookie
            .split("; ")
            .find((row) => row.startsWith(`${name}=`))
            ?.split("=")[1];
    },
    setCookie: function (name, value, expiry, path = "/") {
        if(expiry instanceof Date) {
            expiry = expiry.toUTCString();
        }
        document.cookie = `${name}=${value}; expires=${expiry}; path=${path}`;
    },
    deleteCookie: function (name, path = "/") {
        document.cookie = `${name}=; expires=${this.epoch.toUTCString()}; path=${path}`;
    }
}