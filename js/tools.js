import { chattyConfig } from '/compassai_old/js/tools/chatty.js';
import { summarizerConfig } from '/compassai_old/js/tools/summarizer.js';
import { articulatorConfig } from '/compassai_old/js/tools/articulator.js';
import { chickenConfig } from '/compassai_old/js/tools/chicken.js';
import { guideOverlayContainer, guideOverlayContent, guideImageContainer, guideCloseButton } from '/compassai_old/js/react/guide.js';
import { isMemoryDuplicate, newMemory } from '/compassai_old/js/memories.js';
import { generateGUID, countTokens, trimMessage, extractUrl, extractText, createChunkedText, getRandomColor, isMobileScreen, setStyles } from '/compassai_old/js/general.js';

const aiConfigFilePrefix = 'aiconfig-';
let aiConfig = '';
const maxTokens = 8192;
const maxRetries = 3;
const memoriesToPull = 5;
let chatHistoryToggle = 'infinite';
let aiName, aiPersonality, aiGoals, outputFormats, outputFormatTemplates, inputFormats, aiContext, aiDomainExpertise, aiTone, aiConfigFile, memoriesDivContainer, menuHTML, memoriesHTML, conversationsHTML, settingsHTML, toolsHTML, currentConversationID;

const domCache = {
  userInput: document.getElementById('user-input'),
  toolOutputInner: document.getElementById('tool-output-inner'),
  memoriesContainer: document.getElementById('memoriesContainer'),
  menuContainer: document.getElementById('menu-container'),
  popoutCardContainers: document.getElementById('popoutCardContainers'),
  popoutMenuItemButtons: document.getElementById('popoutMenuItemButtons'),
  mainWrapper: document.getElementById('main-wrapper'),
};

function selectById(id) {
  return document.getElementById(id);
}

function checkAiConfigFileExists() {
  return localStorage.getItem(aiConfigFilePrefix + aiName) !== null;
}

function saveAIConfig() {
  try {
    localStorage.setItem(aiConfigFilePrefix + aiName, JSON.stringify(aiConfig));
  } catch (error) {
    createConsoleBubble('Error occurred while saving configuration\n' + error);
  }
}

function setObjectAiConfig(key, value) {
  aiConfig[key] = value;
  saveAIConfig();
}

async function loadAIConfig() {
  try {
    aiConfig = chattyConfig;
    setVariables();
    if (!checkAiConfigFileExists()) {
      saveAIConfig();
    }
    aiConfig = JSON.parse(localStorage.getItem(aiConfigFilePrefix + aiName));
    loadConversations();
    loadMemories();
    return aiConfig;
  } catch (error) {
    console.error('Error loading AI config:', error);
  }
}

function getObjectAiConfig(keyName, lookup = null) {
  function searchObject(obj) {
    for (const [key, value] of Object.entries(obj)) {
      if (lookup !== null && key === keyName && value === lookup) {
        return obj;
      }
      if (lookup === null && key === keyName) {
        return value;
      }
      if (typeof value === 'object' && value !== null) {
        const result = searchObject(value);
        if (result) return result;
      }
    }
    return null;
  }
  return searchObject(JSON.parse(JSON.stringify(aiConfig)));
}

async function fetchData(jsonObjectBody, isStream = false) {
  try {
    const workerUrl = 'https://example.com/worker'; // Replace with actual URL
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonObjectBody,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      createErrorBubble('An error occurred during crossf web lookup:<br><br>' + response.status);
      throw new Error('Error fetching data from the worker.');
    }
    if (isStream) {
      return response.body.getReader();
    } else {
      const contentType = response.headers.get('content-type');
      return contentType && contentType.includes('application/json') ? await response.json() : await response.text();
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      createConsoleBubble('Sorry, the request to fetch data from CloudFlare took longer than expected and was cancelled.');
      createErrorBubble('Error: The request timed out after 15 seconds.');
    } else {
      createConsoleBubble("An error occurred while fetching data from CloudFlare. Here's the error message.");
      createErrorBubble(error.message);
    }
    return null;
  }
}

