<script>
	import { cn } from "$lib/utils.js";
	let className = undefined;
	export { className as class };
</script>

<caption class={cn("mt-4 text-sm text-muted-foreground", className)} {...$$restProps}>
	<slot />
</caption>
