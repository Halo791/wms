FROM php:8.1-cli-bullseye

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        git \
        libcurl4-openssl-dev \
        libsqlite3-dev \
        libxml2-dev \
        libzip-dev \
        sqlite3 \
        unzip \
        zip \
    && docker-php-ext-install \
        curl \
        dom \
        pdo_sqlite \
        sqlite3 \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/backend

COPY backend/composer.json backend/composer.lock* ./
RUN composer update --no-dev --with-all-dependencies --no-interaction --no-progress --no-scripts

COPY backend ./
COPY docker/backend/entrypoint.sh /usr/local/bin/wms-backend-entrypoint

RUN chmod +x /usr/local/bin/wms-backend-entrypoint \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache /var/www/data \
    && composer dump-autoload --optimize --no-dev --no-interaction --no-scripts

EXPOSE 8000

ENTRYPOINT ["wms-backend-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