async function fetchUrlData(url) {
  await createConsoleBubble('Url found. Fetching website data now.');
  try {
    const corsshBody = { option: 'corssh', corsshRequestBody: JSON.stringify({ url }) };
    const webdata = await fetchData(JSON.stringify(corsshBody), false);
    if (webdata) {
      await createConsoleBubble("Retrieved website data. Processing...");
      const webdataChunks = await createChunkedText(webdata);
      const webdataSummarizedChunks = await SummarizeChunksOpenAI(webdataChunks);
      return webdataSummarizedChunks;
    }
  } catch (error) {
    await createConsoleBubble("Error fetching website data.");
    await createErrorBubble(error.message);
  }
}

async function fetchCloudFlareMessage(message) {
  console.log('FETCHING FROM CLOUDFLARE WORKER NOW');
  const messageToOpenAI = message.content;
  const parent = domCache.toolOutputInner;
  const url = extractUrl(messageToOpenAI);
  const currentDate = new Date().toLocaleString();
  let webdata = null;
  await createUserBubble(messageToOpenAI);
  if (url) {
    webdata = await fetchUrlData(url);
  }
  const chatHistory = await getConversationHistory(5);
  const instructions = await getImportantMemories(2);
  const assistantMessage = { id: generateGUID(), role: 'assistant', timestamp: currentDate, ignore: false, tokens: 0, content: '' };
  const assistantBubble = buildChatBubble(assistantMessage);
  assistantBubble.style.display = 'none';
  instructions.forEach(instruction => createSystemMessage(instruction.content));
  parent.prepend(assistantBubble);
  try {
    let openaimessage = [...instructions, ...chatHistory, { role: 'user', content: messageToOpenAI }];
    let openaitemperature = 0.9;
    if (webdata) {
      openaimessage = [{ role: 'system', content: 'Repeat this: ' + webdata }];
      openaitemperature = 0.1;
    }
    const openaiBody = { option: 'openai', openaiRequestBody: JSON.stringify({ model: 'gpt-3.5-turbo', messages: openaimessage, temperature: openaitemperature, stream: true }) };
    const reader = await fetchData(JSON.stringify(openaiBody), true);
    if (!reader) throw new Error('Failed to read response as a stream');
    const decoder = new TextDecoder('utf-8');
    let remaining = '';
    let assistantContent = '';
    let isFirstLine = true;
    return new Promise((resolve, reject) => {
      function processText({ done, value }) {
        if (done) return resolve();
        const text = decoder.decode(value);
        let lines = text.split('\n');
        lines[0] = remaining + lines[0];
        remaining = text.endsWith('\n') ? '' : lines.pop();
        if (lines.length > 0) assistantBubble.style.display = '';
        lines.forEach(line => {
          if (isFirstLine) { isFirstLine = false; return; }
          if (line.startsWith('data: ')) {
            const json = line.slice(6);
            if (json === '[DONE]') {
              assistantMessage.tokens = countTokens(assistantContent);
              assistantMessage.content = assistantBubble.chatBubbleText.textContent;
              assistantBubble.chatBubbleText.innerHTML = marked.parse(assistantMessage.content);
              appendMessageAiConfig(assistantMessage);
              return resolve();
            }
            try {
              const chunk = JSON.parse(json);
              if (chunk.choices?.[0]?.delta?.content) {
                assistantContent += chunk.choices[0].delta.content;
                assistantBubble.chatBubbleText.textContent += chunk.choices[0].delta.content;
                parent.scrollTop = parent.scrollHeight;
              }
            } catch {}
          }
        });
        reader.read().then(processText).catch(reject);
      }
      reader.read().then(processText).catch(reject);
    });
  } catch (error) {
    console.error(error);
  }
}

async function SummarizeChunksOpenAI(chunksToSummarize) {
  const chunkHistory = [];
  for (let i = 0; i < chunksToSummarize.length; i++) {
    const chunkText = chunksToSummarize[i].content;
    if (i === chunksToSummarize.length - 1 && !chunkText.endsWith('.')) continue;
    const systemInstruction = { role: 'system', content: `Cleanup this text without losing any information: "${chunkText}"` };
    await createSystemMessage(systemInstruction.content);
    const openaiBody = { option: 'openai', openaiRequestBody: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [systemInstruction], temperature: 0.9, stream: false }) };
    const response = await fetchData(JSON.stringify(openaiBody));
    if (response?.choices?.[0]?.message?.content) {
      chunkHistory.push(response.choices[0].message.content);
    }
  }
  return chunkHistory;
}

