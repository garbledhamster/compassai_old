import { chattyConfig } from './tools/chatty.js';
import { summarizerConfig } from './tools/summarizer.js';
import { articulatorConfig } from './tools/articulator.js';
import { chickenConfig } from './tools/chicken.js';
import { guideOverlayContainer, guideOverlayContent, guideImageContainer, guideCloseButton } from '/js/react.js';

// AI CONFIG CONTROLS

function checkAiConfigFileExists() {
  console.log('CHECKING IF AI CONFIG EXISTS: ');
  var configFile = localStorage.getItem(aiConfigFile);
  if (configFile !== null) {
    console.log(' - ' + aiConfigFile + ' exists...');
    return true;
  } else {
    // The item 'aiConfigFile' does not exist in local storage
    console.log(' - ' + aiConfigFile + ' does not exist');
    return false;
  }
}
function saveAIConfig() {
  console.log('SAVING AI CONFIG: ' + JSON.stringify(aiConfig));
  console.log(' - AI CONFIG FILE: ' + aiConfigFile);
  try {
    localStorage.setItem(aiConfigFile, JSON.stringify(aiConfig));
  } catch (error) {
    console.log(' - ERROR OCCURED WHILE SAVING AI CONFIG:', error);
  }
}
async function loadAIConfig() {
  console.log('LOADING AI CONFIG');

  try {
    aiConfig = chattyConfig;
    setVariables();
    if (localStorage.getItem(aiConfigFile) == null) {
      saveAIConfig();
    }
    aiConfig = JSON.parse(localStorage.getItem(aiConfigFile));
    loadConversations();
    loadMemories();
    return aiConfig;
  } catch {
    console.log(' - FAILED TO CONFIGURE AI CONFIG');
  }
}
function getObjectAiConfig(keyName, lookup = null) {
  const obj = JSON.parse(JSON.stringify(aiConfig));

  function searchObject(obj, keyName, lookup) {
    let result = null;
    for (let prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        if (lookup !== null && prop === keyName && obj[prop] === lookup) {
          return obj; // return entire object if lookup value is specified
        } else if (lookup === null && prop === keyName) {
          return obj[prop]; // return only the value if lookup value is not specified
        }
        if (typeof obj[prop] === 'object' && obj[prop] !== null) {
          result = searchObject(obj[prop], keyName, lookup);
          if (result) {
            return result;
          }
        }
      }
    }
    return result;
  }

  return searchObject(obj, keyName, lookup);
}
function selectById(id) {
  return document.getElementById(id);
}

// VARIABLES

let aiConfig = '';
var maxTokens = 8192;
var maxRetries = 3;
var memoriesToPull = 5;
let textarea = selectById('user-input');
let chatHistoryToggle = 'infinite';
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
let menuHTML;
let memoriesHTML;
let conversationsHTML;
let settingsHTML;
let toolsHTML;
let currentConversationID;
// ASYNC FUNCTIONS

async function fetchData(jsonObjectBody, isStream = false) {
  console.log('FETCHING FROM CLOUDFLARE WORKER NOW');
  console.log(' - JSON OBJECT BODY: ' + jsonObjectBody);
  try {
    const workerUrl = 'https://compass.jrice.workers.dev/';
    const response = await Promise.race([
      fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonObjectBody,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 5000)),
    ]);
    console.log(' - FETCH RESPONSE: ', response);
    if (!response.ok) {
      createErrorBubble('An error occurred during crossh web lookup:<br><br>' + response.status);
      console.error('Error: ' + response.status);
      throw new Error('Error fetching data from the worker.');
    }
    if (isStream) {
      return response.body.getReader();
    } else {
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      console.log('FETCHED DATA: ', data);
      console.log(' - DATA: ' + data);
      return data;
    }
  } catch (error) {
    if (error.message === 'Request timed out') {
      createConsoleBubble('Sorry, the request to fetch data from CloudFlare took longer than expected and was therefore cancelled.');
      createErrorBubble('Error: The request timed out after 5 seconds.');
      return;
    }
    createConsoleBubble("An error occurred while fetching data from CloudFlare. Here's the error message.");
    createErrorBubble(error.message);
    return null;
  }
}
async function fetchCloudFlareMessage(message) {
  console.log('FETCHING DATA FROM CLOUDFLARE');
  let messageToOpenAI = message.content;

  if (!messageToOpenAI) {
    return null;
  }

  const parent = selectById('tool-output-inner');
  const url = extractUrl(messageToOpenAI);

  if (url) {
    createConsoleBubble('Url found. Fetching website data now.');
    try {
      const corsshBody = {
        option: 'corssh',
        corsshRequestBody: JSON.stringify({ url: url }),
      };
      const webdata = await fetchData(JSON.stringify(corsshBody), false);
      if (await webdata) {
        console.log(' - WEBDATA: ' + webdata);
        createConsoleBubble("I managed to retrieve the website data.  Here's what I was able to pull.  I didn't verify the content, so it may be gibberish.");
        createConsoleBubble(webdata);
        createConsoleBubble("I'm sending the website data to get processed now.  It may take a while.");
      }
      messageToOpenAI = messageToOpenAI + '<br><br>' + "WEBSITE DATA: '" + webdata + "'";
      createUserBubble(messageToOpenAI);
    } catch (error) {
      createConsoleBubble("Uh oh, getting to the website was harder than I thought. Here's the error that occured.");
      createErrorBubble(error.message);
    }
  } else {
    createUserBubble(messageToOpenAI);
  }

  const currentDate = new Date().toLocaleString();
  const assistantMessage = { id: generateGUID(), role: 'assistant', timestamp: currentDate, ignore: false, tokens: 0, content: '' };
  const assistantBubble = buildChatBubble(assistantMessage);
  assistantBubble.style.display = 'none';
  parent.prepend(assistantBubble);

  console.log(' - MESSAGE CONTENT: ' + message.content);

  try {
    let chatHistory = await getConversationHistory(5);
    let instructions = await getImportantMemories();
    console.log(JSON.stringify(instructions));
    console.log(' - CHAT HISTORY BEFORE NEW MESSAGE: ' + JSON.stringify(chatHistory));
    const openaiBody = {
      option: 'openai',
      openaiRequestBody: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [...instructions, ...chatHistory, { role: 'user', content: messageToOpenAI }],
        temperature: 0.5,
        stream: true,
      }),
    };
    console.log(' - MESSAGE WITH CHAT HISTORY: ' + JSON.stringify(openaiBody));
    const reader = await fetchData(JSON.stringify(openaiBody), true);
    if (!reader) {
      throw new Error('Failed to read response as a stream');
    }
    console.log(' - RESPONSE FROM CLOUDFLARE/OPENAI: ' + reader);
    const decoder = new TextDecoder('utf-8');
    let remaining = '';
    return new Promise((resolve, reject) => {
      let isFirstLine = true;
      console.log(' - STARTING STREAM');
      reader.read().then(function processText({ done, value }) {
        let assistantContent = '';
        const text = decoder.decode(value);
        let lines = text.split('\n');
        lines[0] = remaining + lines[0];
        if (!text.endsWith('\n')) {
          remaining = lines.pop();
        } else {
          remaining = '';
        }
        if (lines.length > 0) {
          assistantBubble.style.display = '';
        }
        for (const line of lines) {
          //console.log(" - LINE: " + JSON.stringify(line));
          if (isFirstLine) {
            isFirstLine = false;
            continue;
          }
          if (line.startsWith('data: ')) {
            const json = line.slice(6);
            if (json === '[DONE]') {
              assistantMessage.tokens = countTokens(assistantContent);
              assistantMessage.content = assistantBubble.chatBubbleText.innerHTML;
              appendMessageAiConfig(assistantMessage);
              console.log(' - ASSISTANT BUBBLE METADATA: ' + assistantBubble.metadata);
              console.log(' - ASSISTANT BUBBLE CONTENT: ' + assistantBubble.chatBubbleText.innerHTML);
              console.log(' - END OF STREAM');
              return resolve();
            }
            let chunk;
            try {
              chunk = JSON.parse(json);
            } catch (e) {
              console.error('Invalid JSON: ', json, ' Error: ', e);
              continue;
            }
            if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
              const delta = chunk.choices[0].delta;
              //console.log(" - DELTA: " + delta);
              if (delta.content) {
                assistantContent += delta.content;
                assistantBubble.chatBubbleText.innerHTML += assistantContent.replace(/\n/g, '<br>');
                parent.scrollTop = parent.scrollHeight;
              }
            }
          }
        }
        if (done) {
          return resolve();
        }

        return reader.read().then(processText);
      });
    });
  } catch (error) {
    console.error(error);
  }
}

