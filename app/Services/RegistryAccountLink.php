<?php

namespace App\Services;

use App\Models\LrnRegistry;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Ties a Students-page roster row (lrn_registry) to the student account it
 * belongs to.
 *
 * The roster used to find a student's account through the LRN alone, so a
 * student registered WITHOUT an LRN could never be found: their row read
 * "Not registered — Awaiting student signup" forever, account or not.
 * `lrn_registry.user_id` is now the link; the LRN stays a fallback for rows
 * written before the link existed.
 */
class RegistryAccountLink
{
    /**
     * The account behind each roster row, keyed by row id.
     *
     * @param  Collection<int, LrnRegistry>  $rows
     * @return Collection<int, User|null>
     */
    public function accountsFor(Collection $rows, array $with = []): Collection
    {
        $ids = $rows->pluck('user_id')->filter()->unique()->values()->all();
        $lrns = $rows->pluck('lrn')->filter()->unique()->values()->all();

        $users = collect();
        if ($ids || $lrns) {
            $users = User::query()
                ->with($with)
                ->where(function ($q) use ($ids, $lrns) {
                    if ($ids) {
                        $q->orWhereIn('id', $ids);
                    }
                    if ($lrns) {
                        $q->orWhereIn('lrn', $lrns);
                    }
                })
                ->get();
        }

        $byId = $users->keyBy('id');
        $byLrn = $users->filter(fn (User $u) => filled($u->lrn))->keyBy('lrn');

        return $rows->mapWithKeys(fn (LrnRegistry $row) => [
            $row->id => ($row->user_id ? $byId->get($row->user_id) : null)
                ?? ($row->lrn ? $byLrn->get($row->lrn) : null),
        ]);
    }

    public function accountFor(LrnRegistry $row): ?User
    {
        return $this->accountsFor(collect([$row]))->first();
    }

    /** The roster row a student account appears as on the Students page. */
    public function rowFor(User $user): ?LrnRegistry
    {
        return LrnRegistry::where('user_id', $user->id)->first()
            ?? (filled($user->lrn) ? LrnRegistry::where('lrn', $user->lrn)->first() : null);
    }

    /** Point a roster row at an account — one row per account. */
    public function link(LrnRegistry $row, User $user): void
    {
        LrnRegistry::where('user_id', $user->id)->where('id', '<>', $row->id)->update(['user_id' => null]);

        $row->forceFill(['user_id' => $user->id])->save();
    }

    /** The account stopped being a student: its roster row goes back to unregistered. */
    public function detach(User $user): void
    {
        LrnRegistry::where('user_id', $user->id)->update(['user_id' => null]);
    }

    /**
     * Carry an LRN change on a student account over to its roster row.
     *
     * Call BEFORE the account itself is saved (it reads the old LRN). Returns a
     * message for the `lrn` field when the change can't be made, null when the
     * roster side is done.
     */
    public function applyLrnChange(User $user, ?string $newLrn, ?int $schoolId): ?string
    {
        $newLrn = $newLrn !== null && trim($newLrn) !== '' ? trim($newLrn) : null;
        $own = $this->rowFor($user);

        if ($newLrn === null) {
            if ($own) {
                if ($own->lrn !== null && $own->lrn === $user->lrn) {
                    $own->lrn = null;
                }
                // Removing the LRN must not "unregister" the student.
                $own->user_id = $user->id;
                $own->save();
            }

            return null;
        }

        if ($own && $own->lrn === $newLrn) {
            $this->link($own, $user);

            return null;
        }

        $taken = LrnRegistry::where('lrn', $newLrn)->first();

        if (!$taken) {
            if ($own) {
                $own->lrn = $newLrn;
                $own->save();
                $this->link($own, $user);
            }

            return null;
        }

        if ($schoolId !== null && (int) $taken->school_id !== $schoolId) {
            return 'This LRN belongs to a student at another school. Contact the Super Admin to transfer them.';
        }

        $holder = $taken->user_id ?? User::where('lrn', $newLrn)->value('id');
        if ($holder && (int) $holder !== $user->id) {
            return 'This LRN is already registered to another student.';
        }

        // The LRN is already on the roster, still waiting for an account (a
        // batch upload, typically): this student IS that row. Their own row was
        // only the placeholder written when they were registered without it.
        if ($own && $own->id !== $taken->id) {
            if (!$taken->grade_level && $own->grade_level) {
                $taken->grade_level = $own->grade_level;
                $taken->section = $own->section;
                $taken->save();
            }
            $own->delete();
        }

        $this->link($taken, $user);

        return null;
    }

    /**
     * Link the rows and accounts that existed before `user_id` did.
     *
     * Query builder only — this runs from a migration. A row WITH an LRN takes
     * the account carrying that LRN. A row WITHOUT one takes the single student
     * account at the same school with the same name (and the same birthdate
     * when both have one); anything ambiguous is left for staff to sort out.
     */
    public function backfill(): int
    {
        $linked = 0;
        $isLinked = fn (int $userId) => DB::table('lrn_registry')->where('user_id', $userId)->exists();

        DB::table('lrn_registry')->whereNotNull('lrn')->whereNull('user_id')->orderBy('id')
            ->chunkById(500, function ($rows) use (&$linked, $isLinked) {
                $accounts = DB::table('users')->whereIn('lrn', $rows->pluck('lrn')->all())->pluck('id', 'lrn');

                foreach ($rows as $row) {
                    $userId = $accounts[$row->lrn] ?? null;
                    if ($userId && !$isLinked((int) $userId)) {
                        DB::table('lrn_registry')->where('id', $row->id)->update(['user_id' => $userId]);
                        $linked++;
                    }
                }
            });

        DB::table('lrn_registry')->whereNull('lrn')->whereNull('user_id')->orderBy('id')
            ->chunkById(500, function ($rows) use (&$linked) {
                foreach ($rows as $row) {
                    $candidates = DB::table('users')
                        ->where('user_role', 'user')
                        ->where('school_id', $row->school_id)
                        ->where(fn ($q) => $q->whereNull('lrn')->orWhere('lrn', ''))
                        ->whereRaw('lower(trim(name)) = ?', [mb_strtolower(trim((string) $row->name))])
                        ->whereNotExists(fn ($s) => $s->selectRaw('1')->from('lrn_registry as linked')->whereColumn('linked.user_id', 'users.id'))
                        ->get(['id', 'birthdate']);

                    if ($row->birthdate) {
                        $day = substr((string) $row->birthdate, 0, 10);
                        $candidates = $candidates->filter(fn ($u) => $u->birthdate === null || substr((string) $u->birthdate, 0, 10) === $day);
                    }

                    if ($candidates->count() === 1) {
                        DB::table('lrn_registry')->where('id', $row->id)->update(['user_id' => $candidates->first()->id]);
                        $linked++;
                    }
                }
            });

        return $linked;
    }
}
