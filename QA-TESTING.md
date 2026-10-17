# LIBTRACK — Gabay sa Pag-test ng Bagong Features

Heto yung gagawin mo bukas para ma-check natin lahat ng bagong feature na nakapasok. Bawat section binigyan ko ng URL, ng ilalagay mo, at ng dapat mangyari. Yung mga lumang sirang tests sa `tests/Feature/Auth/*` — wag mo na pansinin yan, sira na yan dati pa at hindi natin gawa.

---

## 1. Pang-umpisa (setup)

Sa terminal, sa loob ng project folder:

```bash
php artisan migrate         # kapag may bago pang migrations na hindi pa naka-run
php artisan db:seed         # ito ang magbibigay sa'yo ng default test users
npm run build               # o `npm run dev` sa ibang terminal kung gusto mo live updates
php artisan serve           # buksan sa http://localhost:8000
```

**Tip sa OTP:** Pag walang `IPROG_SMS_API_TOKEN` sa `.env` (na hindi nga dapat naka-set sa dev), automatic ipapakita ng OTP service yung 6-digit code mo bilang **flash message sa taas ng registration page** (tingnan ang `OtpService.php:52` — naka-show lang yung debug code kapag `APP_ENV=local` at walang SMS config). Ibig sabihin, hindi mo na kailangan ng totoong cellphone para makapag-test ng OTP — basta tingnan mo lang yung **orange box** sa screen, andoon yung code.

---

## 2. Mga Test Account

Heto yung mga ready na users galing sa `UserSeeder`:

| Role          | Email                  | Password   | School |
| ------------- | ---------------------- | ---------- | ------ |
| admin         | admin@gmail.com        | password   | —      |
| librarian     | librarian@gmail.com    | password   | LNHS   |
| user          | student@gmail.com      | password   | LNHS   |
| user          | student2@gmail.com     | password   | LNHS   |
| user          | student3@gmail.com     | password   | XUHS   |

Wala pang super admin sa seeder. Gawa ka muna ng isa gamit ang tinker:

```bash
php artisan tinker --execute="
use App\Models\User;
use Illuminate\Support\Facades\Hash;
User::updateOrCreate(
  ['email' => 'super@gmail.com'],
  ['name' => 'Super Admin', 'password' => Hash::make('password'),
   'user_role' => 'super_admin', 'is_active' => true]
);
echo 'OK';
"
```

Para sa LRN tests, kailangan din natin ng test data sa `lrn_registry`:

```bash
php artisan tinker --execute="
use App\Models\LrnRegistry;
use App\Models\School;
\$s = School::where('code','LNHS')->first();
LrnRegistry::updateOrCreate(
  ['lrn' => '123456789012'],
  ['name' => 'Test Enrollee', 'school_id' => \$s->id, 'enrollment_status' => 'enrolled']
);
LrnRegistry::updateOrCreate(
  ['lrn' => '999999999999'],
  ['name' => 'Not Enrolled Person', 'school_id' => \$s->id, 'enrollment_status' => 'not_enrolled']
);
echo 'OK';
"
```

Yung first LRN — para may pwede mag-register. Yung second LRN — para makita kung talagang ina-block ng system yung hindi enrolled.

---

## 3. Mga Test Bawat Feature

### 3.1 Apat na Magkakaibang Login at Dashboard (per-role portals)

May iba't ibang pinto ng pag-login para sa bawat role para malinis at hindi nagsasalubong ang access.

#### 3.1.1 Tingnan kung tama yung itsura ng bawat login page

Buksan ang bawat URL sa incognito window:

| URL                    | Ano dapat makita                                         |
| ---------------------- | -------------------------------------------------------- |
| `/student/login`       | Amber/dilaw na "Student portal", may dalawang panel       |
| `/admin/login`         | Madilim, pulang "Admin Portal — Restricted Access" card  |
| `/librarian/login`     | Teal (asul-berde) na "Librarian portal"                  |
| `/superadmin/login`    | Itim na background, dilaw na "Super Admin Portal" with crown icon |
| `/login`               | Dapat nire-redirect agad sa `/student/login`             |

Magkakaiba talaga ang kulay at design. Pag pareho lang ng itsura, may mali.

#### 3.1.2 Tamang account sa tamang portal → tamang dashboard

