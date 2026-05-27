<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LoginRedirectController;

Route::view('/', 'welcome');

Route::get('/login', LoginRedirectController::class)->name('login');
