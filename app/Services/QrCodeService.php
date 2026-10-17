<?php

namespace App\Services;

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use chillerlan\QRCode\Output\QRMarkupSVG;
use chillerlan\QRCode\Output\QRGdImagePNG;
use Illuminate\Support\Facades\Cache;

class QrCodeService
{
    protected function outputInterface(): string
    {
        return extension_loaded('gd') ? QRGdImagePNG::class : QRMarkupSVG::class;
    }

    public function getMimeType(): string
    {
        return $this->outputInterface() === QRGdImagePNG::class ? 'image/png' : 'image/svg+xml';
    }

    protected function options(bool $outputBase64): QROptions
    {
        return new QROptions([
            'outputInterface' => $this->outputInterface(),
            'scale' => 10,
            'outputBase64' => $outputBase64,
        ]);
    }

    public function generateForBook(string $uuid): string
    {
        return $this->generate("LIBTRACK:BOOK:{$uuid}");
    }

    /**
     * QR payload for one physical copy. Distinct prefix from BOOK: so a scan
     * is self-describing; legacy BOOK: labels still resolve because copy #1
     * inherited the title's original code.
     */
    public function generateForCopy(string $uuid): string
    {
        return $this->generate("LIBTRACK:COPY:{$uuid}");
    }

    public function copyPayload(string $uuid): string
    {
        return "LIBTRACK:COPY:{$uuid}";
    }

    public function generateForUser(string $uuid): string
    {
        return $this->generate("LIBTRACK:USER:{$uuid}");
    }

    public function generate(string $data): string
    {
        return (new QRCode($this->options(false)))->render($data);
    }

    public function generateBase64(string $data): string
    {
        // Pages that refresh live re-send their QR images every few seconds
        // (the Copies sheet has one per copy). A payload's image never changes,
        // so it is rendered once rather than on every refresh.
        return Cache::rememberForever(
            'qr:base64:' . $this->getMimeType() . ':' . sha1($data),
            fn () => (new QRCode($this->options(true)))->render($data)
        );
    }
}
