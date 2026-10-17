<?php

namespace App\Services;

use ZipArchive;

/**
 * Builds the student-roster upload template as a real .xlsx.
 *
 * Why not a CSV: a CSV cell is free text, so grade_level was whatever the
 * teacher typed and half the import errors were "Grade7" / "7th" / "G-7".
 * An .xlsx can carry data validation, so grade_level, section and
 * enrollment_status are *dropdowns* the teacher picks from, and the file is
 * wrong-proof before it is ever uploaded.
 *
 * Written by hand (ZipArchive + string XML) rather than with PhpSpreadsheet —
 * the project has no spreadsheet dependency and this writes exactly one shape
 * of file. The reader side lives in {@see XlsxReader}.
 */
class RosterTemplate
{
    /** Column order must match what BatchImportService reads. */
    public const HEADERS = [
        'lrn',
        'first_name',
        'middle_name',
        'last_name',
        'birthdate',
        'grade_level',
        'section',
        'enrollment_status',
        'email',
    ];

    public const ENROLLMENT_STATUSES = ['enrolled', 'not_enrolled', 'transferred', 'graduated'];

    /** How far down the sheet the dropdowns reach — one class roster is never this long. */
    private const VALIDATION_ROWS = 1000;

    /** cellXfs indexes defined in {@see styles()}. */
    private const STYLE_TEXT = 1;
    private const STYLE_HEADER = 2;

    /**
     * @param  array<int, string>  $gradeLevels
     * @param  array<int, string>  $sections    section names offered by this school
     * @param  array<int, array<int, string>>  $examples  worked example rows, in HEADERS order.
     *         They are written to the Guide sheet, never to Students: the importer
     *         reads the first sheet, so an example left in place would import a
     *         fictional "Juan Cruz" into the roster.
     * @return string  absolute path to the generated file (caller deletes it)
     */
    public function build(array $gradeLevels, array $sections = [], array $examples = []): string
    {
        // Duplicated names would make the dropdown list the same section twice.
        $sections = array_values(array_unique(array_filter(array_map('trim', $sections), fn ($s) => $s !== '')));
        $gradeLevels = array_values($gradeLevels);
        $statuses = self::ENROLLMENT_STATUSES;

        // No '.xlsx' suffix: tempnam() *creates* the file it names, so appending
        // an extension would leave that first file orphaned on every download.
        // response()->download() supplies the filename the browser sees anyway.
        $path = tempnam(sys_get_temp_dir(), 'roster_');
        if ($path === false) {
            throw new \RuntimeException('Could not create the roster template file.');
        }

        $zip = new ZipArchive();
        if ($zip->open($path, ZipArchive::OVERWRITE) !== true) {
            @unlink($path);
            throw new \RuntimeException('Could not create the roster template file.');
        }

        try {
            // [Content_Types].xml goes in first: that is what lets `file`/fileinfo
            // recognise the archive as an Office document rather than a plain zip,
            // which in turn is what makes Laravel's `mimes:xlsx` rule pass.
            $zip->addFromString('[Content_Types].xml', $this->contentTypes());
            $zip->addFromString('_rels/.rels', $this->rootRels());
            $zip->addFromString('xl/workbook.xml', $this->workbook(count($gradeLevels), count($sections), count($statuses)));
            $zip->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRels());
            $zip->addFromString('xl/styles.xml', $this->styles());
            $zip->addFromString('xl/worksheets/sheet1.xml', $this->rosterSheet($sections !== []));
            $zip->addFromString('xl/worksheets/sheet2.xml', $this->guideSheet($gradeLevels, $sections, $statuses, $examples));
        } catch (\Throwable $e) {
            $zip->close();
            @unlink($path);
            throw $e;
        }

        $zip->close();

