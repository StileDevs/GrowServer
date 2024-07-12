import { ModeToggle } from "../mode-toggle";
import { Typography } from "../text/typography";

export function Navbar() {
  return (
    <nav className="flex justify-between items-center p-4 sticky top-0 left-0 z-10 w-full bg-transparent backdrop-filter backdrop-blur-md">
      <a href="/" className="font-bold text-xl">
        GrowServer
      </a>
      <button id="toggleSidebar" className="text-gray-300 focus:outline-none lg:hidden">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zM4 12a2 2 0 1 0 0 4v-4z" />
        </svg>
      </button>
      <ul className="hidden lg:flex items-center gap-x-4">
        <li>
          <a href="/about">Github</a>
        </li>
        <li>
          <a href="/contact">Discord</a>
        </li>
        <ModeToggle />
      </ul>
    </nav>
  );
}