| Mag-login as         | Saang portal      | Dadalhin ka sa          | Itsura ng dashboard |
| -------------------- | ----------------- | ----------------------- | ------------------- |
| student@gmail.com    | /student/login    | `/student/dashboard`    | Amber sidebar; may QR code mo |
| librarian@gmail.com  | /librarian/login  | `/librarian/dashboard`  | Teal sidebar "Librarian Desk"; may quick actions (Issue book, Process return, Students master list) |
| admin@gmail.com      | /admin/login      | `/admin/dashboard`      | Amber sidebar with Schools at Users nav |
| super@gmail.com      | /superadmin/login | `/superadmin/dashboard` | Itim na sidebar; may cross-school stats |

Makikita mo, magkakaiba talaga ang dashboard ng bawat role — hindi pareho ang laman.

#### 3.1.3 Tamang account pero maling portal — dapat hindi pumapasok

Subukan ito para makita na talagang naka-secure:

| Mag-login as       | Sa anong portal       | Dapat mangyari |
| ------------------ | --------------------- | -------------- |
| admin@gmail.com    | `/student/login`      | Bababalik sa `/admin/login` na may error flash |
| librarian@gmail.com| `/student/login`      | Bababalik sa `/librarian/login` na may error flash |
| super@gmail.com    | `/student/login`      | Bababalik sa `/superadmin/login` na may error flash |
| student@gmail.com  | `/admin/login`        | Inline error: "This portal is for school administrators only" |
| super@gmail.com    | `/admin/login`        | Inline error: "Super admins must sign in through the Super Admin Portal" |
| student@gmail.com  | `/librarian/login`    | Inline error: "This portal is for librarians only" |
| admin@gmail.com    | `/superadmin/login`   | Inline error: "This portal is for the platform super admin only" |

Sa lahat ng test na ito — dapat hindi sila nakapasok. Naka-logged out pa rin sila.

#### 3.1.4 Naka-login na, pero pumupunta pa sa login page

Habang naka-login as librarian, buksan mo ang `/admin/login`. Dapat dalhin ka agad sa `/librarian/dashboard` — kasi naka-login ka na nga, di mo na kailangan mag-login ulit. Same idea para sa student, admin, super admin.

#### 3.1.5 Hindi nagsasalubong yung sidebar ng iba't ibang role

Habang librarian ka, buksan mo ang `/admin/dashboard`. Dadalhin ka agad sa `/librarian/dashboard`. Tapos buksan mo `/admin/books` — pupunta ka sa `/librarian/books`, at makikita mo na **teal** yung sidebar (kasi nag-de-dispatch yung admin-layout sa LibrarianLayout pag librarian yung naka-login).

Habang student ka naman, buksan mo `/admin/dashboard` — dapat tinatanggal ka. Buksan mo `/student/dashboard` — pumasok dapat.

---

### 3.2 LRN System (₱1,000) — DepEd LRN para sa registration

#### 3.2.1 LRN search para sa admin/librarian

1. Mag-login as admin o librarian.
2. Buksan sa browser: `/admin/lrn/search?q=Test` o `/librarian/lrn/search?q=Test`. Lalabas dapat ang mga matching enrollees galing sa LRN registry.
3. Buksan: `/admin/lrn/lookup?lrn=123456789012`. Dapat may JSON response na may pangalan + school ng test enrollee.
4. Subukan ang `/admin/lrn/lookup?lrn=000000000000` (walang ganitong LRN) — dapat 404 yan na may dahilan.

#### 3.2.2 Pag-register na may LRN check

1. Mag-logout. Buksan ang `/register`.
2. Step 1: ilagay yung LRN `123456789012`, click yung search button. Dapat lumabas ang **green panel** na "Student found" with name + school.
3. Subukan yung LRN `999999999999` (yung not_enrolled na seed) — error dapat: "enrollment status not enrolled".
4. Subukan yung LRN `000000000000` (wala sa registry) — error: "not in registry".
5. Pag valid yung LRN, fill in mo email/phone/password, submit. Tingnan ang **orange flash message** sa taas — andoon yung 6-digit OTP code.
6. Step 2: maling code → error. Tamang code → ma-create yung user (`user_role = 'user'`), at dadalhin ka sa `/student/dashboard`.

---

### 3.2.3 Sections (BAGO) — CRUD ng mga klase

