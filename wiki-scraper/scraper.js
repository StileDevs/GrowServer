async function split_item_list(item_list, split) {
  const sublist_size = Math.ceil(item_list.length / split);
  const sublists = [];

  for (let i = 0; i < item_list.length; i += sublist_size) {
    sublists.push(item_list.slice(i, i + sublist_size));
  }

  return sublists;
}

export async function get_item_pages(item_list, split) {
  const sublists = await split_item_list(item_list, split);

  const tasks = sublists.map((sublist) => post_request(sublist));
  const results = await Promise.all(tasks);

  console.log("post requests done");

  return results;
}

async function post_request(item_list) {
  console.log("started post request");

  const post_data = new URLSearchParams({
    title: "Special:Export",
    pages: item_list.join("\n"),
    curonly: 1
  });

  const response = await fetch("https://growtopia.fandom.com/wiki/Special:Export", {
    method: "POST",
    body: post_data
  });

  return response.text();
}
