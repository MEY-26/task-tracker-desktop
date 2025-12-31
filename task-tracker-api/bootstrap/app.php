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
        // Handle AuthenticationException for API routes (önce bu kontrol edilmeli)
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated',
                    'error' => 'Authentication required',
                ], 401);
            }
        });

        // Global exception handling to prevent application crashes
        $exceptions->render(function (Throwable $e, $request) {
            // Return validation errors with 422 instead of generic 500
            if ($e instanceof \Illuminate\Validation\ValidationException) {
                if ($request->is('api/*') || $request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Doğrulama hatası',
                        'errors' => $e->errors(),
                        'code' => 422,
                        'timestamp' => now()->toISOString(),
                    ], 422);
                }
            }

            // RouteNotFoundException için özel handling (API route'ları için)
            if ($e instanceof \Symfony\Component\Routing\Exception\RouteNotFoundException) {
                if ($request->is('api/*') || $request->expectsJson()) {
                    // Authentication hatası olabilir, 401 döndür
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthenticated',
                        'error' => 'Authentication required',
                    ], 401);
                }
            }
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
                } elseif ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
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
