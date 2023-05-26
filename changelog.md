## Changelog

## [2.1.3] - 2023-05-26 - Fixed sendMessageToOpenAi and UI Improvements

### Changed

- Now returns JSON Object instead of just the content string.
- Added console logging to monitor the send message process.
- Updated ui elements in tools.css.

## [2.1.2] - 2023-05-26 - UI Enhancements and Bug Fixes

### Added

- Integrated highlight.js and marked.js in chat bubbles.

### Changed

- Removed top gradient in output box.
- Modified userInputText variable in tools.js.

### Fixed

- Rectified increment issue in lastMessageElement.

## [2.1.1] - 2023-05-25 - Chat History Control Update

### Added

- Clear chat history button.
- Toggle button to control message history.

## [2.1.0] - 2023-05-25 - Major Tools Overhaul

### Added

- AI profiles in JSON for all tools.
- New GUI for all tools.

### Changed

- Updated CSS styles and fonts.
- Rebuilt submit-button in tools.js.
- Optimized several functions in tools.js.

## [2.0.6] - 2023-05-24 - Memory and Chat Profile Enhancements

### Added

- chatty.js file for AI profile and storage.
- Included chatty.js in index.html and chatty.html.

### Changed

- Rebuilt all memory functions.
- Memory functions now use local storage.
- Updated "Important" and "Delete" buttons in memory.

### Fixed

- Corrected script order in chatty.html.

## [2.0.5] - 2023-05-23 - Code Cleanup and Organization

### Fixed

- Fixed script ordering in chef.html and index.html.
- Removed extra </body> tag in index.html.

### Changed

- Enhanced json template in chef.js.
- Reordered tools.js file.

## [2.0.4] - 2023-05-23 - Documentation Updates

### Updated

- Updated README.md.

## [2.0.3] - 2023-05-23 - Chef Interface Improvements

### Changed

- Chef.html uses new interface.
- Tools.js improvements.

## [2.0.2] - 2023-05-23 - Chef Data Operations Integration

### Added

- Created chef.js for data operations.

## [2.0.1] - 2023-05-23 - Git Management Enhancements

### Added

- .gitignore file.

## [2.0.0] - 2023-05-22 - Major Interface Redesign

### Changed

- Modernized interface with CSS.
- Optimized JavaScript functions.
- Enhanced mobile compatibility.
- Converted output-container to an iframe.

### Added

- New task-tracking memory system.
- Clipboard feature for AI output.

## [1.0.0] - 2023-04-22 - Initial Release

### Added

- Basic interface with input box, output box, submit button.
- Index page and toolselector JavaScript function.
- Five AI tools using OpenAI.
- Essential JavaScript functions including OpenAI messenger.
