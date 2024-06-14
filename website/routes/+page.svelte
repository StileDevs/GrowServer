<script>
  import * as Card from "$lib/components/ui/card";
  import { Toaster } from "$lib/components/ui/sonner";
  import { toast } from "svelte-sonner";
  import * as Carousel from "$lib/components/ui/carousel/index.js";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";

  onMount(() => {
    const ws = new WebSocket("ws://localhost");

    /** @param {MessageEvent<Blob>} ev*/
    ws.onmessage = async (ev) => {
      const data = new DataView(await ev.data.arrayBuffer());
      const type = data.getInt32(0, true);

      switch (type) {
        case 1: {
          const dataReq = new DataView(new ArrayBuffer(8));
          let requestFlags = 0;

          requestFlags |= 1 << 0; // SUPER_BROADCAST

          dataReq.setInt32(0, 2, true);
          dataReq.setUint32(4, requestFlags, true);

          ws.send(dataReq.buffer);
          break;
        }

        case 4: {
          let pos = 4;
          const broadcastType = data.getUint8(pos);
          pos += 1;

          if (broadcastType === 1) {
            const jammed = data.getUint8(pos);
            pos += 1;

            let toStr = new TextDecoder("utf-8");

            const msgLen = data.getUint16(pos, true);
            pos += 2;
            const msg = toStr.decode(data.buffer.slice(pos, pos + msgLen));
            pos += msgLen;

            const peerLen = data.getUint16(pos, true);
            pos += 2;
            const peer = toStr.decode(data.buffer.slice(pos, pos + peerLen));
            pos += peerLen;

            const worldLen = data.getUint16(pos, true);
            pos += 2;
            const world = toStr.decode(data.buffer.slice(pos, pos + worldLen));
            pos += worldLen;

            console.log({ broadcastType, jammed, msg, peer, world });
            toast("Super Broadcast", {
              description: `FROM ${peer}: ${msg}`
            });
          }
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
  <Button
    variant="outline"
    on:click={() => {
      toast("Event has been created", {
        description: "Sunday, December 03, 2023 at 9:00 AM"
      });
    }}
  >
    Test Toast
  </Button>
  <Toaster />
</div>
