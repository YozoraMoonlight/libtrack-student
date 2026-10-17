import { PasswordChecklist } from '@/components/password-checklist';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/layouts/admin-layout';
import { Head, useForm } from '@inertiajs/react';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface User {
    name: string;
    email: string;
}

interface SettingsProps {
    user: User;
    success?: string;
}

export default function AdminSettings({ user, success }: SettingsProps) {
    const [activeTab, setActiveTab] = useState('profile');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Profile update form
    const profileForm = useForm({
        name: user.name,
        _method: 'PUT',
    });

    // Password update form
    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
        _method: 'PUT',
    });

    const updateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        profileForm.post(route('admin.settings.updateProfile'));
    };

    const updatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        passwordForm.post(route('admin.settings.updatePassword'));
    };

    return (
        <AdminLayout user={user}>
            <Head title="Settings" />
            
            <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Settings
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Manage your account settings and change your password
                    </p>
                </div>

                {success && (
                    <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-8 grid w-full grid-cols-2">
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="password">Password</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>
                                    Update your account's profile information and email address.
                                </CardDescription>
                            </CardHeader>

                            <form onSubmit={updateProfile}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            value={profileForm.data.name}
                                            onChange={(e) => profileForm.setData('name', e.target.value)}
                                            disabled={profileForm.processing}
                                        />
                                        {profileForm.errors.name && (
                                            <p className="text-sm text-red-500">{profileForm.errors.name}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            value={user.email}
                                            disabled
                                            className="bg-gray-50 dark:bg-gray-800"
                                        />
                                        <p className="text-sm text-gray-500">
                                            Email cannot be changed
                                        </p>
                                    </div>
                                </CardContent>

                                <CardFooter>
                                    <Button
                                        type="submit"
                                        disabled={profileForm.processing || !profileForm.isDirty}
                                        className="ml-auto"
                                    >
                                        Save Changes
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </TabsContent>

                    <TabsContent value="password">
                        <Card>
                            <CardHeader>
                                <CardTitle>Change Password</CardTitle>
                                <CardDescription>
                                    Ensure your account is using a long, random password to stay secure.
                                </CardDescription>
                            </CardHeader>

                            <form onSubmit={updatePassword}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="current_password">Current Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="current_password"
                                                name="current_password"
                                                type={showCurrent ? 'text' : 'password'}
                                                value={passwordForm.data.current_password}
                                                onChange={(e) =>
                                                    passwordForm.setData('current_password', e.target.value)
                                                }
                                                disabled={passwordForm.processing}
                                                className="pr-11"
                                                autoComplete="current-password"
                                                autoCapitalize="off"
                                                autoCorrect="off"
                                                spellCheck={false}
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowCurrent((s) => !s)}
                                                className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-700"
                                                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                                            >
                                                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {passwordForm.errors.current_password && (
                                            <p className="text-sm text-red-500">
                                                {passwordForm.errors.current_password}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                name="password"
                                                type={showNew ? 'text' : 'password'}
                                                value={passwordForm.data.password}
                                                onChange={(e) =>
                                                    passwordForm.setData('password', e.target.value.replace(/\s/g, ''))
                                                }
                                                disabled={passwordForm.processing}
                                                className="pr-11"
                                                autoComplete="new-password"
                                                autoCapitalize="off"
                                                autoCorrect="off"
                                                spellCheck={false}
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowNew((s) => !s)}
                                                className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-700"
                                                aria-label={showNew ? 'Hide password' : 'Show password'}
                                            >
                                                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <PasswordChecklist value={passwordForm.data.password} />
                                        {passwordForm.errors.password && (
                                            <p className="text-sm text-red-500">{passwordForm.errors.password}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password_confirmation">Confirm Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                type={showConfirm ? 'text' : 'password'}
                                                value={passwordForm.data.password_confirmation}
                                                onChange={(e) =>
                                                    passwordForm.setData('password_confirmation', e.target.value)
                                                }
                                                disabled={passwordForm.processing}
                                                className="pr-11"
                                                autoComplete="new-password"
                                                autoCapitalize="off"
                                                autoCorrect="off"
                                                spellCheck={false}
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowConfirm((s) => !s)}
                                                className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-700"
                                                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                            >
                                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter>
                                    <Button
                                        type="submit"
                                        disabled={
                                            passwordForm.processing ||
                                            !passwordForm.data.current_password ||
                                            !passwordForm.data.password ||
                                            !passwordForm.data.password_confirmation
                                        }
                                        className="ml-auto"
                                    >
                                        Update Password
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}