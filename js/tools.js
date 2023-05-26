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
  let chatBubbleText = document.createElement("div");
  chatBubbleText.className = "chat-bubble user";
  chatBubbleText.innerHTML = `${text}<br>${currentDate}`;
  console.log("NEW CHAT BUBBLE:", text); // Debug statement
  const newDiv = document.createElement("div");
  newDiv.className = userType + "-message";
  newDiv.innerHTML = chatBubbleText.innerHTML;
  parent.appendChild(newDiv);
  parent.scrollTop = parent.scrollHeight;
}

async function sendMessageToOpenAI(message) {
  if (countTokens(message) >= maxTokens) {
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
      //return "Hi there";
      if (response.status === 429) {
        console.log("Too Many Requests. Retrying in 5 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      } else {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error(error);
    }
  }

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

// STRING OPERATIONS

function buildMessage(userInput) {
  try {
    console.log("Building message to send to AI...");

    loadAIConfig();

    let memoryContent = getMemoryContent();

    if (!memoryContent) {
      memoryContent = '';
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
            let prefix = messageElement.classList.contains("user-message") ? "USER:" : "AI:";
            return prefix + " '" + lines.join("\n") + "': " + lastLine;
          } else {
            let prefix = messageElement.classList.contains("user-message") ? "USER:" : "AI:";
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
    
      let lastAiMessage = '';
      const messageElements = Array.from(toolOutputInner.getElementsByClassName("ai-message"));
      if (messageElements.length > 0) {
        const lastMessageElement = messageElements[messageElements.length - 2];
        lastAiMessage = "AI: " + lastMessageElement.innerText.trim();
      }
    
      return lastAiMessage + "\n" + message;
    }
    
    return message;
  } catch (error) {
    console.error('Error building message:', error);
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

function createMemory(text, important, tokenLength, timestamp) {
  console.log("  - Creating memory '" + text + "'...");

  const memoryJSON = {
    Memory: {
      "Memory-Text": text,
      Important: important,
      "Token-Length": tokenLength,
      Timestamp: timestamp,
    },
  };

  const memoryContainer = createNewMemoryContainer(memoryJSON.Memory);
  const memoryTextWrapper = createMemoryTextWrapper(
    memoryJSON.Memory["Memory-Text"]
  );
  const toolbarMemory = createMemoryToolbar(memoryJSON.Memory);

  // Add styles to memoryContainer to make it a flex column container
  memoryContainer.style.display = 'flex';
  memoryContainer.style.flexDirection = 'column';

  // Add styles to toolbarMemory to snap it to the top
  toolbarMemory.style.position = 'sticky';
  toolbarMemory.style.top = '0';

  // Add styles to memoryTextWrapper to make it fill the rest of the space
  memoryTextWrapper.style.flexGrow = '1';
  memoryTextWrapper.style.overflowY = 'auto';

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
  let important = memoryJSON["Important"];
  const memoryToolbar = document.createElement("div");
  memoryToolbar.style.display = "flex";
  memoryToolbar.style.justifyContent = "space-between"; // Update to space-between for left-aligned title
  memoryToolbar.className = "memory-toolbar";
  
  // Create and add the title element
  const titleElement = document.createElement("div");
  titleElement.id = "memoryToolbarTitle"
  titleElement.textContent = "Memory Title";
  titleElement.style.textAlign = "left";
  titleElement.style.margin = "10px";
  memoryToolbar.appendChild(titleElement);
  
  memoryToolbar.appendChild(createImportantButton(important));
  memoryToolbar.appendChild(createDeleteButton());
  return memoryToolbar;
}

function createImportantButton(important) {
  const importantButton = document.createElement("button");
  importantButton.innerHTML = "<strong>!</strong>";
  importantButton.textContent = "!";
  importantButton.className = "memory-toolbar-button memory-important-button";
  importantButton.style.color = important ? "red" : "gray";
  importantButton.style.fontSize = "24px";
  importantButton.addEventListener("click", () => {
    const memoryWrapper = importantButton.parentNode.parentNode;
    const memoryWrapperMetadata = memoryWrapper.metadata.Memory;
    console.log(
      "Important button clicked for '" +
        memoryWrapperMetadata["Memory-Text"] +
        "' memory..."
    );
    let color = importantButton.style.color;
    if (color === "gray") {
      important = true;
      console.log(
        " - Marking importance for '" +
          memoryWrapperMetadata["Memory-Text"] +
          "' to " +
          important
      );
      importantButton.style.color = "red";
    } else if (color === "red") {
      important = false;
      importantButton.style.color = "gray";
      console.log(
        " - Marking importance for '" +
          memoryWrapperMetadata["Memory-Text"] +
          "' to " +
          important
      );
    }

    const memoryIndex = aiConfig["Memories"].findIndex(
      (memory) =>
        memory["Memory"]["Memory-Text"].trim() ===
        memoryWrapper.metadata["Memory"]["Memory-Text"].trim()
    );

    console.log(" - memoryindex: " + memoryIndex);
    if (memoryIndex > -1) {
      aiConfig["Memories"][memoryIndex]["Memory"]["Important"] =
        !aiConfig["Memories"][memoryIndex]["Memory"]["Important"];
      saveAIConfig();
    }
  });

  return importantButton;
}

function createDeleteButton() {
  const deleteButton = document.createElement("button");
  deleteButton.innerHTML = "❌";
  deleteButton.className = "memory-toolbar-button memory-delete-button";
  deleteButton.addEventListener("click", () => {
    const memoryWrapper = deleteButton.parentNode.parentNode;
    console.log("Deleting memory " + JSON.stringify(memoryWrapper.metadata));
    const memoryIndex = aiConfig["Memories"].findIndex(
      (memory) =>
        JSON.stringify(memory) === JSON.stringify(memoryWrapper.metadata)
    );
    if (memoryIndex > -1) {
      aiConfig["Memories"].splice(memoryIndex, 1);
    }

    memoryWrapper.remove();
    console.log(" - Deleted memory " + JSON.stringify(memoryWrapper.metadata));
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
    console.log("USER INPUT 0: " + userInput.value)
    
    let userInputText = userInput.value.replace(/\n/g, "<br>");
    console.log("USER INPUT 1: " + userInputText);

    submitButton.disabled = true;
    userInput.disabled = true;
    event.preventDefault();

    const submitButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<div class="loading-circle"></div>';

    // append the user's message
    appendChatBubble(toolOutputInner, userInputText, "user");

    const message = buildMessage(userInputText, true);
    console.log("USER INPUT 2: " + message);

    const response = await sendMessageToOpenAI(trimMessage(message, maxTokens));
    submitButton.innerHTML = submitButtonText;
    // append the AI's response
    console.log("RESPONSE: " + response);
    appendChatBubble(toolOutputInner, response.trim(), "ai");

    userInput.value = ""; // Clear the user input

    submitButton.disabled = false;
    userInput.disabled = false;
  });

  selectById("clipboardButton").addEventListener("click", () => {
    const copiedText = [...selectById("tool-output").children]
      .map((child) => child.textContent)
      .join("\n");
    if (copiedText.trim() !== "") {
      navigator.clipboard.writeText(copiedText);
      console.log("Text copied to clipboard:", copiedText);
    }
  });

  selectById("memoryButton").addEventListener("click", (e) => {
    console.log("Creating memory...");
    memoriesDivContainer = selectById("memories");
    e.preventDefault();
    const selectedText = window.getSelection().toString();
    if (selectedText !== "") {
      let timestamp = new Date().toISOString();
      let tokenLength = countTokens(selectedText);
      newMemory = createMemory(selectedText, false, tokenLength, timestamp);
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
    yesButton.className="button";
    promptBox.appendChild(yesButton);
  
    // Create no button
    const noButton = document.createElement("button");
    noButton.textContent = "No";
    noButton.className="button";
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
      toggleButton.textContent = "📚";
    } else if (chatHistoryToggle === "aiLastOutput") {
      chatHistoryToggle = "currentInput";
      toggleButton.textContent = "📗";
    } else if (chatHistoryToggle === "currentInput") {
      chatHistoryToggle = "infinite";
      toggleButton.textContent = "♾️";
    } else {
      // Handle the case when the starting value is not accounted for
      chatHistoryToggle = "infinite";
      toggleButton.textContent = "♾️";
    }
  
    console.log(" - Chat history toggle is now set to " + chatHistoryToggle);
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
