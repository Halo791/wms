<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome');

Route::get('/login', function () {
    return redirect(config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')).'/login');
})->name('login');
