let abort = false;
let downloadCounter = 0;
let safe = false;

const DEFAULT_PROMPT = "(masterpiece, best quality, ultra-detailed), (illustration), (beautiful detailed eyes), (very detailed face), (1girl), (solo), (depth of field), bokeh, light smile, full-face blush, (open mouth:0.6), sweat, sweatdrop, thighs, looking at viewer, sunlight, dappled sunlight, (large breasts:1), ";
const DEFAULT_NEGATIVE_PROMPT = "(painting by bad-artist-anime:0.9), (painting by bad-artist:0.9), bad-hands-5, watermark, text, error, blurry, jpeg artifacts, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, artist name, (worst quality, low quality:1.4), bad anatomy, ((cleavage)), (collar), (seiza), (wariza), badhandv4";

window.addEventListener("load", async () => {
  if (new URLSearchParams(window.location.search).has("safe")) {
    document.querySelector("header").style.display = "none";
    document.querySelector("#tab-settings").setAttribute("safe", "true");
    safe = true;
  }

  document.querySelector("#tab-settings").addEventListener("change", (event) => {
    if (event.target.closest("textarea")) saveTab(getClass(event.target.closest("article")), event);
  });

  document.querySelectorAll(".q0").forEach((queryItem) => queryItem.remove());
  if (localStorage.length === 0) localStorage.setItem("q0", JSON.stringify({ prompt: safe ? "" : DEFAULT_PROMPT, negativePrompt: safe ? "" : DEFAULT_NEGATIVE_PROMPT }));

  for (let i = 0; i < localStorage.length; i++) {
    addTab(localStorage.key(i).substring(1));
    loadTab(localStorage.key(i));
  }

  document.querySelectorAll("." + getClass(document.querySelector("#tab-settings").firstElementChild)).forEach((queryItem) => queryItem.classList.add("active"));
});

function getClass(element) {
  return element.className.split(" ")[0];
}

function focusTab(element) {
  if (!element.classList.contains("removed")) {
    document.querySelectorAll(".active").forEach((element) => element.classList.remove("active"));
    document.querySelectorAll("." + getClass(element)).forEach((element) => element.classList.add("active"));
  }
}

function nextTabIndex() {
  let i = 0;
  while (true) {
    if (document.querySelector("#tab-settings > .q" + i) == null) return i;
    i++;
  }
}

function emptyTab(tab) {
  return (document.querySelector("." + getClass(tab) + " .prompt").value === "" || document.querySelector("." + getClass(tab) + " .prompt").value === DEFAULT_PROMPT) && (document.querySelector("." + getClass(tab) + " .negative-prompt").value === "" || document.querySelector("." + getClass(tab) + " .negative-prompt").value === DEFAULT_NEGATIVE_PROMPT);
}

function closeTab(element) {
  element = element.parentElement;
  if (emptyTab(element) || confirm("All Entered Data Will Be Removed")) {
    element.remove();
    document.querySelector("." + getClass(element)).remove();
    if (element.classList.contains("active")) {
      document.querySelectorAll("." + getClass(document.querySelector("li"))).forEach((element) => element.classList.add("active"));
    }
    element.classList.add("removed");
    localStorage.removeItem(getClass(element));
  }
}
function addTab(tabIndex) {
  if (tabIndex == null) tabIndex = nextTabIndex();
  const tab = document.createElement("li");
  tab.classList.add("q" + tabIndex);
  tab.dataset.order = "-1";
  tab.setAttribute("onclick", "focusTab(this);");
  tab.innerHTML = "query" + tabIndex + '<div onclick="closeTab(this)"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 100 100"><path d="M10 10 90 90 M90 10 10 90" stroke-width="20" /></svg></div>';
  document.querySelector("ul").append(tab);

  const article = document.createElement("article");
  article.classList.add("q" + tabIndex);
  article.innerHTML = '<textarea class="prompt" rows="10" spellcheck="false">' + DEFAULT_PROMPT + '</textarea><div class="controls"><button onclick="queueQuery(this);">Start</button><div><input class="iterations" type="number" min="1" max="100" step="1" value="20" /><div class="progress">0/0</div></div></div><details><summary>Negative Prompt</summary><textarea class="negative-prompt" rows="5" spellcheck="false">' + DEFAULT_NEGATIVE_PROMPT + "</textarea></details>";
  document.querySelector("#tab-settings").append(article);

  if (safe) {
    document.querySelector(".q" + tabIndex + " .prompt").value = "";
    document.querySelector(".q" + tabIndex + " .negative-prompt").value = "";
    document.querySelector(".q" + tabIndex + " .controls").style.display = "none";
    document.querySelector(".q" + tabIndex + " details").style.display = "none";
  }
  if (JSON.parse(localStorage.getItem("q" + tabIndex)) == null) saveTab("q" + tabIndex);
}

function saveTab(queryClass) {
  localStorage.setItem(queryClass, JSON.stringify({ prompt: document.querySelector("." + queryClass + " .prompt").value, negativePrompt: document.querySelector("." + queryClass + " .negative-prompt").value }));
}

function loadTab(queryClass) {
  const storedTab = JSON.parse(localStorage.getItem(queryClass));
  if (storedTab != null) {
    document.querySelector("." + queryClass + " .prompt").value = storedTab.prompt;
    document.querySelector("." + queryClass + " .negative-prompt").value = storedTab.negativePrompt;
  }
}

function queueQuery(element) {
  const tab = document.querySelector("li." + getClass(element.closest("article")));
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
      startQuery(getClass(tab));
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

async function startQuery(queryClass) {
  const url = document.querySelector("#url").value;
  const iterations = parseInt(document.querySelector("article." + queryClass + " .iterations").value);
  const prompt = document.querySelector("article." + queryClass + " .prompt").value;
  const negativePrompt = document.querySelector("article." + queryClass + " .negative-prompt").value;

  const worker = new Worker("queryWorker.js");
  worker.onmessage = (e) => {
    if (e.data.action === "start iteration") console.log(e.data.prompt);
    else if (e.data.action === "download") {
      let a = document.createElement("a");
      a.href = e.data.file;
      a.download = `${String.fromCharCode("a".charCodeAt(0) + downloadCounter) + String.fromCharCode("a".charCodeAt(0) + e.data.index) + e.data.iterations}.png`;
      a.click();
    } else if (e.data.action === "error") console.log(e.data.exception);
    else if (e.data.action === "end iteration") {
      document.querySelector("article." + queryClass + " .progress").innerHTML = parseInt(i + 1) + "/" + iterations;
      if (abort) {
        worker.terminate();
        downloadCounter++;
        startNextQuery(queryClass);
      }
    } else if (e.data.action === "end query") {
      worker.terminate();
      downloadCounter++;
      startNextQuery(queryClass);
    }
  };
  worker.postMessage({ prompt: prompt, negativePrompt: negativePrompt, url: url, iterations: iterations });
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
    startQuery(getClass(nextQuery));
  }
}
