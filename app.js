let abort = false;
let downloadCounter = 0;

function getClass(element) {
  return element.className.substring(0, 2);
}

function focusTab(element) {
  if (!element.classList.contains("removed")) {
    document.querySelectorAll(".active").forEach((element) => element.classList.remove("active"));
    document.querySelectorAll("." + getClass(element)).forEach((element) => element.classList.add("active"));
  }
}

function closeTab(element) {
  element = element.parentElement;
  element.remove();
  document.querySelector("." + getClass(element)).remove();
  if (element.classList.contains("active")) {
    document.querySelectorAll("." + getClass(document.querySelector("li"))).forEach((element) => element.classList.add("active"));
  }
  element.classList.add("removed");
}
function addTab(element) {
  const tab = document.createElement("li");
  tab.classList.add("q" + element.dataset.index);
  tab.dataset.order = "-1";
  tab.setAttribute("onclick", "focusTab(this);");
  tab.innerHTML = "query" + element.dataset.index + '<div onclick="closeTab(this)"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 100 100"><path d="M10 10 90 90 M90 10 10 90" stroke-width="20" /></svg></div>';
  document.querySelector("ul").append(tab);

  const article = document.createElement("article");
  article.classList.add("q" + element.dataset.index);
  article.innerHTML = '<textarea class="prompt" rows="10" spellcheck="false">(masterpiece, best quality, ultra-detailed), (illustration), (beautiful detailed eyes), (very detailed face), (1girl), (solo), (depth of field), bokeh, light smile, full-face blush, (open mouth:0.6), sweat, sweatdrop, thighs, looking at viewer, sunlight, dappled sunlight, (large breasts:1), </textarea><div class="controls"><button onclick="queueQuery(this);">Start</button><div><input class="iterations" type="number" min="1" max="100" step="1" value="20" /><div class="progress">0/0</div></div></div><details><summary>Negative Prompt</summary><textarea class="negative-prompt" rows="5" spellcheck="false">(painting by bad-artist-anime:0.9), (painting by bad-artist:0.9), bad-hands-5, watermark, text, error, blurry, jpeg artifacts, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, artist name, (worst quality, low quality:1.4), bad anatomy, ((cleavage)), (collar), (seiza), (wariza), badhandv4</textarea></details>';
  document.querySelector("main").append(article);

  element.dataset.index = parseInt(element.dataset.index) + 1;
}

function queueQuery(element) {
  const tab = document.querySelector("li." + getClass(element.parentElement.parentElement));
  tab.classList.toggle("queued");
  if (tab.classList.contains("queued")) {
    if (element.innerHTML === "Stopping") {
      abort = false;
      element.innerHTML = "Stop";
      return;
    }
    document.querySelector("article." + getClass(tab) + " .progress").innerHTML = "0/" + parseInt(document.querySelector("article." + getClass(tab) + " .iterations").value);
    let max = -1;
    document.querySelectorAll(".queued").forEach((element) => {
      if (max < parseInt(element.dataset.order)) max = parseInt(element.dataset.order);
    });
    tab.dataset.order = max + 1;
    element.classList.add("can-stop");
    element.innerHTML = "Queued";

    if (document.querySelectorAll(".running").length === 0) {
      tab.classList.add("running");
      element.innerHTML = "Stop";
      createSet(getClass(tab));
    }
  } else {
    if (tab.classList.contains("running")) {
      abort = true;
      element.innerHTML = "Stopping";
    } else {
      tab.dataset.order = "-1";
      element.classList.remove("can-stop");
      element.innerHTML = "Start";
    }
  }
}

async function createSet(queryClass) {
  const url = document.querySelector("#url").value;
  const iterations = parseInt(document.querySelector("article." + queryClass + " .iterations").value);
  let prompt = dynamicPrompt(document.querySelector("article." + queryClass + " .prompt").value);
  let negativePrompt = dynamicPrompt(document.querySelector("article." + queryClass + " .negative-prompt").value);

  const payload = {
    enable_hr: true,
    denoising_strength: 0.6,
    hr_upscaler: "Latent (nearest-exact)",
    hr_second_pass_steps: 20,
    hr_resize_x: 960,
    hr_resize_y: 1280,
    seed: -1,
    sampler_name: "DPM++ 2M Karras",
    batch_size: 2,
    steps: 25,
    cfg_scale: 7.5,
    width: 448,
    height: 640,
    CLIP_stop_at_last_layers: 2,
    prompt: prompt,
    negative_prompt: negativePrompt,
  };

  for (let i = 0; i < iterations; i++) {
    if (abort) {
      downloadCounter++;
      startNextQuery(queryClass);
      return;
    }
    prompt = dynamicPrompt(document.querySelector("article." + queryClass + " .prompt").value);
    negativePrompt = dynamicPrompt(document.querySelector("article." + queryClass + " .negative-prompt").value);
    payload["prompt"] = prompt;
    payload["negative_prompt"] = negativePrompt;
    console.log(payload["prompt"]);
    const response = await fetch(`${url}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    json.images.forEach((image, index) => {
      let a = document.createElement("a");
      a.href = "data:image/png;base64," + image;
      a.download = `${String.fromCharCode("a".charCodeAt(0) + downloadCounter) + String.fromCharCode("a".charCodeAt(0) + index) + i}.png`;
      a.click();
    });
    document.querySelector("article." + queryClass + " .progress").innerHTML = parseInt(i + 1) + "/" + iterations;
  }
  downloadCounter++;
  startNextQuery(queryClass);
}

function dynamicPrompt(prompt) {
  Array.from(prompt.matchAll(/{([^{]+?)}/g)).forEach((group) => {
    let weightedArray = [];
    let items = Array.from(group[1].matchAll(/([^\|:]+):?([0-9.]*)/g));
    if (items.length === 1) {
      if (items[0][2] && /\S/.test(items[0][2])) items.push(["", "", (1 - parseFloat(items[0][2])).toString()]);
      else items.push(["", "", "0"]);
    }
    items.forEach((item) => {
      if (item[2] && /\S/.test(item[2])) weightedArray.push(parseFloat(item[2]));
      else weightedArray.push(1);
    });
    prompt = prompt.replace(group[0], items[weightedRandom(weightedArray)][1].trim());
  });
  return prompt;
}

function weightedRandom(weightedArray) {
  let table = [];
  for (let i = 0; i < weightedArray.length; i++) {
    let multiplier = 10 ^ (weightedArray[i] % 1 === 0 ? 0 : weightedArray[i].toString().split(".")[1].length);
    for (let j = 0; j < weightedArray[i] * multiplier; j++) {
      table.push(i);
    }
  }
  return table[Math.floor(Math.random() * table.length)];
}

function startNextQuery(queryClass) {
  abort = false;
  const currentTab = document.querySelector("li." + queryClass);
  currentTab.dataset.order = "-1";
  currentTab.classList.remove("running");
  currentTab.classList.remove("queued");
  const button = document.querySelector("article." + queryClass + " button");
  button.classList.remove("can-stop");
  button.innerHTML = "Start";
  let order = Number.MAX_SAFE_INTEGER;
  let nextQuery = null;
  let tabs = document.querySelectorAll("li.queued");
  tabs.forEach((tab) => {
    if (order > parseInt(tab.dataset.order)) {
      order = parseInt(tab.dataset.order);
      nextQuery = tab;
    }
  });
  if (nextQuery != null) {
    nextQuery.classList.add("running");
    document.querySelector("article." + getClass(nextQuery) + " button").innerHTML = "Stop";
    createSet(getClass(nextQuery));
  }
}
