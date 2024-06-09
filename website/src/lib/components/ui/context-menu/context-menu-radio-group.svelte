<script>
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	export let value = undefined;
</script>

<ContextMenuPrimitive.RadioGroup {...$$restProps} bind:value>
	<slot />
</ContextMenuPrimitive.RadioGroup>
