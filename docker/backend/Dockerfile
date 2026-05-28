FROM php:8.1-cli-bullseye

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        sqlite3 \
        unzip \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions curl dom mbstring pdo_sqlite sqlite3 zip

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