// async function fetchData(jsonObjectBody) {
//     console.log("FETCHING FROM CLOUDFLARE WORKER NOW");
//     console.log(" - JSON OBJECT BODY: " + JSON.stringify(jsonObjectBody));
//     try {
//         const workerUrl = "https://compass.jrice.workers.dev/";
//         const response = await fetch(workerUrl, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//             },
//             body: JSON.stringify(jsonObjectBody),
//         });

//         if (!response.ok) {
//             createErrorBubble("An error occured during corssh web lookup:<br><br>" + response.status);
//             console.error("Error: " + response.status);
//             throw new Error("Error fetching data from the worker.");
//         }
//         const data = await response.json();
//         console.log(" - DATA: " + JSON.stringify(data));
//         return data;
//     } catch (error) {
//         createSystemBubble("An error occured while fetching data from CloudFlare. Here's the error message.");
//         createErrorBubble(error);
//         return null;
//     }

// }
/*async function sendMessageToOpenAI(message, maxTokens) {
  console.log("Sending message to OpenAI - Start");
  if (countTokens(message) >= maxTokens) {
    console.log(" - Max token limit exceeded, reduce your input text and try again...");
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
      //const response = await fetchData("openai", requestParams);
      
      console.log(" - API response: " + JSON.stringify(response));
      const responseData = await response.choices[0].message.content;
      console.log(" - API response received:");
      console.log(responseData);
      return response;
    } catch (error) {
      console.error(error);
    }
  }
  console.log(" - Exceeded maximum number of retries.");
  return "Exceeded maximum number of retries.";
}*/

// async function sendMessageToOpenAI(message) {
//     if (!openaiAPIKey) {
//         console.error("OpenAI API Key is missing!");
//         return;
//     }
//     message = message.message;

//     createUserBubble(message.content);

//     const currentDate = new Date().toLocaleString();
//     const assistantMessage = { id: generateGUID(), role: "assistant", timestamp: currentDate, ignore: false, tokens: 0, content: "" };
//     const assistantBubble = buildChatBubble(assistantMessage);
//     assistantBubble.style.display = "none";
//     parent.prepend(assistantBubble);

//     const contentChunks = chunkText(message.content, 4000);
//     console.log(" - CONTENT CHUNKS: " + JSON.stringify(contentChunks));
//     const SummarizedChunks = await SummarizeChunksOpenAI(contentChunks, openaiAPIKey); // ensure to await the promise here
//     console.log(" - SUMMARIZED CHUNKS: " + JSON.stringify(SummarizedChunks));

//     const requestParams = {
//         method: "POST",
//         headers: { Authorization: `Bearer ${openaiAPIKey}`, "Content-Type": "application/json" },
//         body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "system", content: SummarizedChunks }], temperature: 1, stream: true }),
//     };
//     // rest of your code

//     console.log(" - REQUEST PARAMS: " + JSON.stringify(requestParams));

//     try {
//         const response = await fetch("https://api.openai.com/v1/chat/completions", requestParams);

//         const reader = response.body.getReader();
//         const decoder = new TextDecoder("utf-8");

//         return new Promise((resolve, reject) => {
//             let isFirstLine = true; // Flag to skip the first line
//             reader.read().then(function processText({ done, value }) {
//                 let assistantContent = "";
//                 const text = decoder.decode(value);
//                 const lines = text.split("\n");
//                 if (lines.length > 0) {
//                     assistantBubble.style.display = "";
//                 }
//                 for (const line of lines) {
//                     //console.log(" - LINE: " + JSON.stringify(line));
//                     if (isFirstLine) {
//                         isFirstLine = false;
//                         continue; // Skip the first line starting with "data: "
//                     }
//                     if (line.startsWith("data: ")) {
//                         const json = line.slice(6);
//                         if (json === "[DONE]") {
//                             console.log("Received [DONE] - ending stream.");
//                             return resolve();
//                         }
//                         let chunk;
//                         try {
//                             chunk = JSON.parse(json);
//                         } catch (e) {
//                             console.error("Invalid JSON: ", json, " Error: ", e);
//                             continue;
//                         }
//                         if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
//                             const delta = chunk.choices[0].delta;
//                             if (delta.content) {
//                                 assistantContent += delta.content;
//                                 assistantMessage.tokens = countTokens(assistantContent);
//                                 // Replace '\n' with '<br>' for HTML display
//                                 assistantBubble.chatBubbleText.innerHTML += assistantContent.replace(/\n/g, "<br>");
//                                 parent.scrollTop = parent.scrollHeight;
//                             }
//                         }
//                     }
//                 }
//                 return reader.read().then(processText);
//             });
//         });
//     } catch (error) {
//         console.error("Error in sendMessageToOpenAI:", error);
//     }
// }
// async function fetchCloudFlareMessage(message) {
//     console.log("FETCHING DATA FROM CLOUDFLARE");
//     if (!message.content) {
//         return null;
//     }

//     createUserBubble(message.content);

//     const parent = selectById("tool-output-inner");
//     const url = extractUrl(message.content);

//     if (url) {
//         createSystemBubble("Url found. Fetching website data now.");
//         userBubble.chatBubbleText.innerHTML = message.content;
//         parent.prepend(userBubble);
//         try {
//             const corsshBody = {
//                 option: "corssh",
//                 corsshRequestBody: url,
//             };
//             const webdata = await fetchData(corsshBody);
//             if (await webdata) {
//                 createSystemBubble("I managed to retrieve the website data.  Here's what I was able to pull.  I didn't verify the content, so it may be gibberish.");
//                 createSystemBubble(JSON.stringify(webdata));
//                 createSystemBubble("I'm sending the website data to get processed now.  It may take a while.");
//             }
//         } catch {
//             createSystemBubble("Uh oh, getting to the website was harder than I thought.  Try removing the link from your message or try again later.");
//         }
//     }

//     const currentDate = new Date().toLocaleString();
//     const assistantMessage = { id: generateGUID(), role: "assistant", timestamp: currentDate, ignore: false, tokens: 0, content: "" };
//     const assistantBubble = buildChatBubble(assistantMessage);
//     assistantBubble.style.display = "none";
//     parent.prepend(assistantBubble);

//     const messageToOpenAI = "";
//     console.log(" - MESSAGE CONTENT: " + message.content);
//     if (countTokens(message.content) > 4000) {
//         const contentChunks = chunkText(message.content, 4000, 3);
//         console.log(" - CONTENT CHUNKS: " + JSON.stringify(contentChunks));
//         const SummarizedChunks = await SummarizeChunksOpenAI(contentChunks, openaiAPIKey); // ensure to await the promise here
//         console.log(" - SUMMARIZED CHUNKS: " + JSON.stringify(SummarizedChunks));
//         messageToOpenAI = SummarizedChunks;
//     } else {
//         console.log(" - TOKENS: " + countTokens(message.content));
//     }

//     try {
//         const openaiBody = {
//             "option": "openai",
//             "openaiRequestBody": '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"TEST"}],"temperature":1,"stream":true}',
//         };
//         console.log(openaiBody);
//         const response = await fetchData(openaiBody);
//         console.log(" - RESPONSE FROM CLOUDFLARE/OPENAI: " + response);
//         const reader = response.body.getReader();
//         const decoder = new TextDecoder("utf-8");

