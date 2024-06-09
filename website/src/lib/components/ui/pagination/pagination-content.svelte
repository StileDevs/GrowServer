<script>
	import { cn } from "$lib/utils.js";
	let className = undefined;
	export { className as class };
</script>

<ul class={cn("flex flex-row items-center gap-1", className)} {...$$restProps}>
	<slot />
</ul>
