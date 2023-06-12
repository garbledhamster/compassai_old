document.addEventListener("DOMContentLoaded", function () {
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
  var termsOfService = document.createElement("div");
  termsOfService.innerHTML = `
    <div style="background-color: #fff; padding: 20px; display: flex; flex-direction: column; align-items: flex-start;">
      <h1>Terms of Service</h1>
      <ol style="text-align: left; padding-left: 20px;">
        <li>This is an experimental tool that uses OpenAI's NLP API.</li>
        <li>Information returned by the tool may not always be accurate or reliable.</li>
        <li>The tool should be used for informational purposes only and should not be considered as professional advice.</li>
        <li>OpenAI does not guarantee the correctness, completeness, or usefulness of the information provided.</li>
        <li>This is an Alpha version of the tool, and frequent updates and improvements are expected.</li>
        <li>Users are responsible for verifying the accuracy of the information obtained through the tool.</li>
        <li>Any actions taken based on the information provided by the tool are at the user's own risk.</li>
      </ol>
      <p><b>Version: Alpha 3.0.0</b></p>
      <div style="display: flex; flex-direction: column; align-items: center;">
        <label><input type="checkbox" id="doNotShowAgainCheckbox"> Do not show again</label>
        <br>
        <button id="acceptButton">Accept Terms of Service</button>
      </div>
    </div>
  `;
  overlay.appendChild(termsOfService);
  document.body.appendChild(overlay);
  function acceptTerms() {
    var doNotShowAgainCheckbox = document.getElementById(
      "doNotShowAgainCheckbox"
    );
    var isChecked = doNotShowAgainCheckbox.checked;
    document.body.removeChild(overlay);
    if (isChecked) {
      localStorage.setItem("termsAccepted", "true");
    }
  }
  var acceptButton = document.getElementById("acceptButton");
  acceptButton.addEventListener("click", acceptTerms);
  var termsAccepted = localStorage.getItem("termsAccepted");
  if (termsAccepted === "true") {
    document.body.removeChild(overlay);
  }
});
