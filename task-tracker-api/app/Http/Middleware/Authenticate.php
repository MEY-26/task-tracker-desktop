<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // API route'ları için JSON response döndür (redirect yapma)
        if ($request->is('api/*') || $request->expectsJson()) {
            return null; // null döndürürsek, middleware JSON response döndürür
        }

        // Web route'ları için login sayfasına yönlendir
        return route('login');
    }

}