async function getConversationHistory(limit = null) {
  const conversations = getObjectAiConfig('conversations');
  const conversation = conversations.find(convo => convo.id === currentConversationID);
  if (!conversation) return [];
  let chatHistory = conversation.messages.filter(message => !message.ignore).map(({ role, content }) => ({ role, content }));
  if (limit !== null && limit < chatHistory.length) chatHistory = chatHistory.slice(-limit);
  return chatHistory;
}

function loadConversations() {
  const conversations = getObjectAiConfig('conversations');
  const parent = domCache.toolOutputInner;
  while (parent.firstChild) parent.firstChild.remove();
  conversations.forEach(conversationObj => {
    conversationObj.messages.forEach(message => {
      const chatBubble = buildChatBubble(message);
      parent.prepend(chatBubble);
    });
  });
}

function newConversation(title) {
  const newConvo = { id: generateGUID(), title, timestamp: new Date().toISOString(), tokens: 0, messages: [] };
  const conversations = getObjectAiConfig('conversations') || [];
  conversations.push(newConvo);
  setObjectAiConfig('conversations', conversations);
  currentConversationID = newConvo.id;
  saveAIConfig();
  return newConvo;
}

function appendMessageAiConfig(message) {
  if (getObjectAiConfig('id', message.id)) return;
  const conversations = getObjectAiConfig('conversations') || [];
  const convoIndex = conversations.findIndex(convo => convo.id === currentConversationID);
  if (convoIndex !== -1) {
    conversations[convoIndex].messages.push(message);
    aiConfig.conversations = conversations;
    saveAIConfig();
  }
}

function buildChatBubble(message) {
  const currentDate = new Date(message.timestamp).getTime() > 0 ? new Date(message.timestamp).toLocaleString() : new Date().toLocaleString();
  const chatBubble = document.createElement('div');
  const chatBubbleText = document.createElement('div');
  chatBubble.className = `${message.role}-message`;
  chatBubble.chatBubbleText = chatBubbleText;
  chatBubbleText.innerHTML = marked.parse(message.content);
  chatBubbleText.className = 'chatBubbleText';
  chatBubble.appendChild(chatBubbleText);
  if (message.content) appendMessageAiConfig(message);
  return chatBubble;
}

async function createErrorBubble(message) {
  const currentDate = new Date().toLocaleString();
  const parent = domCache.toolOutputInner;
  parent.prepend(buildChatBubble({ id: generateGUID(), role: 'error', timestamp: currentDate, ignore: true, tokens: countTokens(message), content: message }));
}

async function createConsoleBubble(message) {
  const currentDate = new Date().toLocaleString();
  const parent = domCache.toolOutputInner;
  parent.prepend(buildChatBubble({ id: generateGUID(), role: 'console', timestamp: currentDate, ignore: true, tokens: await countTokens(message), content: message }));
}

async function createSystemMessage(message) {
  const currentDate = new Date().toLocaleString();
  const parent = domCache.toolOutputInner;
  parent.prepend(buildChatBubble({ id: generateGUID(), role: 'system', timestamp: currentDate, ignore: false, tokens: await countTokens(message), content: message }));
}

async function createUserBubble(message) {
  const currentDate = new Date().toLocaleString();
  const parent = domCache.toolOutputInner;
  parent.prepend(buildChatBubble({ id: generateGUID(), role: 'user', timestamp: currentDate, ignore: false, tokens: await countTokens(message), content: message }));
}

async function createAssistantBubble(message) {
  const currentDate = new Date().toLocaleString();
  const parent = domCache.toolOutputInner;
  parent.prepend(buildChatBubble({ id: generateGUID(), role: 'assistant', timestamp: currentDate, ignore: false, tokens: await countTokens(message), content: message }));
}

function loadMemories() {
  const memories = aiConfig['memories'] || [];
  const memoriesContainer = domCache.memoriesContainer;
  if (memoriesContainer) {
    while (memoriesContainer.firstChild) memoriesContainer.removeChild(memoriesContainer.firstChild);
    memories.forEach(memory => appendMemoryBubble(memory));
  } else {
    memories.forEach(memory => appendMemoryBubble(memory));
  }
}