//         return new Promise((resolve, reject) => {
//             let isFirstLine = true;
//             reader.read().then(function processText({ done, value }) {
//                 let assistantContent = "";
//                 const text = decoder.decode(value);
//                 const lines = text.split("\n");
//                 if (lines.length > 0) {
//                     assistantBubble.style.display = "";
//                 }
//                 for (const line of lines) {
//                     console.log(" - LINE: " + JSON.stringify(line));
//                     if (isFirstLine) {
//                         isFirstLine = false;
//                         continue;
//                     }
//                     if (line.startsWith("data: ")) {
//                         const json = line.slice(6);
//                         if (json === "[DONE]") {
//                             console.log("Received [DONE] - ending stream.");
//                             return resolve();
//                         }
//                         let chunk;
//                         try {
//                             chunk = JSON.parse(json);
//                         } catch (e) {
//                             console.error("Invalid JSON: ", json, " Error: ", e);
//                             continue;
//                         }
//                         if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
//                             const delta = chunk.choices[0].delta;
//                             console.log(" - DELTA: " + delta);
//                             if (delta.content) {
//                                 assistantContent += delta.content;
//                                 assistantMessage.tokens = countTokens(assistantContent);
//                                 assistantBubble.chatBubbleText.innerHTML += assistantContent.replace(/\n/g, "<br>");
//                                 parent.scrollTop = parent.scrollHeight;
//                             }
//                         }
//                     }
//                 }
//                 return reader.read().then(processText);
//             });
//         });
//     } catch (error) {
//         console.error(error);
//     }
// }

// MISC FUNCTIONS

function countTokens(inputString) {
  try {
    console.log(`COUNTING TOKENS NOW - ${new Date().toISOString()}`);

    if (typeof inputString !== 'string') {
      let inputType = typeof inputString;
      let inputText = '';

      if (inputType === 'object') {
        if (Array.isArray(inputString)) {
          inputType = 'array';
          inputText = inputString.join(' ');
        } else if (inputString !== null) {
          if (inputString.toString() !== '[object Object]') {
            inputText = inputString.toString();
          } else {
            inputText = JSON.stringify(inputString);
          }
        }
      } else if (inputType === 'number' || inputType === 'boolean') {
        inputText = inputString.toString();
      }

      console.log(` - INPUT TYPE: ${inputType}`);
      console.log(` - EXTRACTED TEXT: ${inputText}`);

      createErrorBubble(`An error occured while counting the tokens for the string. Try again later. Input was of type ${inputType}. Extracted text: ${inputText}`);
      throw new Error(`Input must be a string. Received: ${inputType}. Extracted text: ${inputText}`);
    }

    //console.log(" - INPUTSTRING: " + inputString);
    return inputString.split(' ').reduce((tokenCount, token) => tokenCount + (token.trim() ? Math.ceil(token.length / 4) : 0), 0);
  } catch (error) {
    console.error(`Error in countTokens: ${error.message}`);
    return 0; // default return value
  }
}
function getMemoryContent() {
  let memories = loadMemories();
  let memoryContent = '';
  for (let i = 0; i < memories.length; i++) {
    let memoryJSON = memories[i].Memory;
    console.log(memoryJSON);
    let memoryText = memoryJSON['memory-text'];
    let memoryImportance = memoryJSON['important'];
    let memoryTokenLength = memoryJSON['token-length'];
    let memoryTimeStamp = memoryJSON['timestamp'];
    if (memoryImportance === true) {
      memoryContent += "'" + memoryText + "'" + '\n';
    }
  }
  if (memoryContent === '') {
    return ''; // return an empty string instead of undefined
  } else {
    console.log(' - Memory Content: ' + memoryContent);
    return memoryContent;
  }
}
function generateGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// STRING OPERATIONS

function trimMessage(message, maxTokens) {
  if (typeof message !== 'string' || typeof maxTokens !== 'number') {
    throw new Error('Input types: Message should be a string, maxTokens should be a number');
  }
  let tokenCount = 0;
  return message
    .split(' ')
    .filter((token) => {
      if (tokenCount + Math.ceil(token.length / 4) <= maxTokens) {
        tokenCount += Math.ceil(token.length / 4);
        return true;
      }
      return false;
    })
    .join(' ');
}
function extractUrl(string) {
  var pattern = /(https?:\/\/(?:[-\w.]|(?:%[\da-fA-F]{2}))+.*)/i;
  var match = string.match(pattern);
  return match ? match[0] : null;
}
function extractText(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const paragraphs = doc.querySelectorAll('p');
  let extractedText = '';
  for (const p of paragraphs) {
    extractedText += p.textContent + '\n';
  }
  console.log(' - CLEANED UP TEXT: ' + extractedText);
  return extractedText;
}
function chunkText(text, chunkTokenLimit = 1000, chunkNumberLimit = 5) {
  // Average characters per token (for English)
  const charsPerToken = 4; // From OpenAI documentation

  // Characters limit per chunk
  const charsLimit = charsPerToken * chunkTokenLimit;

  const words = text.split(' ');
  let chunks = [];
  let currentChunk = [];
  let currentChunkChars = 0;
  let startIndex = 0;
  let endIndex = 0;

  for (const word of words) {
    // If the chunk number limit has been reached, break the loop
    if (chunks.length === chunkNumberLimit) {
      console.log(`Chunk number limit of ${chunkNumberLimit} reached, stopping chunking.`);
      break;
    }

    if (currentChunkChars + word.length <= charsLimit) {
      currentChunk.push(word);
      currentChunkChars += word.length;
    } else {
      // Add the current chunk to the list of chunks with additional information
      chunks.push({
        text: currentChunk.join(' '),
        tokens: Math.round(currentChunkChars / charsPerToken),
        startIndex: startIndex,
        endIndex: endIndex - 1, // Subtract 1 because we don't want to include the first word of the next chunk
      });

      // Start a new chunk with the current word
      currentChunk = [word];
      currentChunkChars = word.length;
      startIndex = endIndex + 1; // +1 to not include the first space of the current word
    }
    endIndex += word.length + 1; // +1 to account for space
  }

  // Add the last chunk if it's non-empty and we haven't reached the chunk limit
  if (currentChunkChars > 0 && chunks.length < chunkNumberLimit) {
    chunks.push({
      text: currentChunk.join(' '),
      tokens: Math.round(currentChunkChars / charsPerToken),
      startIndex: startIndex,
      endIndex: endIndex,
    });
  } else {
    const systemMessageText = 'You have maxed out your chunk settings, max tokens per chunk: ' + chunkTokenLimit + ', max chunk limit: ' + chunkNumberLimit + '.';
    systemMessage = {
      message: {
        id: generateGUID,
        role: 'system',
        timestamp: currentDate,
        ignore: false,
        tokens: countTokens(systemMessageText),
        content: systemMessageText,
      },
    };
    buildChatBubble(systemMessage);
  }

  // Return chunks as JSON object
  return { chunks };
}

// CONVERSATION AND MESSAGING FUNCTIONS