> **Bakit ito.** Dati, `section` ay free text — kaya pumapasok ang `G7-A`, `g7 a`
> at `G7 - A` bilang tatlong magkaibang section. Ngayon ang school admin ang
> gumagawa ng listahan, at yun na lang ang mapipili kahit saan.

1. Mag-login as school admin. May bagong **Sections** sa sidebar (sa ilalim ng Students).
   Buksan ang `/admin/sections`.
2. **Add:** pumili ng Grade Level (dropdown, Grade 7–12), i-type ang pangalan (hal. `G7-A`),
   pindutin ang **Add Section**. Dapat lumabas agad sa table.
3. Subukan ang mga dapat ma-reject:
   - Parehong grade + parehong pangalan (kahit ibang case, hal. `g7-a`) → error na
     *"Grade 7 already has a section called …"*.
   - Parehong pangalan pero **ibang grade** (`Grade 8` + `G7-A`) → **dapat pumasa** ito;
     magkaibang klase yan.
   - Pangalan na may junk (`<script>`) → error.
4. **Rename:** pindutin ang lapis. Palitan ang pangalan o ang grade, i-save.
   **Ang mga estudyante sa section na yun ay sumasama sa bagong pangalan** —
   i-check sa `/admin/students`.
5. **Move students:** yung section na may laman, may **↔ button**. Pindutin → lalabas ang
   isang row sa ilalim: pumili ng ibang section (o **No section**), pindutin ang **Move**.
   - Paglipat sa ibang section, **sumasama rin ang grade level** ng mga estudyante.
   - Paglipat sa **No section**, hindi nagbabago ang grade nila — wala lang silang klase.
   - Hindi ka makakapili ng section ng ibang school.
6. **Delete:** yung section na may laman, naka-**disable** ang basurahan (may tooltip kung
   bakit). I-move mo muna ang mga estudyante gamit ang ↔, tapos madi-delete na siya.
7. **Ibang school:** hindi mo makikita o mababago ang section ng ibang paaralan.
   (Kung may access ka sa dalawang admin account, subukan ang ID ng isa sa URL ng isa pa —
   dapat 403.)

Automated cover: `tests/Feature/SectionManagementTest.php`.

---

### 3.3 Batch Upload (₱1,000) — roster import

May tatlong import: books, students, at LRN registry.

#### 3.3.1 Books CSV upload

1. Mag-login as admin o librarian.
2. Buksan ang `/admin/books/import` (o `/librarian/books/import`).
3. I-download yung sample CSV mismo galing sa page.
4. Edit mo yung CSV: isang row gawing valid, isa naman gawing sira sinasadya (walang title, copies = 0, o duplicate ISBN).
5. I-upload. Dapat sabihin ng page kung ilan yung `imported / skipped / errors` plus row numbers + dahilan kung bakit naskip. Yung valid books — makikita sa `/admin/books`.

#### 3.3.2 Students CSV upload — DIREKTANG NAKA-REGISTER NA

> **Binago ito.** Dati, ang upload ay nagdadagdag lang ng row sa `lrn_registry` —
> wala pa ring account ang estudyante at hindi pa siya makaka-login. Ngayon,
> **gumagawa na rin ito ng totoong account** bawat estudyante.

1. Mag-login as school admin. Buksan ang `/admin/students/import`.
2. **BAGO — i-download ang Excel template** (yung itim na button na "Excel template").
   `.xlsx` ito, hindi CSV, kasi **hindi kayang magkaroon ng dropdown ang isang CSV cell**.
   Buksan mo sa Excel:
   - Dalawang sheet: **Students** (dito ka magta-type) at **Guide** (listahan ng valid
     values + halimbawa). Walang laman ang Students maliban sa header — sadya yun,
     para walang halimbawang estudyante ang ma-import nang hindi sinasadya.
   - Pindutin ang isang cell sa ilalim ng **grade_level** → dapat may **dropdown arrow**,
     at Grade 7–12 lang ang laman. Subukan mag-type ng `Kinder` → **tatanggihan ng Excel**.
   - Ganoon din ang **section** (yung mga section na ginawa mo sa `/admin/sections`) at ang
     **enrollment_status**.
   - Yung **lrn** column, naka-**Text** na — kaya hindi na magiging `1.23E+11` ang
     12-digit LRN. Wala nang manual na pag-format.
   - Punan mo ang Students sheet, i-save bilang `.xlsx`, i-upload nang buo. Basahin ng
     importer ang **unang sheet** lang.
