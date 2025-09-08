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

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*', 'attachments/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000',
    'http://0.0.0.0:5173',
    'http://0.0.0.0:5174',
    'http://0.0.0.0:3000',
    'http://172.23.16.1:5173',
    'http://172.23.16.1:5174',
    'http://172.23.16.1:3000',
    'http://172.17.0.22:5173',
    'http://172.17.0.22:5174',
    'http://172.17.0.22:3000',
    'http://172.20.10.7:5173',
    'http://172.20.10.7:5174',
    'http://172.20.10.7:8000',
    'http://gorevtakip.vaden:5173',
    'http://gorevtakip.vaden:5174',
    'http://api.gorevtakip.vaden:800',
    'app://./',
    '*'
],

    'allowed_origins_patterns' => [
        '/^http:\/\/192\.168\.\d+\.\d+:\d+$/',
        '/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/',
        '/^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/',
        '/^http:\/\/localhost:\d+$/',
        '/^http:\/\/127\.0\.0\.1:\d+$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
