<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;
use Illuminate\Auth\AuthenticationException;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // API route'ları için null döndür (JSON response döndürülecek)
        if ($request->is('api/*') || $request->expectsJson()) {
            return null;
        }

        // Web route'ları için login route'una yönlendir (eğer tanımlıysa)
        try {
            return route('login');
        } catch (\Exception $e) {
            // Login route tanımlı değilse, null döndür
            return null;
        }
    }

    /**
     * Handle an unauthenticated user.
     */
    protected function unauthenticated($request, array $guards)
    {
        // API route'ları için direkt JSON response döndür
        if ($request->is('api/*') || $request->expectsJson()) {
            throw new AuthenticationException(
                'Unauthenticated.',
                $guards,
                null // redirectTo null olduğu için JSON response döndürülecek
            );
        }

        // Web route'ları için parent metodunu çağır
        parent::unauthenticated($request, $guards);
    }
}

