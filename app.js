let abort = false;
let downloadCounter = 0;

const DEFAULT_PROMPT = "(masterpiece, best quality, ultra-detailed), (illustration), (beautiful detailed eyes), (very detailed face), (1girl), (solo), (depth of field), bokeh, light smile, full-face blush, (open mouth:0.6), sweat, sweatdrop, thighs, looking at viewer, sunlight, dappled sunlight, (large breasts:1), ";
const DEFAULT_NEGATIVE_PROMPT = "(painting by bad-artist-anime:0.9), (painting by bad-artist:0.9), bad-hands-5, watermark, text, error, blurry, jpeg artifacts, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, artist name, (worst quality, low quality:1.4), bad anatomy, ((cleavage)), (collar), (seiza), (wariza), badhandv4";

window.addEventListener("load", async () => {
  document.querySelectorAll("noscript").forEach((noscript) => noscript.remove());

  if (new URLSearchParams(window.location.search).has("safe")) {
    setTimeout(() => {
      document.querySelector("#autocomplete").style.display = "none";
    }, 1000);
    document.querySelector("header").style.display = "none";
    document.querySelector("#tab-settings").classList.add("safe");
  } else setInterval(serverStatus, 5000);

  loadPreviousTabs();

  if (document.querySelector("#tab-list").children.length === 0) addNewTab();

  document.querySelectorAll("." + getClass(document.querySelector("#tab-settings").firstElementChild)).forEach((queryItem) => queryItem.classList.add("active"));
});

function getClass(element) {
  return element.className.split(" ")[0];
}

function loadPreviousTabs() {
  const localStorageArray = new Array();
  for (let i = 0; i < localStorage.length; i++) {
    localStorageItem = JSON.parse(localStorage.getItem(localStorage.key(i)));
    localStorageArray[i] = { key: localStorage.key(i), prompt: localStorageItem.prompt, negativePrompt: localStorageItem.negativePrompt, timestamp: localStorageItem.timestamp };
  }
  localStorageArray.sort((a, b) => a.timestamp - b.timestamp);
  localStorageArray.forEach((localStorageItem) => {
    addTab(localStorageItem.key.substring(1), localStorageItem.prompt, localStorageItem.negativePrompt); // key.substring(1) => q<number>
  });
}

function loadTab(queryClass) {
  const storedTab = JSON.parse(localStorage.getItem(queryClass));
  if (storedTab != null) {
    document.querySelector("." + queryClass + " .prompt").value = storedTab.prompt;
    document.querySelector("." + queryClass + " .negative-prompt").value = storedTab.negativePrompt;
  }
}

function saveTab(queryClass) {
  if (localStorage.getItem(queryClass) != null) localStorage.setItem(queryClass, JSON.stringify({ prompt: document.querySelector("." + queryClass + " .prompt").value, negativePrompt: document.querySelector("." + queryClass + " .negative-prompt").value, timestamp: JSON.parse(localStorage.getItem(queryClass)).timestamp }));
  else localStorage.setItem(queryClass, JSON.stringify({ prompt: document.querySelector("." + queryClass + " .prompt").value, negativePrompt: document.querySelector("." + queryClass + " .negative-prompt").value, timestamp: new Date().getTime() }));
}

function addNewTab() {
  if (document.querySelector("#tab-settings").classList.contains("safe")) addTab(nextTabIndex(), "", "");
  else addTab(nextTabIndex(), DEFAULT_PROMPT, DEFAULT_NEGATIVE_PROMPT);
}

function addTab(tabIndex, prompt, negativePrompt) {
  document.querySelector("ul").append(createLi(tabIndex));
  document.querySelector("#tab-settings").append(createArticle(tabIndex, prompt, negativePrompt));

  saveTab("q" + tabIndex);
}

function nextTabIndex() {
  let i = 0;
  while (true) {
    if (document.querySelector("#tab-settings > .q" + i) == null) return i;
    i++;
  }
}

function createLi(index) {
  const li = document.createElement("li");
  li.classList.add("q" + index);
  li.dataset.order = "-1";
  li.setAttribute("onclick", "focusTab(this);");
  li.innerHTML = `
  query${index}
  <div onclick="closeTab(this)">
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 100 100">
      <path d="M10 10 90 90 M90 10 10 90" stroke-width="20" />
    </svg>
  </div>`;
  return li;
}

