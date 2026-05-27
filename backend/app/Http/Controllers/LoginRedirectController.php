<?php

namespace App\Http\Controllers;

class LoginRedirectController extends Controller
{
    public function __invoke()
    {
        return redirect(rtrim(config('app.frontend_url'), '/').'/login');
    }
}
