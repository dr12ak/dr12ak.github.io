// From https://github.com/component/textarea-caret-position

// We'll copy the properties below into the mirror div.
// Note that some browsers, such as Firefox, do not concatenate properties
// into their shorthand (e.g. padding-top, padding-bottom etc. -> padding),
// so we have to list every single property explicitly.
var properties = [
  "direction", // RTL support
  "boxSizing",
  "width", // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
  "height",
  "overflowX",
  "overflowY", // copy the scrollbar for IE

  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",

  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",

  // https://developer.mozilla.org/en-US/docs/Web/CSS/font
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",

  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration", // might not make a difference, but better be safe

  "letterSpacing",
  "wordSpacing",

  "tabSize",
  "MozTabSize",
];

var isBrowser = typeof window !== "undefined";
var isFirefox = isBrowser && window.mozInnerScreenX != null;

function getCaretCoordinates(element, position, options) {
  if (!isBrowser) {
    throw new Error("textarea-caret-position#getCaretCoordinates should only be called in a browser");
  }

  var debug = (options && options.debug) || false;
  if (debug) {
    var el = document.querySelector("#input-textarea-caret-position-mirror-div");
    if (el) el.parentNode.removeChild(el);
  }

  // The mirror div will replicate the textarea's style
  var div = document.createElement("div");
  div.id = "input-textarea-caret-position-mirror-div";
  document.body.appendChild(div);

  var style = div.style;
  var computed = window.getComputedStyle ? window.getComputedStyle(element) : element.currentStyle; // currentStyle for IE < 9
  var isInput = element.nodeName === "INPUT";

  // Default textarea styles
  style.whiteSpace = "pre-wrap";
  if (!isInput) style.wordWrap = "break-word"; // only for textarea-s

  // Position off-screen
  style.position = "absolute"; // required to return coordinates properly
  if (!debug) style.visibility = "hidden"; // not 'display: none' because we want rendering

  // Transfer the element's properties to the div
  properties.forEach(function (prop) {
    if (isInput && prop === "lineHeight") {
      // Special case for <input>s because text is rendered centered and line height may be != height
      if (computed.boxSizing === "border-box") {
        var height = parseInt(computed.height);
        var outerHeight = parseInt(computed.paddingTop) + parseInt(computed.paddingBottom) + parseInt(computed.borderTopWidth) + parseInt(computed.borderBottomWidth);
        var targetHeight = outerHeight + parseInt(computed.lineHeight);
        if (height > targetHeight) {
          style.lineHeight = height - outerHeight + "px";
        } else if (height === targetHeight) {
          style.lineHeight = computed.lineHeight;
        } else {
          style.lineHeight = 0;
        }
      } else {
        style.lineHeight = computed.height;
      }
    } else {
      style[prop] = computed[prop];
    }
  });

  if (isFirefox) {
    // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
    if (element.scrollHeight > parseInt(computed.height)) style.overflowY = "scroll";
  } else {
    style.overflow = "hidden"; // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'
  }

  div.textContent = element.value.substring(0, position);
  // The second special handling for input type="text" vs textarea:
  // spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
  if (isInput) div.textContent = div.textContent.replace(/\s/g, "\u00a0");

  var span = document.createElement("span");
  // Wrapping must be replicated *exactly*, including when a long word gets
  // onto the next line, with whitespace at the end of the line before (#7).
  // The  *only* reliable way to do that is to copy the *entire* rest of the
  // textarea's content into the <span> created at the caret position.
  // For inputs, just '.' would be enough, but no need to bother.
  span.textContent = element.value.substring(position) || "."; // || because a completely empty faux span doesn't render at all
  div.appendChild(span);

  var coordinates = {
    top: span.offsetTop + parseInt(computed["borderTopWidth"]),
    left: span.offsetLeft + parseInt(computed["borderLeftWidth"]),
    height: parseInt(computed["lineHeight"]),
  };

  if (debug) {
    span.style.backgroundColor = "#aaa";
  } else {
    document.body.removeChild(div);
  }

  return coordinates;
}

