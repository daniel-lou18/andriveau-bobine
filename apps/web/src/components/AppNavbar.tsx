import logoAndriveau from "@/assets/images/logo-andriveau.png";

const PAGE_TITLE = "Recensement de population de Paris - 1946";

/** Sticky top bar; right column reserved for a future nav menu. */
export function AppNavbar() {
  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto grid h-14 w-full max-w-8xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 md:px-6 sm:h-16 sm:gap-4">
        <a
          href="/"
          className="flex shrink-0 items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
          aria-label="Andriveau — accueil"
        >
          <img
            src={logoAndriveau}
            alt=""
            width={40}
            height={40}
            className="size-8 object-contain sm:size-10"
          />
        </a>
        <h1 className="font-heading min-w-0 text-center text-xs leading-tight font-semibold uppercase tracking-[1.8px] sm:text-sm md:text-base lg:text-lg">
          {PAGE_TITLE}
        </h1>
        <a
          href="#"
          className="flex size-8 shrink-0 items-center justify-center text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground sm:size-10"
          aria-label="Menu"
          onClick={(event) => event.preventDefault()}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 448 512"
            xmlns="http://www.w3.org/2000/svg"
            className="size-5 fill-current sm:size-7"
          >
            <path d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
