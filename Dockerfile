# Use the official Apache HTTPD image, based on Debian Trixie Slim
FROM httpd:2.4-trixie

# Copy your website files into the default Apache document root
WORKDIR /usr/local/apache2/
COPY . ./htdocs
RUN echo "<Directory \"$PWD/htdocs\">" >> ./conf/httpd.conf && \
    cat /usr/local/apache2/htdocs/.htaccess >> ./conf/httpd.conf && \
    rm ./htdocs/.htaccess && \
    echo "</Directory>" >> ./conf/httpd.conf
RUN cd htdocs && \
    rm Dockerfile

# Expose port 80 for HTTP traffic
EXPOSE 80