async function getConversationHistory(limit = null) {
  console.log('GETTING CONVERSATION HISTORY');
  let conversations = getObjectAiConfig('conversations');
  let conversation = conversations.find((convo) => convo.id === currentConversationID);
  let chatHistory = [];

  conversation.messages.forEach((message) => {
    console.log(' - CHECKING MESSAGE');
    console.log(' - MESSAGE: ' + JSON.stringify(message));
    console.log('   - MESSAGE IGNORE STATUS: ' + message.ignore);
    if (!message.ignore) {
      const { role, content } = message;
      chatHistory.push({ role, content });
    }
  });

  // Apply limit if given
  if (limit !== null && limit < chatHistory.length) {
    chatHistory = chatHistory.slice(-limit);
  }

  console.log(' - CHAT HISTORY: ' + JSON.stringify(chatHistory));
  return chatHistory;
}
function loadConversations() {
  console.log('LOADING CONVERSATIONS');
  console.log(' - AI CONFIG: ' + JSON.stringify(aiConfig));
  console.log(' - CONVERSATIONS OBJECT: ' + JSON.stringify(getObjectAiConfig('conversations')));
  const conversations = getObjectAiConfig('conversations');
  const parent = selectById('tool-output-inner');
  const messages = parent.getElementsByClassName('message');

  while (messages.length > 0) {
    console.log('REMOVING MESSAGES NOW...');
    messages[0].remove();
  }

  conversations.forEach((conversationObj) => {
    const messages = conversationObj.messages;
    messages.forEach((message) => {
      let chatBubble = buildChatBubble(message);
      parent.prepend(chatBubble);
    });
  });
}
function newConversation(title) {
  let newConversation = {
    id: generateUuid(),
    title: title,
    timestamp: new Date().toISOString(),
    tokens: 0,
    messages: [],
  };
  let conversations = getObjectAiConfig('conversations');
  conversations.push(newConversation);
  setObjectAiConfig('conversations', conversations);
  conversationId = newConversation.id;
  saveAIConfig();
  return newConversation;
}
function appendMessageAiConfig(message) {
  console.log('STARTING TO APPEND MESSAGES NOW');
  if (getObjectAiConfig('id', message.id)) {
    console.log(' - MESSAGE ALREADY IN AI CONFIG, SKIPPING');
    return;
  }
  console.log(' - MESSAGE: ' + JSON.stringify(message));

  let conversations = getObjectAiConfig('conversations');
  console.log(' - CONVERSATIONS JSON: ' + JSON.stringify(conversations));
  let conversationIndex = conversations.findIndex((convo) => convo.id === currentConversationID);
  console.log(' - CONVERSATION JSON: ' + JSON.stringify(conversations[conversationIndex]));
  conversations[conversationIndex].messages.push(message);
  console.log(' - ADDING MESSAGE TO CONVERSATION: ' + JSON.stringify(conversations[conversationIndex]));
  aiConfig.conversations = conversations;
  saveAIConfig();
}
function buildChatBubble(message) {
  console.log('BUILDING CHAT BUBBLE:\n');
  console.log(' - MESSAGE JSON: ' + JSON.stringify(message));

  const metadata = JSON.stringify(message);
  let currentDate = new Date().toLocaleString();
  if (message.timestamp !== '' && new Date(message.timestamp).getTime() <= 0) {
    currentDate = message.timestamp;
  }

  const chatBubble = document.createElement('div');
  const chatBubbleText = document.createElement('div');
  chatBubble.className = message.role + '-message';
  chatBubble.metadata = metadata;
  chatBubble.chatBubbleText = chatBubbleText;
  chatBubbleText.innerHTML = message.content;
  chatBubbleText.className = 'chatBubbleText';
  chatBubble.appendChild(chatBubbleText);
  console.log(' - APPENDING MESSAGE TO AI CONFIG');
  if (message.content) {
    appendMessageAiConfig(message);
  }
  return chatBubble;
}
function createErrorBubble(message) {
  let currentDate = new Date().toLocaleString();
  const parent = selectById('tool-output-inner');
  parent.prepend(
    buildChatBubble({
      id: generateGUID(),
      role: 'error',
      timestamp: currentDate,
      ignore: true,
      tokens: countTokens(message),
      content: message,
    }),
  );
}
function createConsoleBubble(message) {
  let currentDate = new Date().toLocaleString();
  const parent = selectById('tool-output-inner');
  parent.prepend(
    buildChatBubble({
      id: generateGUID(),
      role: 'app',
      timestamp: currentDate,
      ignore: true,
      tokens: countTokens(message),
      content: message,
    }),
  );
}
function createSystemMessage(message) {
  let currentDate = new Date().toLocaleString();
  const parent = selectById('tool-output-inner');
  parent.prepend(
    buildChatBubble({
      id: generateGUID(),
      role: 'system',
      timestamp: currentDate,
      ignore: false,
      tokens: countTokens(message),
      content: message,
    }),
  );
}
function createUserBubble(message) {
  console.log('CREATING USER BUBBLE');
  console.log(' - MESSAGE: ' + message);
  let currentDate = new Date().toLocaleString();
  const parent = selectById('tool-output-inner');
  parent.prepend(
    buildChatBubble({
      id: generateGUID(),
      role: 'user',
      timestamp: currentDate,
      ignore: false,
      tokens: countTokens(message),
      content: message,
    }),
  );
}
function createAssistantBubble(message) {
  let currentDate = new Date().toLocaleString();
  const parent = selectById('tool-output-inner');
  parent.prepend(
    buildChatBubble({
      id: generateGUID(),
      role: 'assistant',
      timestamp: currentDate,
      ignore: false,
      tokens: countTokens(message),
      content: message,
    }),
  );
}

// MEMORY FUNCTIONS