3. Kung sariling CSV ang gagamitin mo, puwede pa rin — pindutin ang **CSV sample**. Ang mga column:
   `lrn, first_name, middle_name, last_name, birthdate, grade_level, section, enrollment_status, email`
   - **Kailangan:** `first_name`, `last_name`, at `birthdate` (kapag nagre-register ng account).
   - `birthdate` ay `YYYY-MM-DD`. **Ito ang pinagmumulan ng password:** apelyido + taon ng kapanganakan,
     halimbawa `Montenegro2005`.
   - `email` puwedeng blangko — gagawa ang sistema ng `<lrn>@student.libtrack.local`.
4. **Grade Level dropdown** sa page (para sa buong file):
   - Pumili ng grade → mapupunan ang mga row na **blangko** ang `grade_level`.
   - Tsekan ang **Apply to all rows** → papalitan ang lahat, kahit may laman ang CSV.
   - Kapag walang piniling grade pero naka-check ang override → may error, hindi tutuloy.
5. **Register accounts directly** checkbox — naka-on by default. Alisin ito kung gusto mong
   idagdag lang sa registry (dating ugali).
6. I-upload. Dapat makita:
   - **Student logins** table: pangalan, LRN, login email, at password bawat bagong account,
     may **Copy** at **Download CSV**. *I-save ito agad — isang beses lang ito lalabas.*
   - **Import Result**: bilang ng naidagdag sa registry, bilang ng naparehistrong account,
     at bawat na-skip na row na may dahilan.
7. Subukan ang mga sadyang sirang row — dapat may malinaw na dahilan bawat isa:
   - walang `birthdate` → *"birthdate is required — the student's password is their surname + birth year."*
   - `grade_level` na `Kinder` → *"grade_level must be one of: Grade 7, Grade 8, …"*
   - LRN na hindi 12 digits, LRN na may account na, o email na gamit na.
8. **Bagong section sa roster:** kung may row na naka-`Grade 9` + `G9-C` na wala pa sa
   `/admin/sections`, **awtomatikong maidadagdag** ito doon pagkatapos ng import — hindi
   itatapon ang buong file dahil lang sa isang bagong klase. Tingnan mo sa Sections page.
9. **Patunayan na totoo ang account:** kunin ang isang estudyante sa credentials table,
   mag-logout, tapos mag-login sa `/student/login` gamit ang **LRN** (hal. `111111111111`)
   at ang password (hal. `Montenegro2005`). Dapat pumasok sa student dashboard.
   Gumagana rin ang generated email bilang username.

Automated cover: `tests/Feature/StudentDirectRegistrationTest.php`,
`tests/Feature/RosterTemplateTest.php` (template dropdowns + `.xlsx` upload).

#### 3.3.2b Manual Register — may Birthdate na

1. Buksan ang `/admin/students/manual-register`.
2. May bagong **Birthdate** field, required.
3. Habang pinupunan mo ang **Last Name** at **Birthdate**, kusang napupuno ang **Password** ng
   apelyido + taon (hal. `Montenegro2005`), at may berdeng paalala sa ilalim nito.
4. Puwede mo pa ring palitan ang password — kapag ginalaw mo, hindi na ito ove-overwrite,
   at may **Reset to …** link para bumalik sa auto na halaga.
5. **Grade Level** ay dropdown na (Grade 7–12); walang free text.
6. **Section ay dropdown na rin (BAGO)** — hindi na text box:
   - Bago ka pumili ng grade, lalabas ang lahat ng section na naka-label na
     `Grade 7 – G7-A`. Pag pumili ka, **kusang mase-set din ang Grade Level**.
   - Pag may napiling grade ka na, yung mga section ng grade na yun lang ang laman.
   - Pag pinalitan mo ang grade, **nabubura ang section** kung hindi na siya kabilang doon.
   - Kung walang section ang school mo, naka-disable ang dropdown at may link papuntang
     **Sections** page.
   - May **No section** na option kung wala pang naka-assign na klase.
   - Server-side check din ito: kahit i-post mo ang isang section na wala sa listahan
     (o galing sa ibang school, o ibang grade), tatanggihan.
7. Kapag may LRN na nasa registry, pindutin ang **Lookup** — mapupunan din ang birthdate
   mula sa registry, at kasabay nito ang password. Ang lumang section na nakasulat sa
   registry ay ise-set lang kung tugma pa siya sa isang totoong section.

