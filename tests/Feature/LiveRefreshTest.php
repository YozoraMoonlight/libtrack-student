<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ReadOnlySessionForLiveRefresh;
use App\Models\Book;
use App\Models\Category;
use App\Models\School;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

/**
 * Reported: "real time — every transaction, no refresh needed."
 *
 * Open pages re-fetch their own data in the background. These cover the server
 * half: a refresh returns fresh data without the shared props, and it can never
 * clobber the session of an action (borrow/return) made at the same moment.
 */
class LiveRefreshTest extends TestCase
{
    use RefreshDatabase;

    /** Runs one request through the middleware and saves the session, as StartSession would. */
    private function runRequest(Store $session, array $headers = []): void
    {
        $request = Request::create('/librarian/circulation/return', 'GET');
        foreach ($headers as $name => $value) {
            $request->headers->set($name, $value);
        }
        $request->setLaravelSession($session);

        (new ReadOnlySessionForLiveRefresh())->handle($request, fn () => new Response());

        $session->save();
    }

    private function sessionFrom(ArraySessionHandler $handler, string $id): Store
    {
        $session = new Store('libtrack_session', $handler, $id);
        $session->start();

        return $session;
    }

    public function test_a_live_refresh_does_not_consume_or_overwrite_a_pending_flash(): void
    {
        $handler = new ArraySessionHandler(120);
        $id = Str::random(40);

        // The return action: flashes its message for the page it redirects to.
        $action = $this->sessionFrom($handler, $id);
        $action->flash('success', 'Book returned successfully.');
        $action->save();

        // A background refresh lands between the POST and the redirected GET.
        $this->runRequest($this->sessionFrom($handler, $id), [ReadOnlySessionForLiveRefresh::HEADER => '1']);

        // The redirected page still gets the message.
        $page = $this->sessionFrom($handler, $id);
        $this->assertSame('Book returned successfully.', $page->get('success'));
    }

    /**
     * The control for the test above: the same interleaving WITHOUT the header.
     * Laravel ages flash at the end of the POST, so any one request in between
     * consumes it — which is exactly how a background refresh used to eat the
     * message meant for the redirected page. Ordinary requests keep doing so.
     */
    public function test_without_the_header_a_request_in_between_consumes_the_flash(): void
    {
        $handler = new ArraySessionHandler(120);
        $id = Str::random(40);

        $action = $this->sessionFrom($handler, $id);
        $action->flash('success', 'Book returned successfully.');
        $action->save();

        $this->runRequest($this->sessionFrom($handler, $id));

        $this->assertNull($this->sessionFrom($handler, $id)->get('success'));
    }

    public function test_the_header_is_ignored_on_writes(): void
    {
        $handler = new ArraySessionHandler(120);
        $id = Str::random(40);
        $session = $this->sessionFrom($handler, $id);

        $request = Request::create('/admin/circulation/return', 'POST');
        $request->headers->set(ReadOnlySessionForLiveRefresh::HEADER, '1');
        $request->setLaravelSession($session);
        (new ReadOnlySessionForLiveRefresh())->handle($request, fn () => new Response());

        $session->flash('success', 'Book returned successfully.');
        $session->save();

        $this->assertSame('Book returned successfully.', $this->sessionFrom($handler, $id)->get('success'));
    }

    public function test_an_open_return_desk_picks_up_a_students_return_request_on_its_next_refresh(): void
    {
        $school = School::create(['code' => 'LIV', 'name' => 'Live High', 'is_active' => true]);
        $make = fn (string $email, string $role) => User::create([
            'name' => ucfirst(strtok($email, '@')),
            'email' => $email,
            'password' => Hash::make('Password123!'),
            'user_role' => $role,
            'school_id' => $school->id,
            'is_active' => true,
        ]);
        $librarian = $make('desk@test.io', 'librarian');
        $student = $make('student@test.io', 'user');
        $book = Book::create([
            'title' => 'Basic Java',
            'author' => 'DepEd',
            'category_id' => Category::create(['name' => 'Tech'])->id,
            'school_id' => $school->id,
            'total_copies' => 1,
            'available_copies' => 1,
            'status' => 'available',
        ]);
        $loan = app(CirculationService::class)->borrowBook($student->id, $book->id);

        $refresh = fn () => $this->actingAs($librarian)->get(route('librarian.circulation.return'), [
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request()),
            'X-Inertia-Partial-Component' => 'Admin/Circulation/Return',
            'X-Inertia-Partial-Except' => 'auth,flash,name,quote,ziggy',
            ReadOnlySessionForLiveRefresh::HEADER => '1',
        ]);

        $refresh()->assertOk()->assertJsonPath('props.transactions.0.return_requested_at', null);

        $this->actingAs($student)->post(route('user.borrowings.return-request'), ['transaction_id' => $loan->id]);

        $response = $refresh()->assertOk();
        $this->assertNotNull($response->json('props.transactions.0.return_requested_at'));
        // Shared props stay on the client as they were — a refresh never clears a flash.
        $this->assertArrayNotHasKey('flash', $response->json('props'));
        $this->assertArrayNotHasKey('auth', $response->json('props'));
    }
}
