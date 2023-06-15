export function generateGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
// export function countTokens(inputString) {
//   try {
//     console.log(`COUNTING TOKENS NOW - ${new Date().toISOString()}`);

//     if (typeof inputString !== 'string') {
//       let inputType = typeof inputString;
//       let inputText = '';

//       if (inputType === 'object') {
//         if (Array.isArray(inputString)) {
//           inputType = 'array';
//           inputText = inputString.join(' ');
//         } else if (inputString !== null) {
//           if (inputString.toString() !== '[object Object]') {
//             inputText = inputString.toString();
//           } else {
//             inputText = JSON.stringify(inputString);
//           }
//         }
//       } else if (inputType === 'number' || inputType === 'boolean') {
//         inputText = inputString.toString();
//       }

//       console.log(` - INPUT TYPE: ${inputType}`);
//       console.log(` - EXTRACTED TEXT: ${inputText}`);

//       createErrorBubble(`An error occured while counting the tokens for the string. Try again later. Input was of type ${inputType}. Extracted text: ${inputText}`);
//       throw new Error(`Input must be a string. Received: ${inputType}. Extracted text: ${inputText}`);
//     }

//     //console.log(" - INPUTSTRING: " + inputString);
//     return inputString.split(' ').reduce((tokenCount, token) => tokenCount + (token.trim() ? Math.ceil(token.length / 4) : 0), 0);
//   } catch (error) {
//     console.error(`Error in countTokens: ${error.message}`);
//     return 0; // default return value
//   }
// }
export function trimMessage(message, maxTokens = 2000) {
  if (typeof message !== 'string' || typeof maxTokens !== 'number') {
    throw new TypeError('Input types: Message should be a string, maxTokens should be a number');
  }
  const wordsArray = message.split(' ');
  let tokenCount = 0;
  const resultArray = [];
  for (let i = 0; i < wordsArray.length; i++) {
    const wordLength = Math.ceil(wordsArray[i].length / 4);
    if (tokenCount + wordLength <= maxTokens) {
      tokenCount += wordLength;
      resultArray.push(wordsArray[i]);
    } else {
      break;
    }
  }
  return resultArray.join(' ');
}
export function extractUrl(string) {
  // console.log("EXTRACTING URL NOW");
  var pattern = /(https?:\/\/(?:[-\w.]|(?:%[\da-fA-F]{2}))+.*)/i;
  var match = string.match(pattern);
  // console.log(" - RETURNING MATCH: " + match);
  return match ? match[0] : null;
}
export function extractText(htmlString) {
  // console.log("EXTRACTING TEXT NOW");
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const paragraphs = doc.querySelectorAll('p');
  let extractedText = '';
  for (const p of paragraphs) {
    extractedText += p.textContent + '\n';
  }
  // console.log(' - CLEANED UP TEXT: ' + extractedText);
  return extractedText;
}
export async function countTokens(text) {
  // console.log("GETTING STRING TOKENS");
  const response = await fetch('https://wrangler.jrice.workers.dev/', {
      method: 'POST',
      headers: {
          'Content-Type': 'text/plain'
      },
      body: text
  });
  const data = await response.text();
  // console.log(" - TOKENS COUNT: " + await data);
  return data;
}

// export function countTokens(text) {
//   const htmlEntityPattern = /&#[xX]?\d+;/g; // Matches HTML entities like &#x27; or &#38;
//   const wordTokens = text.split(/[\s.,!?]+/);

//   // Count HTML entities as 1 token each.
//   const htmlEntities = text.match(htmlEntityPattern);
//   const htmlEntityTokens = htmlEntities ? htmlEntities.length : 0;
  
//   // Filter out empty strings
//   const validTokens = wordTokens.filter(token => token.length > 0);

//   return validTokens.length + htmlEntityTokens;
// }



export async function createChunkedText(text, maxTokensPerChunk = 1000) {
  // console.log("CREATING CHUNKS");
  // console.log(" - TEXT TO CHUNK AND SUMMARIZE: " + text);
  
  const approxTokenLength = 4;
  const maxCharsPerChunk = maxTokensPerChunk * approxTokenLength;

  let chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + maxCharsPerChunk;

    // Find the last period within the chunk
    let periodIndex = text.lastIndexOf('.', endIndex);

    // If there is no period within the chunk, find the next period after the chunk
    if (periodIndex === -1 || periodIndex < startIndex) {
      periodIndex = text.indexOf('.', endIndex);
    }

    // If a period is found, include it in the chunk
    if (periodIndex !== -1) {
      endIndex = periodIndex + 1;
    }

    let chunk = text.slice(startIndex, endIndex);
    let tokens = await countTokens(chunk);
    // console.log(" - CHUNK TEXT: " + chunk);
    // console.log(" - CHUNK TOKENS: " + await tokens);
    chunks.push({
      content: chunk,
      tokens: tokens,
    });

    startIndex = endIndex;
  }

  console.log(" - RETURNING CHUNKS: " + JSON.stringify(chunks));
  return chunks;
}


export function getRandomColor() {
	const letters = '0123456789ABCDEF';
	let color = '#';
	for (let i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}
export function isMobileScreen() {
	return window.innerWidth <= 1000; // Adjust the threshold as needed
}
export function setStyles(element, styles, innerHTML) {
	for (const property in styles) {
		element.style[property] = styles[property];
	}
	if (innerHTML != null) {
		element.innerHTML = innerHTML;
	}
}
