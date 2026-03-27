export function initializeTheme(): void {
    const savedAppearance = localStorage.getItem('appearance') || 'system';

    if (savedAppearance === 'dark' || (savedAppearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
    } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
    }
}
