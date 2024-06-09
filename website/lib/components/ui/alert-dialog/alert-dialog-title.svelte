<script>
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	let className = undefined;
	export let level = "h3";
	export { className as class };
</script>

<AlertDialogPrimitive.Title class={cn("text-lg font-semibold", className)} {level} {...$$restProps}>
	<slot />
</AlertDialogPrimitive.Title>