function isMemoryDuplicate(memory) {
  console.log('CHECKING IF MEMORY IS A DUPLICATE');
  console.log(' - MEMORY: ' + JSON.stringify(memory));

  let memoryContent = memory.content.trim().toLowerCase();
  memoryContent = memoryContent.replace(/(<([^>]+)>)/gi, ''); // Remove HTML tags

  const memoriesContainer = document.getElementById('memoriesContainer');
  const memories = memoriesContainer.getElementsByClassName('memory-container');

  console.log(' - MEMORY COUNT: ' + (memories.length + 1));
  for (let i = 0; i < memories.length; i++) {
    let contentElement = memories[i].querySelector('.memory-content').innerText.trim().toLowerCase();
    console.log(' - MEMORY CONTENT: ' + memoryContent);
    console.log(' - CONTENT ELEMENT: ' + contentElement);

    if (memoryContent === contentElement) {
      console.log(' - Duplicate found, returning true.');
      return true;
    }
  }

  console.log(' - Duplicate not found, returning false.');
  return false;
}
function loadMemories() {
  console.log('LOADING MEMORIES NOW...');
  console.log(' - AI CONFIG: ' + JSON.stringify(aiConfig));
  var memories = aiConfig['memories'];
  var memoriesContainer = selectById('memories');
  console.log(' - MEMORIES: ' + JSON.stringify(memories));
  if (memoriesContainer !== null) {
    console.log(' - MEMORIES FOUND, REMOVING THEM');
    while (memoriesContainer.firstChild) {
      console.log(' - MEMORY: ' + JSON.stringify(memories.firstChild));
      memorimemoriesContaineres.removeChild(memories.firstChild);
    }
  } else {
    console.log(' - NO MEMORIES FOUND');
    aiConfig.memories.forEach(function (memory) {
      console.log(' - Memory being loaded: ' + JSON.stringify(memory));
      appendMemoryBubble(memory);
    });
  }
}
function newMemory(text) {
  const memory = {
    id: generateGUID(),
    icon: '&#x1F9E0;',
    title: 'TITLE',
    content: text,
    important: false,
    tokens: countTokens(text),
    timestamp: null,
  };

  appendMemoryBubble(memory);
  return memory;
}
function appendMemoryBubble(memory) {
  console.log('APPENDING MEMORY BUBBLE NOW...');
  console.log(' - Memory being appended: ' + JSON.stringify(memory));

  if (isMemoryDuplicate(memory)) {
    //createSystemBubble("The memory '" + memory.content.trim() + "' already exists.");
    return null;
  }

  if (!memory.timestamp) {
    memory.timestamp = new Date().toLocaleString();
  }

  var memoriesContainer = document.getElementById('memoriesContainer');

  var memoryContainer = document.createElement('div');
  memoryContainer.id = 'memoryContainer_' + memory.id;
  memoryContainer.className = 'memory-container';

  var memoryToolbarContainer = document.createElement('div');
  memoryToolbarContainer.id = 'memoryToolbarContainer';
  memoryToolbarContainer.className = 'memory-toolbar-container';

  var memoryTitleContainer = document.createElement('div');
  memoryTitleContainer.id = 'memoryTitleContainer';
  memoryTitleContainer.className = 'memory-title-container';

  var memoryTitleIcon = document.createElement('div');
  memoryTitleIcon.id = 'memoryTitleIcon';
  memoryTitleIcon.className = 'memory-title-icon';
  memoryTitleIcon.innerHTML = memory.icon;

  var memoryTitleText = document.createElement('div');
  memoryTitleText.id = 'memoryTitleText';
  memoryTitleText.textContent = memory.title;

  var memoryButtonContainer = document.createElement('div');
  memoryButtonContainer.id = 'memoryButtonContainer';
  memoryButtonContainer.className = 'memory-button-container';

  var memoryImportanceButton = document.createElement('button');
  memoryImportanceButton.id = 'memoryImportanceButton';
  memoryImportanceButton.className = 'button';
  memoryImportanceButton.innerHTML = '&#x1F525;';
  memoryImportanceButton.style.backgroundColor = memory.important ? '#32CD32' : '';
  memoryImportanceButton.addEventListener('click', function () {
    handleImportanceButtonClick(memory, memoryImportanceButton);
  });

  var memoryDeleteButton = document.createElement('button');
  memoryDeleteButton.id = 'memoryDeleteButton';
  memoryDeleteButton.className = 'button';
  memoryDeleteButton.innerHTML = '&#x1F5D1;';
  memoryDeleteButton.addEventListener('click', function () {
    handleDeleteButtonClick(memory, memoryDeleteButton);
  });

  var memoryContentContainer = document.createElement('div');
  memoryContentContainer.id = 'memoryContentContainer';
  memoryContentContainer.className = 'memory-content-container';

  var memoryContent = document.createElement('label');
  memoryContent.id = 'memoryContent';
  memoryContent.className = 'memory-content';
  memoryContent.innerHTML = memory.content;

  var memoryFooter = document.createElement('footer');
  memoryFooter.id = 'memoryFooter';
  memoryFooter.className = 'memory-footer';
  memoryFooter.textContent = memory.timestamp;

  memoryTitleContainer.appendChild(memoryTitleIcon);
  memoryTitleContainer.appendChild(memoryTitleText);
  memoryButtonContainer.appendChild(memoryImportanceButton);
  memoryButtonContainer.appendChild(memoryDeleteButton);
  memoryToolbarContainer.appendChild(memoryTitleContainer);
  memoryToolbarContainer.appendChild(memoryButtonContainer);
  memoryContentContainer.appendChild(memoryContent);
  memoryContainer.appendChild(memoryToolbarContainer);
  memoryContainer.appendChild(memoryContentContainer);
  memoryContainer.appendChild(memoryFooter);

  memoriesContainer.appendChild(memoryContainer);
}
function handleImportanceButtonClick(memory, memoryImportanceButton) {
  console.log('Importance button clicked for memory:', memory);
  for (let i = 0; i < aiConfig.memories.length; i++) {
    if (aiConfig.memories[i].id === memory.id) {
      aiConfig.memories[i].important = !aiConfig.memories[i].important;
      if (aiConfig.memories[i].important) {
        memoryImportanceButton.style.backgroundColor = '#32CD32';
      } else {
        memoryImportanceButton.style.backgroundColor = '';
      }
      saveAIConfig();
      break;
    }
  }
}
function handleDeleteButtonClick(memory, memoryDeleteButton) {
  console.log('Delete button clicked for memory:', memory);
  var memoryContainer = document.getElementById('memoryContainer_' + memory.id);
  if (memoryContainer) {
    for (let i = 0; i < aiConfig.memories.length; i++) {
      if (aiConfig.memories[i].id === memory.id) {
        aiConfig.memories.splice(i, 1); // this will remove the item at index i
        saveAIConfig();
        break;
      }
    }
    memoryContainer.parentNode.removeChild(memoryContainer);
  }
}
async function getImportantMemories(limit = null) {
  console.log('GETTING IMPORTANT MEMORIES');
  
  let memories = getObjectAiConfig('memories');
  
  // Filter out the important memories
  let importantMemories = memories.filter(memory => memory.important === true);
  
  let memoryMessages = [];

  importantMemories.forEach((memory) => {
    console.log(' - CHECKING MEMORY');
    console.log(' - MEMORY: ' + JSON.stringify(memory));
    const content = memory.content;
    memoryMessages.push({ role: 'system', content });
  });

  // Apply limit if given
  if (limit !== null && limit < memoryMessages.length) {
    memoryMessages = memoryMessages.slice(-limit);
  }

  console.log(' - MEMORY MESSAGES: ' + JSON.stringify(memoryMessages));
  return memoryMessages;
}


// DOCUMENT FUNCTIONS

// Define global variables to store the HTML contents

async function fetchHTML(htmlFileRelativePath, variableName) {
  window[variableName] = await getHtmlFileContent(htmlFileRelativePath);
  console.log;
}

// function handleDrag(event, ui, menuContainer, popoutMenu, parent) {
//   // Store initial display state

//   var rightEdge = ui.position.left + menuContainer.outerWidth() + popoutMenu.outerWidth() > parent.outerWidth();
//   var bottomEdge = ui.position.top + menuContainer.outerHeight() + popoutMenu.outerHeight() > parent.outerHeight();

//   // Set display to "flex" during dragging
//   popoutMenu.css({ display: "flex" });

//   if (rightEdge && bottomEdge) {
//     // BOTTOM-RIGHT QUADRANT
//     popoutMenu.css({
//       left: ui.position.left - popoutMenu.outerWidth() + menuContainer.outerWidth(),
//       top: ui.position.top - popoutMenu.outerHeight(),
//     });
//     menuContainer.css({
//       //borderRadius: "0 0 50% 50%",
//     });
//   } else if (bottomEdge) {
//     // BOTTOM-LEFT QUADRANT
//     popoutMenu.css({
//       left: ui.position.left,
//       top: ui.position.top - popoutMenu.outerHeight(),
//     });
//     if (popoutMenu.is(":visible")) {
//       menuContainer.css({
//         //borderRadius: "0 0 50% 50%",
//         //backgroundColor: "white",
//       });
//     } else {
//       menuContainer.css("backgroundColor", "transparent");
//     }
//   } else if (rightEdge) {
//     // TOP-RIGHT QUADRANT
//     popoutMenu.css({
//       left: ui.position.left - popoutMenu.outerWidth(),
//       top: ui.position.top,
//     });
//     if (popoutMenu.is(":visible")) {
//       menuContainer.css({
//         //borderRadius: "0 50% 50% 0",
//         //backgroundColor: "white",
//       });
//     } else {
//       menuContainer.css("backgroundColor", "transparent");
//     }
//   } else {
//     // TOP-LEFT QUADRANT
//     popoutMenu.css({
//       left: ui.position.left + menuContainer.outerWidth(),
//       top: ui.position.top,
//     });
//     if (popoutMenu.is(":visible")) {
//       menuContainer.css({
//         //borderRadius: "50% 0 0 50%",
//         //backgroundColor: "white",
//       });
//     } else {
//       menuContainer.css("backgroundColor", "transparent");
//     }
//   }
// }
// async function handleMenuButtonLoaded() {
//   console.log("MENU BUTTON HANDLER STARTING NOW...");
//   var menuContainer = $("#menu-container");
//   var popoutMenu = $("#popoutMenu");
//   var parent = menuContainer.parent();

//   // Retrieve the position from local storage
//   // var storedPosition = localStorage.getItem("menuContainerPosition");
//   // if (storedPosition) {
//   //   storedPosition = JSON.parse(storedPosition);
//   //   menuContainer.css({
//   //     left: storedPosition.left,
//   //     top: storedPosition.top,
//   //   });
//   // }

//   /*// Attach the handleDrag function to the draggable event
//   menuContainer.draggable({
//     containment: "parent",
//     drag: function (event, ui) {
//       handleDrag(event, ui, menuContainer, popoutMenu, parent);
//     },
//     stop: function (event, ui) {
//       // Store the position in local storage after dragging stops
//       var position = {
//         left: ui.position.left,
//         top: ui.position.top,
//       };
//       localStorage.setItem("menuContainerPosition", JSON.stringify(position));
//     },
//   });*/

//   // var menuButton = $("#menuButton");
//   // var isDragging = false;

//   // menuButton.on({
//   //   mousedown: function () {
//   //     isDragging = false;
//   //   },
//   //   mousemove: function () {
//   //     isDragging = true;
//   //   },
//   //   mouseup: function () {
//   //     if (!isDragging) {
//   //       popoutMenu.toggle();
//   //       if (popoutMenu.is(":visible")) {
//   //         menuContainer.css("backgroundColor", "white");
//   //       } else {
//   //         menuContainer.css("backgroundColor", "transparent");
//   //       }
//   //     }
//   //     isDragging = false;
//   //   },
//   //   click: function (event) {
//   //     if (!isDragging) {
//   //       event.stopPropagation();
//   //     }
//   //   },
//   // });
// }