function createArticle(index, prompt, negativePrompt) {
  const article = document.createElement("article");
  article.classList.add("q" + index);
  article.innerHTML = `
  <textarea class="prompt" oninput="saveTab(getClass(this.closest('article')));" rows="10" spellcheck="false">${prompt != null ? prompt : ""}</textarea>
  <div class="controls">
    <div class="controls-option">
      <button onclick="queueQuery(this);">Start</button>
    </div>
    <div class="controls-info">
      <input class="iterations" type="number" min="1" max="100" step="1" value="20" />
      <div class="progress">0/0</div>
    </div>
  </div>
  <details>
    <summary>Negative Prompt</summary>
    <textarea class="negative-prompt" oninput="saveTab(getClass(this.closest('article')));" rows="5" spellcheck="false">${negativePrompt != null ? negativePrompt : ""}</textarea>
  </details>
  <ul class="log"></ul>`;
  article.querySelector(".prompt").value = prompt;
  article.querySelector(".negative-prompt").value = negativePrompt;
  return article;
}

function focusTab(element) {
  if (!element.classList.contains("removed")) {
    document.querySelectorAll(".active").forEach((element) => element.classList.remove("active"));
    document.querySelectorAll("." + getClass(element)).forEach((element) => element.classList.add("active"));
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

function getURL() {
  const url = document.querySelector("#url").value;
  return url[url.length - 1] === "/" ? url.slice(0, -1) : url;
}

async function dataURIToFile(dataURI, filename) {
  const blob = await (await fetch(dataURI)).blob();
  const file = new File([blob], filename);
  return URL.createObjectURL(file);
}

function imageName(iteration) {
  return String.fromCharCode("a".charCodeAt(0) + downloadCounter) + String.fromCharCode("a".charCodeAt(0) + iteration) + "_" + new Date() + ".png";
}

function isApp() {
  return navigator.userAgent.indexOf("gonative") > -1 || navigator.userAgent.indexOf("median") > -1;
}

async function startQuery(queryClass) {
  const url = getURL();
  const iterations = parseInt(document.querySelector("article." + queryClass + " .iterations").value);
  const prompt = document.querySelector("article." + queryClass + " .prompt").value;
  const negativePrompt = document.querySelector("article." + queryClass + " .negative-prompt").value;

  document.querySelector("article." + queryClass + " .log").innerHTML = "";

  const worker = new Worker("queryWorker.js");
  worker.onmessage = async (e) => {
    if (e.data.action === "start iteration") divLog(e.data.prompt);
    else if (e.data.action === "download") {
      if (isApp()) gonative.share.downloadFile({ url: await dataURIToFile(e.data.file, imageName(e.data.iteration)) });
      else {
        let a = document.createElement("a");
        a.href = e.data.file;
        a.download = imageName(e.data.iteration);
        a.click();
      }
    } else if (e.data.action === "error") divLog(e.data.exception, "error");
    else if (e.data.action === "end iteration") {
      document.querySelector("article." + queryClass + " .progress").innerHTML = parseInt(e.data.index) + "/" + iterations;
      if (abort) {
        worker.terminate();
        downloadCounter++;
        startNextQuery(queryClass);
      } else worker.postMessage({}); // post after abort so it doesn't send another request
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

function divLog(text, textClass) {
  const li = document.createElement("li");
  li.innerHTML = encodeHTML(text);
  if (textClass != null) li.classList.add("error");
  document.querySelector("article." + getClass(document.querySelector(".running")) + " .log").append(li);
}
function serverStatus() {
  const url = getURL();
  if (url && /\S/.test(url)) {
    fetch(getURL() + "/sdapi/v1/txt2img", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => {
        if (response.ok) {
          document.querySelector("#online-indicator").classList.add("online");
          loraAutocomplete();
        } else document.querySelector("#online-indicator").classList.remove("online");
      })
      .catch((error) => document.querySelector("#online-indicator").classList.remove("online"));
  } else document.querySelector("#online-indicator").classList.remove("online");
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
