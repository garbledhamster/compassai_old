export function generateGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
export function countTokens(inputString) {
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
export function trimMessage(message, maxTokens) {
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
export function extractUrl(string) {
  var pattern = /(https?:\/\/(?:[-\w.]|(?:%[\da-fA-F]{2}))+.*)/i;
  var match = string.match(pattern);
  return match ? match[0] : null;
}
export function extractText(htmlString) {
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
export function chunkText(text, chunkTokenLimit = 1000, chunkNumberLimit = 5) {
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
export async function SummarizeChunksOpenAI(ChunksToSummarize) {
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

