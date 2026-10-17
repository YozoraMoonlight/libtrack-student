import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
}

export default function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
    return (
        <Card>
            <CardContent className="flex items-center gap-3 pt-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon size={20} />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
                    <span className="truncate text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
                    {description && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{description}</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
