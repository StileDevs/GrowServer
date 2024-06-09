<script>
	import { Tooltip as TooltipPrimitive } from "bits-ui";
	import { cn, flyAndScale } from "$lib/utils.js";
	let className = undefined;
	export let sideOffset = 4;
	export let transition = flyAndScale;
	export let transitionConfig = {
		y: 8,
		duration: 150,
	};
	export { className as class };
</script>

<TooltipPrimitive.Content
	{transition}
	{transitionConfig}
	{sideOffset}
	class={cn(
		"z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
		className
	)}
	{...$$restProps}
>
	<slot />
</TooltipPrimitive.Content>
