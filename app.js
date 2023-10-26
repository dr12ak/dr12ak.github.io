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
  console.log(element);
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
  article.innerHTML = '<textarea class="prompt" rows="10"></textarea><div class="controls"><button onclick="queueQuery(this);">Start</button><div><input class="iterations" type="number" min="1" max="100" step="1" value="20" /><div class="progress">0/0</div></div></div><details><summary>Negative Prompt</summary><textarea rows="5"></textarea></details>';
  document.querySelector("main").append(article);

  element.dataset.index = parseInt(element.dataset.index) + 1;
}

function queueQuery(element) {
  const tab = document.querySelector("li." + getClass(element.parentElement.parentElement));
  tab.classList.toggle("queued");
  if (tab.classList.contains("queued")) {
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
    tab.dataset.order = "-1";
    element.classList.remove("can-stop");
    element.innerHTML = "Start";
  }
}

async function createSet(queryClass) {
  const url = document.querySelector("#url").value;
  const iterations = parseInt(document.querySelector("article.active .iterations").value);
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
    prompt: "(masterpiece, best quality, ultra-detailed), (illustration), (beautiful detailed eyes), (very detailed face), (1girl), (solo), march seventh, blue eyes, hair between eyes, medium hair, pink eyes, pink hair, two-tone eyes, (depth of field), bokeh, light smile, full-face blush, (open mouth:0.6), sweat, sweatdrop, thighs, looking at viewer, sunlight, dappled sunlight, (large breasts:1), beach, ocean, bikini, <lora:marchseventh-lora-nochekaiser:0.9>",
    negative_prompt: "(painting by bad-artist-anime:0.9), (painting by bad-artist:0.9), bad-hands-5, watermark, text, error, blurry, jpeg artifacts, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, artist name, (worst quality, low quality:1.4), bad anatomy, ((cleavage)), (collar), (seiza), (wariza), badhandv4,",
  };

  let prompt = "(masterpiece, best quality, ultra-detailed), (illustration), (beautiful detailed eyes), (very detailed face), (1girl), (solo), (depth of field), bokeh, light smile, full-face blush, (open mouth:0.6), sweat, sweatdrop, thighs, looking at viewer, sunlight, dappled sunlight, (large breasts:1)";
  let promptAddOn = document.querySelector("article.active .prompt").value;
  payload["prompt"] = prompt + promptAddOn;

  await running(url, iterations, payload);

  /*
  !mkdir {'/content/' + folder}
  for i in range(iterations):
    newPrompt = OR(prompt)
    newPrompt = OR(newPrompt)
    newPrompt = SPLIT(newPrompt)
    newPrompt = CHANCE(newPrompt)
    print(newPrompt)
    payload["prompt"] = newPrompt
    response = requests.post(url=f'{url}/sdapi/v1/txt2img', json=payload)
    r = response.json()

    for j in range(len(r['images'])):
      image = Image.open(io.BytesIO(base64.b64decode(r['images'][j])))
      image.save('/content/' + folder + '/' + folder[0] + chr(97 + j)+ str(i) +'.png')
  */

  /*let worker = new Worker(
    `data:text/javascript,
    const payload = {
      enable_hr: True,
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
      prompt: "(masterpiece, best quality, ultra-detailed), (illustration), (beautiful detailed eyes), (very detailed face), (1girl), (solo), march seventh, blue eyes, hair between eyes, medium hair, pink eyes, pink hair, two-tone eyes, (depth of field), bokeh, light smile, full-face blush, (open mouth:0.6), sweat, sweatdrop, thighs, looking at viewer, sunlight, dappled sunlight, (large breasts:1), beach, ocean, bikini, <lora:marchseventh-lora-nochekaiser:0.9>",
      negative_prompt: "(painting by bad-artist-anime:0.9), (painting by bad-artist:0.9), bad-hands-5, watermark, text, error, blurry, jpeg artifacts, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, artist name, (worst quality, low quality:1.4), bad anatomy, ((cleavage)), (collar), (seiza), (wariza), badhandv4,",
    };
        for (let i = 0; i < ${iterations}; i++) {
          fetch(${url} + "/sdapi/v1/txt2img", {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
            },
          })
            .then((response) => response.json())
            .then((json) => console.log(json););
        }
        `
  );
  /*worker.onmessage = function (event) {
    //Get the result from the worker. This code will be called when postMessage is called in the worker.
    alert("The result is " + event.data);
  };*/
}

async function running(url, iterations, payload) {
  for (let i = 0; i < iterations; i++) {
    fetch(url + "/sdapi/v1/txt2img", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
    })
      .then((response) => response.json())
      .then((json) => console.log(json));
  }
}
