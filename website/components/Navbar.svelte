<script>
  import { onMount } from "svelte";

  onMount(() => {
    const toggleSidebarBtn = document.getElementById("toggleSidebar");

    toggleSidebarBtn?.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-open");
    });
  });
</script>

<nav class=" text-white flex justify-between items-center p-4 sticky top-0 left-0 z-10 w-full bg-transparent backdrop-filter backdrop-blur-md">
  <a href="/" class="font-bold text-xl">GrowServer</a>
  <button id="toggleSidebar" class="text-gray-300 focus:outline-none lg:hidden">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zM4 12a2 2 0 1 0 0 4v-4z" />
    </svg>
  </button>
  <ul class="hidden lg:flex space-x-4">
    <li><a href="/about" class="hover:text-gray-400">Github</a></li>
    <li><a href="/contact" class="hover:text-gray-400">Discord</a></li>
  </ul>
</nav>
