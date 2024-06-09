<script>
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	let className = undefined;
	export { className as class };
</script>

<ContextMenuPrimitive.Separator
	class={cn("-mx-1 my-1 h-px bg-border", className)}
	{...$$restProps}
/>
