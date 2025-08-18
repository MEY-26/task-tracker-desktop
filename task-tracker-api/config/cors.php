<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://192.168.1.180:5173',
    'http://192.168.1.180:5174',
    'http://192.168.1.180:3000',
    'http://0.0.0.0:5173',
    'http://0.0.0.0:5174',
    'http://gorevtakip.vaden:5173',
    'http://gorevtakip.vaden:5174',
    'http://api.gorevtakip.vaden:800',
    'app://./',
    '*'
],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
