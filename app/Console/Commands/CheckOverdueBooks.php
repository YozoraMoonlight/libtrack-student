<?php

namespace App\Console\Commands;

use App\Models\Fine;
use App\Models\NotificationLog;
use App\Models\Transaction;
use App\Services\CredentialHoldService;
use App\Services\IprogSmsService;
use App\Services\SettingsService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckOverdueBooks extends Command
{
    protected $signature = 'books:check-overdue';
    protected $description = 'Check for overdue books and create fines';

    public function handle(SettingsService $settings, IprogSmsService $sms, CredentialHoldService $holds): int
    {
        $overdueTransactions = Transaction::with(['user', 'book'])
            ->where('status', 'active')
            ->where('due_date', '<', Carbon::now())
            ->get();

        $count = 0;
        $finePerDay = $settings->finePerDay();

        foreach ($overdueTransactions as $transaction) {
            // Update status to overdue
            $transaction->update(['status' => 'overdue']);

            // Check if fine already exists
            $existingFine = Fine::where('transaction_id', $transaction->id)
                ->where('type', 'overdue')
                ->first();

            $daysOverdue = (int) $transaction->due_date->diffInDays(Carbon::now());
            $amount = $daysOverdue * $finePerDay;

            if ($existingFine) {
                // Update existing fine amount
                $existingFine->update([
                    'amount' => $amount,
                    'description' => "Overdue by {$daysOverdue} day(s) at {$finePerDay}/day",
                ]);
            } else {
                // Create new fine
                Fine::create([
                    'user_id' => $transaction->user_id,
                    'transaction_id' => $transaction->id,
                    'type' => 'overdue',
                    'amount' => $amount,
                    'description' => "Overdue by {$daysOverdue} day(s) at {$finePerDay}/day",
                ]);

                $bookTitle = $transaction->book?->title ?? 'your borrowed book';
                $amountFormatted = number_format($amount, 2);
                $userMessage = "LIBTRACK: Your book '{$bookTitle}' is overdue by {$daysOverdue} day(s). A fine of PHP {$amountFormatted} has been applied. Please return ASAP.";

                // Create database notification
                NotificationLog::create([
                    'user_id' => $transaction->user_id,
                    'type' => 'overdue_notice',
                    'title' => 'Overdue Book Notice',
                    'message' => "Your borrowed book is overdue. A fine of P{$amountFormatted} has been applied.",
                    'channel' => 'database',
                    'sent_at' => Carbon::now(),
                ]);

                // Send SMS if user has a phone number
                if ($transaction->user && !empty($transaction->user->phone)) {
                    $sent = $sms->sendNow($transaction->user->phone, $userMessage);
                    NotificationLog::create([
                        'user_id' => $transaction->user_id,
                        'type' => 'overdue_notice',
                        'title' => $sent ? 'Overdue SMS Sent' : 'Overdue SMS Failed',
                        'message' => $userMessage,
                        'channel' => 'sms',
                        'sent_at' => Carbon::now(),
                    ]);
                }
            }

            if ($transaction->user) {
                $holds->evaluate($transaction->user);
            }

            $count++;
        }

        $this->info("Processed {$count} overdue transactions.");

        return Command::SUCCESS;
    }
}
