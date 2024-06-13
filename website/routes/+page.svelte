<script>
  import * as Card from "$lib/components/ui/card";
  import { onMount } from "svelte";

  onMount(() => {
    const ws = new WebSocket("ws://localhost");

    /** @param {MessageEvent<Blob>} ev*/
    ws.onmessage = async (ev) => {
      const data = new DataView(await ev.data.arrayBuffer());
      const type = data.getInt32(0, true);

      switch (type) {
        case 1: {
          ws.send(new Uint8Array([2, 0, 0, 0, 1]));
          break;
        }
      }
    };
  });
</script>

<div class="container mx-auto p-8 space-y-8">
  <div class="flex justify-center items-center mt-16">
    <div class="text-center">
      <img src="/banner.png" alt="Banner" class="w-[600px] md:w-[700px] lg:w-[800px]" />
      <h4 class="scroll-m-20 text-md font-semibold tracking-tight">A Growtopia private server using Node.js</h4>
    </div>
  </div>
</div>
