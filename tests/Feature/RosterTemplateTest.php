<?php

namespace Tests\Feature;

use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\Section;
use App\Models\User;
use App\Services\RosterTemplate;
use App\Services\XlsxReader;
use App\Support\GradeLevels;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;
use ZipArchive;

/**
 * The roster template is an .xlsx precisely because a CSV cell cannot hold a
 * dropdown: grade_level (and section, and enrollment_status) are now picked
 * from a list rather than typed, so the file is right before it is uploaded.
 *
 * These tests cover both halves of that: the template we hand out, and the
 * filled-in workbook coming back.
 */
class RosterTemplateTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::create(['code' => 'TPL', 'name' => 'Template High', 'is_active' => true]);
    }

    private function admin(): User
    {
        return User::factory()->create([
            'user_role' => 'school_admin',
            'is_active' => true,
            'school_id' => $this->school->id,
            'password' => Hash::make('Password1!'),
            'phone' => '09171234500',
        ]);
    }

    /**
     * Build a workbook the way Excel does — shared strings, a numeric LRN and a
     * date-styled serial birthdate — so the reader is exercised against the
     * shapes that actually break, not just the ones we write ourselves.
     *
     * @param  array<int, array<int, string|int|float>>  $rows  raw cell values; ints/floats are written as numbers
     * @param  array<int, string>  $headers
     */
    private function workbook(array $headers, array $rows, ?int $dateColumn = null): UploadedFile
    {
        $strings = [];
        $stringIndex = function (string $value) use (&$strings): int {
            $existing = array_search($value, $strings, true);
            if ($existing !== false) {
                return (int) $existing;
            }
            $strings[] = $value;

            return count($strings) - 1;
        };

        $col = function (int $i): string {
            $letter = '';
            $i++;
            while ($i > 0) {
                $i--;
                $letter = chr(65 + ($i % 26)) . $letter;
                $i = intdiv($i, 26);
            }

            return $letter;
        };

        $sheetRows = '<row r="1">';
        foreach ($headers as $i => $header) {
            $sheetRows .= '<c r="' . $col($i) . '1" t="s"><v>' . $stringIndex($header) . '</v></c>';
        }
        $sheetRows .= '</row>';

        foreach ($rows as $n => $row) {
            $rowNum = $n + 2;
            $sheetRows .= '<row r="' . $rowNum . '">';
            foreach (array_values($row) as $i => $value) {
                if ($value === '' || $value === null) {
                    continue;
                }
                $ref = $col($i) . $rowNum;
                if (is_int($value) || is_float($value)) {
                    // Style 1 is the date format; everything else is a plain number.
                    $style = ($dateColumn !== null && $i === $dateColumn) ? ' s="1"' : '';
                    $sheetRows .= '<c r="' . $ref . '"' . $style . '><v>' . $value . '</v></c>';
                } else {
                    $sheetRows .= '<c r="' . $ref . '" t="s"><v>' . $stringIndex((string) $value) . '</v></c>';
                }
            }
            $sheetRows .= '</row>';
        }

        $sst = '';
        foreach ($strings as $value) {
            $sst .= '<si><t>' . htmlspecialchars($value, ENT_QUOTES | ENT_XML1) . '</t></si>';
        }

        $path = tempnam(sys_get_temp_dir(), 'wb_');
        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml',
            '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            . '</Types>');
        $zip->addFromString('_rels/.rels',
            '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>');
        $zip->addFromString('xl/workbook.xml',
            '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
            . ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="Students" sheetId="1" r:id="rId1"/></sheets></workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels',
            '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '</Relationships>');
        $zip->addFromString('xl/sharedStrings.xml',
            '<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' . $sst . '</sst>');
        $zip->addFromString('xl/styles.xml',
            '<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/></cellXfs></styleSheet>');
        $zip->addFromString('xl/worksheets/sheet1.xml',
            '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<sheetData>' . $sheetRows . '</sheetData></worksheet>');
        $zip->close();

        return new UploadedFile($path, 'roster.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }

    // ------------------------------------------------------------------
    //  The template we hand out
    // ------------------------------------------------------------------

    public function test_template_downloads_as_a_real_xlsx(): void
    {
        $response = $this->actingAs($this->admin())->get(route('admin.students.import.template'));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $this->assertStringContainsString('student_roster_template.xlsx', $response->headers->get('content-disposition'));

        // PK.. — a zip, which is what an xlsx is.
        $this->assertStringStartsWith('PK', file_get_contents($response->getFile()->getPathname()));
    }

    public function test_template_grade_level_column_is_a_dropdown_of_the_offered_grades(): void
    {
        Section::create(['school_id' => $this->school->id, 'grade_level' => 'Grade 7', 'name' => 'G7-A']);

        $path = (new RosterTemplate())->build(GradeLevels::all(), ['G7-A']);

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($path) === true);
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $workbook = $zip->getFromName('xl/workbook.xml');
        $guide = $zip->getFromName('xl/worksheets/sheet2.xml');
        $zip->close();
        @unlink($path);

        // grade_level is column F; the rule points at a named range, and that
        // range holds exactly the grades the app accepts.
        $this->assertStringContainsString('sqref="F2:F1001"', $sheet);
        $this->assertStringContainsString('<formula1>GradeLevels</formula1>', $sheet);
        $this->assertStringContainsString('<definedName name="GradeLevels">Guide!$A$2:$A$7</definedName>', $workbook);
        foreach (GradeLevels::all() as $grade) {
            $this->assertStringContainsString('>' . $grade . '<', $guide);
        }

        // …and section + enrollment_status get the same treatment.
        $this->assertStringContainsString('<formula1>SectionNames</formula1>', $sheet);
        $this->assertStringContainsString('<formula1>EnrollmentStatuses</formula1>', $sheet);
    }

    public function test_template_section_dropdown_lists_only_this_schools_sections(): void
    {
        $other = School::create(['code' => 'ZZZ', 'name' => 'Zulu High', 'is_active' => true]);
        Section::create(['school_id' => $this->school->id, 'grade_level' => 'Grade 7', 'name' => 'Mine-A']);
        Section::create(['school_id' => $other->id, 'grade_level' => 'Grade 7', 'name' => 'Theirs-A']);

        $response = $this->actingAs($this->admin())->get(route('admin.students.import.template'));
        $response->assertOk();

        $path = tempnam(sys_get_temp_dir(), 'dl_') . '.xlsx';
        file_put_contents($path, file_get_contents($response->getFile()->getPathname()));
        $zip = new ZipArchive();
        $zip->open($path);
        $guide = $zip->getFromName('xl/worksheets/sheet2.xml');
        $zip->close();
        @unlink($path);

        $this->assertStringContainsString('Mine-A', $guide);
        $this->assertStringNotContainsString('Theirs-A', $guide);
    }

    public function test_the_sheet_the_admin_fills_in_holds_no_example_rows(): void
    {
        // Examples live on the Guide sheet: the importer reads sheet 1, so an
        // example left in place would import a fictional student.
        $path = (new RosterTemplate())->build(GradeLevels::all(), ['G7-A'], [
            ['123456789012', 'Juan', 'Santos', 'Cruz', '2011-04-12', 'Grade 7', 'G7-A', 'enrolled', ''],
        ]);

        $parsed = XlsxReader::read($path);
        @unlink($path);

        $this->assertSame(
            ['lrn', 'first_name', 'middle_name', 'last_name', 'birthdate', 'grade_level', 'section', 'enrollment_status', 'email'],
            $parsed['headers']
        );
        $this->assertSame([], $parsed['rows']);
    }

    public function test_the_template_uses_no_attribute_excel_would_offer_to_repair(): void
    {
        // `customFormat` belongs to CT_Row, not CT_Col. An unknown attribute in
        // the spreadsheetml namespace is what puts Excel into "we found a problem
        // with some content" repair mode, which strips <cols> and takes the Text
        // format on the lrn column with it.
        $path = (new RosterTemplate())->build(GradeLevels::all(), ['G7-A']);

        $zip = new ZipArchive();
        $zip->open($path);
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        @unlink($path);

        $this->assertStringNotContainsString('customFormat', $sheet);
        // The Text format still has to be there — it is the LRN fix.
        $this->assertMatchesRegularExpression('/<col min="1" max="1"[^>]*style="1"/', $sheet);
    }

    public function test_building_the_template_leaves_no_temp_files_behind(): void
    {
        $before = count(glob(sys_get_temp_dir() . '/roster_*') ?: []);

        $paths = [];
        for ($i = 0; $i < 3; $i++) {
            $paths[] = (new RosterTemplate())->build(GradeLevels::all(), ['G7-A']);
        }
        foreach ($paths as $path) {
            // What deleteFileAfterSend() does.
            @unlink($path);
        }

        $this->assertSame($before, count(glob(sys_get_temp_dir() . '/roster_*') ?: []));
    }

    // ------------------------------------------------------------------
    //  The filled-in workbook coming back
    // ------------------------------------------------------------------

    public function test_an_xlsx_roster_imports_and_keeps_twelve_digit_lrns_intact(): void
    {
        $file = $this->workbook(
            ['lrn', 'first_name', 'last_name', 'birthdate', 'grade_level', 'section'],
            [
                // LRN as a NUMBER — the shape that turns into 1.23E+11 in a CSV.
                [123456789012, 'Juan', 'Cruz', 40645, 'Grade 7', 'G7-A'],
            ],
            dateColumn: 3,
        );

        $this->actingAs($this->admin())
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $file])
            ->assertRedirect();

        $this->assertDatabaseHas('lrn_registry', [
            'lrn' => '123456789012',
            'school_id' => $this->school->id,
            'grade_level' => 'Grade 7',
            'section' => 'G7-A',
        ]);

        // 40645 is Excel's serial for 2011-04-12 — read as a date, not a number.
        $this->assertSame('2011-04-12', LrnRegistry::where('lrn', '123456789012')->first()->birthdate->toDateString());
    }

    public function test_an_xlsx_roster_can_register_accounts(): void
    {
        $file = $this->workbook(
            ['lrn', 'first_name', 'last_name', 'birthdate', 'grade_level'],
            [[123456789013, 'Maria', 'Montenegro', '2005-04-12', 'Grade 8']],
        );

        $this->actingAs($this->admin())
            ->post(route('admin.students.import.store'), ['create_accounts' => '1', 'file' => $file])
            ->assertRedirect();

        $student = User::where('lrn', '123456789013')->first();
        $this->assertNotNull($student);
        $this->assertTrue(Hash::check('Montenegro2005', $student->password));
    }

    public function test_a_roster_that_names_a_new_section_adds_it_to_the_schools_list(): void
    {
        $file = $this->workbook(
            ['lrn', 'first_name', 'last_name', 'grade_level', 'section'],
            [
                [123456789014, 'Ana', 'Reyes', 'Grade 9', 'G9-C'],
                // Same section, different casing — must not create a second row.
                [123456789015, 'Ben', 'Reyes', 'Grade 9', 'g9-c'],
                // No grade means no section can be created: a section hangs off a grade.
                [123456789016, 'Cy', 'Reyes', '', 'Orphan'],
            ],
        );

        $this->actingAs($this->admin())
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $file]);

        $this->assertDatabaseHas('sections', [
            'school_id' => $this->school->id,
            'grade_level' => 'Grade 9',
            'name' => 'G9-C',
        ]);
        $this->assertSame(1, Section::where('school_id', $this->school->id)->count());
        $this->assertDatabaseMissing('sections', ['name' => 'Orphan']);
    }

    public function test_csv_rosters_still_import_unchanged(): void
    {
        $tmp = tempnam(sys_get_temp_dir(), 'csv_');
        file_put_contents($tmp, "lrn,first_name,last_name,grade_level,section\n123456789017,Leo,Santos,Grade 7,Mabini\n");
        $file = new UploadedFile($tmp, 'students.csv', 'text/csv', null, true);

        $this->actingAs($this->admin())
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $file])
            ->assertRedirect();

        $this->assertDatabaseHas('lrn_registry', ['lrn' => '123456789017', 'section' => 'Mabini']);
    }

    public function test_a_workbook_that_would_inflate_to_gigabytes_is_refused_not_loaded(): void
    {
        // .xlsx is a zip, so the 10 MB upload cap bounds the COMPRESSED size only.
        // A tiny file must be refused on the zip directory's size figure, before
        // anything is decompressed — otherwise the worker dies on a memory fatal
        // that no try/catch can absorb.
        $path = tempnam(sys_get_temp_dir(), 'bomb_');
        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0"?><Types/>');
        $zip->addFromString('_rels/.rels',
            '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>');
        $zip->addFromString('xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>');
        // ~70 MB of a single repeated byte — compresses to a few KB. Written to
        // disk a megabyte at a time so building the fixture doesn't do the very
        // allocation the reader is supposed to refuse.
        $big = tempnam(sys_get_temp_dir(), 'big_');
        $handle = fopen($big, 'wb');
        $chunk = str_repeat(' ', 1024 * 1024);
        for ($i = 0; $i < 70; $i++) {
            fwrite($handle, $chunk);
        }
        fclose($handle);
        unset($chunk);
        $zip->addFile($big, 'xl/worksheets/sheet1.xml');
        $zip->close();
        @unlink($big);

        $this->assertLessThan(2 * 1024 * 1024, filesize($path), 'the fixture must stay small — that is the point');

        $before = memory_get_usage();
        try {
            XlsxReader::read($path);
            $this->fail('an oversized workbook should have been refused');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('too large', $e->getMessage());
        }
        // Nothing near the part size was ever allocated.
        $this->assertLessThan(10 * 1024 * 1024, memory_get_usage() - $before);

        // And the importer turns it into a readable error instead of a 500.
        $upload = new UploadedFile($path, 'roster.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
        $this->actingAs($this->admin())
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $upload])
            ->assertRedirect()
            ->assertSessionHas('error');

        @unlink($path);
    }

    public function test_a_conditional_formatting_numfmt_cannot_turn_an_lrn_into_a_date(): void
    {
        // <dxf><numFmt> lives in its own id space. Harvesting numFmt document-wide
        // lets it overwrite a real format, after which every cell using that style
        // is misread as a date.
        $path = tempnam(sys_get_temp_dir(), 'dxf_');
        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0"?><Types/>');
        $zip->addFromString('_rels/.rels',
            '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            . '</Relationships>');
        $zip->addFromString('xl/workbook.xml',
            '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
            . ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            . '<sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels',
            '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            . '</Relationships>');
        $zip->addFromString('xl/styles.xml',
            '<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            . '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts>'
            . '<cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs>'
            . '<dxfs count="1"><dxf><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></dxf></dxfs>'
            . '</styleSheet>');
        $zip->addFromString('xl/worksheets/sheet1.xml',
            '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
            . '<row r="1"><c r="A1" t="inlineStr"><is><t>lrn</t></is></c></row>'
            . '<row r="2"><c r="A2" s="1"><v>123456789012</v></c></row>'
            . '</sheetData></worksheet>');
        $zip->close();

        $parsed = XlsxReader::read($path);
        @unlink($path);

        $this->assertSame('123456789012', $parsed['rows'][0]['lrn']);
    }

    public function test_a_birthdate_carrying_a_time_still_reads_as_a_plain_date(): void
    {
        $file = $this->workbook(
            ['lrn', 'first_name', 'last_name', 'birthdate'],
            // 40645.5 — the serial for 2011-04-12 at noon, as a formula would produce.
            [[123456789018, 'Timed', 'Student', 40645.5]],
            dateColumn: 3,
        );

        $this->actingAs($this->admin())
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $file]);

        $this->assertSame(
            '2011-04-12',
            LrnRegistry::where('lrn', '123456789018')->first()->birthdate->toDateString()
        );
    }

    public function test_a_csv_saved_under_an_xlsx_name_still_imports(): void
    {
        // The book importer validates by MIME only, so this is a legitimate upload
        // there; dispatching on the filename would send it to the zip reader and
        // report every column as missing.
        $tmp = tempnam(sys_get_temp_dir(), 'mis_');
        file_put_contents($tmp, "lrn,first_name,last_name,grade_level\n123456789019,Mis,Named,Grade 7\n");
        $file = new UploadedFile($tmp, 'roster.xlsx', 'text/csv', null, true);

        $this->actingAs($this->admin())
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $file])
            ->assertRedirect();

        $this->assertDatabaseHas('lrn_registry', ['lrn' => '123456789019']);
    }

    public function test_an_unsupported_file_type_is_rejected(): void
    {
        $tmp = tempnam(sys_get_temp_dir(), 'pdf_');
        file_put_contents($tmp, '%PDF-1.4 not a roster');
        $file = new UploadedFile($tmp, 'roster.pdf', 'application/pdf', null, true);

        $this->actingAs($this->admin())
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $file])
            ->assertSessionHasErrors('file');
    }
}
