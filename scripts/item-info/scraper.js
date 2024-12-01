"use strict";

async function split_item_list(item_list, split) {
  const sublist_size = Math.ceil(item_list.length / split);
  const sublists = [];

  for (let i = 0; i < item_list.length; i += sublist_size) {
    sublists.push(item_list.slice(i, i + sublist_size));
  }

  return sublists;
}

async function get_item_pages(item_list, split) {
  const sublists = await split_item_list(item_list, split);

  const tasks = sublists.map((sublist, i) => post_request(sublist, i + 1));
  const results = await Promise.all(tasks);

  console.log("post requests done");

  return results;
}

async function post_request(item_list, count) {
  console.log(`started post request ${count}`);

  const post_data = new URLSearchParams({
    title: "Special:Export",
    pages: item_list.join("\n"),
    curonly: 1
  });

  const res = await fetchWiki(post_data);

  console.log(res[1]);

  return res[0];
}

module.exports = {
  split_item_list,
  get_item_pages,
  post_request
};

async function fetchWiki(post_data) {
  const response = await fetch("https://growtopia.fandom.com/wiki/Special:Export", {
    method: "POST",
    body: post_data
  });

  if (response.status !== 200) return [null, response.statusText];

  const text = await response.text();

  return [text, response.statusText];
}
