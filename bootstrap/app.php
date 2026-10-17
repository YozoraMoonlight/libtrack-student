<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ReadOnlySessionForLiveRefresh;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance']);

        $middleware->web(append: [
            HandleAppearance::class,
            // Runs after StartSession: background page refreshes must not save
            // the session over a borrow/return made at the same moment.
            ReadOnlySessionForLiveRefresh::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule) {
        $schedule->command('books:check-overdue')
            ->dailyAt('07:00')
            ->timezone('Asia/Manila')
            ->name('books:check-overdue')
            ->onOneServer()
            ->withoutOverlapping();

        $schedule->command('books:send-due-reminders')
            ->dailyAt('08:00')
            ->timezone('Asia/Manila')
            ->name('books:send-due-reminders')
            ->onOneServer()
            ->withoutOverlapping();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
