<?php

use App\Http\Controllers\Api\QrLookupController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\RegisterController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Middleware\EnsureStudentApi;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])->name('api.v1.auth.login');

    Route::post('auth/register/lookup-lrn', [RegisterController::class, 'lookupLrn'])->name('api.v1.auth.register.lookup-lrn');
    Route::post('auth/register/initiate', [RegisterController::class, 'initiate'])->name('api.v1.auth.register.initiate');
    Route::post('auth/register/resend', [RegisterController::class, 'resend'])->name('api.v1.auth.register.resend');
    Route::post('auth/register/verify', [RegisterController::class, 'verify'])->name('api.v1.auth.register.verify');
    Route::post('auth/register/cancel', [RegisterController::class, 'cancel'])->name('api.v1.auth.register.cancel');

    Route::middleware(['auth:sanctum', EnsureStudentApi::class])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me'])->name('api.v1.auth.me');
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');

        Route::get('dashboard', [StudentController::class, 'dashboard'])->name('api.v1.dashboard');
        Route::get('qr-card', [StudentController::class, 'qrCard'])->name('api.v1.qr-card');

        Route::get('books', [StudentController::class, 'books'])->name('api.v1.books.index');
        Route::get('books/{book}', [StudentController::class, 'book'])->name('api.v1.books.show');
        Route::get('books/{book}/qr', [StudentController::class, 'bookQr'])->name('api.v1.books.qr');

        Route::get('borrowings', [StudentController::class, 'borrowings'])->name('api.v1.borrowings.index');
        Route::post('borrowings/return-request', [StudentController::class, 'requestReturn'])->name('api.v1.borrowings.return-request');
        Route::delete('borrowings/return-request/{transaction}', [StudentController::class, 'cancelReturnRequest'])->name('api.v1.borrowings.return-request.cancel');

        Route::get('fines', [StudentController::class, 'fines'])->name('api.v1.fines.index');

        Route::put('settings/profile', [StudentController::class, 'updateProfile'])->name('api.v1.settings.profile');
        Route::put('settings/password', [StudentController::class, 'updatePassword'])->name('api.v1.settings.password');

        Route::post('qr/lookup', [QrLookupController::class, 'lookup'])->name('api.v1.qr.lookup');
    });
});
