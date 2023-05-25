let aiConfig = {
  "AI-Name": "TaskMaster",
  "AI-Personality": "Organized",
  "AI-Goals": ["Task Management", "Dynamic List Generation"],
  "Output Formats": ["Text", "JSON"],
  "Output Format Templates": {
      "Text": "To-Do List Template",
      "JSON": "To-Do List JSON Template"
  },
  "Input Formats": ["Text", "JSON"],
  "AI Context": "Task Management",
  "AI Domain Expertise": ["Project Management", "Organizational Strategy"],
  "AI Tone": "Professional",
  "User Profiling": {
      "Preferences": "Efficiency",
      "Background": "Busy Professional",
      "Interests": "Productivity, Task Management"
  },
  "Feedback Mechanism": "Thumbs Up/Down",
  "Interaction History": [
      {
          "Interaction": {
              "Query": "I need a to-do list for my project.",
              "Response": "Sure, here is a suggested list..."
          }
      },
      {
          "Interaction": {
              "Query": "Can you help me organize my tasks?",
              "Response": "Absolutely, let's prioritize them..."
          }
      }
  ],
  "Memories": [
      {
          "Memory": {
              "Memory-Text": "You are the TaskMaster AI, designed to assist in task management and to-do list creation.",
              "Important": true,
              "Token-Length": "16",
              "Timestamp": "2023-05-24T15:54:06.816Z"
          }
      },
      {
          "Memory": {
              "Memory-Text": "You must adhere to the rules of OpenAI.",
              "Important": true,
              "Token-Length": "50",
              "Timestamp": "2023-05-24T15:55:06.816Z"
          }
      }
  ]
};


function createTask(Text, ParentElement) {
  // CREATE CONTAINERS
  var divTaskContainer = createTaskContainer();
  var divInputContainer = createDivInput();
  var divButtonsContainer = createDivButtons();

  // CREATE CONTAINER ELEMENTS
  var newText = createTextInput(Text);
  var collapseButton = createCollapseButton(divTaskContainer);
  var magicButton = createMagicButton(newText, divTaskContainer);
  var deleteButton = createDeleteButton(divTaskContainer);
  var checkbox = createCheckbox(newText);

  // APPEND CONTAINER ELEMENTS
  divTaskContainer.appendChild(divInputContainer);
  divButtonsContainer.appendChild(magicButton);
  divButtonsContainer.appendChild(deleteButton);
  divInputContainer.appendChild(collapseButton);
  divInputContainer.appendChild(checkbox);
  divInputContainer.appendChild(newText);
  divInputContainer.appendChild(divButtonsContainer);
  ParentElement.appendChild(divTaskContainer);

}

function createTaskContainer() {
  var taskContainer = document.createElement("div");
  taskContainer.className = "divTaskContainer";
  taskContainer.style.border = "5px solid #ccc";
  taskContainer.style.borderRadius = "8px";
  taskContainer.style.padding = "10px";
  taskContainer.style.marginBottom = "10px";
  taskContainer.style.marginTop = "10px";
  taskContainer.style.boxShadow = "0 2px 4px rgba(0.1, 0.1, 0.1, 0.5)";
  taskContainer.style.backgroundColor = "#fff";

  taskContainer.style.alignItems = "center"; // Align items vertically
  taskContainer.style.justifyContent = "space-between"; // Distribute items evenly
  return taskContainer;
}


function createDivButtons() {
  var divButtons = document.createElement("div");
  return divButtons;
}

function createDivInput() {
  var divInput = document.createElement("div");
  divInput.style.display = "flex";
  divInput.style.alignItems = "center";
  divInput.style.margin = "10px";
  divInput.style.border = "1px black";
  return divInput;
}

function createCheckbox(Text) {
  var checkboxContainer = document.createElement("label");
  checkboxContainer.className = "checkbox-container";
  checkboxContainer.style.display = "flex"; // Set display property to flex
  checkboxContainer.style.alignItems = "center"; // Align items vertically

  var checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.style.marginTop = "6px"; // Add some spacing between the checkbox and the text

  checkbox.addEventListener("change", function () {
    if (checkbox.checked) {
      Text.style.textDecoration = "line-through";
      Text.disabled = true;
    } else {
      Text.style.textDecoration = "none";
      Text.disabled = false;
    }
  });

  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(Text);

  return checkboxContainer;
}


function createCollapseButton(Task) {
  var collapseButton = document.createElement("button");
  collapseButton.textContent = "▲";

  collapseButton.addEventListener("click", function () {
    var childItems = Task.getElementsByClassName("divTaskContainer");
    if (childItems.length > 0) {
      if (collapseButton.textContent === "▲") {
        collapseButton.textContent = "▼";
        Array.from(childItems).forEach(function (item, index) {
          item.style.display = "none";
        });
      } else {
        collapseButton.textContent = "▲";
        Array.from(childItems).forEach(function (item, index) {
          item.style.display = "block";
        });
      }
    }
  });

  collapseButton.style.position = "absolute";
  collapseButton.style.top = "0";
  collapseButton.style.left = "0";
  collapseButton.style.marginRight = "10px";
  collapseButton.style.padding = "5px 10px";
  collapseButton.style.border = "none";
  collapseButton.style.borderRadius = "4px";
  collapseButton.style.fontSize = "14px";
  collapseButton.style.fontWeight = "bold";
  collapseButton.style.color = "#000";
  collapseButton.style.backgroundColor = "transparent";
  collapseButton.style.cursor = "pointer";
  collapseButton.style.transition = "transform 0.3s ease-in-out";

  collapseButton.addEventListener("mouseover", function () {
    collapseButton.style.transform = "scale(1.2)";
  });

  collapseButton.addEventListener("mouseout", function () {
    collapseButton.style.transform = "scale(1)";
  });

  // Set parent container's position to relative
  Task.style.position = "relative";

  return collapseButton;
}


