let abort = false;
let downloadCounter = 0;

const DEFAULT_PROMPT = "(masterpiece, best quality, ultra-detailed), (illustration), (beautiful detailed eyes), (very detailed face), (1girl), (solo), (depth of field), bokeh, light smile, full-face blush, (open mouth:0.6), sweat, sweatdrop, thighs, looking at viewer, sunlight, dappled sunlight, (large breasts:1), ";
const DEFAULT_NEGATIVE_PROMPT = "(painting by bad-artist-anime:0.9), (painting by bad-artist:0.9), bad-hands-5, watermark, text, error, blurry, jpeg artifacts, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, artist name, (worst quality, low quality:1.4), bad anatomy, (collar), (seiza), (wariza), badhandv4";

class Tab {
  constructor(prompt = DEFAULT_PROMPT, negativePrompt = DEFAULT_NEGATIVE_PROMPT, index = this.nextTabIndex()) {
    this.index = index;
    this.prompt = prompt;
    this.negativePrompt = negativePrompt;
  }

  nextTabIndex() {
    let i = 0;
    while (true) {
      if (document.querySelector('[data-index="' + i + '"]')) i++;
      else return i;
    }
  }

  static nodeToTab(node) {
    return new Tab(node.querySelector(".prompt").value, node.querySelector(".negative-prompt").value, parseInt(node.dataset.index));
  }

  toNode() {
    const tab = document.createElement("li");
    tab.className = "tab";
    tab.dataset.index = this.index;
    tab.dataset.order = "-1";
    tab.innerHTML = `
    <div class="tab-header" onclick="focusTab(this);">
    query${this.index}
    <div class="close-tab" onclick="closeTab(this, event)">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 100 100">
            <path d="M10 10 90 90 M90 10 10 90" stroke-width="20" />
        </svg>
        </div>
    </div>
    <div class="tab-content">
        <textarea class="prompt" oninput="saveTabs();" rows="10" spellcheck="false">${this.prompt}</textarea>
        <div class="controls">
            <button onclick="queueQuery(this);">Start</button>
        <div class="options">
            <input class="iterations" type="number" min="1" max="100" step="1" value="20" />
            <div class="progress">0/0</div>
        </div>
        </div>
        <details>
            <summary>Negative Prompt</summary>
            <textarea class="negative-prompt" oninput="saveTabs();" rows="5" spellcheck="false">${this.negativePrompt}</textarea>
        </details>
        <ul class="log"></ul>
    </div>
    `;
    return tab;
  }
}

window.addEventListener("load", async () => {
  document.querySelectorAll("noscript").forEach((noscript) => noscript.remove());

  if (new URLSearchParams(window.location.search).has("safe")) {
    document.body.classList.add("safe");
    document.querySelectorAll("script[src*=autocomplete]").forEach((script) => script.remove());
  } else setInterval(serverStatus, 5000);

  loadPreviousTabs();

  if (document.querySelector("#tab-list").children.length === 0) addNewTab();

  document.querySelector(".tab").classList.add("active");
});

function loadPreviousTabs() {
  if (localStorage.getItem(window.location.href)) {
    const localStorageArray = JSON.parse(localStorage.getItem(window.location.href));
    localStorageArray.sort((a, b) => a.index - b.index);
    localStorageArray.forEach((localStorageItem) => {
      addTab(new Tab(localStorageItem.prompt, localStorageItem.negativePrompt, localStorageItem.index));
    });
  }
}

function addNewTab() {
  addTab(new Tab());
}

function addTab(tab) {
  document.querySelector("#tab-list").append(tab.toNode());
  saveTabs();
}

function focusTab(tab) {
  tab = tab.closest(".tab");
  document.querySelectorAll(".active").forEach((tab) => tab.classList.remove("active"));
  tab.classList.add("active");
}

function emptyTab(tab) {
  return (tab.querySelector(".prompt").value === "" || tab.querySelector(".prompt").value === DEFAULT_PROMPT) && (tab.querySelector(".negative-prompt").value === "" || tab.querySelector(".negative-prompt").value === DEFAULT_NEGATIVE_PROMPT);
}

function closeTab(tab, event) {
  event.stopPropagation();
  tab = tab.closest(".tab");
  if (emptyTab(tab) || confirm("All Entered Data Will Be Removed")) {
    tab.remove();
    if (tab.classList.contains("active")) document.querySelector(".tab").classList.add("active");
    saveTabs();
  }
}

function saveTabs() {
  const tabs = [];
  document.querySelectorAll(".tab").forEach((tab) => tabs.push(Tab.nodeToTab(tab)));
  localStorage.setItem(window.location.href, JSON.stringify(tabs));
}

