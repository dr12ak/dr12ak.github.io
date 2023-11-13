importScripts("./client-zip.js");

let files = [];

onmessage = async (e) => {
  if (e.data.file) files.push(new File([await (await fetch(e.data.file)).blob()], e.data.filename, { type: "image/png" }));
  else {
    zipURL = URL.createObjectURL(await downloadZip(files).blob());
    postMessage({ url: zipURL });
    self.close();
  }
};
