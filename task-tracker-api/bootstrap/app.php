<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Log;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(remove: [
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
        ]);
        
        $middleware->api(append: [
            \Illuminate\Http\Middleware\HandleCors::class,
            \App\Http\Middleware\ErrorHandlerMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Global exception handling to prevent application crashes
        $exceptions->render(function (Throwable $e, $request) {
            // Log the error for debugging
            Log::channel('errors')->error('Application Error: ' . $e->getMessage(), [
                'exception' => $e,
                'request' => $request->all(),
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'user_agent' => $request->userAgent(),
                'ip' => $request->ip(),
                'trace' => $e->getTraceAsString(),
            ]);

            // For API requests, return JSON error response
            if ($request->is('api/*') || $request->expectsJson()) {
                $statusCode = 500;
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException) {
                    $statusCode = $e->getStatusCode();
                } elseif (method_exists($e, 'getStatusCode') && is_callable([$e, 'getStatusCode'])) {
                    $statusCode = $e->getStatusCode();
                }
                
                return response()->json([
                    'success' => false,
                    'message' => 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
                    'error' => config('app.debug') ? $e->getMessage() : 'Sunucu hatası',
                    'code' => $statusCode,
                    'timestamp' => now()->toISOString(),
                ], $statusCode);
            }

            // For web requests, return a user-friendly error page
            return response()->view('errors.generic', [
                'message' => 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
                'error' => config('app.debug') ? $e->getMessage() : 'Sunucu hatası',
            ], 500);
        });

        // Handle specific exception types
        $exceptions->reportable(function (Throwable $e) {
            // Log all exceptions for monitoring
            Log::channel('errors')->error('Exception reported: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
            ]);
        });
    })->create();