function getURL() {
  const url = document.querySelector("#url").value;
  return url[url.length - 1] === "/" ? url.slice(0, -1) : url;
}

function queueQuery(tab) {
  tab = tab.closest(".tab");
  if (tab.classList.contains("running")) {
    abort = !abort;
    if (abort) tab.querySelector("button").innerHTML = "Stopping";
    else tab.querySelector("button").innerHTML = "Stop";
  } else {
    tab.classList.toggle("queued");
    if (tab.classList.contains("queued")) {
      tab.querySelector(".progress").innerHTML = "0/" + parseInt(tab.querySelector(".iterations").value);
      let order = 0;
      document.querySelectorAll(".queued").forEach((tab) => (order = Math.max(order, parseInt(tab.dataset.order) + 1)));
      tab.dataset.order = order;
      tab.querySelector("button").innerHTML = "Queued";
      tab.querySelector("button").classList.add("can-stop");

      if (document.querySelectorAll(".running").length === 0) startNextQuery();
    } else {
      tab.dataset.order = "-1";
      tab.querySelector("button").innerHTML = "Start";
      tab.querySelector("button").classList.remove("can-stop");
    }
  }
}

function imageName(iteration) {
  return String.fromCharCode("a".charCodeAt(0) + downloadCounter) + String.fromCharCode("a".charCodeAt(0) + iteration) + "_" + new Date().getTime() + ".png";
}

function isApp() {
  return navigator.userAgent.indexOf("gonative") > -1 || navigator.userAgent.indexOf("median") > -1;
}

async function startQuery(tab) {
  const url = getURL();
  const iterations = parseInt(tab.querySelector(".iterations").value);
  const prompt = tab.querySelector(".prompt").value;
  const negativePrompt = tab.querySelector(".negative-prompt").value;

  tab.querySelector(".log").innerHTML = "";

  const worker = new Worker("queryWorker.js");

  worker.onmessage = async (e) => {
    if (e.data.action === "start iteration") log(e.data.prompt);
    else if (e.data.action === "download") {
      let a = document.createElement("a");
      a.href = e.data.file;
      a.download = imageName(e.data.iteration);
      a.click();
    } else if (e.data.action === "error") log(e.data.exception, "error");
    else if (e.data.action === "end iteration") {
      tab.querySelector(".progress").innerHTML = parseInt(e.data.index) + "/" + iterations;
      if (abort) endQuery(worker);
      else if (e.data.index !== iterations) worker.postMessage({}); // post after abort so it doesn't send another request
    } else if (e.data.action === "end query") {
      endQuery(worker);
    }
  };
  worker.postMessage({ prompt: prompt, negativePrompt: negativePrompt, url: url, iterations: iterations, isApp: isApp() });
}

async function endQuery(worker) {
  worker.terminate();
  downloadCounter++;
  startNextQuery();
}

function startNextQuery() {
  abort = false;
  const currentTab = document.querySelector(".running");
  if (currentTab != null) {
    currentTab.dataset.order = "-1";
    currentTab.classList.remove("queued");
    currentTab.classList.remove("running");
    currentTab.querySelector("button").innerHTML = "Start";
    currentTab.querySelector("button").classList.remove("can-stop");
  }
  let order = Number.MAX_SAFE_INTEGER;
  let nextTab = null;
  document.querySelectorAll(".queued").forEach((tab) => {
    if (order > parseInt(tab.dataset.order)) {
      order = parseInt(tab.dataset.order);
      nextTab = tab;
    }
  });
  if (nextTab != null) {
    nextTab.classList.add("running");
    nextTab.querySelector("button").innerHTML = "Stop";
    startQuery(nextTab);
  }
}

function log(text, textClass) {
  const message = document.createElement("li");
  message.innerHTML = encodeHTML(text);
  if (textClass != null) message.classList.add(textClass);
  document.querySelector(".running .log").append(message);
}

function encodeHTML(text) {
  return text.replace(/[&"'\<\>]/g, function (c) {
    switch (c) {
      case "&":
        return "&amp;";
      case "'":
        return "&#39;";
      case '"':
        return "&quot;";
      case "<":
        return "&lt;";
      default:
        return "&gt;";
    }
  });
}