#### 3.3.3 LRN Registry upload (super admin lang)

1. Mag-login as super admin.
2. Buksan ang `/superadmin/lrn-registry/import`.
3. Mag-upload ng CSV na may columns: `lrn,name,school_code,grade_level,section,enrollment_status`.
4. Yung sira (LRN hindi 12 digits, school_code walang match) — i-rereport yan; valid rows ipapasok sa DB.

---

### 3.4 Super Admin + Roles (₱1,000)

#### 3.4.1 Tingnan kung kompleto yung super admin tools

Mag-login as super admin, tapos buksan ang:

- `/superadmin/dashboard` → cross-school stats + table per school.
- `/superadmin/school-admins` → list ng school admins; may Create button.
- `/superadmin/school-admins/create` → mag-create ng bagong school admin (name/email/password/school). Dapat lumabas siya sa list, at pwede mong i-toggle active/inactive.
- `/superadmin/lrn-registry` → makikita mo dito lahat ng LRN registry rows; pwedeng i-edit at delete.

#### 3.4.2 School-scoping ng admin

Mag-login as the new school admin na ginawa mo, buksan ang `/admin/students` — students lang ng kanilang school dapat lumalabas. Hindi makikita yung students ng ibang school.

#### 3.4.3 Naka-block kapag mali ang role

Habang librarian ka, subukan mo buksan ang `/superadmin/dashboard` directly — dapat hindi ka makapasok (403 o redirect away).

Habang student ka, subukan mo `/admin/dashboard` — dapat din hindi ka makapasok.

---

### 3.5 Credential Hold (₱1,000) — paghihinto ng student account

Pag may unpaid fines o sobrang overdue books, automatic mailalagay yung student sa "hold" — at habang naka-hold sila, **hindi sila makaka-login at hindi makakahiram ng libro**.

#### 3.5.1 Auto-hold sa unpaid fines

1. Mag-login as librarian; buksan ang `/librarian/fines`. Mag-create ng fine para kay `student@gmail.com` na ₱100 (mas mataas kaysa sa ₱50 threshold).
2. Buksan ang `/librarian/credential-holds`. Dapat may bagong active hold para sa student na yan, dahilan: "Unpaid fines (₱100.00)".

#### 3.5.2 Manual na pag-hold + release

1. Sa `/librarian/credential-holds`, click yung "Place hold" button, lagyan ng dahilan tulad ng "Lost ID card", submit.
2. Tapos i-release naman gamit yung "Release" button. Tingnan kung naka-fill na yung `released_at` at `released_by`.

#### 3.5.3 BAGO — Naka-hold na student, hindi makakapag-login

1. Habang on-hold pa rin yung student@gmail.com, mag-logout ka.
2. Subukan mong mag-login sa `/student/login` gamit ang student account na yun.
3. Dapat hindi makapasok — makikita mo ang **red error message**: "Your account is on hold: <reason>. Please settle outstanding fines or returns at the library." Hindi siya naka-login.

#### 3.5.4 BAGO — Naka-hold na student, hindi makakahiram ng libro

1. Habang naka-hold pa, mag-login as librarian, subukan mo i-issue/borrow ng libro yung student via `/librarian/circulation/borrow`.
2. May error dapat: "Cannot borrow: account on hold — <reason>. Release the hold before borrowing."

#### 3.5.5 Auto-release pag clear na

1. Sa `/librarian/fines`, mark yung fine as "paid".
2. Buksan ulit ang `/librarian/credential-holds` — dapat naging `released` na yung hold, at may auto-release note. Pwede na ulit mag-login at mag-borrow yung student.

---

### 3.6 Manual Registration + Enrollment Guard (₱1,000)

Para sa mga estudyanteng nasa LRN registry pero hindi makapag-register sa sarili — pwede silang i-register manually ng admin o librarian.

#### 3.6.1 Manual register ng student

1. Mag-login as admin o librarian.
2. Buksan ang `/admin/students/manual-register` (o `/librarian/...`).
3. Mag-search sa LRN registry sa pangalan o LRN. Pumili ng valid `enrolled` na entry.
4. Fill email + phone + password, submit. Lalabas yung bagong student sa `/admin/students` na `is_active = true`.

