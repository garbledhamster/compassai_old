import { chattyConfig } from './tools/chatty.js';
import { summarizerConfig } from './tools/summarizer.js';
import { articulatorConfig } from './tools/articulator.js';
import { chickenConfig } from './tools/chicken.js';
import { guideOverlayContainer, guideOverlayContent, guideImageContainer, guideCloseButton } from '/dev/js/react/guide.js';
import { isMemoryDuplicate, newMemory } from '/dev/js/memories.js';
import { generateGUID, countTokens, trimMessage, extractUrl, extractText, chunkText, SummarizeChunksOpenAI } from '/dev/js/general.js';

// AI CONFIG CONTROLS //

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

// VARIABLES //

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

// ASYNC FUNCTIONS //

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
			new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 15000)),
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
				createConsoleBubble("I managed to retrieve the website data. I'm sending the website data to get processed now.  It may take a while.");
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
	let chatHistory = await getConversationHistory(5);
	let instructions = await getImportantMemories(2);
	console.log(' - INSTRUCTIONS: ' + JSON.stringify(instructions));
	instructions.forEach((instruction) => {
		createSystemMessage(instruction.content);
	});

	const currentDate = new Date().toLocaleString();
	const assistantMessage = { id: generateGUID(), role: 'assistant', timestamp: currentDate, ignore: false, tokens: 0, content: '' };
	const assistantBubble = buildChatBubble(assistantMessage);
	assistantBubble.style.display = 'none';
	parent.prepend(assistantBubble);

	console.log(' - MESSAGE CONTENT: ' + message.content);

	try {
		console.log(' - CHAT HISTORY BEFORE NEW MESSAGE: ' + JSON.stringify(chatHistory));

		const openaiBody = {
			option: 'openai',
			openaiRequestBody: JSON.stringify({
				model: 'gpt-3.5-turbo',
				messages: [...instructions, ...chatHistory, { role: 'user', content: messageToOpenAI }],
				temperature: .9,
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
							assistantMessage.content = assistantBubble.chatBubbleText.innerText;
							assistantMessage.content = marked.parse(assistantMessage.content);
							appendMessageAiConfig(assistantMessage);
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
								assistantBubble.chatBubbleText.innerText += assistantContent;
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

// CONVERSATION AND MESSAGING FUNCTIONS //

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

	let currentDate = new Date().toLocaleString();
	if (message.timestamp !== '' && new Date(message.timestamp).getTime() <= 0) {
		currentDate = message.timestamp;
	}
	const chatBubble = document.createElement('div');
	const chatBubbleText = document.createElement('div');
	chatBubble.className = message.role + '-message';
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
			role: 'console',
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

// MEMORY FUNCTIONS //
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
	let importantMemories = memories.filter((memory) => memory.important === true);

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

// MENU ITEMS CLICKS //

//// HOT BAR ITEMS
async function handlesShortcutClipboardButtonClick() {
	const copiedText = [...selectById('tool-output').children].map((child) => child.textContent).join('\n');
	if (copiedText.trim() !== '') {
		navigator.clipboard.writeText(copiedText);
		console.log('Text copied to clipboard:', copiedText);
	}
}
async function TestButton() {}
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
	appendMemoryBubble(memory);
	aiConfig.memories.push(memory);
	saveAIConfig();
	window.getSelection().removeAllRanges();
	memoryButton.disabled = false;
}
async function handleResetButtonClick() {
	const overlay = document.createElement('div');
	overlay.style.position = 'absolute';
	overlay.style.top = '0';
	overlay.style.left = '0';
	overlay.style.width = '100%';
	overlay.style.height = '100%';
	overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
	overlay.style.display = '';
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
async function handleShortcutCloseToolButton() {
	var popoutCardContainers = document.getElementById('popoutCardContainers');
	var children = popoutCardContainers.children;
	var visibleChildExists = false;

	for (var i = 0; i < children.length; i++) {
		if (children[i].style.display !== 'none') {
			visibleChildExists = true;
		}
		children[i].style.display = 'none';
	}

	popoutCardContainers.style.display = 'none';

	var popoutMenuItemButtons = document.getElementById('popoutMenuItemButtons');
	popoutMenuItemButtons.style.display = '';

	var shortcutCloseToolButton = document.getElementById('shortcutCloseToolButton');
	shortcutCloseToolButton.style.boxShadow = '';

	if (!visibleChildExists) handleMenuButtonClick();
}
//// MENU ITEMS
async function handleGuidesItemClick() {
	var shortcutCloseToolButton = selectById('shortcutCloseToolButton');
	var popoutMenuItemButtons = selectById('popoutMenuItemButtons');
	var menuItemCardContainer = selectById('guidesContainer');
	var popoutCardContainers = selectById('popoutCardContainers');
	var messages = selectById('messages');
	if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
		popoutCardContainers.style.display = '';
		menuItemCardContainer.style.display = '';
		popoutMenuItemButtons.style.display = 'none';
		menuItemCardContainer.classList.add('appear');
	} else {
		setTimeout(() => {
			menuItemCardContainer.style.display = 'none';
			messages.style.display = 'none';
			popoutCardContainers.style.display = 'none';
			popoutMenuItemButtons.style.display = '';
			menuItemCardContainer.classList.remove('appear');
		}, 300);
	}
}
async function handleMemoriesItemClick() {
	var shortcutCloseToolButton = selectById('shortcutCloseToolButton');
	var popoutMenuItemButtons = selectById('popoutMenuItemButtons');
	var menuItemCardContainer = selectById('memoriesContainer');
	var popoutCardContainers = selectById('popoutCardContainers');
	var messages = selectById('messages');
	if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
		popoutCardContainers.style.display = '';
		menuItemCardContainer.style.display = '';
		popoutMenuItemButtons.style.display = 'none';
		menuItemCardContainer.classList.add('appear');
	} else {
		setTimeout(() => {
			menuItemCardContainer.style.display = 'none';
			messages.style.display = 'none';
			popoutCardContainers.style.display = 'none';
			popoutMenuItemButtons.style.display = '';
			menuItemCardContainer.classList.remove('appear');
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
		popoutCardContainers.style.display = '';
		menuItemCardContainer.style.display = '';
		popoutMenuItemButtons.style.display = 'none';
		menuItemCardContainer.classList.add('appear');
	} else {
		setTimeout(() => {
			menuItemCardContainer.style.display = 'none';
			messages.style.display = 'none';
			popoutCardContainers.style.display = '';
			popoutMenuItemButtons.style.display = '';
			menuItemCardContainer.classList.remove('appear');
		}, 300);
	}
}

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
	if (menuContainer.style.display === 'none' || menuContainer.style.display === '') {
		menuContainer.style.display = 'flex';
		menuContainer.style.flexDirection = 'column';
	} else {
		menuContainer.style.display = 'none';
	}
	handleCloseMenuItem();
}
async function handleConversationsItemClick() {
	var shortcutCloseToolButton = selectById('shortcutCloseToolButton');
	var popoutMenuItemButtons = selectById('popoutMenuItemButtons');
	var menuItemCardContainer = selectById('conversationsContainer');
	var popoutCardContainers = selectById('popoutCardContainers');
	var messages = selectById('messages');
	if (menuItemCardContainer.style.display === 'none' || menuItemCardContainer.style.display === '') {
		popoutCardContainers.style.display = '';
		menuItemCardContainer.style.display = '';
		popoutMenuItemButtons.style.display = 'none';
		menuItemCardContainer.classList.add('appear');
	} else {
		setTimeout(() => {
			menuItemCardContainer.style.display = 'none';
			messages.style.display = 'none';
			popoutCardContainers.style.display = '';
			popoutMenuItemButtons.style.display = '';
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
		popoutCardContainers.style.display = '';
		menuItemCardContainer.style.display = '';
		popoutMenuItemButtons.style.display = 'none';
		menuItemCardContainer.classList.add('appear');
	} else {
		setTimeout(() => {
			menuItemCardContainer.style.display = 'none';
			messages.style.display = 'none';
			popoutCardContainers.style.display = 'none';
			popoutMenuItemButtons.style.display = '';
			menuItemCardContainer.classList.remove('appear');
			shortcutCloseToolButton.style.boxShadow = '';
		}, 300);
	}
}

//// TOOLS ITEM CLICK
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

//// GUIDES ITEM CLICK
async function handleGuideGettingStarted() {
	const overlayJSON = {
		title: 'Getting started with Compass AI',
		image: 'assets/guides/Getting Started.gif',
		description: 'To get started, simply enter a message in the chat to start a conversation.',
		altText: '1. Open the menu.\n2. Click the reset icon (which looks like a circular arrow).\n3. A confirmation overlay will show. Click "Yes" to clear the app settings.',
	};

	guideShowOverlay(overlayJSON);
}
async function handleGuideMemoryUsage() {
	const overlayJSON = {
		title: 'Getting started with Compass AI',
		image: 'assets/guides/Memory Usage.gifa',
		description: 'Memories can be used for instructing the AI to do different things.',
		altText: `
    ### How to use a Memory
    1. Open the menu.
    2. Click the reset icon (which looks like a circular arrow).
    3. A confirmation overlay will show. Click "Yes" to clear the app settings.
    `,
	};

	guideShowOverlay(overlayJSON);
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
						style: { display: '', Direction: 'row', justifyContent: 'space-between' },
					},
					React.createElement('h1', { className: 'overlay-title' }, jsonHelpBody.title),
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
							border: '2px black solid',
							width: '100%',
							height: 'auto',
							maxWidth: '600px',
							maxHeight: '600px',
							borderRadius: '10px',
						},
						onError: (e) => {
							e.target.style.display = 'none';
							document.querySelector('.alt-text-container').style.display = 'block';
						},
					}),

					React.createElement('div', {
						className: 'alt-text-container',
						dangerouslySetInnerHTML: { __html: marked.parse(jsonHelpBody.altText.trim()) },
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
	const buttons = Array.from(document.getElementsByClassName('popoutMenuHotBarItem'));
	buttons.forEach((button) => {
		button.addEventListener('touchstart', (event) => {
			button.click();
		});
		button.addEventListener('touchend', (event) => {
			button.click();
			button.style.backgroundColor = '';
			button.style.color = '';
		});
	});
}
async function checkAndLoadAiConfig() {}

document.addEventListener('DOMContentLoaded', () => {
	console.log('COMPASS AI DOCUMENT LOADED...');
	//console.log = function () {};
	console.warn = function () {};

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
	marked.setOptions({
		highlight: function (code, language) {
			if (language && hljs.getLanguage(language)) {
				return hljs.highlight(code, { language }).value;
			} else {
				return hljs.highlightAuto(code).value;
			}
		},
	});
	// Check if AI config file exists
	loadAIConfig();
});
