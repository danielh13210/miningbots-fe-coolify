# MiningBots Frontend 

This site connects to an ongoing `MiningBots` game and provices an birds-eye view of the entire map

## Deployment Notes
Deploying this site publicly requires all endpoints be secured, ie `https`/`wss`. Reverse proxy non-TLS traffic as necessary such that your browser will not block loading mixed content from `https` and `http` sources.

An example of a `Caddyfile` (this assumes this code is stored in `/opt/web/miningbots-fe`)

```Caddyfile
game.bootcamp.tk.sg {
	tls /etc/ssl/fullchain1.pem /etc/ssl/privkey1.pem # Using the same Wildcard cert obtained with certbot
	header {
		Access-Control-Allow-Origin *
		Access-Control-Allow-Credentials true
		Access-Control-Allow-Methods *
		Access-Control-Allow-Headers *
		defer
	}
	root * /opt/web/miningbots-fe
	file_server
}

p1.bootcamp.tk.sg {
	tls /etc/ssl/fullchain1.pem /etc/ssl/privkey1.pem # Using the same Wildcard cert obtained with certbot
	header {
		Access-Control-Allow-Origin *
		Access-Control-Allow-Credentials true
		Access-Control-Allow-Methods *
		Access-Control-Allow-Headers *
		defer
	}
	reverse_proxy server.bootcamp.tk.sg:9001 {
		header_down -Access-Control-Allow-Origin
	}
}
```

## Query parameters

The following query parameters are to be used with this web application to connect to a server

+ ```url```: url of the server (*Required*)
+ ```observer_key```: Observer key (*Required*)
+ ```instance_name```: Replace the hostname in the title with the instance name
