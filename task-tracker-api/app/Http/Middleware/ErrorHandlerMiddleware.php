<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ErrorHandlerMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            return $next($request);
        } catch (\Throwable $e) {
            // Log the error with context
            Log::channel('errors')->error('Middleware caught exception: ' . $e->getMessage(), [
                'exception' => $e,
                'request_url' => $request->fullUrl(),
                'request_method' => $request->method(),
                'request_data' => $request->all(),
                'user_agent' => $request->userAgent(),
                'ip' => $request->ip(),
                'user_id' => $request->user()?->id,
            ]);

            // Return appropriate response based on request type
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.',
                    'error' => config('app.debug') ? $e->getMessage() : 'Sunucu hatası',
                    'code' => 500,
                    'timestamp' => now()->toISOString(),
                ], 500);
            }

            // For web requests, redirect to error page
            return redirect()->route('error.generic')->with('error', $e->getMessage());
        }
    }
}
