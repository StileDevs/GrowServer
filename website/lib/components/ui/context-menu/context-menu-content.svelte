<script>
	import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
	import { cn, flyAndScale } from "$lib/utils.js";
	let className = undefined;
	export let transition = flyAndScale;
	export let transitionConfig = undefined;
	export { className as class };
</script>

<ContextMenuPrimitive.Content
	{transition}
	{transitionConfig}
	class={cn(
		"z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md focus:outline-none",
		className
	)}
	{...$$restProps}
	on:keydown
>
	<slot />
</ContextMenuPrimitive.Content>
