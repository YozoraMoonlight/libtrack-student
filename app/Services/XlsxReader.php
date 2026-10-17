<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use XMLReader;
use ZipArchive;

/**
 * Minimal .xlsx reader — enough to turn the first worksheet of an uploaded
 * roster into the same {headers, rows} shape the CSV parser produces.
 *
 * Hand-rolled because the project carries no spreadsheet dependency and this
 * only ever has to read files shaped like {@see RosterTemplate}. It is written
 * defensively all the same: real uploads come back from Excel, LibreOffice and
 * Google Sheets, and each writes the same data slightly differently.
 *
 * Two details it exists to get right, both of which have bitten this importer
 * before through CSV:
 *   - a 12-digit LRN stored as a number must come back as "123456789012",
 *     never "1.23E+11";
 *   - a birthdate stored as an Excel date serial must come back as YYYY-MM-DD,
 *     not "40645".
 */
class XlsxReader
{
    private const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    private const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    private const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

    /**
     * Largest a single decompressed part may be.
     *
     * .xlsx is a zip, so the 10 MB cap on the upload bounds the *compressed*
     * size only — deflate on repetitive XML runs several hundred to one, and an
     * in-limit file can otherwise inflate to gigabytes and take the PHP worker
     * down with an uncatchable memory fatal. A 5,000-student roster's worksheet
     * is a few MB, so this is generous for anything real.
     */
    private const MAX_PART_BYTES = 64 * 1024 * 1024;

    /** And a ceiling across all parts, so many merely-large parts can't add up. */
    private const MAX_TOTAL_BYTES = 128 * 1024 * 1024;

    private int $bytesRead = 0;

    /** Built-in numFmt ids that mean "this number is a date or a time". */
    private const DATE_FORMAT_IDS = [
        14, 15, 16, 17, 18, 19, 20, 21, 22,
        27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
        45, 46, 47,
        50, 51, 52, 53, 54, 55, 56, 57, 58,
    ];

    /** @var array<int, string> */
    private array $sharedStrings = [];

    /** @var array<int, bool> cellXfs index => is a date format */
    private array $dateStyles = [];

    private bool $date1904 = false;

    /**
     * @return array{headers: array<int, string>, rows: array<int, array<string, string>>}
     */
    public static function read(string $path): array
    {
        return (new self())->parse($path);
    }

    /**
     * @return array{headers: array<int, string>, rows: array<int, array<string, string>>}
     */
    public function parse(string $path): array
    {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            return ['headers' => [], 'rows' => []];
        }