#### 3.6.2 Hindi pwede yung not-enrolled

1. Subukan mo gamitin yung LRN `999999999999` (yung not_enrolled na seed).
2. May error dapat — hindi ma-create yung student.
3. Subukan din ng walang sa registry — same outcome.

#### 3.6.3 Public register guard (covered na sa 3.2.2)

Same `validateEnrolled` check ang ginagamit sa public registration din.

---

### 3.7 QR Code — isa bawat PHYSICAL COPY (₱500)

> **Binago ito.** Dati **iisang QR code lang** ang buong titulo, kaya pareho ang
> QR ng Copy 1 at Copy 2 ng "English 7". Puwedeng isauli ni Student 1 ang copy
> ni Student 2 at matatanggap iyon laban sa sarili niyang hiram. Ngayon
> **bawat pisikal na kopya ay may sariling QR code at accession number**
> (`ACC-00012-002`), at naka-record sa hiraman kung aling kopya ang lumabas.

#### 3.7.1 May sariling QR code bawat kopya

1. Mag-login as librarian. Buksan ang `/librarian/books/<id>` — may **Physical copies** table
   na naglilista ng bawat kopya: accession number, status, at kung sino ang may hawak.
2. Click **Manage & print labels** → `/librarian/books/<id>/copies`.
   Dapat may hiwalay na QR image bawat kopya, at **magkaiba ang bawat isa**.
3. Click **Print all labels** — lalabas ang print sheet na QR labels lang (naka-hide ang ibang UI).
   Idikit ang tamang label sa tamang pisikal na libro.
4. **Download QR** bawat kopya: `/librarian/books/<id>/copies/<copyId>/qr-code`.

#### 3.7.2 Borrow — tinatakda kung aling kopya ang lumabas

1. Buksan ang `/librarian/circulation/borrow`.
2. Pumili ng libro — lalabas ang **Copy** dropdown na naglilista lang ng mga
   kopyang nasa shelf. Kapag iniwang blangko, ang pinakamababang libreng kopya
   ang awtomatikong ibibigay.
3. Click **Scan QR** at i-scan (o i-paste) ang `LIBTRACK:COPY:<uuid>` ng isang kopya —
   dapat mapili nito nang sabay ang libro **at** ang eksaktong kopya.
4. Kumpirmahin. Sa `/librarian/circulation` makikita ang accession number ng kopya.

#### 3.7.3 REGRESSION — bawal isauli ang kopya ng iba

Ito ang mismong bug na inayos:

1. Kumuha ng libro na may **2 kopya**. Pahiramin si **Student 1 ng Copy 1** at si
   **Student 2 ng Copy 2**.
2. Pumunta sa `/librarian/circulation/return`. Click **Scan Copy QR** at i-paste ang
   `LIBTRACK:COPY:<uuid ng Copy 2>`.
3. **Inaasahan:** ang na-highlight ay ang hiram ni **Student 2**, hindi ni Student 1 —
   at malinaw na nakasulat kung sino ang nanghiram.
4. Kung pipiliting isauli ang Copy 2 laban sa hiram ni Student 1, tatanggihan ng server:
   *"Wrong copy. You scanned ACC-…-002, but this loan was issued on ACC-…-001 to Student 1."*
   Dapat **walang nagbago**: bukas pa rin ang dalawang hiram at nasa labas pa rin ang dalawang kopya.
5. I-scan ang tamang kopya — dapat matanggap, at bumalik sa `available` ang kopyang iyon lang.

#### 3.7.4 Kailangan ng scan bago tanggapin ang sauli

1. Sa `/librarian/circulation/return`, pindutin agad ang **Return (no scan)** ng isang hiram
   nang walang na-scan. May babala munang lalabas na hindi ma-veverify ang kopya.
2. Kanselahin muna — dapat walang nangyari.
3. Ulitin at pumayag. Tatanggapin ito, pero **naka-tala** sa transaction notes ang
   *"Returned without QR verification …"* kasama ang inaasahang accession number.
   Tingnan sa `/librarian/circulation/<id>`.
4. Ito ang tanging paraan para makasauli nang walang scan (para sa sirang label) — hindi
   ito ang default, at may bakas.

#### 3.7.5 Kailangang piliin ang kopya bago mahiram