const serverStatus = (function () {
  let online = false;
  return function () {
    if (!online) {
      const url = getURL();
      if (url && /\S/.test(url)) {
        fetch(getURL() + "/sdapi/v1/txt2img", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
          .then((response) => {
            if (response.ok) {
              document.querySelector("#online-indicator").classList.add("online");
              online = true;
              loraAutocomplete();
            } else document.querySelector("#online-indicator").classList.remove("online");
          })
          .catch((error) => document.querySelector("#online-indicator").classList.remove("online"));
      } else document.querySelector("#online-indicator").classList.remove("online");
    }
  };
})();

const getTextarea = (function () {
  let textarea = null;
  return function () {
    if (document.activeElement.tagName.toLowerCase() === "textarea") textarea = document.activeElement;
    else if (!textarea || textarea.offsetParent == null) {
      textarea = document.querySelector(".active .prompt");
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
    }
    return textarea;
  };
})();

HTMLTextAreaElement.prototype.setValue = function (value) {
  this.value = value;
  this.dispatchEvent(new Event("input", { bubbles: false }));
};

function insertCharacter(event) {
  if (getTextarea()) {
    let textarea = getTextarea();
    selectionIndex = textarea.selectionEnd;
    textarea.setValue(textarea.value.substring(0, selectionIndex) + event.target.closest("li").innerText + textarea.value.substring(selectionIndex));
    textarea.selectionEnd = selectionIndex + 1;
    textarea.focus();
  }
}

function openSidebar() {
  document.querySelector("#sidebar").style.display = "";
}
function closeSidebar() {
  document.querySelector("#sidebar").style.display = "none";
}

async function prequeue() {
  const tabs = document.querySelectorAll(".tab").length;
  if (!Array.from(document.querySelectorAll("#choose-domain input[type=checkbox]")).some((domain) => domain.checked)) alert("At least one domain needs to be used.");
  else if (confirm("Run? (Queue " + tabs + (tabs === 1 ? " tab" : " tabs") + " to run)")) {
    const notebookId = "h-" + new Date().getTime().toString(36);
    const payload = {
      slug: "dr12ak/" + notebookId,
      newTitle: notebookId,
      text: String.raw`{"cells":[{"cell_type":"code","execution_count":null,"metadata":{},"outputs":[],"source":["import requests\n","import base64\n","import random\n","import re\n","import threading\n","\n","!pip install supabase\n","import os\n","from supabase import create_client, Client\n","\n","supabase: Client = create_client(\"https://yrztxljxuckpokjoqnwu.supabase.co\", \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyenR4bGp4dWNrcG9ram9xbnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQzODk2MTgsImV4cCI6MjAxOTk2NTYxOH0.heP9JaLV9aTQLxs092UvlqaabjJef0cMe5Io3M_97p0\")\n","\n","endpoints = ['fleet-bluebird-polished.ngrok-free.app']\n","for i in range(len(endpoints)):\n","  endpoints[i] = re.sub(\"(^\\w+:|^)\\/\\/\", \"\", endpoints[i])\n","  endpoints[i] = \"https://\" + endpoints[i]\n","\n","def folderExists(path, name):\n","  response = supabase.storage.from_(\"images\").list(path, {\"search\": name})\n","  return any(a.get(\"name\", False) == name for a in response)\n","\n","def createAll(all):\n","  for i in range(len(all)):\n","    print(\"COMPLETE SET: \" + str(i))\n","    count = 0\n","    while folderExists(\"\", \"name\" + str(count)):\n","      count += 1\n","    \n","    path = \"name\" + str(count)\n","    createAllSets(all[i], path)\n","    !zip -r {path}.zip {path}\n","    !rm -rf {path}\n","  \n","  for i in range(len(endpoints)):\n","    requests.post(url=f\"{endpoints[i]}/sdapi/v1/server-kill\")\n","\n","\n","def createAllSets(sets, path):\n","  global endpoints\n","  threads = []\n","  for i in range(len(endpoints)):\n","    threads.append(threading.Thread(target=threadSet, args=(sets[i::len(endpoints)], endpoints[i], path, i, )))\n","\n","  for thread in threads:\n","    thread.start()\n","  for thread in threads:\n","    thread.join()\n","\n","def threadSet(sets, endpoint, path, thread_index):\n","  for i in range(len(sets)):\n","    createSet(sets[i], endpoint, path + \"/set-\" + str(i) + \"-\" + str(thread_index))\n","\n","def createSet(setObject, endpoint, path):\n","  !mkdir -p {path}\n","\n","  payload = {\n","    \"enable_hr\": True,\n","    \"denoising_strength\": 0.6,\n","    \"hr_upscaler\": \"Latent (nearest-exact)\",\n","    \"hr_second_pass_steps\": 20,\n","    \"hr_resize_x\": 960,\n","    \"hr_resize_y\": 1280,\n","    \"seed\": -1,\n","    \"sampler_name\": \"DPM++ 2M Karras\",\n","    \"batch_size\": 2,\n","    \"steps\": 25,\n","    \"cfg_scale\": 7.5,\n","    \"width\": 448,\n","    \"height\": 640,\n","    \"prompt\": \"prompt\",\n","    \"negative_prompt\": \"negative prompt\",\n","    \"override_settings\": {\n","        \"sd_model_checkpoint\": \"model.safetensors\",\n","        \"sd_vae\": \"model.vae.pt\",\n","        \"CLIP_stop_at_last_layers\": 2,\n","        \"eta_noise_seed_delta\": 31337,\n","        \"enable_pnginfo\": False,\n","    },\n","    \"override_settings_restore_afterwards\": False,\n","  }\n","  count = 0\n","  iterations = setObject.get(\"iterations\")\n","  for i in range(iterations):\n","    payload[\"prompt\"] = dynamicPrompt(setObject.get(\"prompt\"))\n","    payload[\"negative_prompt\"] = dynamicPrompt(setObject.get(\"negative_prompt\"))\n","    print(\" iteration number: \" + str(i) + \", prompt: \" + payload[\"prompt\"])\n","    response = requests.post(url=f\"{endpoint}/sdapi/v1/txt2img\", json=payload)\n","    r = response.json()\n","    for j in range(len(r[\"images\"])):\n","      print(\"  image number: \" + str(j))\n","      image = base64.b64decode(r[\"images\"][j])\n","      while True:\n","        try:\n","          supabase.storage.from_(\"images\").upload(file=image, path=f\"{path}/{count}.png\", file_options={\"content-type\": \"image/png\"})\n","          break\n","        except Exception as error:\n","          #print(error.args[0].get(\"statusCode\"))\n","          count += 1\n","      \n","      with open(f\"{path}/{count}.png\", 'wb') as file:\n","        file.write(image)\n","      count += 1\n","\n","def dynamicPrompt(prompt):\n","  result = re.findall(r\"({([^{}]*):[+-]?([0-9]*[.]?[0-9]+)})\", prompt)\n","  for i in range(len(result)):\n","    replace = \"\"\n","    if random.random() <= float(result[i][2]):\n","      replace = result[i][1]\n","    prompt = prompt.replace(result[i][0], replace)\n","  result = re.findall(r\"({([^{|}]+[|][^{}]+)})\", prompt)\n","  for i in range(len(result)):\n","    replace = random.choice(result[i][1].split(\"|\"))\n","    prompt = prompt.replace(result[i][0], replace)\n","  return prompt\n","\n","\n","createAll([])\n","# [[{iterations: \"\", prompt: \"\", negative_promp: \"\"}, {iterations: \"\", prompt: \"\", negative_promp: \"\"}], [{...}, ...], ...]"]}],"metadata":{"kaggle":{"isGpuEnabled":false,"isInternetEnabled":true,"language":"python","sourceType":"notebook"},"kernelspec":{"display_name":"Python 3","language":"python","name":"python3"},"language_info":{"codemirror_mode":{"name":"ipython","version":3},"file_extension":".py","mimetype":"text/x-python","name":"python","nbconvert_exporter":"python","pygments_lexer":"ipython3","version":"3.12.0"}},"nbformat":4,"nbformat_minor":2}`,
      language: "python",
      kernelType: "notebook",
      isPrivate: "true",
      enableGpu: "false",
      enableTpu: "false",
      enableInternet: "true",
      datasetDataSources: [],
      competitionDataSources: [],
      kernelDataSources: [],
      modelDataSources: [],
      categoryIds: [],
    };

    let domains = [];
    document.querySelectorAll("#choose-domain input[type=checkbox]:checked").forEach((domain) => domains.push(domain.name));
    payload["text"] = payload["text"].replace("endpoints = []", "endpoints = " + JSON.stringify(domains).replaceAll(`\"`, `\'`));

    let prompts = [];
    document.querySelectorAll(".tab").forEach((tab) => {
      prompts.push({ iterations: parseInt(tab.querySelector(".iterations").value), prompt: tab.querySelector(".prompt").value, negative_prompt: tab.querySelector(".negative-prompt").value });
    });
    payload["text"] = payload["text"].replace("([])", "([" + JSON.stringify(prompts).replaceAll(`\"`, `\'`) + "])");

    document.querySelector("#prequeue-button").disabled = true;
    document.querySelector("#prequeue-button").style.backgroundColor = "var(--secondary-background-color)";

    const response = await fetch("https://www.kaggle.com/api/v1/kernels/push", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa("dr12ak:773fd7859414f4437a58e6d806baad44"),
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Swagger-Codegen/1/python",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) document.querySelector("#prequeue-button").style.backgroundColor = "var(--error)";
  }
}
