# composer stage
FROM composer:1.8 AS composer-stage
WORKDIR /app
ENV env=prod
COPY backend/composer.* ./
RUN composer install --no-interaction --no-plugins --no-scripts --prefer-dist --no-suggest
COPY backend .
# Deactivated for now because it doesn't work and isn't needed right now
#RUN docker-php-ext-install pdo_mysql && composer di-generate-aot

# production stage
FROM php:7.4.2-apache AS production-stage
WORKDIR /app
ENV env=prod
RUN apt-get -y update && apt-get -y upgrade && apt-get -y install libxml2-dev curl unzip iproute2 libonig-dev && docker-php-ext-install pdo pdo_mysql xml
COPY --from=composer-stage /app/vendor /app/vendor
COPY backend .
RUN chmod -R a+rw data && a2enmod rewrite
COPY backend/apache-vhost.conf /etc/apache2/sites-enabled/000-default.conf
COPY .docker-hub/backend/docker-entrypoint.sh docker-entrypoint.sh
ENTRYPOINT bash docker-entrypoint.sh