function appendMemoryBubble(memory) {
  if (isMemoryDuplicate(memory)) return;
  if (!memory.timestamp) memory.timestamp = new Date().toLocaleString();
  const memoryContainer = document.createElement('div');
  memoryContainer.id = `memoryContainer_${memory.id}`;
  memoryContainer.className = 'memory-container';
  const memoryToolbarContainer = document.createElement('div');
  memoryToolbarContainer.className = 'memory-toolbar-container';
  const memoryTitleContainer = document.createElement('div');
  memoryTitleContainer.className = 'memory-title-container';
  const memoryTitleIcon = document.createElement('div');
  memoryTitleIcon.className = 'memory-title-icon';
  memoryTitleIcon.innerHTML = memory.icon;
  const memoryTitleText = document.createElement('div');
  memoryTitleText.textContent = memory.title;
  const memoryButtonContainer = document.createElement('div');
  memoryButtonContainer.className = 'memory-button-container';
  const memoryImportanceButton = document.createElement('button');
  memoryImportanceButton.className = 'button';
  memoryImportanceButton.innerHTML = '&#x1F525;';
  memoryImportanceButton.style.backgroundColor = memory.important ? '#32CD32' : '';
  memoryImportanceButton.addEventListener('click', () => handleImportanceButtonClick(memory, memoryImportanceButton));
  const memoryDeleteButton = document.createElement('button');
  memoryDeleteButton.className = 'button';
  memoryDeleteButton.innerHTML = '&#x1F5D1;';
  memoryDeleteButton.addEventListener('click', () => handleDeleteButtonClick(memory));
  memoryButtonContainer.appendChild(memoryImportanceButton);
  memoryButtonContainer.appendChild(memoryDeleteButton);
  memoryTitleContainer.appendChild(memoryTitleIcon);
  memoryTitleContainer.appendChild(memoryTitleText);
  memoryToolbarContainer.appendChild(memoryTitleContainer);
  memoryToolbarContainer.appendChild(memoryButtonContainer);
  const memoryContentContainer = document.createElement('div');
  memoryContentContainer.className = 'memory-content-container';
  const memoryContent = document.createElement('label');
  memoryContent.className = 'memory-content';
  memoryContent.innerHTML = memory.content;
  memoryContentContainer.appendChild(memoryContent);
  const memoryFooter = document.createElement('footer');
  memoryFooter.className = 'memory-footer';
  memoryFooter.textContent = memory.timestamp;
  memoryContainer.appendChild(memoryToolbarContainer);
  memoryContainer.appendChild(memoryContentContainer);
  memoryContainer.appendChild(memoryFooter);
  domCache.memoriesContainer.appendChild(memoryContainer);
}

function handleImportanceButtonClick(memory, button) {
  const memIndex = aiConfig.memories.findIndex(mem => mem.id === memory.id);
  if (memIndex !== -1) {
    aiConfig.memories[memIndex].important = !aiConfig.memories[memIndex].important;
    button.style.backgroundColor = aiConfig.memories[memIndex].important ? '#32CD32' : '';
    saveAIConfig();
  }
}

function handleDeleteButtonClick(memory) {
  const memoryContainer = document.getElementById(`memoryContainer_${memory.id}`);
  const memIndex = aiConfig.memories.findIndex(mem => mem.id === memory.id);
  if (memIndex !== -1) {
    aiConfig.memories.splice(memIndex, 1);
    saveAIConfig();
    if (memoryContainer) memoryContainer.remove();
  }
}

async function getImportantMemories(limit = null) {
  const importantMemories = aiConfig.memories.filter(memory => memory.important);
  let memoryMessages = importantMemories.map(memory => ({ role: 'system', content: memory.content }));
  if (limit !== null && limit < memoryMessages.length) memoryMessages = memoryMessages.slice(-limit);
  return memoryMessages;
}

async function handlesShortcutClipboardButtonClick() {
  const copiedText = Array.from(selectById('tool-output').children).map(child => child.textContent).join('\n');
  if (copiedText.trim() !== '') navigator.clipboard.writeText(copiedText);
}