// MENU ITEMS CLICKS

async function handleSubmitButtonClick() {
  event.preventDefault();

  const [submitButton, userInput, toolOutputInner] = ['submit-button', 'user-input', 'tool-output-inner'].map(selectById);

  let userInputText = userInput.value;
  let currentDate = new Date().toLocaleString();
  const submitButtonText = submitButton.innerHTML;

  let message = {
    id: generateGUID(),
    role: 'user',
    timestamp: currentDate,
    ignore: false,
    tokens: countTokens(userInputText),
    content: userInputText,
  };

  submitButton.disabled = true;
  userInput.disabled = true;
  submitButton.innerHTML = '<div class="loading-circle"></div>';

  await fetchCloudFlareMessage(message);

  // if (extractUrl(userInputText)) {
  //     const url = extractUrl(userInputText);
  //     const content = await sendUrlToCorsSh(url);
  //     const responseText = "TEST";

  //     assistantMessage = {
  //         message: {
  //             id: generateGUID,
  //             role: "system",
  //             timestamp: currentDate,
  //             ignore: false,
  //             tokens: countTokens(responseText),
  //             content: responseText,
  //         },
  //     };

  //     buildChatBubble(assistantMessage);
  // } else {
  //     await sendMessageToOpenAI(message); // await added here
  // }

  userInput.value = '';
  // Moved enabling of input and button here
  submitButton.innerHTML = submitButtonText;
  submitButton.disabled = false;
  userInput.disabled = false;
}
async function handleMenuButtonClick() {
  console.log('MENU BUTTON CLICKED');
  var menuContainer = document.getElementById('menu-container');
  if (menuContainer.style.transform === 'translateY(100%)' || menuContainer.style.transform === '') {
    menuContainer.style.transform = 'translateY(0)';
    menuContainer.style.display = 'flex';
    menuContainer.classList.add('appear');
    await new Promise((resolve) => setTimeout(resolve, 10));
    menuContainer.style.opacity = '1';
  } else {
    menuContainer.style.transform = 'translateY(100%)';
    menuContainer.style.opacity = '0';
    await new Promise((resolve) => setTimeout(resolve, 300));
    menuContainer.classList.remove('appear');
    menuContainer.style.display = 'none';
  }
  handleCloseMenuItem();
}
async function handleMemoriesItemClick() {
  var shortcutCloseToolButton = selectById('shortcutCloseToolButton');
  var popoutMenuItemButtons = selectById('popoutMenuItemButtons');
  var menuItemCardContainer = selectById('memoriesContainer');
  var popoutCardContainers = selectById('popoutCardContainers');
  var messages = selectById('messages');
  if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
    popoutCardContainers.style.display = 'flex';
    menuItemCardContainer.style.display = 'flex';
    popoutMenuItemButtons.style.display = 'none';
    menuItemCardContainer.classList.add('appear');
    shortcutCloseToolButton.style.boxShadow = '0px 0px 8px 4px #007bff';
  } else {
    setTimeout(() => {
      menuItemCardContainer.style.display = 'none';
      messages.style.display = 'none';
      popoutCardContainers.style.display = 'none';
      popoutMenuItemButtons.style.display = 'flex';
      menuItemCardContainer.classList.remove('appear');
      shortcutCloseToolButton.style.boxShadow = '0px 0px 8px 4px #007bff';
    }, 300);
  }
  loadMemories();
}
async function handleToolsItemClick() {
  var shortcutCloseToolButton = selectById('shortcutCloseToolButton');
  var popoutMenuItemButtons = selectById('popoutMenuItemButtons');
  var menuItemCardContainer = selectById('toolsContainer');
  var popoutCardContainers = selectById('popoutCardContainers');
  var messages = selectById('messages');
  if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
    popoutCardContainers.style.display = 'flex';
    menuItemCardContainer.style.display = 'flex';
    popoutMenuItemButtons.style.display = 'none';
    menuItemCardContainer.classList.add('appear');
    shortcutCloseToolButton.style.boxShadow = '0px 0px 8px 4px #007bff';
  } else {
    setTimeout(() => {
      menuItemCardContainer.style.display = 'none';
      messages.style.display = 'none';
      popoutCardContainers.style.display = 'none';
      popoutMenuItemButtons.style.display = 'flex';
      menuItemCardContainer.classList.remove('appear');
      shortcutCloseToolButton.style.boxShadow = '';
    }, 300);
  }
  //loadMemories();
  //loadMemories();
}
async function handleConversationsItemClick() {
  var shortcutCloseToolButton = selectById('shortcutCloseToolButton');
  var popoutMenuItemButtons = selectById('popoutMenuItemButtons');
  var menuItemCardContainer = selectById('conversationsContainer');
  var popoutCardContainers = selectById('popoutCardContainers');
  var messages = selectById('messages');
  if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
    popoutCardContainers.style.display = 'flex';
    menuItemCardContainer.style.display = 'flex';
    popoutMenuItemButtons.style.display = 'none';
    menuItemCardContainer.classList.add('appear');
    shortcutCloseToolButton.style.boxShadow = '0px 0px 8px 4px #007bff';
  } else {
    setTimeout(() => {
      menuItemCardContainer.style.display = 'none';
      messages.style.display = 'none';
      popoutCardContainers.style.display = 'none';
      popoutMenuItemButtons.style.display = 'flex';
      menuItemCardContainer.classList.remove('appear');
    }, 300);
  }
}
async function handleSettingsItemClick() {
  var shortcutCloseToolButton = selectById('shortcutCloseToolButton');
  var popoutMenuItemButtons = selectById('popoutMenuItemButtons');
  var menuItemCardContainer = selectById('settingsContainer');
  var popoutCardContainers = selectById('popoutCardContainers');
  var messages = selectById('messages');
  if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
    popoutCardContainers.style.display = 'flex';
    menuItemCardContainer.style.display = 'flex';
    popoutMenuItemButtons.style.display = 'none';
    menuItemCardContainer.classList.add('appear');
  } else {
    setTimeout(() => {
      menuItemCardContainer.style.display = 'none';
      messages.style.display = 'none';
      popoutCardContainers.style.display = 'none';
      popoutMenuItemButtons.style.display = 'flex';
      menuItemCardContainer.classList.remove('appear');
      shortcutCloseToolButton.style.boxShadow = '';
    }, 300);
  }
}
async function handleChattyClick() {
  console.log('Chatty clicked');
  aiConfig = chattyConfig;
  loadAIConfig();
}
async function handleChickenClick() {
  console.log('Chicken clicked');
  aiConfig = chickenConfig;
  loadAIConfig();
}
async function handleSummarizerClick() {
  console.log('Summarizer clicked');
  aiConfig = summarizerConfig;
  loadAIConfig();
}
async function handleArticulatorClick() {
  console.log('Articulator clicked');
  aiConfig = articulatorConfig;
  loadAIConfig();
}
async function handleResetButtonClick() {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '9999';
  // Create prompt box
  const promptBox = document.createElement('div');
  promptBox.style.backgroundColor = 'white';
  promptBox.style.padding = '20px';
  promptBox.style.borderRadius = '5px';
  promptBox.style.textAlign = 'center';
  overlay.appendChild(promptBox);
  // Create prompt text
  const promptText = document.createElement('p');
  promptText.textContent = 'Reset application to default settings?';
  promptBox.appendChild(promptText);
  // Create yes button
  const yesButton = document.createElement('button');
  yesButton.textContent = 'Yes';
  yesButton.style.marginRight = '10px';
  yesButton.className = 'button';
  promptBox.appendChild(yesButton);
  // Create no button
  const noButton = document.createElement('button');
  noButton.textContent = 'No';
  noButton.className = 'button';
  promptBox.appendChild(noButton);
  // Append the overlay to the document body
  document.body.appendChild(overlay);
  // Add event listeners to the buttons
  yesButton.addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    var cookies = document.cookie.split('; ');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i];
      var eqPos = cookie.indexOf('=');
      var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    alert('Compass AI has been cleared and reset!');
    location.reload();
  });
  noButton.addEventListener('click', () => {
    // Remove the overlay
    document.body.removeChild(overlay);
  });
}
async function handlesShortcutClipboardButtonClick() {
  const copiedText = [...selectById('tool-output').children].map((child) => child.textContent).join('\n');
  if (copiedText.trim() !== '') {
    navigator.clipboard.writeText(copiedText);
    console.log('Text copied to clipboard:', copiedText);
  }
}
async function handleShortcutCloseToolButton() {
  var popoutCardContainers = document.getElementById('popoutCardContainers');
  var children = popoutCardContainers.children;
  for (var i = 0; i < children.length; i++) {
    children[i].style.display = 'none';
  }
  var popoutMenuItemButtons = document.getElementById('popoutMenuItemButtons');
  popoutCardContainers.style.display = 'none';
  popoutMenuItemButtons.style.display = 'flex';
  shortcutCloseToolButton.style.boxShadow = '';
}
async function handleMemoryCreation(e) {
  console.log('CREATING NEW MEMORY NOW...');
  e.preventDefault();
  const selectedText = window.getSelection().toString();
  if (selectedText.length <= 0) {
    console.log(' - Select text to create a memory');
    return null;
  }
  const memoryButton = e.target;
  memoryButton.disabled = true;
  let memory = newMemory(selectedText);
  aiConfig.memories.push(memory);
  saveAIConfig();
  window.getSelection().removeAllRanges();
  memoryButton.disabled = false;
}
async function handleHistoryToggleButton() {
  console.log('CHAT HISTORY TOGGLE PRESSED');
  const toggleButton = selectById('chatHistoryToggle');
  if (chatHistoryToggle === 'infinite') {
    chatHistoryToggle = 'aiLastOutput';
  } else if (chatHistoryToggle === 'aiLastOutput') {
    chatHistoryToggle = 'currentInput';
    toggleButton.innerHTML = '&#x1F4D7;';
  } else if (chatHistoryToggle === 'currentInput') {
    chatHistoryToggle = 'infinite';
    toggleButton.innerHTML = '&#x267E;&#xFE0F;';
  } else {
    chatHistoryToggle = 'infinite';
    toggleButton.innerHTML = '&#x267E;&#xFE0F;';
  }
  console.log(' - Chat history toggle is now set to ' + chatHistoryToggle);
}
async function handleGuidesItemClick() {
  var shortcutCloseToolButton = selectById('shortcutCloseToolButton');
  var popoutMenuItemButtons = selectById('popoutMenuItemButtons');
  var menuItemCardContainer = selectById('guidesContainer');
  var popoutCardContainers = selectById('popoutCardContainers');
  var messages = selectById('messages');
  if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
    popoutCardContainers.style.display = 'flex';
    menuItemCardContainer.style.display = 'flex';
    popoutMenuItemButtons.style.display = 'none';
    menuItemCardContainer.classList.add('appear');
    shortcutCloseToolButton.style.boxShadow = '0px 0px 8px 4px #007bff';
  } else {
    setTimeout(() => {
      menuItemCardContainer.style.display = 'none';
      messages.style.display = 'none';
      popoutCardContainers.style.display = 'none';
      popoutMenuItemButtons.style.display = 'flex';
      menuItemCardContainer.classList.remove('appear');
      shortcutCloseToolButton.style.boxShadow = '';
    }, 300);
  }
}
async function handleGuideGettingStarted() {
  const overlayJSON = {
    title: 'Getting started with Compass AI',
    image: 'assets/guides/Getting Started.gif',
    description:
      'To get started, simply enter a message in the chat to start a conversation.',
    altText: '1. Open the menu.\n2. Click the reset icon (which looks like a circular arrow).\n3. A confirmation overlay will show. Click "Yes" to clear the app settings.',
  };

  guideShowOverlay(overlayJSON);
}
async function handlePopoutMenuItemLoading() {
  selectById('popoutMenuItemCompassGuides').addEventListener('click', handleGuidesItemClick);
  selectById('popoutMenuItemMemories').addEventListener('click', handleMemoriesItemClick);
  selectById('popoutMenuItemTools').addEventListener('click', handleToolsItemClick);
  selectById('popoutMenuItemSettings').addEventListener('click', handleSettingsItemClick);
  selectById('popoutMenuItemConversations').addEventListener('click', handleConversationsItemClick);
  selectById('popoutMenuItemCompassGuides').addEventListener('click', handleGuidesItemClick);
  selectById('guideGettingStarted').addEventListener('click', handleGuideGettingStarted);
}

