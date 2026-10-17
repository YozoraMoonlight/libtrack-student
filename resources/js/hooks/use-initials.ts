export function useInitials() {
    return (name: string) => {
        const cleaned = name?.trim();
        if (!cleaned) {
            return '';
        }

        const words = cleaned.split(/\s+/);
        if (words.length === 1) {
            return words[0].slice(0, 2).toUpperCase();
        }

        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    };
}