async function TestButton() {
  try {
    console.log('TESTING LAMBDA FUNCTION CORSSH');
    const api = 'https://example.com/api'; // Replace with actual API URL
    const url = 'https://example.com/url'; // Replace with actual URL
    const body = { url };
    const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    console.log(await response.json());
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

async function handleHistoryToggleButton() {
  const toggleButton = selectById('chatHistoryToggle');
  if (chatHistoryToggle === 'infinite') {
    chatHistoryToggle = 'aiLastOutput';
  } else if (chatHistoryToggle === 'aiLastOutput') {
    chatHistoryToggle = 'currentInput';
    toggleButton.innerHTML = '&#x1F4D7;';
  } else {
    chatHistoryToggle = 'infinite';
    toggleButton.innerHTML = '&#x267E;&#xFE0F;';
  }
}

async function handleMemoryCreation(e) {
  e.preventDefault();
  const selectedText = window.getSelection().toString();
  if (selectedText.length <= 0) return;
  const memoryButton = e.target;
  memoryButton.disabled = true;
  const memory = newMemory(selectedText);
  appendMemoryBubble(memory);
  aiConfig.memories.push(memory);
  saveAIConfig();
  window.getSelection().removeAllRanges();
  memoryButton.disabled = false;
}

async function handleResetButtonClick() {
  const overlay = document.createElement('div');
  setStyles(overlay, {
    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '9999'
  });
  const promptBox = document.createElement('div');
  setStyles(promptBox, { backgroundColor: 'white', padding: '20px', borderRadius: '5px', textAlign: 'center' });
  const promptText = document.createElement('p');
  promptText.textContent = 'Reset application to default settings?';
  const yesButton = document.createElement('button');
  setStyles(yesButton, { marginRight: '10px', className: 'button' });
  yesButton.textContent = 'Yes';
  const noButton = document.createElement('button');
  setStyles(noButton, { className: 'button' });
  noButton.textContent = 'No';
  promptBox.appendChild(promptText);
  promptBox.appendChild(yesButton);
  promptBox.appendChild(noButton);
  overlay.appendChild(promptBox);
  document.body.appendChild(overlay);
  yesButton.addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split('; ').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
    });
    alert('Compass AI has been cleared and reset!');
    location.reload();
  });
  noButton.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
}

async function handleShortcutCloseToolButton() {
  const { popoutCardContainers, popoutMenuItemButtons, shortcutCloseToolButton } = domCache;
  let visibleChildExists = false;
  Array.from(popoutCardContainers.children).forEach(child => {
    if (child.style.display !== 'none') visibleChildExists = true;
    child.style.display = 'none';
  });
  popoutCardContainers.style.display = 'none';
  popoutMenuItemButtons.style.display = '';
  shortcutCloseToolButton.style.boxShadow = '';
  if (!visibleChildExists) handleMenuButtonClick();
}

async function handleGuidesItemClick() {
  const { popoutCardContainers, popoutMenuItemButtons } = domCache;
  const menuItemCardContainer = selectById('guidesContainer');
  if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
    popoutCardContainers.style.display = '';
    menuItemCardContainer.style.display = '';
    popoutMenuItemButtons.style.display = 'none';
    menuItemCardContainer.classList.add('appear');
  } else {
    setTimeout(() => {
      menuItemCardContainer.style.display = 'none';
      popoutCardContainers.style.display = 'none';
      popoutMenuItemButtons.style.display = '';
      menuItemCardContainer.classList.remove('appear');
    }, 300);
  }
}

async function handleMemoriesItemClick() {
  const { popoutCardContainers, popoutMenuItemButtons } = domCache;
  const menuItemCardContainer = selectById('memoriesContainer');
  if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
    popoutCardContainers.style.display = '';
    menuItemCardContainer.style.display = '';
    popoutMenuItemButtons.style.display = 'none';
    menuItemCardContainer.classList.add('appear');
  } else {
    setTimeout(() => {
      menuItemCardContainer.style.display = 'none';
      popoutCardContainers.style.display = 'none';
      popoutMenuItemButtons.style.display = '';
      menuItemCardContainer.classList.remove('appear');
    }, 300);
  }
  loadMemories();
}

async function handleToolsItemClick() {
  const { popoutCardContainers, popoutMenuItemButtons } = domCache;
  const menuItemCardContainer = selectById('toolsContainer');
  if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
    popoutCardContainers.style.display = '';
    menuItemCardContainer.style.display = '';
    popoutMenuItemButtons.style.display = 'none';
    menuItemCardContainer.classList.add('appear');
  } else {
    setTimeout(() => {
      menuItemCardContainer.style.display = 'none';
      popoutCardContainers.style.display = 'none';
      popoutMenuItemButtons.style.display = '';
      menuItemCardContainer.classList.remove('appear');
    }, 300);
  }
}

