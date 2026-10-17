<?php

namespace App\Services;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Fine;
use App\Models\NotificationLog;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CirculationService
{
    protected SettingsService $settings;
    protected IprogSmsService $sms;
    protected CredentialHoldService $holds;
    protected BookCopyService $copies;

    public function __construct(SettingsService $settings, IprogSmsService $sms, CredentialHoldService $holds, BookCopyService $copies)
    {
        $this->settings = $settings;
        $this->sms = $sms;
        $this->holds = $holds;
        $this->copies = $copies;
    }

    /**
     * Resolve a scanned QR payload to a physical copy.
     *
     * Accepts the new `LIBTRACK:COPY:<uuid>` payload and the legacy
     * `LIBTRACK:BOOK:<uuid>` one — the latter still resolves because the
     * backfill gave copy #1 of every title its original code.
     */
    public function resolveCopyByQr(string $payload): ?BookCopy
    {
        $payload = trim($payload);

        foreach (['LIBTRACK:COPY:', 'LIBTRACK:BOOK:'] as $prefix) {
            if (str_starts_with($payload, $prefix)) {
                $uuid = trim(substr($payload, strlen($prefix)));

                return BookCopy::with('book')->where('qr_code', $uuid)->first();
            }
        }

        // Bare uuid / accession number typed into the manual-entry box.
        return BookCopy::with('book')
            ->where('qr_code', $payload)
            ->orWhere('accession_number', $payload)
            ->first();
    }

    /**
     * The title a `LIBTRACK:BOOK:` label names, or null for any other payload.
     *
     * Title labels are still handed out — the book's detail page shows one and
     * so does the student's Browse Books QR. Only books that existed before
     * per-copy codes have a copy carrying the title's code, so for every newer
     * book resolveCopyByQr() finds nothing and the scan used to be rejected.
     */
    public function resolveTitleByQr(string $payload): ?Book
    {
        $payload = trim($payload);

        if (!str_starts_with($payload, 'LIBTRACK:BOOK:')) {
            return null;
        }

        $uuid = trim(substr($payload, strlen('LIBTRACK:BOOK:')));

        return $uuid === '' ? null : Book::where('qr_code', $uuid)->first();
    }

    /**
     * Issue a loan on one PHYSICAL copy.
     *
     * $bookCopyId picks the exact copy (that's what a QR scan supplies). When
     * it is null the first copy on the shelf is assigned automatically, so the
     * older "just pick the title" callers keep working.
     */
    public function borrowBook(int $userId, int $bookId, ?int $librarianId = null, ?string $borrowedAt = null, ?string $dueDate = null, ?int $bookCopyId = null): Transaction
    {
        $transaction = DB::transaction(function () use ($userId, $bookId, $librarianId, $borrowedAt, $dueDate, $bookCopyId) {
            $book = Book::lockForUpdate()->findOrFail($bookId);
            $user = User::findOrFail($userId);

            // Lock the individual copy, not just the title, so two librarians
            // checking out two different copies don't serialise on each other.
            if ($bookCopyId !== null) {
                $copy = BookCopy::where('id', $bookCopyId)->lockForUpdate()->first();

                if (!$copy || $copy->book_id !== $book->id) {
                    throw new \Exception('That copy does not belong to the selected book.');
                }
                if (!$copy->isAvailable()) {
                    throw new \Exception("Copy {$copy->label()} is not on the shelf (status: {$copy->status}). Pick another copy.");
                }
            } else {
                $copy = BookCopy::where('book_id', $book->id)
                    ->where('status', 'available')
                    ->orderBy('copy_number')
                    ->lockForUpdate()
                    ->first();

                if (!$copy) {
                    throw new \Exception('No copies available for borrowing.');
                }
            }

            if ($user->hasUnpaidFines()) {
                throw new \Exception('User has unpaid fines. Please settle fines before borrowing.');
            }

            if ($user->hasActiveCredentialHold()) {
                $hold = $user->credentialHolds()->where('status', 'active')->latest()->first();
                throw new \Exception('Cannot borrow: account on hold — ' . ($hold->reason ?? 'unresolved obligations') . '. Release the hold before borrowing.');
            }

            $maxBorrow = $this->settings->maxBorrowPerUser();
            if ($user->activeBorrowCount() >= $maxBorrow) {
                throw new \Exception("User has reached the maximum borrow limit ({$maxBorrow} books).");
            }

            // Check for existing active borrow of same book
            $existingBorrow = Transaction::where('user_id', $userId)
                ->where('book_id', $bookId)
                ->where('status', 'active')
                ->exists();
            if ($existingBorrow) {
                throw new \Exception('User already has an active borrow for this book.');
            }

            // Create transaction
            $borrowDate = $borrowedAt ? Carbon::parse($borrowedAt) : Carbon::now();
            $dueDateParsed = $dueDate ? Carbon::parse($dueDate) : Carbon::now()->addDays($this->settings->borrowDurationDays());
            $transaction = Transaction::create([
                'user_id' => $userId,
                'book_id' => $bookId,
                'book_copy_id' => $copy->id,
                'librarian_id' => $librarianId,
                'type' => 'borrow',
                'borrowed_at' => $borrowDate,
                'due_date' => $dueDateParsed,
                'status' => 'active',
            ]);

            // Take this copy off the shelf and re-derive the title's counters.
            $copy->update(['status' => 'borrowed']);
            $this->copies->refreshCounts($book);

            return $transaction;
        });

        $this->scheduleBorrowReminder($transaction);

        return $transaction;
    }

    /**
     * Close a loan.
     *
     * $scannedCopyQr is the QR the librarian actually scanned off the book being
     * handed back. When supplied it MUST be the same physical copy the loan was
     * issued on — otherwise a student could return a classmate's copy of the
     * same title against their own loan, which is exactly the hole per-copy
     * codes exist to close.
     *
     * $scannedUserQr is the student QR scanned at the desk, if any. It must be
     * the borrower's own, so a scan can't close someone else's loan.
     */
    public function returnBook(int $transactionId, ?int $librarianId = null, ?string $scannedCopyQr = null, bool $unverified = false, ?string $scannedUserQr = null): Transaction
    {
        return DB::transaction(function () use ($transactionId, $librarianId, $scannedCopyQr, $unverified, $scannedUserQr) {
            $transaction = Transaction::lockForUpdate()->findOrFail($transactionId);

            if ($transaction->status === 'returned') {
                throw new \Exception('This book has already been returned.');
            }

            $borrowerVerified = false;
            if ($scannedUserQr !== null && trim($scannedUserQr) !== '') {
                $payload = trim($scannedUserQr);
                $uuid = str_starts_with($payload, 'LIBTRACK:USER:') ? trim(substr($payload, strlen('LIBTRACK:USER:'))) : $payload;

                if ($uuid === '' || $transaction->user?->qr_code !== $uuid) {
                    // The scanned student is deliberately not named: the QR may
                    // belong to another school's student.
                    throw new \Exception(
                        'Wrong student. The student QR you scanned is not ' . ($transaction->user?->name ?? 'the borrower') . "'s, and this loan is theirs."
                    );
                }

                $borrowerVerified = true;
            }

            // Lock in the SAME order as borrowBook — books, then book_copies.
            // Taking the copy lock first here inverted the order against a
            // concurrent borrow of the same title and deadlocked on Postgres
            // (SQLite compiles the lock clause away, so it only bites in prod).
            $book = Book::lockForUpdate()->findOrFail($transaction->book_id);

            $copy = $transaction->book_copy_id
                ? BookCopy::where('id', $transaction->book_copy_id)->lockForUpdate()->first()
                : null;

            // A title label sits on (or stands for) every copy of the title, so it
            // proves the right BOOK came back but cannot say which copy. It is
            // accepted for a loan on that title and recorded as such; a per-copy
            // label is still held to the exact copy.
            $titleVerified = false;

            if ($scannedCopyQr !== null && $scannedCopyQr !== '') {
                $scannedTitle = $this->resolveTitleByQr($scannedCopyQr);

                if ($scannedTitle) {
                    if ($scannedTitle->id !== $book->id) {
                        throw new \Exception(
                            "Wrong book. You scanned the label for \"{$scannedTitle->title}\", but this loan is for \"{$book->title}\"."
                        );
                    }

                    $titleVerified = true;
                } else {
                    $scanned = $this->resolveCopyByQr($scannedCopyQr);

                    if (!$scanned) {
                        throw new \Exception('That QR code does not match any book copy in the system.');
                    }

                    if (!$copy) {
                        throw new \Exception('This loan predates per-copy tracking, so a scanned copy cannot be verified against it. Return it from the list instead.');
                    }

                    if ($scanned->id !== $copy->id) {
                        $borrower = $transaction->user?->name ?? 'another student';
                        throw new \Exception(
                            "Wrong copy. You scanned {$scanned->label()}, but this loan was issued on {$copy->label()}"
                            . " to {$borrower}. Return the copy that was actually borrowed."
                        );
                    }
                }
            }

            $returnedEarly = $transaction->due_date->isFuture();
            $reminderId = $transaction->sms_reminder_id;

            // A return accepted without scanning the copy is recorded as such —
            // it is the one path where the system cannot prove the right
            // physical book came back.
            $notes = $transaction->notes;
            if ($unverified && ($scannedCopyQr === null || $scannedCopyQr === '')) {
                $stamp = 'Returned without QR verification on ' . Carbon::now()->format('M d, Y H:i')
                    . ($copy ? " (expected {$copy->label()})" : '')
                    . ($borrowerVerified ? "; borrower's student QR verified" : '') . '.';
                $notes = trim(($notes ? $notes . "\n" : '') . $stamp);
            } elseif ($titleVerified) {
                $stamp = 'Returned by scanning the title QR on ' . Carbon::now()->format('M d, Y H:i')
                    . ($copy ? " (title labels are not copy-specific; loan was on {$copy->label()})" : '')
                    . ($borrowerVerified ? "; borrower's student QR verified" : '') . '.';
                $notes = trim(($notes ? $notes . "\n" : '') . $stamp);
            } elseif ($borrowerVerified) {
                $notes = trim(($notes ? $notes . "\n" : '') . "Borrower's student QR verified at return.");
            }

            $transaction->update([
                'returned_at' => Carbon::now(),
                'status' => 'returned',
                'librarian_id' => $librarianId ?? $transaction->librarian_id,
                'notes' => $notes,
            ]);

            // Put the physical copy back on the shelf, then re-derive the
            // title's counters from its copies. ($book was locked above, before
            // the copy, to keep the lock order consistent with borrowBook.)
            if ($copy) {
                // Don't overwrite a copy an admin has flagged damaged/lost.
                if ($copy->status === 'borrowed') {
                    $copy->update(['status' => 'available']);
                }
                $this->copies->refreshCounts($book);
            } elseif ($book->copies()->exists()) {
                // Legacy loan with no copy attached, but the title HAS copies:
                // re-derive from them rather than incrementing a counter past
                // the real copy count.
                $this->copies->refreshCounts($book);
            } else {
                // No copy rows at all — fall back to the counter so historical
                // returns still balance.
                $book->increment('available_copies');
                if ($book->fresh()->available_copies > 0) {
                    $book->update(['status' => 'available']);
                }
            }

            // Auto-create fine if overdue (guard against duplicates)
            if ($transaction->due_date->isPast()) {
                $daysOverdue = (int) $transaction->due_date->diffInDays(Carbon::now());
                $finePerDay = $this->settings->finePerDay();
                $amount = $daysOverdue * $finePerDay;

                if ($amount > 0) {
                    Fine::updateOrCreate(
                        ['transaction_id' => $transaction->id, 'type' => 'overdue'],
                        [
                            'user_id' => $transaction->user_id,
                            'amount' => $amount,
                            'description' => "Overdue by {$daysOverdue} day(s) at {$finePerDay}/day",
                        ]
                    );
                }
            }

            if ($returnedEarly && $reminderId) {
                $this->sms->deleteReminder((int) $reminderId);
            }

            // Evaluate credential hold (auto place/release based on outstanding fines)
            $borrower = $transaction->user;
            if ($borrower) {
                $this->holds->evaluate($borrower);
                $this->holds->autoReleaseIfClear($borrower);
            }

            return $transaction;
        });
    }

    /**
     * A student asks to return one of their books from their own page.
     *
     * This does NOT close the loan: the book is still in the student's hands
     * until a librarian receives it on the Return screen, so fines keep running
     * until then. With $scannedQr the student scanned the book's label, which
     * has to be one of their own open loans — a per-copy label must be the
     * exact copy they borrowed.
     */
    public function requestReturn(User $student, ?int $transactionId, ?string $scannedQr = null): Transaction
    {
        $open = fn () => Transaction::with(['book', 'bookCopy'])
            ->where('user_id', $student->id)
            ->whereIn('status', ['active', 'overdue']);

        if ($scannedQr !== null && trim($scannedQr) !== '') {
            $title = $this->resolveTitleByQr($scannedQr);
            $copy = $title ? null : $this->resolveCopyByQr($scannedQr);

            if (!$title && !$copy) {
                throw new \Exception('That QR code is not a LIBTRACK book label. Scan the QR sticker on the book.');
            }

            $transaction = $open()
                ->when($title, fn ($q) => $q->where('book_id', $title->id))
                ->when($copy, fn ($q) => $q->where('book_copy_id', $copy->id))
                ->when($transactionId, fn ($q) => $q->where('id', $transactionId))
                ->first();

            if (!$transaction && $copy) {
                $sameTitle = $open()->where('book_id', $copy->book_id)->first();
                if ($sameTitle?->bookCopy) {
                    throw new \Exception(
                        "That label is {$copy->label()}, but you borrowed {$sameTitle->bookCopy->label()}. Scan the copy you actually have."
                    );
                }
            }

            if (!$transaction) {
                $name = $title?->title ?? $copy?->book?->title ?? 'That book';
                throw new \Exception("\"{$name}\" is not one of your borrowed books.");
            }

            $method = 'qr';
        } else {
            $transaction = $transactionId ? $open()->find($transactionId) : null;

            if (!$transaction) {
                throw new \Exception('That book is not currently borrowed on your account.');
            }

            $method = 'manual';
        }

        if ($transaction->return_requested_at) {
            throw new \Exception("You already asked to return \"{$transaction->book?->title}\". Hand it to the librarian to finish the return.");
        }

        $transaction->update([
            'return_requested_at' => Carbon::now(),
            'return_request_method' => $method,
        ]);

        return $transaction;
    }

    /** Withdraw a return request the student made by mistake. */
    public function cancelReturnRequest(Transaction $transaction): Transaction
    {
        if (!in_array($transaction->status, ['active', 'overdue'], true)) {
            throw new \Exception('This book has already been returned.');
        }

        if (!$transaction->return_requested_at) {
            throw new \Exception('There is no return request to cancel for this book.');
        }

        $transaction->update([
            'return_requested_at' => null,
            'return_request_method' => null,
        ]);

        return $transaction;
    }

    protected function scheduleBorrowReminder(Transaction $transaction): void
    {
        $user = $transaction->user;
        if (!$user || empty($user->phone)) {
            return;
        }

        $book = $transaction->book;
        $bookTitle = $book?->title ?? 'your borrowed book';
        $finePerDay = number_format($this->settings->finePerDay(), 2);
        $dueDate = $transaction->due_date instanceof Carbon
            ? $transaction->due_date
            : Carbon::parse($transaction->due_date);

        $reminderHour = (int) config('services.iprog_sms.reminder_hour', 8);
        $scheduledAt = $dueDate->copy()->setTimezone('Asia/Manila')->startOfDay()->addHours($reminderHour);

        if ($scheduledAt->isPast()) {
            $scheduledAt = Carbon::now('Asia/Manila')->addMinutes(5);
        }

        $message = sprintf(
            "Hi %s, this is a LIBTRACK reminder to return '%s' today (%s). Late returns incur a fine of PHP %s per day.",
            $user->name,
            $bookTitle,
            $dueDate->format('M d, Y'),
            $finePerDay
        );

        $reminderId = $this->sms->scheduleReminder($user->phone, $message, $scheduledAt);

        if ($reminderId) {
            $transaction->forceFill(['sms_reminder_id' => $reminderId])->save();

            NotificationLog::create([
                'user_id' => $user->id,
                'type' => 'due_reminder',
                'title' => 'SMS Return Reminder Scheduled',
                'message' => "SMS reminder scheduled for {$scheduledAt->format('M d, Y h:i A')} to return '{$bookTitle}'.",
                'channel' => 'sms',
                'sent_at' => Carbon::now(),
            ]);
        }
    }
}
