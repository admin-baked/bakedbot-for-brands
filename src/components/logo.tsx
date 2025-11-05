export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="BakedBot AI Home">
      <svg
        className="h-8 w-8 text-primary"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M85 40H75V30C75 24.4772 70.5228 20 65 20H35C29.4772 20 25 24.4772 25 30V40H15C9.47715 40 5 44.4772 5 50V70C5 75.5228 9.47715 80 15 80H85C90.5228 80 95 75.5228 95 70V50C95 44.4772 90.5228 40 85 40Z"
          fill="currentColor"
          fillOpacity="0.5"
        />
        <path
          d="M75 30C75 24.4772 70.5228 20 65 20H50V80H85C90.5228 80 95 75.5228 95 70V50C95 44.4772 90.5228 40 85 40H75V30Z"
          fill="currentColor"
        />
        <circle cx="65" cy="55" r="5" fill="#1E293B" opacity="0.8"/>
        <circle cx="35" cy="55" r="5" fill="currentColor" fillOpacity="0.6"/>
        <path d="M50 20V10C50 4.47715 45.5228 0 40 0C34.4772 0 30 4.47715 30 10V20H50Z" fill="currentColor" fillOpacity="0.5" />
        <path d="M50 20V10C50 4.47715 54.4772 0 60 0C65.5228 0 70 4.47715 70 10V20H50Z" fill="currentColor" />

      </svg>

      <h1 className="text-xl font-bold tracking-tighter text-foreground">
        BakedBot AI
      </h1>
    </div>
  );
}