// REACT


function guideShowOverlay(jsonHelpBody, parentOfHelpButton) {
  const mainWrapper = document.getElementById('main-wrapper');
  let overlayContainer = null;
  let overlayRoot = null;

  const handleShow = () => {
    overlayContainer = document.createElement('div');
    mainWrapper.appendChild(overlayContainer);
    overlayRoot = ReactDOM.createRoot(overlayContainer);
    renderOverlay();
  };
  const handleHide = () => {
    overlayRoot.unmount();
    mainWrapper.removeChild(overlayContainer);
  };
  const renderOverlay = () => {
    const overlay = React.createElement(
      guideOverlayContainer,
      {},
      React.createElement(
        guideOverlayContent,
        {},
        React.createElement(
          'div',
          {
            className: 'overlay-header',
            style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' },
          },
          React.createElement('h2', { className: 'overlay-title' }, jsonHelpBody.title),
          React.createElement(guideCloseButton, { onClick: handleHide }, 'X'),
        ),
        React.createElement(
          guideImageContainer,
          {},
          React.createElement('img', {
            className: 'overlay-image',
            src: jsonHelpBody.image,
            alt: marked.parse(jsonHelpBody.altText),
            style: {
                border: "2px black solid",
                width: "100%",
                height: 'auto',  // Keep the aspect ratio
                maxWidth: '600px',
                maxHeight: '600px', // Ensure it's not taller than the viewport
                borderRadius: '10px',
            },
            onError: (e) => {
              e.target.style.display = 'none';
              document.querySelector('.alt-text-container').style.display = 'block';
            },
        }),
        
          React.createElement('div', {
            className: 'alt-text-container',
            dangerouslySetInnerHTML: { __html: marked.parse(jsonHelpBody.altText) },
            style: {
              display: 'none',
            },
          }),
        ),
        React.createElement('p', { className: 'overlay-description', dangerouslySetInnerHTML: { __html: marked.parse(jsonHelpBody.description) } }),
      ),
    );
    overlayRoot.render(overlay);
  };

  const initialButton = React.createElement(
    'button',
    {
      className: 'toggle-help-btn',
      onClick: handleShow,
      style: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '30px',
        height: '30px',
        backgroundColor: 'rgba(0, 0, 0, .2)',
        border: 'none',
        borderRadius: '50%',
        margin: '10px',
        color: 'white',
        boxShadow: '0px 0px 10px 5px black',
      },
    },
    '?',
  );

  // If parentOfHelpButton is defined, render the button. Otherwise, show the overlay directly.
  if (parentOfHelpButton) {
    const helpButtonParent = document.getElementById(parentOfHelpButton);
    const buttonContainer = document.createElement('div');
    helpButtonParent.appendChild(buttonContainer);
    const buttonRoot = ReactDOM.createRoot(buttonContainer);
    buttonRoot.render(initialButton);
  } else {
    handleShow();
  }
}

// DOC LOADED
async function handleCloseMenuItem() {
  console.log('TEST BUTTON PRESSED...');
  console.log('MENU BUTTON CLICKED');

  var popoutCardContainers = document.getElementById('popoutCardContainers');
  var children = popoutCardContainers.children;

  for (var i = 0; i < children.length; i++) {
    children[i].style.display = 'none';
  }

  var popoutMenuItemButtons = document.getElementById('popoutMenuItemButtons');
  popoutCardContainers.style.display = 'none';
  popoutMenuItemButtons.style.display = 'flex';
}