1. Sa `/librarian/circulation/borrow`, pumili ng student at libro pero **huwag** pumili ng Copy.
2. Dapat naka-disable ang **Confirm Borrow**. Hindi puwedeng hulaan ng sistema kung aling
   pisikal na libro ang iniabot — kung mali ang naitala, mabibigo ang scan sa pagsauli.

Automated cover: `tests/Feature/BookCopyCirculationTest.php`.

> **Paalam sa mga lumang label:** ang mga QR na naka-print bago ang pagbabagong ito
> ay tumuturo na ngayon sa **Copy 1** ng bawat titulo. I-print at idikit ang mga
> bagong per-copy label para maging kakaiba ang bawat pisikal na libro.

---

### 3.8 BAGO — Librarian OTP SMS Self-Registration

May option na ngayon para mag-register mismo yung librarian, pero may OTP verification para sigurado tunay siya.

1. Mag-logout. Buksan ang `/register`.
2. Click yung **"Librarian"** tab sa taas (kasama yung "Student" tab).
3. Fill in: full name, school (galing dropdown), email, phone, password + confirm. Submit.
4. Tingnan yung **orange "Dev OTP"** flash message para sa 6-digit code (since walang SMS provider sa dev).
5. Step 2: maling code → error. Tamang code → ma-create yung user (`user_role = 'librarian'`), dadalhin ka sa `/librarian/dashboard`.
6. Mag-logout, tapos mag-login ulit sa `/librarian/login` para makita kung working talaga yung credentials.

---

## 4. Iba pang dapat i-check (edge cases)

Habang nag-te-test ka, sanity-check din ito:

- **Disabled student** — i-set mo via tinker ang `is_active = false` sa isang student, tapos subukan mo mag-login sa `/student/login`. Dapat hindi pumasok with error "Your account has been disabled".
- **Disabled librarian** — same, sa `/librarian/login`.
- **Lumang URLs** — `/login` → `/student/login`; `/dashboard` (kapag naka-login as student) → `/student/dashboard`.
- **Logout galing kahit anong role** — `/logout` dapat dalhin ka pabalik sa `/` (home page).
- **Settings link** — bawat role may sariling settings page: `/admin/settings`, `/librarian/settings`, `/user/settings`.
- **School isolation** — mag-login as the LNHS librarian; sa `/librarian/students` dapat hindi makita yung students from XUHS (ibang school).

---

## 5. Automated tests (gusto mo lang i-run yung mga test, walang manual click-click)

May binuong test file na `tests/Feature/RolePortalsTest.php` na covers 39 test cases — lahat ng nasa itaas (login pages, tama at maling credentials, hold gates, OTP register, dashboard access, GuestMiddleware redirects).

Para patakbuhin:

```bash
# build muna ang assets para sa Inertia
npm run build

# yung bago naming portal/feature suite — dapat 39 / 39 pasado
php artisan test --filter "RolePortalsTest"

# pati ito, na-update din kasama nito
php artisan test --filter "BookCrudTest"
```

Yung ibang failing tests sa repo (`Auth\AuthenticationTest`, `Settings\*`, `UserFinesAndRemindersTest`) — hindi galing dito. Sira na sila dati pa kasi sumusunod sila sa lumang Laravel Breeze scaffold routes na hindi naman naka-set up dito sa LIBTRACK. Wag mo na pansinin.

---

## 6. Saan tumingin pag may mali

| Anong nangyari (symptom)                            | Tingnan dito                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| Maling portal yung dinadalhan ng login              | `app/Http/Controllers/Auth/*LoginController.php`, `GuestMiddleware`   |
| Naka-hold na student pero nakakapasok pa            | `LoginController::store`, `CirculationService::borrowBook`            |
| Maling LRN lookup o guard                           | `LrnRegistryService`, `RegisterController::lookupLrn`/`initiate`      |
| Mukhang admin pa rin yung librarian dashboard       | `admin-layout.tsx` dispatch sa `LibrarianLayout`, `librarian-layout.tsx` |
| Vite manifest error sa tests                        | I-rerun ang `npm run build`                                           |
| Nawawala yung column sa DB                          | `php artisan migrate:status`, tapos `php artisan migrate`             |

---

Pag may natitisod kang feature na hindi gumagana ayon sa list na ito — tandaan mo lang yung exact URL, anong klaseng account ginagamit mo, at anong message lumabas. Mas madali ayusin kung may screenshot pa.

Good luck bukas.
