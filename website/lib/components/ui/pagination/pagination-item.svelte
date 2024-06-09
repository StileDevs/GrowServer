<script>
	import { cn } from "$lib/utils.js";
	let className = undefined;
	export { className as class };
</script>

<li class={cn("", className)} {...$$restProps}>
	<slot />
</li>
