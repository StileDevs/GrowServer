<script>
  import "../index.pcss";
  import Navbar from "../components/Navbar.svelte";
  import { ModeWatcher } from "mode-watcher";
</script>

<ModeWatcher />
<Navbar />
<slot />