        try {
            $this->readWorkbookFlags($zip);
            $this->readSharedStrings($zip);
            $this->readStyles($zip);

            $sheetXml = $this->entry($zip, $this->firstSheetPath($zip));
            if ($sheetXml === null) {
                return ['headers' => [], 'rows' => []];
            }

            return $this->parseSheet($sheetXml);
        } finally {
            $zip->close();
        }
    }

    // ------------------------------------------------------------------
    //  Workbook parts
    // ------------------------------------------------------------------

    private function readWorkbookFlags(ZipArchive $zip): void
    {
        $xml = $this->entry($zip, 'xl/workbook.xml');
        if ($xml === null) {
            return;
        }

        $doc = $this->loadXml($xml);
        if ($doc === null) {
            return;
        }

        // Classic Mac workbooks count days from 1904 instead of 1900. Rare, but
        // every birthdate in the file is four years off if it is ignored.
        $pr = $doc->getElementsByTagNameNS(self::NS_MAIN, 'workbookPr')->item(0);
        if ($pr instanceof DOMElement) {
            $flag = $pr->getAttribute('date1904');
            $this->date1904 = $flag === '1' || strtolower($flag) === 'true';
        }
    }

    /**
     * Resolve the *first* sheet in tab order through the workbook relationships,
     * rather than assuming sheet1.xml — Google Sheets and re-saved workbooks
     * routinely number their parts differently from their tab order.
     */
    private function firstSheetPath(ZipArchive $zip): string
    {
        $fallback = 'xl/worksheets/sheet1.xml';

        $workbook = $this->entry($zip, 'xl/workbook.xml');
        $rels = $this->entry($zip, 'xl/_rels/workbook.xml.rels');
        if ($workbook === null || $rels === null) {
            return $fallback;
        }

        $wbDoc = $this->loadXml($workbook);
        $relDoc = $this->loadXml($rels);
        if ($wbDoc === null || $relDoc === null) {
            return $fallback;
        }

        $sheet = $wbDoc->getElementsByTagNameNS(self::NS_MAIN, 'sheet')->item(0);
        if (!$sheet instanceof DOMElement) {
            return $fallback;
        }
        $rid = $sheet->getAttributeNS(self::NS_REL, 'id');
        if ($rid === '') {
            return $fallback;
        }

        foreach ($relDoc->getElementsByTagNameNS(self::NS_PKG_REL, 'Relationship') as $rel) {
            /** @var DOMElement $rel */
            if ($rel->getAttribute('Id') !== $rid) {
                continue;
            }
            $target = ltrim($rel->getAttribute('Target'), '/');
            // Targets are relative to xl/ unless the part path is already absolute.
            return str_starts_with($target, 'xl/') ? $target : 'xl/' . $target;
        }

        return $fallback;
    }

    private function readSharedStrings(ZipArchive $zip): void
    {
        $xml = $this->entry($zip, 'xl/sharedStrings.xml');
        if ($xml === null) {
            return;
        }

        $doc = $this->loadXml($xml);
        if ($doc === null) {
            return;
        }

        foreach ($doc->getElementsByTagNameNS(self::NS_MAIN, 'si') as $si) {
            /** @var DOMElement $si */
            $this->sharedStrings[] = $this->textOf($si);
        }
    }

    private function readStyles(ZipArchive $zip): void
    {
        $xml = $this->entry($zip, 'xl/styles.xml');
        if ($xml === null) {
            return;
        }

        $doc = $this->loadXml($xml);
        if ($doc === null) {
            return;
        }

        // Custom formats first: a numFmtId >= 164 is only a date if its code says so.
        // Scoped to the <numFmts> block on purpose — a document-wide search also
        // picks up the <numFmt> elements inside <dxfs> (conditional formatting),
        // which live in a separate id space and, being serialised later, would
        // silently overwrite a real format and turn numbers into dates.
        $custom = [];
        $numFmts = $doc->getElementsByTagNameNS(self::NS_MAIN, 'numFmts')->item(0);
        if ($numFmts instanceof DOMElement) {
            foreach ($numFmts->childNodes as $fmt) {
                if ($fmt instanceof DOMElement && $fmt->localName === 'numFmt') {
                    $custom[(int) $fmt->getAttribute('numFmtId')] = $fmt->getAttribute('formatCode');
                }
            }
        }

        $cellXfs = $doc->getElementsByTagNameNS(self::NS_MAIN, 'cellXfs')->item(0);
        if (!$cellXfs instanceof DOMElement) {
            return;
        }

        // Direct children only: the style index a cell's `s` attribute carries is
        // the position among cellXfs' own <xf> elements, so a nested one would
        // shift every index after it.
        $index = 0;
        foreach ($cellXfs->childNodes as $xf) {
            if (!$xf instanceof DOMElement || $xf->localName !== 'xf') {
                continue;
            }
            $id = (int) $xf->getAttribute('numFmtId');
            $this->dateStyles[$index] = in_array($id, self::DATE_FORMAT_IDS, true)
                || (isset($custom[$id]) && $this->looksLikeDateFormat($custom[$id]));
            $index++;
        }
    }

    /** Strip literals and colour/condition tokens, then look for date placeholders. */
    private function looksLikeDateFormat(string $code): bool
    {
        $stripped = preg_replace('/(\\\\.)|("[^"]*")|(\[[^\]]*\])/', '', $code) ?? '';

        return (bool) preg_match('/[ymdhs]/i', $stripped);
    }

    // ------------------------------------------------------------------
    //  Sheet
    // ------------------------------------------------------------------

    /**
     * @return array{headers: array<int, string>, rows: array<int, array<string, string>>}
     */
    private function parseSheet(string $xml): array
    {
        $reader = new XMLReader();
        if (@$reader->XML($xml, null, LIBXML_NONET) !== true) {
            return ['headers' => [], 'rows' => []];
        }

        $doc = new DOMDocument();
        $headers = [];
        $rows = [];

        while (@$reader->read()) {
            if ($reader->nodeType !== XMLReader::ELEMENT || $reader->localName !== 'row') {
                continue;
            }

            $node = $reader->expand($doc);
            if (!$node instanceof DOMElement) {
                continue;
            }

            $cells = $this->cellsOf($node);

            if ($headers === []) {
                // Leading blank rows are common in hand-edited files; the first
                // row with anything in it is the header row.
                if (array_filter($cells, fn ($v) => $v !== '') === []) {
                    continue;
                }
                $width = max(array_keys($cells)) + 1;
                for ($i = 0; $i < $width; $i++) {
                    $headers[$i] = strtolower(trim($cells[$i] ?? ''));
                }
                continue;
            }

            $assoc = [];
            foreach ($headers as $i => $key) {
                if ($key === '') {
                    continue;
                }
                $assoc[$key] = trim($cells[$i] ?? '');
            }

            if (array_filter($assoc, fn ($v) => $v !== '') !== []) {
                $rows[] = $assoc;
            }
        }

        $reader->close();

        // Drop trailing unnamed columns so the header list matches the CSV parser's.
        while ($headers !== [] && end($headers) === '') {
            array_pop($headers);
        }

        return ['headers' => array_values($headers), 'rows' => $rows];
    }

    /**
     * @return array<int, string> zero-based column index => value
     */
    private function cellsOf(DOMElement $row): array
    {
        $cells = [];
        $auto = 0;

        foreach ($row->getElementsByTagNameNS(self::NS_MAIN, 'c') as $c) {
            /** @var DOMElement $c */
            $ref = $c->getAttribute('r');
            $index = $ref !== '' ? $this->columnIndex($ref) : $auto;
            $auto = $index + 1;
            $cells[$index] = $this->cellValue($c);
        }

        return $cells;
    }

    private function cellValue(DOMElement $c): string
    {
        $type = $c->getAttribute('t');

        if ($type === 'inlineStr') {
            $is = $c->getElementsByTagNameNS(self::NS_MAIN, 'is')->item(0);

            return $is instanceof DOMElement ? $this->textOf($is) : '';
        }

        $v = $c->getElementsByTagNameNS(self::NS_MAIN, 'v')->item(0);
        $raw = $v instanceof DOMElement ? $v->textContent : '';
        if ($raw === '') {
            return '';
        }

        return match ($type) {
            's' => $this->sharedStrings[(int) $raw] ?? '',
            'b' => $raw === '0' ? 'FALSE' : 'TRUE',
            'e' => '',                       // #N/A and friends are not data
            'str' => trim($raw),
            // ISO 8601 date cell. Cut the time off: nothing this importer reads
            // is a datetime, and StudentCredentials::parseBirthdate() matches a
            // fixed set of date formats that "2011-04-12T00:00:00" is not in.
            'd' => explode('T', trim($raw))[0],
            default => $this->numericValue($c, $raw),
        };
    }

    /** A bare number: either a date serial to expand, or a literal to keep exact. */
    private function numericValue(DOMElement $c, string $raw): string
    {
        $style = $c->getAttribute('s');
        $isDate = $style !== '' && ($this->dateStyles[(int) $style] ?? false);

        if ($isDate && is_numeric($raw)) {
            return $this->serialToDate((float) $raw);
        }

        return $this->plainNumber($raw);
    }

    /**
     * Excel's day 0 is 1899-12-30 — the two-day offset absorbs its deliberate
     * 1900-leap-year bug, which is why a plain 1900-01-01 base is wrong.
     */
    private function serialToDate(float $serial): string
    {
        $base = $this->date1904 ? '1904-01-01' : '1899-12-30';
        $days = (int) floor($serial);
        $seconds = (int) round(($serial - $days) * 86400);

        $date = date_create_immutable($base . ' 00:00:00 UTC');
        if ($date === false) {
            return (string) $serial;
        }
        $date = $date->modify("+{$days} days");
        if ($date === false) {
            return (string) $serial;
        }

        // A value below 1 is a time-of-day, not a date — nothing this importer
        // reads is a time, so hand back the clock value rather than 1899-12-30.
        if ($days === 0) {
            return gmdate('H:i:s', $seconds);
        }

        // Any time component is dropped. A birthdate carried by a formula often
        // arrives as 40645.5, and appending " 12:00:00" would make an otherwise
        // unambiguous date unparseable downstream.
        return $date->format('Y-m-d');
    }

    /**
     * Keep the literal digits. Excel writes plain decimals, but some producers
     * emit 1.23456789012E+11 for a big integer — expanding it here is the whole
     * reason 12-digit LRNs survive the round trip.
     */
    private function plainNumber(string $raw): string
    {
        $raw = trim($raw);

        if (preg_match('/^-?\d+(\.\d+)?$/', $raw)) {
            return $raw;
        }

        if (is_numeric($raw)) {
            $float = (float) $raw;
            if (floor($float) === $float && abs($float) < 1.0e15) {
                return sprintf('%.0f', $float);
            }

            return rtrim(rtrim(sprintf('%.10F', $float), '0'), '.');
        }

        return $raw;
    }

    /** "BC12" => 54 (zero-based). */
    private function columnIndex(string $ref): int
    {
        $letters = strtoupper(preg_replace('/[^A-Za-z]/', '', $ref) ?? '');
        if ($letters === '') {
            return 0;
        }

        $index = 0;
        foreach (str_split($letters) as $char) {
            $index = $index * 26 + (ord($char) - 64);
        }

        return $index - 1;
    }

    // ------------------------------------------------------------------
    //  Plumbing
    // ------------------------------------------------------------------

    /** Concatenate every <t> under the node, so rich-text runs read as one string. */
    private function textOf(DOMElement $node): string
    {
        $text = '';
        foreach ($node->getElementsByTagNameNS(self::NS_MAIN, 't') as $t) {
            /** @var DOMElement $t */
            // Skip phonetic guides (Japanese furigana) — they are not the value.
            if ($t->parentNode instanceof DOMElement && $t->parentNode->localName === 'rPh') {
                continue;
            }
            $text .= $t->textContent;
        }

        return $text;
    }

    /**
     * Read one part, refusing anything that would blow up memory.
     *
     * The size is checked from the zip directory BEFORE decompressing — asking
     * getFromName() first is exactly the allocation we are trying to avoid.
     *
     * @throws \RuntimeException when the workbook is too large to read safely
     */
    private function entry(ZipArchive $zip, string $name): ?string
    {
        $stat = $zip->statName($name);
        if ($stat === false) {
            return null;
        }

        $size = (int) ($stat['size'] ?? 0);
        if ($size > self::MAX_PART_BYTES || $this->bytesRead + $size > self::MAX_TOTAL_BYTES) {
            throw new \RuntimeException(
                'This workbook is too large to read (' . $name . ' expands to '
                . round($size / 1048576) . ' MB). Split the roster into smaller files, '
                . 'or save it as CSV.'
            );
        }

        $contents = $zip->getFromName($name);
        if ($contents === false) {
            return null;
        }

        $this->bytesRead += strlen($contents);

        return $contents;
    }

    private function loadXml(string $xml): ?DOMDocument
    {
        $doc = new DOMDocument();
        // LIBXML_NONET blocks external entity fetches; no DTD loading is enabled,
        // so an uploaded workbook cannot be used to reach the filesystem or network.
        $ok = @$doc->loadXML($xml, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);

        return $ok ? $doc : null;
    }
}
