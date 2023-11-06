const payload = {
  sd_model_checkpoint: "model.safetensors",
  sd_vae: "model.vae.pt",
  enable_hr: true,
  denoising_strength: 0.6,
  hr_upscaler: "Latent (nearest-exact)",
  hr_second_pass_steps: 20,
  hr_resize_x: 960,
  hr_resize_y: 1280,
  eta: 31337,
  seed: -1,
  sampler_name: "DPM++ 2M Karras",
  batch_size: 2,
  steps: 25,
  cfg_scale: 7.5,
  width: 448,
  height: 640,
  CLIP_stop_at_last_layers: 2,
  prompt: "prompt",
  negative_prompt: "negativePrompt",
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
    postResponse("end iteration", i);
  }
  postResponse("end query");
}

async function next() {
  postResponse("start query");
  payload["prompt"] = dynamicPrompt(data.prompt);
  payload["negative_prompt"] = dynamicPrompt(data.negativePrompt);
  postResponse("start iteration");
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
  i++;
  postResponse("end iteration");
  if (i === data.iterations) postResponse("end query");
}

function postResponse(action) {
  postMessage({ index: i, prompt: payload["prompt"], negativePrompt: payload["negative_prompt"], action: action });
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