async function handleConversationsItemClick() {
  const { popoutCardContainers, popoutMenuItemButtons } = domCache;
  const menuItemCardContainer = selectById('conversationsContainer');
  if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
    popoutCardContainers.style.display = '';
    menuItemCardContainer.style.display = '';
    popoutMenuItemButtons.style.display = 'none';
    menuItemCardContainer.classList.add('appear');
  } else {
    setTimeout(() => {
      menuItemCardContainer.style.display = 'none';
      popoutCardContainers.style.display = 'none';
      popoutMenuItemButtons.style.display = '';
      menuItemCardContainer.classList.remove('appear');
    }, 300);
  }
}

async function handleSettingsItemClick() {
  const { popoutCardContainers, popoutMenuItemButtons, shortcutCloseToolButton } = domCache;
  const menuItemCardContainer = selectById('settingsContainer');
  if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
    popoutCardContainers.style.display = '';
    menuItemCardContainer.style.display = '';
    popoutMenuItemButtons.style.display = 'none';
    menuItemCardContainer.classList.add('appear');
  } else {
    setTimeout(() => {
      menuItemCardContainer.style.display = 'none';
      popoutCardContainers.style.display = 'none';
      popoutMenuItemButtons.style.display = '';
      menuItemCardContainer.classList.remove('appear');
      shortcutCloseToolButton.style.boxShadow = '';
    }, 300);
  }
}

async function handlePopoutMenuItemLoading() {
  selectById('popoutMenuItemCompassGuides').addEventListener('click', handleGuidesItemClick);
  selectById('popoutMenuItemMemories').addEventListener('click', handleMemoriesItemClick);
  selectById('popoutMenuItemTools').addEventListener('click', handleToolsItemClick);
  selectById('popoutMenuItemSettings').addEventListener('click', handleSettingsItemClick);
  selectById('popoutMenuItemConversations').addEventListener('click', handleConversationsItemClick);
  selectById('guideGettingStarted').addEventListener('click', handleGuideGettingStarted);
  selectById('guideMemoryUsage').addEventListener('click', handleGuideMemoryUsage);
}

function guideShowOverlay(jsonHelpBody, parentOfHelpButton) {
  const { mainWrapper } = domCache;
  let overlayContainer, overlayRoot;
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
          { className: 'overlay-header', style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' } },
          React.createElement('h1', { className: 'overlay-title' }, jsonHelpBody.title),
          React.createElement(guideCloseButton, { onClick: handleHide }, 'X'),
        ),
        React.createElement(
          guideImageContainer,
          {},
          React.createElement('img', {
            className: 'overlay-image',
            src: jsonHelpBody.image,
            alt: '',
            style: { border: '2px black solid', width: '100%', height: 'auto', maxWidth: '600px', maxHeight: '600px', borderRadius: '10px' },
            onError: (e) => { e.target.style.display = 'none'; document.querySelector('.alt-text-container').style.display = 'block'; },
          }),
          React.createElement('div', { className: 'alt-text-container', dangerouslySetInnerHTML: { __html: marked.parse(jsonHelpBody.altText.trim()) }, style: { display: 'none' } }),
        ),
        React.createElement('p', { className: 'overlay-description', dangerouslySetInnerHTML: { __html: marked.parse(jsonHelpBody.description) } }),
      ),
    );
    overlayRoot.render(overlay);
  };
  const initialButton = React.createElement('button', { className: 'toggle-help-btn', onClick: handleShow, style: { position: 'absolute', top: '0', right: '0', width: '30px', height: '30px', backgroundColor: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '50%', margin: '10px', color: 'white', boxShadow: '0px 0px 10px 5px black' } }, '?');
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

function handleGuideGettingStarted() {
  const overlayJSON = {
    title: 'Getting started with Compass AI',
    image: '/compassai_old/assets/guides/Getting Started.gif',
    description: 'To get started, simply enter a message in the chat to start a conversation.',
    altText: '1. Open the menu.\n2. Click the reset icon (which looks like a circular arrow).\n3. A confirmation overlay will show. Click "Yes" to clear the app settings.',
  };
  guideShowOverlay(overlayJSON);
}