/*





*/
//get object from csv
function parseCSV(str) {
  const arr = [];
  let quote = false; // 'true' means we're inside a quoted field

  // Iterate over each character, keep track of current row and column (of the returned array)
  for (let row = 0, col = 0, c = 0; c < str.length; c++) {
    let cc = str[c],
      nc = str[c + 1]; // Current character, next character
    arr[row] = arr[row] || []; // Create a new row if necessary
    arr[row][col] = arr[row][col] || ""; // Create a new column (start with empty string) if necessary

    // If the current character is a quotation mark, and we're inside a
    // quoted field, and the next character is also a quotation mark,
    // add a quotation mark to the current column and skip the next character
    if (cc == '"' && quote && nc == '"') {
      arr[row][col] += cc;
      ++c;
      continue;
    }

    // If it's just one quotation mark, begin/end quoted field
    if (cc == '"') {
      quote = !quote;
      continue;
    }

    // If it's a comma and we're not in a quoted field, move on to the next column
    if (cc == "," && !quote) {
      ++col;
      continue;
    }

    // If it's a newline (CRLF), skip the next character and move on to the next row and move to column 0 of that new row
    if (cc == "\r" && nc == "\n") {
      ++row;
      col = 0;
      ++c;
      quote = false;
      continue;
    }

    // If it's a newline (LF or CR) move on to the next row and move to column 0 of that new row
    if (cc == "\n") {
      ++row;
      col = 0;
      quote = false;
      continue;
    }
    if (cc == "\r") {
      ++row;
      col = 0;
      quote = false;
      continue;
    }

    // Otherwise, append the current character to the current column
    arr[row][col] += cc;
  }
  return arr;
}

async function loadCSV(path) {
  let response = await fetch(path);
  let text = await response.text();
  return parseCSV(text);
}

/*


  autocomplete div


*/
let allTags = [];

window.addEventListener("load", async () => {
  allTags = await loadCSV("./autocomplete/tags1.csv");

  const ul = document.createElement("ul");
  ul.setAttribute("id", "autocomplete");
  ul.innerHTML = '<li class="tag-autocomplete hide"></li><li class="tag-autocomplete hide"></li><li class="tag-autocomplete hide"></li><li class="tag-autocomplete hide"></li><li class="tag-autocomplete hide"></li>';
  document.body.append(ul);

  document.querySelector("#tab-list").addEventListener("input", (event) => {
    if (event.target.closest("textarea")) onInput(getTextarea());
  });

  document.querySelector("#tab-list").addEventListener("keydown", (event) => {
    if (event.target.closest("textarea")) onKeyDown(event);
  });

  document.addEventListener("touchend", (event) => {
    if (getTextarea() && event.target.closest("#autocomplete")) {
      event.preventDefault();
      if (event.target.closest("#autocomplete")) insertTag(event.target.closest(".tag-autocomplete"));
      else document.querySelectorAll(".tag-autocomplete").forEach((item) => item.classList.add("hide"));
    }
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("textarea")) {
    } else if (event.target.closest("#autocomplete")) insertTag(event.target.closest(".tag-autocomplete"));
    else if (!event.target.closest("#keyboard-addon")) document.querySelectorAll(".tag-autocomplete").forEach((item) => item.classList.add("hide"));
  });
});

const loraAutocomplete = (function () {
  let executed = false;
  return async function () {
    if (!executed) {
      executed = true;
      const loras = await (await fetch(getURL() + "/sdapi/v1/loras", { method: "GET", headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "skip-browser-warning" } })).json();
      loras.forEach((lora) => allTags.push(["<lora:" + lora.name + ":1>", "2", "0", lora.name + "," + lora.alias]));
    }
  };
})();

function onInput(textarea) {
  let word = getWord(getTextarea()).sanitizedWord;
  if (word && /\S/.test(word)) {
    let caretPosition = getCaretCoordinates(textarea, textarea.selectionEnd);
    const autocomplete = document.querySelector("#autocomplete");
    const rect = textarea.getBoundingClientRect();
    autocomplete.style.left = parseInt(rect.left - textarea.scrollLeft + caretPosition.left) + "px";
    autocomplete.style.top = parseInt(textarea.getBoundingClientRect().top - textarea.scrollTop + caretPosition.top + parseInt(getComputedStyle(textarea).lineHeight)) + "px";

    const results = searchTags(word);
    document.querySelectorAll(".tag-autocomplete").forEach((item, index) => {
      if (results.length > index) {
        let innerHTML;
        if (results[index][0].toLowerCase().includes(word)) innerHTML = encodeHTML(results[index][0]) + '<span class="tag-popularity">' + nFormatter(results[index][2], 0) + "</span>";
        else {
          results[index][3].split(",").forEach((alternativeTag) => {
            if (alternativeTag.toLowerCase().includes(word)) innerHTML = encodeHTML(alternativeTag) + " → " + encodeHTML(results[index][0]) + '<span class="tag-popularity">' + nFormatter(results[index][2], 0) + "</span>";
          });
        }
        item.innerHTML = innerHTML;
        item.classList.remove("hide");
      } else {
        item.innerHTML = "";
        item.classList.add("hide");
      }
    });
    if (autocomplete.getBoundingClientRect().left + autocomplete.getBoundingClientRect().width > window.innerWidth) autocomplete.style.left = parseInt(window.innerWidth - autocomplete.getBoundingClientRect().width) + "px";
  } else document.querySelectorAll(".tag-autocomplete").forEach((item) => item.classList.add("hide"));
}

