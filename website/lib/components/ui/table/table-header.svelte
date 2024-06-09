<script>
	import { cn } from "$lib/utils.js";
	let className = undefined;
	export { className as class };
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<thead class={cn("[&_tr]:border-b", className)} {...$$restProps} on:click on:keydown>
	<slot />
</thead>