function handleGuideMemoryUsage() {
  const overlayJSON = {
    title: 'Memory Usage in Compass AI',
    image: '/compassai_old/assets/guides/Memory Usage.gif',
    description: 'Memories can be used for instructing the AI to perform various tasks.',
    altText: `### How to use a Memory
1. Open the menu.
2. Click the memory icon.
3. Add or manage your memories as needed.`,
  };
  guideShowOverlay(overlayJSON);
}

function loadTermsOfService() {
  const tosWrapper = document.createElement('div');
  const tosContainer = document.createElement('div');
  const tosLogoContainer = document.createElement('div');
  const tosTermsContainer = document.createElement('div');
  const tosButtonsContainer = document.createElement('div');
  const tosPatreonContainer = document.createElement('div');
  setStyles(tosWrapper, { id: 'tosWrapper', display: 'flex', position: 'absolute', height: '100%', width: '100%', backgroundColor: 'rgba(255,255,255,0.5)', zIndex: '9999', top: '0', left: '0', justifyContent: 'center', alignItems: 'center' });
  setStyles(tosContainer, { display: 'flex', flexDirection: 'column', height: '90%', width: '90%', backgroundColor: 'white', borderRadius: '10px', border: '3px solid' });
  setStyles(tosLogoContainer, { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', height: 'max-content', width: '100%' });
  const tosLogoImage = document.createElement('img');
  tosLogoImage.src = '/compassai_old/assets/icon/Compass_AI_Logo_Icon.png';
  setStyles(tosLogoImage, { display: 'flex', padding: '10px', height: 'auto', width: '20%', borderRadius: '10px', minHeight: '80px', minWidth: '80px' });
  const tosLogoText = document.createElement('label');
  tosLogoText.innerText = 'COMPASS AI';
  setStyles(tosLogoText, { display: 'flex', fontSize: '30px' });
  const tosLogoMotto = document.createElement('label');
  tosLogoMotto.innerText = 'AI Personal Assistance';
  setStyles(tosLogoMotto, { display: 'flex', fontSize: '20px' });
  tosLogoContainer.appendChild(tosLogoImage);
  tosLogoContainer.appendChild(tosLogoText);
  tosLogoContainer.appendChild(tosLogoMotto);
  setStyles(tosTermsContainer, { display: 'flex', padding: '10px', height: '100%', width: '100%', borderBottom: '3px solid', borderTop: '3px solid', justifyContent: 'center', alignItems: isMobileScreen() ? 'flex-start' : 'center', overflowY: 'auto' });
  const tosTermsText = document.createElement('label');
  const tosTermsTextMarkdown = `# Terms of Service
1. This is an experimental tool that uses OpenAI's NLP API.
2. Information returned by the tool may not always be accurate or reliable.
3. The tool should be used for informational purposes only and should not be considered as professional advice.
## Disclaimer
1. OpenAI does not guarantee the correctness, completeness, or usefulness of the information provided.
2. This is an Alpha version of the tool, and frequent updates and improvements are expected.
3. Users are responsible for verifying the accuracy of the information obtained through the tool.
4. Any actions taken based on the information provided by the tool are at the user's own risk.
---
By agreeing to these terms and conditions, you are also agreeing to [OpenAI's terms and conditions](https://openai.com/terms).`.trim();
  tosTermsText.innerHTML = marked.parse(tosTermsTextMarkdown);
  tosTermsContainer.appendChild(tosTermsText);
  setStyles(tosPatreonContainer, { display: 'flex', flexDirection: 'column', padding: '10px', height: '200px', width: '100%', justifyContent: 'center', alignItems: 'center', textAlign: 'center' });
  const desiredWidth = isMobileScreen() ? '125px' : '250px';
  const aspectRatio = 5834 / 1188;
  const calculatedHeight = Math.round(parseInt(desiredWidth) / aspectRatio);
  const tosPatreonLogo = document.createElement('button');
  tosPatreonLogo.style.backgroundImage = `url(/compassai_old/assets/patreon/Digital-Patreon-Wordmark_FieryCoral.png)`;
  setStyles(tosPatreonLogo, { padding: '10px', height: `${calculatedHeight}px`, width: `${desiredWidth}`, borderRadius: '10px', border: 'none', cursor: 'pointer', backgroundSize: 'cover', backgroundColor: 'transparent' });
  tosPatreonLogo.addEventListener('click', () => { window.open('https://patreon.com/compassai'); });
  tosPatreonContainer.appendChild(tosPatreonLogo);
  setStyles(tosButtonsContainer, { display: 'flex', flexDirection: 'column', padding: '10px', height: '200px', width: '100%', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderTop: '3px solid' });
  const tosButtonsAcceptTos = document.createElement('button');
  setStyles(tosButtonsAcceptTos, { padding: '10px', height: '50px', width: 'auto', borderRadius: '10px', border: 'none', cursor: 'pointer' });
  tosButtonsAcceptTos.innerText = 'Accept Terms & Conditions';
  tosButtonsAcceptTos.addEventListener('click', () => { localStorage.setItem('acceptedTos', 'true'); tosWrapper.style.display = 'none'; });
  tosButtonsContainer.appendChild(tosButtonsAcceptTos);
  if (localStorage.getItem('acceptedTos')) tosWrapper.style.display = 'none';
  tosContainer.appendChild(tosLogoContainer);
  tosContainer.appendChild(tosTermsContainer);
  tosContainer.appendChild(tosPatreonContainer);
  tosContainer.appendChild(tosButtonsContainer);
  tosWrapper.appendChild(tosContainer);
  return tosWrapper;
}

function setVariables() {
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
  aiConfigFile = aiConfigFilePrefix + aiName;
  currentConversationID = aiConfig.conversations && aiConfig.conversations[0] ? aiConfig.conversations[0].id : generateGUID();
}

function setUpEventListeners() {
  const submitButton = selectById('submit-button');
  submitButton.addEventListener('click', handleSubmitButtonClick);
  const formInputField = selectById('user-input');
  formInputField.addEventListener('keyup', (event) => { if (event.key === '0') handleSubmitButtonClick(event); });
  const menuButton = selectById('menuButton');
  menuButton.addEventListener('click', handleMenuButtonClick);
  const clipboardButton = selectById('shortcutClipboardButton');
  clipboardButton.addEventListener('click', handlesShortcutClipboardButtonClick);
  const memoryButton = selectById('shortcutMemoryButton');
  memoryButton.addEventListener('click', handleMemoryCreation);
  const testButton = selectById('shortcutTestButton');
  testButton.addEventListener('click', TestButton);
  const resetButton = selectById('shortcutResetToDefaults');
  resetButton.addEventListener('click', handleResetButtonClick);
  const historyToggleButton = selectById('shortcutHistoryToggle');
  historyToggleButton.addEventListener('click', handleHistoryToggleButton);
  const shortcutCloseToolButton = selectById('shortcutCloseToolButton');
  shortcutCloseToolButton.addEventListener('click', handleShortcutCloseToolButton);
  handlePopoutMenuItemLoading();
  Array.from(document.getElementsByClassName('popoutMenuHotBarItem')).forEach(button => {
    button.addEventListener('touchstart', () => { button.click(); });
    button.addEventListener('touchend', () => { button.click(); button.style.backgroundColor = ''; button.style.color = ''; });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.warn = () => {};
  window.addEventListener('load', () => {
    setTimeout(() => {
      setUpEventListeners();
      const factoryResetConfig = { title: 'How to factory reset the app', image: '/compassai_old/assets/Reset_to_Defaults.gif', description: 'To reset the app, follow these steps:\n\n1. Open the menu.\n2. Click the reset icon (which looks like a circular arrow).\n3. A confirmation overlay will show. Click "Yes" to clear the app settings.', altText: '1. Open the menu.\n2. Click the reset icon (which looks like a circular arrow).\n3. A confirmation overlay will show. Click "Yes" to clear the app settings.' };
      guideShowOverlay(factoryResetConfig, 'main-wrapper');
    }, 100);
  });
  marked.setOptions({ highlight: (code, language) => language && hljs.getLanguage(language) ? hljs.highlight(code, { language }).value : hljs.highlightAuto(code).value });
  selectById('main-wrapper').appendChild(loadTermsOfService());
  loadAIConfig();
});
