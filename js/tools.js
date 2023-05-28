// VARIABLES
function selectById(id) {
  return document.getElementById(id);
}
var maxTokens = 8192;
var openaiAPIKey = "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";
var openaiAPI = "https://api.openai.com/v1/chat/completions";
var maxRetries = 3;
var memoriesToPull = 5;
let textarea = selectById("user-input");
let chatHistoryToggle = "infinite";
let aiName;
let aiPersonality;
let aiGoals;
let outputFormats;
let outputFormatTemplates;
let inputFormats;
let aiContext;
let aiDomainExpertise;
let aiTone;
let aiConfigFile;
let memoriesDivContainer;
// FUNCTIONS
function appendChatBubble(parent, text, userType) {
  let currentDate = new Date().toLocaleString();
  // Configure marked with syntax highlighting
  marked.setOptions({
    highlight: function (code) {
      return hljs.highlightAuto(code).value;
    },
  });
  let chatBubbleText = document.createElement("div");
  chatBubbleText.className = "chat-bubble user-message";
  // Use the parse method directly from marked
  let markdownText = marked.parse(text) + currentDate;
  chatBubbleText.innerHTML = markdownText;
  console.log("NEW CHAT BUBBLE:", text); // Debug statement
  const chatBubble = document.createElement("div");
  chatBubble.className = userType + "-message";
  chatBubble.innerHTML = chatBubbleText.innerHTML;
  parent.appendChild(chatBubble);
  parent.scrollTop = parent.scrollHeight;
}
async function sendMessageToOpenAI(message, maxTokens) {
  console.log("Sending message to OpenAI - Start");
  if (countTokens(message) >= maxTokens) {
    console.log(
      " - Max token limit exceeded, reduce your input text and try again..."
    );
    return "Max token limit exceeded, reduce your input text and try again...";
  }
  const requestParams = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiAPIKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
      temperature: 1,
    }),
  };
  for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
    try {
      const response = await fetch(openaiAPI, requestParams);
      const responseData = await response.json();
      console.log(" - API response received:");
      console.log(JSON.stringify(responseData, null, 4));
      return responseData;
    } catch (error) {
      console.error(error);
    }
  }
  console.log(" - Exceeded maximum number of retries.");
  return "Exceeded maximum number of retries.";
}
function countTokens(inputString) {
  if (typeof inputString !== "string") {
    throw new Error("Input must be a string");
  }
  return inputString
    .split(" ")
    .reduce(
      (tokenCount, token) =>
        tokenCount + (token.trim() ? Math.ceil(token.length / 4) : 0),
      0
    );
}
function getMemoryContent() {
  let memories = loadMemories();
  let memoryContent = "";
  for (let i = 0; i < memories.length; i++) {
    let memoryJSON = memories[i].Memory;
    console.log(memoryJSON);
    let memoryText = memoryJSON["Memory-Text"];
    let memoryImportance = memoryJSON["Important"];
    let memoryTokenLength = memoryJSON["Token-Length"];
    let memoryTimeStamp = memoryJSON["Timestamp"];
    if (memoryImportance === true) {
      memoryContent += "'" + memoryText + "'" + "\n";
    }
  }
  if (memoryContent === "") {
    return ""; // return an empty string instead of undefined
  } else {
    console.log(" - Memory Content: " + memoryContent);
    return memoryContent;
  }
}
function getAiConfigSetting(searchString) {
  //if searchString containers multiple ["Memoryies"]["Memory"]["Memory-TItle"];
}
function generateGUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
function pullWebsiteContent(url) {
  const proxyUrl = "https://proxy.cors.sh/";
  const apiKey =
    "test_7babbc70c8aa34dbddda875bc2b50a629dd27fb49c71a0c3c3ee56764966a89f";
  return fetch(proxyUrl + url, {
    headers: {
      "x-cors-api-key": apiKey,
      origin: "https://ourtech.space",
    },
  })
    .then((response) => response.text())
    .then((html) => {
      // Parse the HTML string
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      // Get all meta tags
      const metaTags = doc.getElementsByTagName("meta");
      // Extract content from each meta tag
      const contentArray = Array.from(metaTags).map((metaTag) =>
        metaTag.getAttribute("content")
      );
      // Combine content into a line-broken string
      const formattedContent = contentArray.join("\n");
      return formattedContent;
    })
    .catch((error) => {
      console.error("Error fetching website content: ", error);
      throw error;
    });
}
// STRING OPERATIONS
function buildMessage(userInput) {
  try {
    console.log("Building message to send to AI...");
    loadAIConfig();
    let memoryContent = getMemoryContent();
    if (!memoryContent) {
      memoryContent = "";
    }
    let message = `${memoryContent}\n\n${userInput}`.trim();
    if (chatHistoryToggle === "infinite") {
      console.log(" - Chat history is toggled, sending chat history");
      const toolOutputInner = document.getElementById("tool-output-inner");
      if (!toolOutputInner) {
        console.log(" - BUILT MESSAGE 1: " + message);
        return message;
      }
      let combinedMessages = Array.from(toolOutputInner.children)
        .map((messageElement) => {
          let lines = messageElement.innerText.trim().split("\n");
          if (lines.length > 1) {
            let lastLine = lines.pop();
            let prefix = messageElement.classList.contains("user-message")
              ? "USER:"
              : "AI:";
            return prefix + " '" + lines.join("\n") + "': " + lastLine;
          } else {
            let prefix = messageElement.classList.contains("user-message")
              ? "USER:"
              : "AI:";
            return prefix + " " + lines[0];
          }
        })
        .join("\n");
      return combinedMessages + "\n" + message;
    }
    if (chatHistoryToggle === "aiLastOutput") {
      console.log(" - Chat history is toggled, sending last AI message");
      const toolOutputInner = document.getElementById("tool-output-inner");
      if (!toolOutputInner) {
        console.log(" - BUILT MESSAGE 1: " + message);
        return message;
      }
      let lastAiMessage = "";
      const messageElements = Array.from(
        toolOutputInner.getElementsByClassName("ai-message")
      );
      if (messageElements.length > 0) {
        const lastMessageElement = messageElements[messageElements.length - 1];
        lastAiMessage = "AI: " + lastMessageElement.innerText.trim();
      }
      return lastAiMessage + "\n" + message;
    }
    return message;
  } catch (error) {
    console.error("Error building message:", error);
  }
}
function trimMessage(message, maxTokens) {
  if (typeof message !== "string" || typeof maxTokens !== "number") {
    throw new Error(
      "Input types: Message should be a string, maxTokens should be a number"
    );
  }
  let tokenCount = 0;
  return message
    .split(" ")
    .filter((token) => {
      if (tokenCount + Math.ceil(token.length / 4) <= maxTokens) {
        tokenCount += Math.ceil(token.length / 4);
        return true;
      }
      return false;
    })
    .join(" ");
}
function extractUrl(string) {
  var pattern = /(https?:\/\/(?:[-\w.]|(?:%[\da-fA-F]{2}))+.*)/i;
  var match = string.match(pattern);
  return match ? match[0] : null;
}
// SAVE LOAD FUNCTIONS
function checkAiConfigFileExists() {
  var configFile = localStorage.getItem(aiConfigFile);
  if (configFile !== null) {
    // The item 'aiConfigFile' exists in local storage
    console.log(" - " + aiConfigFile + " exists...");
    return true;
  } else {
    // The item 'aiConfigFile' does not exist in local storage
    console.log(" - " + aiConfigFile + " does not exist");
    return false;
  }
}
function saveAIConfig() {
  // take the json from string and convert it to a json obj
  try {
    console.log("Saving " + aiConfigFile + " now...");
    localStorage.setItem(aiConfigFile, JSON.stringify(aiConfig));
  } catch {
    console.log("Failed to save " + aiConfigFile + "...");
  }
}
function loadAIConfig() {
  console.log(" - Loading " + aiConfigFile + " into memory...");
  const configString = localStorage.getItem(aiConfigFile);
  const aiConfigObject = JSON.parse(configString);
  console.log(" - Config for " + aiName + " loaded successfully...");
  return aiConfigObject;
}
function loadMemories() {
  let aiConfigData = loadAIConfig(aiConfigFile);
  console.log("Loading memories for " + aiConfigFile + "...");
  let memoriesJSON = aiConfigData["Memories"];
  while (memoriesDivContainer.firstChild) {
    memoriesDivContainer.removeChild(memoriesDivContainer.firstChild);
  }
  for (let memoryJSON of memoriesJSON) {
    let memoryId = memoryJSON.Memory["id"];
    let memoryTitle = memoryJSON.Memory["Memory-Title"];
    let memoryText = memoryJSON.Memory["Memory-Text"];
    let memoryImportance = memoryJSON.Memory["Important"];
    let memoryTokenLengh = memoryJSON.Memory["Token-Length"];
    let memoryTimeStamp = memoryJSON.Memory["Timestamp"];
    console.log(
      " - Memory: '" +
        memoryText +
        " | " +
        memoryImportance +
        " | " +
        memoryTokenLengh +
        " | " +
        memoryTimeStamp +
        "'"
    );
    memoriesDivContainer.appendChild(
      createMemory(
        memoryId,
        memoryTitle,
        memoryText,
        memoryImportance,
        memoryTokenLengh,
        memoryTimeStamp
      )
    );
  }
  return memoriesJSON;
}
// AI PROFILE
function createAiProfile() {
  aiConfig = loadAIConfig();
}
// MEMORY FUNCTIONS
function findMemoryById(id, aiConfig) {
  let memories = aiConfig.Memories;
  for (let i = 0; i < memories.length; i++) {
    if (memories[i].Memory.id === id) {
      return memories[i];
    }
  }
  return null; // return null if no matching memory found
}
function createMemory(id, title, text, important, tokenLength, timestamp) {
  console.log("  - Creating memory '" + text + "'...");
  const memoryJSON = {
    Memory: {
      "id": id,
      "Memory-Title": title,
      "Memory-Text": text,
      "Important": important,
      "Token-Length": tokenLength,
      "Timestamp": timestamp,
    },
  };
  const memoryContainer = createNewMemoryContainer(memoryJSON.Memory);
  const memoryTextWrapper = createMemoryTextWrapper(
    memoryJSON.Memory["Memory-Text"]
  );
  const toolbarMemory = createMemoryToolbar(memoryJSON.Memory);
  // Add styles to memoryContainer to make it a flex column container
  memoryContainer.style.display = "flex";
  memoryContainer.style.flexDirection = "column";
  // Add styles to toolbarMemory to snap it to the top
  toolbarMemory.style.position = "sticky";
  toolbarMemory.style.top = "0";
  // Add styles to memoryTextWrapper to make it fill the rest of the space
  memoryTextWrapper.style.flexGrow = "1";
  memoryTextWrapper.style.overflowY = "auto";
  memoryContainer.appendChild(toolbarMemory);
  memoryContainer.appendChild(memoryTextWrapper);
  memoryTextWrapper.blur();
  memoryContainer.metadata = memoryJSON;
  console.log(
    "  - Returning created memory '" + memoryJSON.Memory["Memory-Text"] + "'..."
  );
  return memoryContainer;
}
function createNewMemoryContainer(metadata) {
  console.log(
    "  - Creating new memory container for '" + metadata["Memory-Text"] + "'..."
  );
  const newMemoryContainer = document.createElement("div");
  newMemoryContainer.className = "memory";
  newMemoryContainer.metadata = metadata;
  if (!newMemoryContainer) {
    console.error("Failed to create newMemory element.");
    return null;
  }
  return newMemoryContainer;
}
function createMemoryTextWrapper(memoryText) {
  console.log("  - Setting up text wrapper for memory now...");
  const memoryTextWrapper = document.createElement("div");
  const memoryTextContainer = document.createElement("div");
  memoryTextContainer.textContent = memoryText;
  memoryTextContainer.className = "memory-text";
  if (!memoryText) {
    console.error("Failed to create newMemoryText element.");
    return null;
  }
  memoryTextWrapper.appendChild(memoryTextContainer);
  return memoryTextWrapper;
}
function createMemoryToolbar(memoryJSON) {
  console.log("  - Setting up toolbar now...");
  let importantOn = memoryJSON["Important"];
  const memoryToolbar = document.createElement("div");
  memoryToolbar.style.display = "flex";
  memoryToolbar.style.justifyContent = "space-between"; // Updated to space-between for right-aligned buttons
  memoryToolbar.className = "memory-toolbar";
  // Create and add the title element
  const titleElement = document.createElement("div");
  titleElement.id = "memoryToolbarTitle";
  titleElement.textContent = memoryJSON["Memory-Title"];
  titleElement.style.textAlign = "left";
  titleElement.style.margin = "10px";
  titleElement.addEventListener("dblclick", function (e) {
    // Create a new input element
    const inputElement = document.createElement("input");
    inputElement.id = "memoryToolbarTitleInput";
    inputElement.type = "text";
    inputElement.value = titleElement.textContent;
    // Apply modern styles to the input element
    inputElement.style.padding = "5px";
    inputElement.style.border = "none";
    inputElement.style.borderRadius = "5px";
    inputElement.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
    inputElement.style.width = "200px";
    inputElement.style.fontFamily = "Arial, sans-serif";
    inputElement.style.fontSize = "14px";
    inputElement.style.margin = "5px";
    // Replace the title element with the input element in the parent
    memoryToolbar.replaceChild(inputElement, titleElement);
    // Focus on the new input element
    inputElement.focus();
    // Add event listener to input element to revert back to title element when focus is lost
    inputElement.addEventListener("blur", function (e) {
      let memoryContainer = inputElement.closest(".memory");
      let metadataJSON = memoryContainer.metadata;
      let memoryInnerHTML = memoryContainer.innerHTML;
      let memoryId = metadataJSON.Memory["id"];
      let memoryToDelete = findMemoryById(memoryId, aiConfig);
      let memoryNewTitle = e.target.value;
      console.log("Delete button clicked...");
      console.log(" - AICONFIG: '" + JSON.stringify(aiConfig) + "'");
      console.log(
        " - AICONFIG MEMORIES: '" + JSON.stringify(aiConfig.Memories)
      );
      console.log(" - MEMORY HTML: '" + memoryInnerHTML + "'");
      console.log(" - MEMORY METADATA: '" + JSON.stringify(metadataJSON) + "'");
      console.log(" - MEMORY ID: '" + memoryId + "'");
      console.log(
        " - MEMORY TO DELETE: '" + JSON.stringify(memoryToDelete) + "'"
      );
      console.log(" - NEW TITLE: '" + memoryNewTitle + "'");
      updateMemoryValue(memoryId, "Memory-Title", memoryNewTitle, aiConfig);
      saveAIConfig();
      titleElement.textContent = inputElement.value;
      memoryToolbar.replaceChild(titleElement, inputElement);
    });
    // Add global click event listener to check if click happened outside inputElement
    document.addEventListener(
      "click",
      function (e) {
        const isClickInside = inputElement.contains(e.target);
        if (!isClickInside) {
          inputElement.blur();
        }
      },
      { once: true }
    ); // use { once: true } so the event is automatically removed after it is triggered once
  });
  memoryToolbar.appendChild(titleElement);
  // Create a container for the buttons to group them together
  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.appendChild(createImportantButton(importantOn));
  buttonContainer.appendChild(createDeleteButton());
  // Add the button container to the memoryToolbar
  memoryToolbar.appendChild(buttonContainer);
  return memoryToolbar;
}
function createImportantButton(important) {
  const importantButton = document.createElement("button");
  importantButton.innerHTML = "<strong>!</strong>";
  importantButton.textContent = "!";
  importantButton.className = "memory-toolbar-button memory-important-button";
  importantButton.style.fontSize = "24px";
  importantButton.addEventListener("click", () => {
    const memoryContainer = importantButton.closest(".memory");
    let metadataJSON = memoryContainer.metadata;
    let memoryInnerHTML = memoryContainer.innerHTML;
    let memoryId = metadataJSON.Memory["id"];
    console.log("Important button clicked...");
    console.log(" - MEMORY HTML: '" + memoryInnerHTML) + "'";
    console.log(" - MEMORY METADATA: '" + JSON.stringify(metadataJSON) + "'");
    console.log(" - MEMORY ID: '" + memoryId + "'");
    const newImportant = !important;
    updateMemoryValue(memoryId, "Important", newImportant, aiConfig);
    important = newImportant;
    updateButtonStyle();
    saveAIConfig();
    importantButton.style.color = important ? "red" : "gray";
  });
  return importantButton;
}
function updateMemoryValue(id, key, newValue, aiConfig) {
  let memory = findMemoryById(id, aiConfig);
  if (memory !== null) {
    if (memory.Memory.hasOwnProperty(key)) {
      memory.Memory[key] = newValue;
    } else {
      console.log("Invalid key!");
    }
  } else {
    console.log("Memory not found!");
  }
}
function createDeleteButton() {
  const deleteButton = document.createElement("button");
  deleteButton.innerHTML = "\u2716";
  deleteButton.className = "memory-toolbar-button memory-delete-button";
  deleteButton.addEventListener("click", () => {
    let memoryContainer = deleteButton.closest(".memory");
    let metadataJSON = memoryContainer.metadata;
    let memoryInnerHTML = memoryContainer.innerHTML;
    let memoryId = metadataJSON.Memory["id"];
    let memoryToDelete = findMemoryById(memoryId, aiConfig);
    console.log("Delete button clicked...");
    console.log(" - AICONFIG: '" + JSON.stringify(aiConfig) + "'");
    console.log(" - AICONFIG MEMORIES: '" + JSON.stringify(aiConfig.Memories));
    console.log(" - MEMORY HTML: '" + memoryInnerHTML + "'");
    console.log(" - MEMORY METADATA: '" + JSON.stringify(metadataJSON) + "'");
    console.log(" - MEMORY ID: '" + memoryId + "'");
    console.log(
      " - MEMORY TO DELETE: '" + JSON.stringify(memoryToDelete) + "'"
    );
    if (memoryToDelete) {
      const index = aiConfig.Memories.indexOf(memoryToDelete);
      console.log(" - MEMORY INDEX: '" + index + "'");
      if (index !== -1) {
        aiConfig.Memories.splice(index, 1);
        console.log(" - Memory removed from AI config.");
      }
    } else {
      console.log(" - Memory not found in AI config.");
    }
    memoryContainer.remove();
    saveAIConfig();
  });
  return deleteButton;
}
function memoryElementExists(newMemory) {
  console.log(
    "Checking if memory with text '" +
      newMemory.metadata["Memory-Text"] +
      "' exists..."
  );
  if (!memoriesDivContainer) {
    console.error("Memory container does not exist or is not found.");
    return false;
  }
  const memoryElements = memoriesDivContainer.children; // or memoryContainer.querySelectorAll('.memory'), if they have a common class
  console.log(memoryElements);
  for (let oldMemory of memoryElements) {
    if (
      oldMemory.metadata["Memory-Text"] === newMemory.metadata["Memory-Text"]
    ) {
      return true;
    }
  }
  return false;
}
function addMemoryToLocalStorage(memory) {
  // Extract the text and important status from memory element
  const text = memory.querySelector(".memories").textContent;
  const important =
    memory.querySelector(".memory-important-button").style.color === "red";
  // Create a new memory object
  const newMemory = {
    Memory: {
      "Memory-Text": text,
      Important: String(important),
    },
  };
  // Get the AI config from local storage
  let aiConfigName = aiConfig["AI-Name"];
  let aiConfigFile = localStorage.getItem("aiConfig-" + aiConfigName);
  if (aiConfigFile) {
    // If the AI config exists, parse it to an object
    let aiConfig = JSON.parse(aiConfigFile);
    // Check if the memory already exists
    const isDuplicate = isMemoryDuplicate(aiConfig, text);
    if (isDuplicate) {
      // Memory already exists, update it
      const existingMemoryIndex = aiConfig["Memories"].findIndex(
        (memory) => memory["Memory"]["Memory-Text"] === text
      );
      aiConfig["Memories"][existingMemoryIndex]["Memory"]["Important"] =
        String(important);
    } else {
      // Memory does not exist, add it to the aiConfig Memories
      aiConfig["Memories"].push(newMemory);
    }
    // Convert it back to a string and store it in local storage
    localStorage.setItem("aiConfig-" + aiConfigName, JSON.stringify(aiConfig));
  } else {
    console.error(
      "AI Config (aiConfig-" + aiConfigName + ") not found in local storage."
    );
  }
}
// DOC LOADED
document.addEventListener("DOMContentLoaded", function () {
  fetch("toolbar.html")
    .then((response) => response.text())
    .then((data) => {
      document.getElementById("toolbarContainer").innerHTML = data;
      // Dispatch a custom event
      document.dispatchEvent(new CustomEvent("toolbarLoaded"));
    });
  aiName = aiConfig["AI-Name"];
  aiPersonality = aiConfig["AI-Personality"];
  aiGoals = aiConfig["AI-Goals"];
  outputFormats = aiConfig["Output Formats"];
  outputFormatTemplates = aiConfig["Output Format Templates"];
  inputFormats = aiConfig["Input Formats"];
  aiContext = aiConfig["AI Context"];
  aiDomainExpertise = aiConfig["AI Domain Expertise"];
  aiTone = aiConfig["AI Tone"];
  memoriesDivContainer = selectById("memories");
  console.log("Loading " + aiName + "...");
  aiConfigFile = "aiconfig-" + aiName;
  // EVENT LISTENERS
  console.log(" - Setting " + aiName + "'s buttons...");
  selectById("submit-button").addEventListener("click", async (event) => {
    const [submitButton, userInput, toolOutputInner] = [
      "submit-button",
      "user-input",
      "tool-output-inner",
    ].map(selectById);
    let userInputText = userInput.value;
    submitButton.disabled = true;
    userInput.disabled = true;
    event.preventDefault();
    const submitButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<div class="loading-circle"></div>';
    appendChatBubble(toolOutputInner, userInputText, "user");
    if (extractUrl(userInputText)) {
      const url = extractUrl(userInputText);
      console.log(" - URL FOUND: " + url);
      const content = await pullWebsiteContent(url);
      console.log(" CONTENT RETRIEVED: " + content);
      const message = buildMessage(content, true);
      console.log(" - SENDING CONTENT TO AI: " + url);
      const response = await sendMessageToOpenAI(message, maxTokens);
      const responseText = response.choices[0].message.content;
      //const responseText = "URL FOUND: " + url
      appendChatBubble(toolOutputInner, responseText, "ai");
    } else {
      console.log(" - NO URL FOUND:" + userInputText);
      const message = buildMessage(userInputText, true);
      const response = await sendMessageToOpenAI(message, maxTokens);
      const responseText = response.choices[0].message.content;
      //const responseText = " - NO URL FOUND:" + userInputText;
      appendChatBubble(toolOutputInner, responseText, "ai");
    }
    userInput.value = "";
    submitButton.innerHTML = submitButtonText;
    submitButton.disabled = false;
    userInput.disabled = false;
  });
  document.addEventListener("toolbarLoaded", function () {
    selectById("clipboardButton").addEventListener("click", () => {
      const copiedText = [...selectById("tool-output").children]
        .map((child) => child.textContent)
        .join("\n");
      if (copiedText.trim() !== "") {
        navigator.clipboard.writeText(copiedText);
        console.log("Text copied to clipboard:", copiedText);
      }
    });
    selectById("memoryButton").addEventListener("click", async (e) => {
      console.log("Creating memory...");
      memoriesDivContainer = selectById("memories");
      e.preventDefault();
      const selectedText = window.getSelection().toString();
      if (selectedText !== "") {
        let timestamp = new Date().toISOString();
        let tokenLength = countTokens(selectedText);
        let response = await sendMessageToOpenAI(
          "Take this text and return a title.  Only return the title and nothing else.  Return a title even if it's gibberish.\n" +
            selectedText +
            ""
        );
        let memoryTitle = response.choices[0].message.content.replace(
          /^[\W_]+|[\W_]+$/g,
          ""
        );
        let newMemory = createMemory(
          generateGUID,
          memoryTitle,
          selectedText,
          false,
          tokenLength,
          timestamp
        );
        console.log(newMemory.metadata);
        aiConfig["Memories"].push(newMemory.metadata);
        memoriesDivContainer.appendChild(newMemory);
        saveAIConfig();
      }
    });
    selectById("clearButton").addEventListener("click", (e) => {
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.zIndex = "9999";
      // Create prompt box
      const promptBox = document.createElement("div");
      promptBox.style.backgroundColor = "white";
      promptBox.style.padding = "20px";
      promptBox.style.borderRadius = "5px";
      promptBox.style.textAlign = "center";
      overlay.appendChild(promptBox);
      // Create prompt text
      const promptText = document.createElement("p");
      promptText.textContent = "Clear chat history?";
      promptBox.appendChild(promptText);
      // Create yes button
      const yesButton = document.createElement("button");
      yesButton.textContent = "Yes";
      yesButton.style.marginRight = "10px";
      yesButton.className = "button";
      promptBox.appendChild(yesButton);
      // Create no button
      const noButton = document.createElement("button");
      noButton.textContent = "No";
      noButton.className = "button";
      promptBox.appendChild(noButton);
      // Append the overlay to the document body
      document.body.appendChild(overlay);
      // Add event listeners to the buttons
      yesButton.addEventListener("click", () => {
        // Clear all child items
        let outputTextInner = selectById("tool-output-inner");
        while (outputTextInner.firstChild) {
          outputTextInner.removeChild(outputTextInner.firstChild);
        }
        // Remove the overlay
        document.body.removeChild(overlay);
      });
      noButton.addEventListener("click", () => {
        // Remove the overlay
        document.body.removeChild(overlay);
      });
    });
    selectById("chatHistoryToggle").addEventListener("click", (e) => {
      console.log("CHAT HISTORY TOGGLE PRESSED");
      const toggleButton = selectById("chatHistoryToggle");
      if (chatHistoryToggle === "infinite") {
        chatHistoryToggle = "aiLastOutput";
        toggleButton.innerHTML = "&#x1F4DA;";
      } else if (chatHistoryToggle === "aiLastOutput") {
        chatHistoryToggle = "currentInput";
        toggleButton.innerHTML = "&#x1F4D7;";
      } else if (chatHistoryToggle === "currentInput") {
        chatHistoryToggle = "infinite";
        toggleButton.innerHTML = "&#x267E;&#xFE0F;";
      } else {
        // Handle the case when the starting value is not accounted for
        chatHistoryToggle = "infinite";
        toggleButton.innerHTML = "&#x267E;&#xFE0F;";
      }
      console.log(" - Chat history toggle is now set to " + chatHistoryToggle);
    });
    selectById("menuButton").addEventListener("click", (e) => {
      var menu = document.getElementById("popoutMenu");
      var buttonRect = event.target.getBoundingClientRect();
      menu.style.display = "block";
      var menuRect = menu.getBoundingClientRect();
      var top = buttonRect.bottom;
      var left = buttonRect.left - menuRect.width;
      if (left < 0) {
        left = 0;
      }
      if (top + menuRect.height > window.innerHeight) {
        top = window.innerHeight - menuRect.height;
      }
      menu.style.top = top + "px";
      menu.style.left = left + "px";
    });
    selectById("submenu-memories").addEventListener("click", (e) => {
      var toolWrapper = document.getElementById("tool-wrapper");
      var memoryWrapper = document.getElementById("memory-wrapper");
      var memoriesTitle = document.getElementById("memoriesTitle");
      // Toggle the visibility of the wrappers
      toolWrapper.style.display =
        toolWrapper.style.display === "none" ? "block" : "none";
      memoryWrapper.style.display =
        memoryWrapper.style.display === "none" ? "block" : "none";
      memoriesTitle.style.display =
        memoriesTitle.style.display === "none" ? "block" : "none";
    });
    selectById("submenu-tools").addEventListener("click", (e) => {
      // Get the submenu list under 'Tools'
      var submenuList = e.target.nextElementSibling;
      // Get the arrow element
      var arrow = e.target.querySelector(".arrow");
      // Toggle the visibility of the submenu list
      if (submenuList.style.display === "none") {
        submenuList.style.display = "block";
        arrow.innerHTML = "&#x25BE"; // Change the arrow to point downwards
      } else {
        submenuList.style.display = "none";
        arrow.innerHTML = "&#x25B8"; // Change the arrow to point rightwards
      }
    });
    selectById("tempUrlButton").addEventListener("click", async (e) => {
      try {
        const content = await pullWebsiteContent(
          "https://www.thetimes.co.uk/article/team-johnson-its-a-stitch-up-to-smear-boris-at-its-heart-is-oliver-dowden-qz0b0m8nk"
        );
        console.log(content);
        const message =
          content +
          "\nSummarize this text into a summary and keypoints, utput in markdown format.";
        const response = await sendMessageToOpenAI(message, maxTokens);
        const responseText = response.choices[0].message.content;
        appendChatBubble(selectById("tool-output-inner"), responseText, "ai");
      } catch (error) {
        console.error(error);
        appendChatBubble(
          selectById("tool-output-inner"),
          "Website failed to fetch.",
          "ai"
        );
      }
    });
  });
  document.addEventListener("click", function (event) {
    var menu = document.getElementById("popoutMenu");
    if (event.target.id !== "menuButton" && !menu.contains(event.target)) {
      menu.style.display = "none";
    }
  });
  console.log(" - Checking for " + aiName + "'s configuration file...");
  if (!checkAiConfigFileExists()) {
    saveAIConfig();
  } else {
    const configString = localStorage.getItem(aiConfigFile);
    const aiConfigObject = JSON.parse(configString);
    aiConfig = aiConfigObject;
  }
  loadMemories();
});
