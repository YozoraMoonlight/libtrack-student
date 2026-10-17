<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Accounts that staff create for other people (school admins, librarians,
    // students) are confirmed by an SMS code before the row is written. Turn
    // this off only where there is no SMS gateway to reach — with it off the
    // account is created straight from the form, as it was before.
    'account_otp' => [
        'enabled' => env('ACCOUNT_OTP_ENABLED', true),
    ],

    'iprog_sms' => [
        'api_token' => env('IPROG_SMS_API_TOKEN'),
        'base_url' => env('IPROG_SMS_BASE_URL', 'https://www.iprogsms.com/api/v1'),
        'reminder_hour' => (int) env('IPROG_SMS_REMINDER_HOUR', 8),
    ],

];
