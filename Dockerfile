# Use the official Apache HTTPD image
FROM httpd:2.4-alpine

# Copy your website files into the default Apache document root
WORKDIR /usr/local/apache2/
COPY . ./htdocs
RUN cat ./htdocs/apache-docker-config/httpd.conf >> ./conf/httpd.conf && \
    # add two newlines
    echo -en "\n\n" >> ./conf/httpd.conf && \
   rm -rf ./htdocs/apache-docker-config && \
    for dir in $(find /usr/local/apache2/htdocs -name .htaccess -exec dirname {} \;); do echo "<Directory \"$dir\">" && cat "$dir/.htaccess" && rm "$dir/.htaccess" && echo -e "</Directory>\n"; done >> ./conf/httpd.conf
RUN cd htdocs && \
    rm -f Dockerfile

# Expose port 80 for HTTP traffic
EXPOSE 80
