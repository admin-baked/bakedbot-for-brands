
jest.mock('lucide-react', () => ({
    Ticket: () => <svg data-testid="icon-ticket" />,
    Database: () => <svg data-testid="icon-database" />,
    Search: () => <svg data-testid="icon-search" />,
    Code: () => <svg data-testid="icon-code" />,
    Utensils: () => <svg data-testid="icon-utensils" />,
    Tag: () => <svg data-testid="icon-tag" />,
    BookOpen: () => <svg data-testid="icon-book-open" />,
    UserMinus: () => <svg data-testid="icon-user-minus" />,
    Users: () => <svg data-testid="icon-users" />,
    Settings: () => <svg data-testid="icon-settings" />,
    Wallet: () => <svg data-testid="icon-wallet" />,
    Bot: () => <svg data-testid="icon-bot" />,
    // Add other icons as needed for other tests
}));
