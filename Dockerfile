FROM httpd:2.4-alpine AS base_config
WORKDIR /usr/local/apache2/
RUN cp ./conf/httpd.conf /httpd.conf

FROM node:24-alpine AS build
WORKDIR /htdocs
COPY . .
RUN mkdir -p /conf
COPY --from=base_config /httpd.conf /conf/httpd.conf
RUN npm ci
RUN mkdir -p ./styles && \
    npm run build:css && cat ./apache-docker-config/httpd.conf >> /conf/httpd.conf && \
    # add two newlines
    echo -en "\n\n" >> /conf/httpd.conf && \
   rm -rf ./apache-docker-config && \
    for dir in $(find . -name .htaccess -exec dirname {} \;); do echo "<Directory \"$dir\">" && cat "$dir/.htaccess" && rm "$dir/.htaccess" && echo -e "</Directory>\n" && rm -rf "$dir/.htaccess"; done >> /conf/httpd.conf && \
    rm -rf Dockerfile node_modules src tailwind.config.js package.json package-lock.json

# Use the official Apache HTTPD image
FROM httpd:2.4-alpine AS miningbots-frontend-server

# Copy your website files into the default Apache document root
WORKDIR /usr/local/apache2/
COPY --from=build /htdocs ./htdocs
COPY --from=build /conf ./conf

# Expose port 80 for HTTP traffic
EXPOSE 80