        return $path;
    }

    // ------------------------------------------------------------------
    //  Package parts
    // ------------------------------------------------------------------

    private function contentTypes(): string
    {
        return $this->declaration()
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            . '</Types>';
    }

    private function rootRels(): string
    {
        return $this->declaration()
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>';
    }

    private function workbookRels(): string
    {
        $ns = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

        return $this->declaration()
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="' . $ns . '/worksheet" Target="worksheets/sheet1.xml"/>'
            . '<Relationship Id="rId2" Type="' . $ns . '/worksheet" Target="worksheets/sheet2.xml"/>'
            . '<Relationship Id="rId3" Type="' . $ns . '/styles" Target="styles.xml"/>'
            . '</Relationships>';
    }

    /**
     * Defined names rather than raw "Guide!$A$2:$A$7" in each rule: a named
     * range is the one form of cross-sheet validation that Excel, LibreOffice
     * and Google Sheets all honour.
     */
    private function workbook(int $gradeCount, int $sectionCount, int $statusCount): string
    {
        $names = '<definedName name="GradeLevels">Guide!$A$2:$A$' . max(2, $gradeCount + 1) . '</definedName>';
        if ($sectionCount > 0) {
            $names .= '<definedName name="SectionNames">Guide!$B$2:$B$' . ($sectionCount + 1) . '</definedName>';
        }
        $names .= '<definedName name="EnrollmentStatuses">Guide!$C$2:$C$' . max(2, $statusCount + 1) . '</definedName>';

        return $this->declaration()
            . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
            . ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets>'
            . '<sheet name="Students" sheetId="1" r:id="rId1"/>'
            . '<sheet name="Guide" sheetId="2" r:id="rId2"/>'
            . '</sheets>'
            . '<definedNames>' . $names . '</definedNames>'
            . '</workbook>';
    }

    /**
     * Four cell formats. Index 1 (Text) is the important one: it is applied to
     * the lrn and birthdate columns so a 12-digit LRN never becomes 1.23E+11
     * and a birthdate stays the literal "2011-04-12" the admin typed instead of
     * being reinterpreted by the machine's date locale.
     */
    private function styles(): string
    {
        return $this->declaration()
            . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<fonts count="2">'
            . '<font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>'
            . '<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/></font>'
            . '</fonts>'
            . '<fills count="3">'
            . '<fill><patternFill patternType="none"/></fill>'
            . '<fill><patternFill patternType="gray125"/></fill>'
            . '<fill><patternFill patternType="solid"><fgColor rgb="FFEDF2F7"/><bgColor indexed="64"/></patternFill></fill>'
            . '</fills>'
            . '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            . '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            . '<cellXfs count="3">'
            . '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            . '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
            . '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
            . '</cellXfs>'
            . '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
            . '</styleSheet>';
    }

    /** The sheet the admin fills in: headers, frozen top row, dropdowns, nothing else. */
    private function rosterSheet(bool $withSectionList): string
    {
        $lastCol = $this->columnLetter(count(self::HEADERS));

        // lrn (A) and birthdate (E) are forced to Text; the rest are auto-width-ish.
        $widths = [16, 14, 14, 14, 13, 13, 16, 18, 26];
        $cols = '';
        foreach ($widths as $i => $width) {
            $index = $i + 1;
            // CT_Col carries the column format in `style` alone. Do NOT add
            // customFormat here — that attribute belongs to CT_Row, and an
            // unknown attribute makes Excel offer to "repair" the workbook,
            // which strips <cols> and takes the Text format on lrn with it.
            $style = in_array($index, [1, 5], true) ? ' style="' . self::STYLE_TEXT . '"' : '';
            $cols .= '<col min="' . $index . '" max="' . $index . '" width="' . $width . '" customWidth="1"' . $style . '/>';
        }

        $rows = '<row r="1">';
        foreach (self::HEADERS as $i => $header) {
            $rows .= $this->inlineCell($this->columnLetter($i + 1) . '1', $header, self::STYLE_HEADER);
        }
        $rows .= '</row>';

        $lastValidationRow = self::VALIDATION_ROWS + 1;
        $validations = [
            $this->validation('F2:F' . $lastValidationRow, 'GradeLevels', 'Grade level', 'Pick a grade level from the dropdown — typing your own is not accepted by the importer.'),
            $this->validation('H2:H' . $lastValidationRow, 'EnrollmentStatuses', 'Enrollment status', 'Pick one of: ' . implode(', ', self::ENROLLMENT_STATUSES) . '.'),
        ];
        if ($withSectionList) {
            // The list is flat across grades — Excel cannot filter one dropdown by
            // another cell's value without per-grade named ranges — so the prompt
            // has to say so, or a Grade 9 row picks a Grade 7 section and the
            // importer files it under a pair nobody set up.
            $validations[] = $this->validation(
                'G2:G' . $lastValidationRow,
                'SectionNames',
                'Section',
                'Sections from every grade are listed here — pick one that belongs to this row\'s grade_level.'
            );
        }

        return $this->declaration()
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
            . ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<dimension ref="A1:' . $lastCol . $lastValidationRow . '"/>'
            . '<sheetViews><sheetView tabSelected="1" workbookViewId="0">'
            . '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
            . '</sheetView></sheetViews>'
            . '<sheetFormatPr defaultRowHeight="15"/>'
            . '<cols>' . $cols . '</cols>'
            . '<sheetData>' . $rows . '</sheetData>'
            . '<dataValidations count="' . count($validations) . '">' . implode('', $validations) . '</dataValidations>'
            . '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
            . '</worksheet>';
    }

    /**
     * Reference sheet: the valid values the dropdowns are built from, plus a
     * worked example of a filled-in row. Kept off the Students sheet so nothing
     * here can be mistaken for data to import.
     *
     * @param  array<int, string>  $gradeLevels
     * @param  array<int, string>  $sections
     * @param  array<int, string>  $statuses
     * @param  array<int, array<int, string>>  $examples
     */
    private function guideSheet(array $gradeLevels, array $sections, array $statuses, array $examples): string
    {
        $columns = ['A' => $gradeLevels, 'B' => $sections, 'C' => $statuses];
        $headers = ['A' => 'grade_level', 'B' => 'section', 'C' => 'enrollment_status'];

        // Column E onward: the example block. Row 1 is a warning, row 2 repeats
        // the roster headers, rows 3+ are the examples themselves.
        $exampleStart = 5;
        $cellsByRow = [];
        $cellsByRow[1][] = $this->inlineCell('E1', 'EXAMPLE ONLY — type your students on the "Students" sheet, not here.', self::STYLE_HEADER);
        foreach (self::HEADERS as $i => $header) {
            $cellsByRow[2][] = $this->inlineCell($this->columnLetter($exampleStart + $i) . '2', $header, self::STYLE_HEADER);
        }
        foreach ($examples as $n => $example) {
            $rowNum = $n + 3;
            foreach (array_values($example) as $i => $value) {
                if ((string) $value === '') {
                    continue;
                }
                $cellsByRow[$rowNum][] = $this->inlineCell($this->columnLetter($exampleStart + $i) . $rowNum, (string) $value);
            }
        }

        $listHeight = max(1, count($gradeLevels), count($sections), count($statuses)) + 1;
        for ($rowNum = 1; $rowNum <= $listHeight; $rowNum++) {
            $prefix = [];
            foreach ($columns as $letter => $values) {
                $value = $rowNum === 1 ? $headers[$letter] : ($values[$rowNum - 2] ?? null);
                if ($value === null || $value === '') {
                    continue;
                }
                $prefix[] = $this->inlineCell($letter . $rowNum, (string) $value, $rowNum === 1 ? self::STYLE_HEADER : null);
            }
            // List cells sit left of the example block, so they must be written first.
            $cellsByRow[$rowNum] = array_merge($prefix, $cellsByRow[$rowNum] ?? []);
        }

        ksort($cellsByRow);
        $rows = '';
        foreach ($cellsByRow as $rowNum => $cells) {
            if ($cells !== []) {
                $rows .= '<row r="' . $rowNum . '">' . implode('', $cells) . '</row>';
            }
        }

        return $this->declaration()
            . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<sheetFormatPr defaultRowHeight="15"/>'
            . '<cols><col min="1" max="3" width="20" customWidth="1"/><col min="5" max="13" width="16" customWidth="1"/></cols>'
            . '<sheetData>' . $rows . '</sheetData>'
            . '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
            . '</worksheet>';
    }

    // ------------------------------------------------------------------
    //  Small helpers
    // ------------------------------------------------------------------

    private function validation(string $sqref, string $definedName, string $title, string $message): string
    {
        return '<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1"'
            . ' promptTitle="' . $this->esc($title) . '" prompt="' . $this->esc($message) . '"'
            . ' errorTitle="' . $this->esc($title) . '" error="' . $this->esc($message) . '"'
            . ' sqref="' . $sqref . '">'
            . '<formula1>' . $definedName . '</formula1>'
            . '</dataValidation>';
    }

    private function inlineCell(string $ref, string $value, ?int $style = null): string
    {
        // xml:space="preserve" keeps a name like "Dela  Cruz" intact.
        return '<c r="' . $ref . '"' . ($style !== null ? ' s="' . $style . '"' : '') . ' t="inlineStr">'
            . '<is><t xml:space="preserve">' . $this->esc($value) . '</t></is>'
            . '</c>';
    }

    private function columnLetter(int $index): string
    {
        $letter = '';
        while ($index > 0) {
            $index--;
            $letter = chr(65 + ($index % 26)) . $letter;
            $index = intdiv($index, 26);
        }

        return $letter;
    }

    private function esc(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function declaration(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' . "\n";
    }
}