function createMagicButton(Text, Task) {
  
  // CREATE THE MAGIC BUTTON
  var magicButton = document.createElement("button");
  magicButton.innerHTML = "\u{1FA84}";
  magicButton.addEventListener("click", function () {

    let userInput = document.getElementById('user-input');
    let toolDescription = document.getElementById('tool-description');
    let aiPersonality = document.getElementById("ai-personality").innerText;
    let aiGoals = document.getElementById("ai-goals").innerText;
    let aiDescription = toolDescription.innerText;
    
    const input = Text.value;
    const message = "AI_PERSONALITY: '" + aiPersonality + "'\n\nAI_GOALS:'" + aiGoals + "'\n\nAI_STYLE: '" + aiDescription + "'\n\nUSER_INPUT: '" + input + "'\n\nDo not put any other text other than your response to the user_input.";
    console.log("MESSAGE_TO_AI: " + message);
    magicButton.disabled = true;
    
    (async () => {

      magicButton.innerHTML = '<div class="loading-circle"></div>';
      const subTaskText = await sendMessageToOpenAI(message);
      //const subTaskText = "# Task 1\n# Task 2\n# Task 3";
      createDynamicTaskList(subTaskText, Task);
      magicButton.innerHTML = "\u{1FA84}";
      magicButton.disabled = false;
    })();
  });

  // APPLY STYLES TO MAGIC BUTTON
  magicButton.style.marginRight = "10px";
  magicButton.style.padding = "5px 10px";
  magicButton.style.border = "none";
  magicButton.style.borderRadius = "4px";
  magicButton.style.fontSize = "14px";
  magicButton.style.color = "#fff";
  magicButton.style.background = "#2196f3";
  magicButton.style.cursor = "pointer";
  magicButton.style.verticalAlign = "middle";

  return magicButton;
}

function createTextInput(text) {
  var newText = document.createElement("input");
  newText.type = "text";
  newText.value = text;
  newText.style.border = "none";
  newText.style.flex = "1";
  newText.style.marginLeft = "10px";
  newText.style.marginRight = "10px";
  newText.style.padding = "5px";
  newText.style.fontSize = "16px";
  newText.style.color = "#333";
  newText.style.background = "none";
  newText.style.outline = "none";
  newText.style.fontFamily = "Arial, sans-serif";

  return newText;
}

function createDeleteButton(Task) {
  var deleteButton = document.createElement("button");
  deleteButton.className = "button-style";
  deleteButton.textContent = "\u{1F5D1}";

  deleteButton.addEventListener("click", function () {
    Task.remove();
  });

  deleteButton.style.padding = "5px 10px";
  deleteButton.style.border = "none";
  deleteButton.style.borderRadius = "4px";
  deleteButton.style.fontSize = "14px";
  deleteButton.style.color = "#fff";
  deleteButton.style.background = "#f44336";
  deleteButton.style.cursor = "pointer";

  return deleteButton;
}

function createDynamicTaskList(jsonString, containerDiv, indentLevel = 1) {
  const lines = JSON.parse(jsonString); // Parse the JSON string
  console.log(lines.response[0]); // Display the response

  // Check if subtasks property exists and is an array
  if (Array.isArray(lines.subtasks)) {
    // Loop through subtasks and display each one
    lines.subtasks.forEach((subtask) => {
      createTask(subtask, containerDiv); // Pass containerDiv as ParentElement
    });
  } else {
    console.log("No subtasks found.");
  }

  // Additional code for creating tasks or performing other operations
  // ...
}

function createSubTask(Task) {

}
function applySortable(Element) {
  // Create a link element for the external CSS file
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/todo.css';

  // Append the link element to the head of the document
  document.head.appendChild(link);

  // Initialize Sortable with options and TouchPlugin
  var sortable = new Sortable(Element, {
    animation: 150,
    ghostClass: 'ghost',
    chosenClass: 'chosen',
    dragClass: 'drag',
    handle: ".divTaskContainer",
    draggable: ".divTaskContainer", // Exclude buttons from being draggable
    swapThreshold: 1,
    invertSwap: true
  });

  return sortable;
}


document.getElementById("submit-button").addEventListener("click", function () {
  var taskInputBox = document.getElementById("user-input");
  var tasksList = document.getElementById("output-text");
  var inputLines = taskInputBox.value.split("\n"); // Split input into an array of lines

  if (taskInputBox.value !== "") {
    inputLines.forEach(function (line) {
      if (line.trim() !== "") { // Check if the line is not empty or whitespace
        createTask(line, tasksList);
      }
    });
  }


});
