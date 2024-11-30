import { generateGUID, countTokens, trimMessage, extractUrl, extractText, createChunkedText,  } from '/js/general.js';

export function isMemoryDuplicate(memory) {
  //console.log('CHECKING IF MEMORY IS A DUPLICATE');
  // console.log(' - MEMORY: ' + JSON.stringify(memory));

  let memoryContent = memory.content.trim().toLowerCase();
  memoryContent = memoryContent.replace(/(<([^>]+)>)/gi, ''); // Remove HTML tags

  const memoriesContainer = document.getElementById('memoriesContainer');
  const memories = memoriesContainer.getElementsByClassName('memory-container');

  // console.log(' - MEMORY COUNT: ' + (memories.length + 1));
  for (let i = 0; i < memories.length; i++) {
    let contentElement = memories[i].querySelector('.memory-content').innerText.trim().toLowerCase();
    // console.log(' - MEMORY CONTENT: ' + memoryContent);
    // console.log(' - CONTENT ELEMENT: ' + contentElement);

    if (memoryContent === contentElement) {
      // console.log(' - Duplicate found, returning true.');
      return true;
    }
  }
  // console.log(' - Duplicate not found, returning false.');
  return false;
}

export function newMemory(text) {
  const memory = {
    id: generateGUID(),
    icon: '&#x1F9E0;',
    title: 'TITLE',
    content: text,
    important: false,
    tokens: countTokens(text),
    timestamp: null,
  };

  return memory;
}
