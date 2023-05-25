# Changelog

## All notable changes to this project will be documented in this file.

## [2.2.0] - 2023-05-25 - Major Update to Tools

### Added

- AI Profiles in JSON for all tools: This new feature allows the AI tools to have a unique profile that can be easily modified and managed through a JSON file.
- New GUI for all Tools: A new user interface has been implemented for all tools, improving usability and overall user experience.

### Changed

- CSS Styles and Fonts: The CSS styles and fonts across all tools have been updated to make the UI more modern and easy to read.
- Submit-Button in Tools.js: The submit-button function in the tools.js file has been completely rebuilt for improved performance and compatibility with the new GUI.
- Several Functions in Tools.js: Multiple functions in the tools.js file have been rebuilt to enhance their performance and ensure better integration with the new features.

## [2.0.6] - 2023-05-24

### Added

- Created a new js file called "chatty.js" which serves as the ai profile and storage container for conversations and memories.
- Added chatty.js to index.html and chatty.html.

### Changed

- Rebuilt all of the Memory functions.
- Memories now load and save to the browsers local storage.
- Memory "Important" button is now retained and loads into the user input.
- Memory "Delete" button

### Fixed

- Fixed order of scripts in chatty.html.

## [2.0.5] - 2023-05-23

### Fixed

- Fixed issue in chef.html java script ordering
- Fixed issue in index.html with extra </body> tag
- Fixed issue in index.html java script ordering

### Changed

- Updated json template in chef.js to be a bit more robust
- Reordered the entire tools.js file

## [2.0.4] - 2023-05-23

### Updated

- Updated README.md file

## [2.0.3] - 2023-05-23

### Changed

- Updated chef.html to use the new interface
- Changes made to tools.js for improvements

## [2.0.2] - 2023-05-23

### Added

- Created chef.js file to implement data operations

## [2.0.1] - 2023-05-23

### Added

- .gitignore file

## [2.0.0] - 2023-05-22

### Changed

- Interface now uses modern CSS elements
- JavaScript functions optimized for shorter lines of code
- Interface fine-tuned for mobile compatibility
- innerHTML of output-container converted to an iframe

### Added

- New memory system for tracking tasks
- Clipboard feature for copying AI output

## [1.0.0] - 2023-04-22

### Added

- Basic interface with input box, output box, submit button
- Index page and toolselector JavaScript function
- Five AI tools using OpenAI
- Essential JavaScript functions including OpenAI messenger
