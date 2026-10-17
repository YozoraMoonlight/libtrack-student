<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    /**
     * The batch-import result, but only on the batch-import screen itself.
     *
     * Anywhere else the flash is left untouched rather than consumed, so the
     * admin still sees their student logins when they land back on the import
     * page — and no other page ever receives them in its props.
     */
    protected function importResultFor(Request $request): mixed
    {
        $route = $request->route()?->getName();

        if (!in_array($route, ['admin.students.import', 'librarian.students.import'], true)) {
            return null;
        }

        return $request->session()->get('import_result');
    }

    public function share(Request $request): array
    {
        // Generate a random inspiring quote
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            // Include parent shared data
            ...parent::share($request),
            // Your custom shared data
            'name' => config('app.name'),
            'quote' => [
                'message' => trim($message),
                'author'  => trim($author),
            ],
            'auth' => [
                'user' => $request->user(),
            ],
            'ziggy' => fn(): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            // Share flash messages from the session
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
                'info'    => $request->session()->get('info'),
                // Per-row outcome of a CSV batch upload (counts, skipped rows
                // with reasons, and the generated student logins). Without this
                // the Batch Upload page's result table never rendered.
                //
                // Scoped to the import screen on purpose: this payload contains
                // plaintext default passwords, and a bare session() read here
                // would hand them to whichever page happened to load next.
                'import_result' => $this->importResultFor($request),
            ],
        ];
    }
}
