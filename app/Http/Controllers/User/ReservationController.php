<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Book;
use App\Services\SettingsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ReservationController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $reservations = Reservation::with('book.category')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('User/Reservations/Index', [
            'user' => ['name' => $user->name, 'email' => $user->email],
            'reservations' => $reservations,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate(['book_id' => 'required|exists:books,id']);

        $user = Auth::user();
        $book = Book::findOrFail($request->book_id);
        $settings = new SettingsService();

        // Check if user already has an active reservation for this book
        $existing = Reservation::where('user_id', $user->id)
            ->where('book_id', $book->id)
            ->whereIn('status', ['pending', 'ready'])
            ->exists();

        if ($existing) {
            return back()->with('error', 'You already have an active reservation for this book.');
        }

        Reservation::create([
            'user_id' => $user->id,
            'book_id' => $book->id,
            'status' => 'pending',
            'reserved_at' => Carbon::now(),
            'expires_at' => Carbon::now()->addHours($settings->reservationExpiryHours()),
        ]);

        return back()->with('success', 'Book reserved successfully.');
    }

    public function cancel(Reservation $reservation)
    {
        if ($reservation->user_id !== Auth::id()) {
            abort(403);
        }

        if (!in_array($reservation->status, ['pending', 'ready'])) {
            return back()->with('error', 'This reservation cannot be cancelled.');
        }

        $reservation->update(['status' => 'cancelled']);

        return back()->with('success', 'Reservation cancelled.');
    }
}
