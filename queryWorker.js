const testImage =
  "data:image/png;base64,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";

const payload = {
  //sd_model_checkpoint: "model.safetensors",
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
  prompt: "prompt",
  negative_prompt: "negativePrompt",
  override_settings: {
    CLIP_stop_at_last_layers: 2,
    sd_vae: "model.vae.pt",
    eta_noise_seed_delta: 31337,
  },
  override_settings_restore_afterwards: false,
};

let running = false;
let i = 0;
let data;

onmessage = (e) => {
  if (!running) {
    running = true;
    data = e.data;
  }
  next();
};

async function start(query) {
  postResponse("start query");
  for (let i = 0; i < query.iterations; i++) {
    payload["prompt"] = dynamicPrompt(query.prompt);
    payload["negative_prompt"] = dynamicPrompt(query.negativePrompt);
    postResponse("start iteration", i);
    if (query.isApp) {
      await new Promise((r) => setTimeout(r, 10000));
      postMessage({ index: i, iteration: 0, action: "download", file: testImage });
    } else {
      let json;
      while (json == null)
        try {
          const response = await fetch(query.url + "/sdapi/v1/txt2img", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          json = await response.json();
        } catch (error) {
          json = null;
          postMessage({ prompt: payload["prompt"], negativePrompt: payload["negative_prompt"], action: "error", exception: error.message });
        }
      json.images.forEach((image, index) => {
        postMessage({ index: i, iteration: index, action: "download", file: "data:image/png;base64," + image });
      });
    }

    postResponse("end iteration", i);
  }
  postResponse("end query");
}

async function next() {
  postResponse("start query");
  payload["prompt"] = dynamicPrompt(data.prompt);
  payload["negative_prompt"] = dynamicPrompt(data.negativePrompt);
  postResponse("start iteration");
  if (data.isApp) {
    postMessage({ index: i, iteration: 0, action: "download", file: testImage });
  } else {
    let json;
    try {
      const response = await fetch(data.url + "/sdapi/v1/txt2img", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      json = await response.json();
    } catch (error) {
      json = null;
      postMessage({ prompt: payload["prompt"], negativePrompt: payload["negative_prompt"], action: "error", exception: error.message });
      postResponse("end iteration");
      return;
    }
    json.images.forEach((image, index) => {
      postMessage({ index: i, iteration: index, action: "download", file: "data:image/png;base64," + image });
    });
  }
  i++;
  postResponse("end iteration");
  if (i === data.iterations) postResponse("end query");
}

function postResponse(action) {
  postMessage({ index: i, prompt: payload["prompt"], negativePrompt: payload["negative_prompt"], action: action });
}

function dynamicPrompt(prompt) {
  // /{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)}/g 2 level depth braces
  while (/{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)}/g.test(prompt)) {
    Array.from(prompt.matchAll(/{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)}/g)).forEach((group) => {
      let weightedArray = [];

      let items = Array.from(group[1].matchAll(/([^|]+)/g));
      if (!group[1].includes("|")) items = Array.from(group[1].matchAll(/([^|:]+):?([0-9.]*)/g));
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
  }
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
