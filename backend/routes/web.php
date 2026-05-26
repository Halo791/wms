<?php

use Illuminate\Support\Facades\Route;

// Home route
Route::get('/', function () {
    return view('welcome');
});

// Dummy login route that redirects to React frontend login page
Route::get('login', function () {
    return redirect('http://localhost:5173/login');
})->name('login');
