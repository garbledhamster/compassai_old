document.addEventListener('DOMContentLoaded', (event) => {
  const toolSelector = document.getElementById('tool-selector');

  toolSelector.addEventListener('change', function(e) {
    const selectedToolUrl = e.target.value;
    loadTool(selectedToolUrl);
  });
    
  // Load the default tool on page load
  const defaultToolUrl = toolSelector.options[toolSelector.selectedIndex].value;
  loadTool(defaultToolUrl);
  function loadTool(value) {
    var iframe = document.createElement('iframe');
    iframe.className = "tool-iframe";
    iframe.style.width = "100%";
    iframe.style.height = "calc(100vh - 100px)";
    iframe.src = value;
    var toolWrapper = document.getElementById('tool-wrapper');
    toolWrapper.innerHTML = '';
    toolWrapper.appendChild(iframe);
  }

  // Page Initialization

const myContainer = selectById("memory")
addStickyInsetDropShadow(myContainer, 'top');
});
