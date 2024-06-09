<script>
	import { Pagination as PaginationPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	let className = undefined;
	export let count = 0;
	export let perPage = 10;
	export let page = 1;
	export let siblingCount = 1;
	export { className as class };
	$: currentPage = page;
</script>

<PaginationPrimitive.Root
	{count}
	{perPage}
	{siblingCount}
	bind:page
	let:builder
	let:pages
	let:range
	asChild
	{...$$restProps}
>
	<nav {...builder} class={cn("mx-auto flex w-full flex-col items-center", className)}>
		<slot {pages} {range} {currentPage} />
	</nav>
</PaginationPrimitive.Root>
