<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Fine;
use App\Models\Transaction;
use App\Services\QrCodeService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class UserDashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $user->loadMissing('school:id,name,code');

        $stats = [
            'activeBorrows' => Transaction::where('user_id', $user->id)->where('status', 'active')->count(),
            'totalBorrowed' => Transaction::where('user_id', $user->id)->count(),
            'unpaidFines' => Fine::where('user_id', $user->id)->where('status', 'unpaid')->sum('amount'),
        ];

        $upcomingDue = Transaction::with('book')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->orderBy('due_date', 'asc')
            ->take(5)
            ->get();

        $recentActivity = Transaction::with('book')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        $qrService = new QrCodeService();
        $qrCode = $qrService->generateBase64("LIBTRACK:USER:{$user->qr_code}");

        return Inertia::render('User/Dashboard', [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'student_id' => $user->student_id,
                'school_name' => $user->school?->name,
            ],
            'qrCode' => $qrCode,
            'stats' => $stats,
            'upcomingDue' => $upcomingDue,
            'recentActivity' => $recentActivity,
        ]);
    }

    public function downloadQr()
    {
        $user = Auth::user();
        $qrService = new QrCodeService();
        $imageData = $qrService->generate("LIBTRACK:USER:{$user->qr_code}");
        $mimeType = $qrService->getMimeType();
        $extension = $mimeType === 'image/png' ? 'png' : 'svg';

        return response($imageData, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => "attachment; filename=\"my-library-qr.{$extension}\"",
        ]);
    }
}
