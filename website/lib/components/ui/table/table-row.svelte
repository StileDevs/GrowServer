<script>
	import { cn } from "$lib/utils.js";
	let className = undefined;
	export { className as class };
</script>

<tr
	class={cn(
		"border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
		className
	)}
	{...$$restProps}
	on:click
	on:keydown
>
	<slot />
</tr>
