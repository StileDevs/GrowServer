<script>
	import { writable } from "svelte/store";
	import { onDestroy } from "svelte";
	import { setEmblaContext } from "./context.js";
	import { cn } from "$lib/utils.js";
	export let opts = {};
	export let plugins = [];
	export let api = undefined;
	export let orientation = "horizontal";
	let className = undefined;
	export { className as class };
	const apiStore = writable(undefined);
	const orientationStore = writable(orientation);
	const canScrollPrev = writable(false);
	const canScrollNext = writable(false);
	const optionsStore = writable(opts);
	const pluginStore = writable(plugins);
	const scrollSnapsStore = writable([]);
	const selectedIndexStore = writable(0);
	$: orientationStore.set(orientation);
	$: pluginStore.set(plugins);
	$: optionsStore.set(opts);
	function scrollPrev() {
		api?.scrollPrev();
	}
	function scrollNext() {
		api?.scrollNext();
	}
	function scrollTo(index, jump) {
		api?.scrollTo(index, jump);
	}
	function onSelect(api2) {
		if (!api2) return;
		canScrollPrev.set(api2.canScrollPrev());
		canScrollNext.set(api2.canScrollNext());
	}
	$: if (api) {
		onSelect(api);
		api.on("select", onSelect);
		api.on("reInit", onSelect);
	}
	function handleKeyDown(e) {
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			scrollPrev();
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			scrollNext();
		}
	}
	setEmblaContext({
		api: apiStore,
		scrollPrev,
		scrollNext,
		orientation: orientationStore,
		canScrollNext,
		canScrollPrev,
		handleKeyDown,
		options: optionsStore,
		plugins: pluginStore,
		onInit,
		scrollSnaps: scrollSnapsStore,
		selectedIndex: selectedIndexStore,
		scrollTo,
	});
	function onInit(event) {
		api = event.detail;
		apiStore.set(api);
		scrollSnapsStore.set(api.scrollSnapList());
	}
	onDestroy(() => {
		api?.off("select", onSelect);
	});
</script>

<div
	class={cn("relative", className)}
	on:mouseenter
	on:mouseleave
	role="region"
	aria-roledescription="carousel"
	{...$$restProps}
>
	<slot />
</div>