function nFormatter(num, digits) {
  if (num === "0") return "";
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
}

function getWord(textarea) {
  let right = textarea.selectionEnd;
  let left = textarea.selectionStart == right ? right - 1 : textarea.selectionStart;
  while (left >= 0 && ",{|}".indexOf(textarea.value[left]) < 0) {
    left--;
  }

  while (right < textarea.value.length && ",{|}".indexOf(textarea.value[right]) < 0) {
    right++;
  }

  let originalWord = textarea.value.substring(left + 1, right);
  let sanitizedWord = originalWord.trim().replaceAll(" ", "_").replaceAll("\\(", "(").replaceAll("\\)", ")").replaceAll("\\[", "[").replaceAll("\\]", "]").toLowerCase();

  return { originalWord: originalWord, sanitizedWord: sanitizedWord, index: left + 1 };
}

function searchTags(word) {
  let count = 0;
  let results = [];

  for (let i = 0; i < allTags.length; i++) {
    if (count >= 5) break;
    if (allTags[i][0].toLowerCase().includes(word) || allTags[i][3].toLowerCase().includes(word)) {
      results.push(allTags[i]);
      count++;
    }
  }

  return results;
}

function onKeyDown(event) {
  if ((event.key === "ArrowDown" || event.key === "ArrowUp") && document.querySelectorAll(".hide").length < document.querySelectorAll(".tag-autocomplete").length) {
    event.preventDefault();
    const items = document.querySelectorAll(".tag-autocomplete");
    let i = -1;
    items.forEach((item, index) => {
      if (item.classList.contains("selected-tag-autocomplete")) {
        i = index;
        item.classList.remove("selected-tag-autocomplete");
      }
    });
    if (event.key === "ArrowDown") i++;
    else if (event.key == "ArrowUp") i--;
    let visibleItems = [];
    for (let i = 0; i < items.length; i++) {
      if (!items[i].classList.contains("hide")) visibleItems.push(items[i]);
    }
    visibleItems[((i % visibleItems.length) + visibleItems.length) % visibleItems.length].classList.add("selected-tag-autocomplete");
  } else if (event.key === "Enter") {
    event.preventDefault();
    insertTag(document.querySelector(".selected-tag-autocomplete"));
  } else if (event.key === "Tab") {
    event.preventDefault();
    if (!document.querySelector(".selected-tag-autocomplete")) document.querySelectorAll(".tag-autocomplete")[0].classList.add("selected-tag-autocomplete");
    insertTag(document.querySelector(".selected-tag-autocomplete"));
  }
}

function insertTag(tag) {
  if (tag) {
    let result = tag.firstChild.textContent
      .slice(tag.firstChild.textContent.lastIndexOf(" ") - tag.firstChild.textContent.length)
      .trim()
      .replaceAll("_", " ")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)")
      .replaceAll("[", "\\[")
      .replaceAll("]", "\\]");

    let textarea = getTextarea();
    let word = getWord(textarea);
    textarea.setValue((textarea.value.substring(0, word.index) + " " + result + "," + textarea.value.substring(word.index + word.originalWord.length)).replaceAll(",,", ","));
    textarea.selectionEnd = word.index + result.length + 2;
    textarea.focus();
    document.querySelectorAll(".tag-autocomplete").forEach((item) => item.classList.add("hide"));
    selectedTag = document.querySelector(".selected-tag-autocomplete");
    if (selectedTag != null) selectedTag.classList.remove("selected-tag-autocomplete");
  }
}
