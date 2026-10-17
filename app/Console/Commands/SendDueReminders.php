<?php

namespace App\Console\Commands;

use App\Models\NotificationLog;
use App\Models\Transaction;
use App\Services\IprogSmsService;
use App\Services\SettingsService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendDueReminders extends Command
{
    protected $signature = 'books:send-due-reminders
                            {--days=0 : Offset from today in days (0 = due today, 1 = due tomorrow)}
                            {--dry-run : Skip sending SMS, just report what would be sent}';

    protected $description = 'Send SMS reminders for books due on the target date (default: today).';

    public function handle(SettingsService $settings, IprogSmsService $sms): int
    {
        $daysOffset = (int) $this->option('days');
        $dryRun = (bool) $this->option('dry-run');

        $target = Carbon::now('Asia/Manila')->startOfDay()->addDays($daysOffset);
        $targetStart = $target->copy();
        $targetEnd = $target->copy()->endOfDay();

        $transactions = Transaction::with(['user', 'book'])
            ->where('status', 'active')
            ->whereBetween('due_date', [$targetStart, $targetEnd])
            ->get();

        if ($transactions->isEmpty()) {
            $this->info("No active transactions due on {$target->toDateString()}.");
            return Command::SUCCESS;
        }

        $finePerDay = number_format($settings->finePerDay(), 2);
        $sent = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($transactions as $transaction) {
            $user = $transaction->user;
            $book = $transaction->book;

            if (!$user || empty($user->phone)) {
                $skipped++;
                $this->line("  [skip] Transaction #{$transaction->id}: user has no phone.");
                continue;
            }

            // Prevent double-sending in a real run. Dry-run bypasses this so operators
            // can preview what *would* be attempted without today's log polluting the view.
            if (!$dryRun) {
                $alreadySent = NotificationLog::where('user_id', $user->id)
                    ->where('type', 'due_reminder')
                    ->where('channel', 'sms')
                    ->whereDate('sent_at', Carbon::today('Asia/Manila'))
                    ->where('message', 'like', "%[tx-{$transaction->id}]%")
                    ->exists();

                if ($alreadySent) {
                    $skipped++;
                    $this->line("  [skip] Transaction #{$transaction->id}: reminder already sent today.");
                    continue;
                }
            }

            $whenPhrase = match ($daysOffset) {
                0 => 'today',
                1 => 'tomorrow',
                default => 'on ' . $target->format('M d, Y'),
            };

            $message = sprintf(
                "Hi %s, LIBTRACK reminder: please return '%s' %s (%s). Late returns incur a fine of PHP %s per day.",
                $user->name,
                $book?->title ?? 'your borrowed book',
                $whenPhrase,
                $target->format('M d, Y'),
                $finePerDay
            );
            $logMessage = "[tx-{$transaction->id}] " . $message;

            if ($dryRun) {
                $this->line("  [dry-run] Would send to {$user->phone}: {$message}");
                $sent++;
                continue;
            }

            $ok = $sms->sendNow($user->phone, $message);

            NotificationLog::create([
                'user_id' => $user->id,
                'type' => 'due_reminder',
                'title' => $ok ? 'Due Reminder SMS Sent' : 'Due Reminder SMS Failed',
                'message' => $logMessage,
                'channel' => 'sms',
                'sent_at' => Carbon::now(),
            ]);

            if ($ok) {
                $sent++;
                $this->info("  [sent] Transaction #{$transaction->id} -> {$user->phone}");
            } else {
                $failed++;
                $this->error("  [fail] Transaction #{$transaction->id} -> {$user->phone}");
            }
        }

        $this->info("Done. Sent: {$sent}, Skipped: {$skipped}, Failed: {$failed}.");
        return Command::SUCCESS;
    }
}
