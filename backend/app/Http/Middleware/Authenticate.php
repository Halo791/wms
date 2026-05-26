<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    protected function redirectTo($request)
    {
        // For API requests or when JSON is expected, do not redirect.
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }
        // For regular web routes, redirect to the login page (frontend).
        return route('login');
    }
}