async function TestButton() {}

// async function getFirstId(htmlFileRelativePath) {
//     // Retrieve the HTML content
//     const htmlContent = await getHtmlFileContent(htmlFileRelativePath);

//     // Find the first ID in the HTML content
//     const firstIdMatch = htmlContent.match(/id="([^"]+)"/);
//     if (firstIdMatch && firstIdMatch[1]) {
//         return firstIdMatch[1];
//     }

//     return null; // No ID found
// }
// async function buildContainerCard(htmlFileRelativePath) {
//     let cardOverlay = document.createElement("div");
//     cardOverlay.className = "card-overlay";
//     let htmlContent = await getHtmlFileContent(htmlFileRelativePath);
//     cardOverlay.innerHTML = htmlContent;
//     const firstIdMatch = htmlContent.match(/id="([^"]+)"/);
//     if (firstIdMatch && firstIdMatch[1]) {
//         const firstId = firstIdMatch[1];
//         cardOverlay.id = `${firstId}-card`;
//     }
//     let footer = document.createElement("div");
//     footer.className = "card-footer";
//     let closeButton = document.createElement("button");
//     closeButton.className = "close-button";
//     closeButton.innerHTML = "&times;";
//     closeButton.addEventListener("click", function () {
//         const container = document.getElementById("popoutMenuItems");
//         for (let sibling of container.children) {
//             if (sibling.id.endsWith("-card")) {
//                 sibling.style.display = "none";
//             } else if (sibling !== cardOverlay) {
//                 sibling.style.display = "flex";
//             }
//         }
//         cardOverlay.style.display = "none";
//     });
//     footer.appendChild(closeButton);
//     cardOverlay.appendChild(footer);
//     console.log(cardOverlay.innerHTML);
//     return cardOverlay;
// }
// async function getHtmlFileContent(htmlFileRelativePath) {
//     try {
//         const response = await fetch(htmlFileRelativePath);
//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         } else {
//             const htmlContent = await response.text();
//             return htmlContent;
//         }
//     } catch (error) {
//         console.error(`Failed to fetch HTML content: ${error}`);
//         return "";
//     }
// }
// // async function fetchMenuHTML() {
// //   try {
// //     console.log("FETCHING MENU NOW...");
// //     const response = await fetch("html/menu.html");
// //     const data = await response.text();

// //     let dataWithClass = '<div class="hidden">' + data + "</div>";

// //     const menuContainer = document.getElementById("menu-container");
// //     menuContainer.insertAdjacentHTML("afterbegin", dataWithClass);

// //     const menuLoadedEvent = new CustomEvent("menuLoaded");
// //     document.dispatchEvent(menuLoadedEvent);
// //   } catch (error) {
// //     console.error(" - Error fetching menu:", error);
// //   }
// // }

// // const chunkLimitReachedMessage = "Chunk limit of ${chunkLimit} reached, stopping summarization.";
// // let message = {
// //     message: {
// //         id: generateGUID,
// //         role: "system",
// //         timestamp: currentDate,
// //         ignore: false,
// //         tokens: countTokens(chunkLimitReachedMessage),
// //         content: chunkLimitReachedMessage,
// //     },
// // };
async function SummarizeChunksOpenAI(ChunksToSummarize) {
  let json_array_responses = '';
  console.log('SUMMARIZING TEXT CHUNKS NOW');
  console.log(' - CHUNKS TO SUMMARIZE: ' + JSON.stringify(ChunksToSummarize));
  let chunkHistory = [{ role: 'system', content: 'Summarizing chunked text, retaining as much critical detail from each chunk as possible.' }];
  for (let chunk of ChunksToSummarize.chunks) {
    let chunkText = chunk.text;
    console.log(' - CURRENT CHUNK: ' + chunkText);
    let chunkTextBody = { role: 'system', content: chunkText };
    let message = {
      id: generateGUID(),
      role: 'user',
      timestamp: currentDate,
      ignore: false,
      tokens: countTokens(chunkText),
      content: chunkText,
    };
    const response = await fetchCloudFlareMessage(message);

    chunkHistory.push(response);
  }
  return chunkHistory;
}

// PRE LOAD CONFIGURATIONS

function setVariables() {
  console.log('SETTING VARIABLES NOW');
  aiName = aiConfig['ai-name'];
  aiPersonality = aiConfig['ai-personality'];
  aiGoals = aiConfig['ai-goals'];
  outputFormats = aiConfig['output formats'];
  outputFormatTemplates = aiConfig['output format templates'];
  inputFormats = aiConfig['input formats'];
  aiContext = aiConfig['ai context'];
  aiDomainExpertise = aiConfig['ai domain expertise'];
  aiTone = aiConfig['ai tone'];
  memoriesDivContainer = selectById('memories');
  aiConfigFile = 'aiconfig-' + aiName;
  currentConversationID = aiConfig.conversations[0].id;
  console.log(' - CURRENT CONVERSATION ID: ' + currentConversationID);
}
function setUpEventListeners() {
  document.addEventListener('click', (event) => {});

  // Form submit button
  const submitButton = document.getElementById('submit-button');
  submitButton.addEventListener('click', handleSubmitButtonClick);
  console.log('MENU LOADED SUCCESSFULLY...');

  // Form input field
  const formInputField = document.getElementById('user-input'); // replace 'input-field' with the ID of your input field
  formInputField.addEventListener('keyup', (event) => {
    if (event.key === '0') {
      event.preventDefault();
      handleSubmitButtonClick(event);
    }
  });

  // Menu Button
  const menuButton = document.getElementById('menuButton');
  menuButton.addEventListener('click', handleMenuButtonClick);

  // // Clipboard Button
  const clipboardButton = document.getElementById('shortcutClipboardButton');
  clipboardButton.addEventListener('click', handlesShortcutClipboardButtonClick);

  // // Memory Button
  const memoryButton = document.getElementById('shortcutMemoryButton');
  memoryButton.addEventListener('click', handleMemoryCreation);

  // // Test Button
  const testButton = document.getElementById('shortcutTestButton');
  testButton.addEventListener('click', TestButton);

  // // Reset App Button
  const resetButton = document.getElementById('shortcutResetToDefaults');
  resetButton.addEventListener('click', handleResetButtonClick);

  // // Toggle History Button
  const historyToggleButton = document.getElementById('shortcutHistoryToggle');
  historyToggleButton.addEventListener('click', handleHistoryToggleButton);

  // // Close Menu Item
  const shortcutCloseToolButton = document.getElementById('shortcutCloseToolButton');
  shortcutCloseToolButton.addEventListener('click', handleShortcutCloseToolButton);

  handlePopoutMenuItemLoading();

  // Make all buttons support touch events
  const buttons = Array.from(document.getElementsByClassName('button'));
  buttons.forEach((button) => {
    // button.addEventListener("touchstart", event => {
    //     button.click();
    // });
  });
}
async function checkAndLoadAiConfig() {}

document.addEventListener('DOMContentLoaded', () => {
  console.log('COMPASS AI DOCUMENT LOADED...');

  // Set Initial Variables

  // Load html
  //fetchHTML("html/menu.html", "menuHTML");
  //fetchMenuHTML();

  // Event listeners
  window.addEventListener('load', function () {
    setTimeout(function () {
      setUpEventListeners();

      const factoryResetConfig = {
        title: 'How to factory reset the app',
        image: 'https://giphy.com/gifs/YellowstoneTV-yellowstone-yellowstonetv-tv-hVazFLob1BnLpuWoXx',
        description:
          'To reset the app, follow these steps:\n\n1. Open the menu.\n2. Click the <i class="fi-rr-rotate"></i> icon.\n3. A confirmation overlay will show. Click "Yes" to clear the app settings.',
        altText: '1. Open the menu.\n2. Click the reset icon (which looks like a circular arrow).\n3. A confirmation overlay will show. Click "Yes" to clear the app settings.',
      };

      guideShowOverlay(factoryResetConfig, 'main-wrapper');
    }, 100);
  });

  // Check if AI config file exists
  loadAIConfig();
});
