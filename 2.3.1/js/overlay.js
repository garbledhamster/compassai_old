document.addEventListener("DOMContentLoaded", function() {

  // Create the overlay element

  var overlay = document.createElement("div");

  overlay.style.position = "fixed";

  overlay.style.top = "0";

  overlay.style.left = "0";

  overlay.style.width = "100%";

  overlay.style.height = "100%";

  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";

  overlay.style.zIndex = "9999";

  overlay.style.display = "flex";

  overlay.style.alignItems = "center";

  overlay.style.justifyContent = "center";



  // Create the terms of service content

  var termsOfService = document.createElement("div");

  termsOfService.innerHTML = `

    <div style="background-color: #fff; padding: 20px; display: flex; flex-direction: column; align-items: flex-start;">

      <h1>Terms of Service</h1>

      <ol style="text-align: left; padding-left: 20px;">

        <li>This is an experimental tool that uses OpenAI's NLP API.</li>

        <li>Information returned may be inaccurate per OpenAI.</li>

        <li>This is an Alpha version of what is to come.</li>

        <li>Being that this application is in Alpha, you must clear your browser's history/data frequently to ensure you are getting the latest version.</li>

      </ol>

      <p><b>Version: Alpha 2.3.1</b></p>

      <div style="display: flex; flex-direction: column; align-items: center;">

        <label><input type="checkbox" id="doNotShowAgainCheckbox"> Do not show again</label>

        <br>

        <button id="acceptButton">Accept Terms of Service</button>

      </div>

    </div>

  `;



  // Append terms of service content to the overlay

  overlay.appendChild(termsOfService);



  // Append the overlay to the document body

  document.body.appendChild(overlay);



  // Function to handle accepting the terms

  function acceptTerms() {

    // Check if "Do not show again" checkbox is checked

    var doNotShowAgainCheckbox = document.getElementById("doNotShowAgainCheckbox");

    var isChecked = doNotShowAgainCheckbox.checked;



    // Remove the overlay from the document body

    document.body.removeChild(overlay);



    // Save the checkbox state to localStorage if checked

    if (isChecked) {

      localStorage.setItem("termsAccepted", "true");

    }

  }



  // Add click event listener to the Accept button

  var acceptButton = document.getElementById("acceptButton");

  acceptButton.addEventListener("click", acceptTerms);



  // Check if the user has previously accepted the terms

  var termsAccepted = localStorage.getItem("termsAccepted");

  if (termsAccepted === "true") {

    // Remove the overlay if terms have already been accepted

    document.body.removeChild(overlay);

  }

});

