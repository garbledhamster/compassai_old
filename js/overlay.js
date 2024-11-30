function init() {
  
	var overlay = document.createElement('div');
	overlay.style.cssText =
		'display: flex; position: absolute; top: 0; left: 0; width: 100%; height: 100vh; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; align-items: center; justify-content: center; overflow-y: auto; overflow-x: hidden';

	var termsOfService = document.createElement('div');

	var logo = document.createElement('img');
	logo.src = 'assets/icon/Compass_AI_Logo_Blue.png';
	logo.style.cssText = 'width: auto; max-width: 400px; max-height: 30vh; height: auto; display: block; margin: 0 auto';

	var content = document.createElement('div');
	content.style.cssText = 'background-color: #fff; padding: 20px; display: flex; flex-direction: column; align-items: flex-start';

	var h1 = document.createElement('h1');
	h1.textContent = 'Terms of Service';

	var ol = document.createElement('ol');
	ol.style.cssText = 'text-align: left; padding-left: 20px';

	var li = [
		"This is an experimental tool that uses OpenAI's NLP API.",
		'Information returned by the tool may not always be accurate or reliable.',
		'The tool should be used for informational purposes only and should not be considered as professional advice.',
		'OpenAI does not guarantee the correctness, completeness, or usefulness of the information provided.',
		'This is an Alpha version of the tool, and frequent updates and improvements are expected.',
		'Users are responsible for verifying the accuracy of the information obtained through the tool.',
		"Any actions taken based on the information provided by the tool are at the user's own risk.",
	].map((text) => {
		var item = document.createElement('li');
		item.textContent = text;
		return item;
	});

	li.forEach((item) => ol.appendChild(item));

	var version = document.createElement('p');
	version.innerHTML = '<b>Version: Alpha 3.0.0</b>';

	var support = document.createElement('p');
	support.textContent = 'For support and further development, consider supporting Compass on Patreon:';

	var patreon = document.createElement('a');
	patreon.href = 'https://www.patreon.com/CompassAI';
	patreon.target = '_blank';

	var patreonImg = document.createElement('img');
	patreonImg.src = 'assets/patreon/Digital-Patreon-Wordmark_FieryCoral.png';
	patreonImg.alt = 'Patreon';
	patreonImg.style.cssText = 'width: 200px; height: auto';

	patreon.appendChild(patreonImg);

	var checkDevSite = document.createElement('p');
	checkDevSite.textContent = 'Check out our development site for updates and more:';

	var devSite = document.createElement('a');
	devSite.href = 'https://ourtech.space/dev';
	devSite.target = '_blank';
	devSite.textContent = 'OurTech Dev Site';

	var checkboxLabel = document.createElement('label');
	var checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	checkbox.id = 'doNotShowAgainCheckbox';
	checkboxLabel.appendChild(checkbox);
	checkboxLabel.innerHTML += ' Do not show again';

	var button = document.createElement('button');
	button.id = 'acceptButton';
	button.textContent = 'Accept Terms of Service';

	var checkboxContainer = document.createElement('div');
	checkboxContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center';

	checkboxContainer.appendChild(checkboxLabel);
	checkboxContainer.appendChild(button);

	var openAICheckboxLabel = document.createElement('label');
	openAICheckboxLabel.className = 'openai-label';
	var openAICheckbox = document.createElement('input');
	openAICheckbox.type = 'checkbox';
	openAICheckbox.id = 'openAITermsCheckbox';
	openAICheckboxLabel.appendChild(openAICheckbox);
	openAICheckboxLabel.innerHTML += ' I accept the ';
	var openAILink = document.createElement('a');
	openAILink.href = 'https://openai.com/policies';
	openAILink.target = '_blank';
	openAILink.textContent = 'OpenAI Terms of Service';
	openAICheckboxLabel.appendChild(openAILink);

	checkboxContainer.appendChild(openAICheckboxLabel);

	[h1, ol, version, support, patreon, checkDevSite, devSite, checkboxContainer].forEach((element) => content.appendChild(element));

	termsOfService.appendChild(logo);
	termsOfService.appendChild(content);

	overlay.appendChild(termsOfService);
	document.body.appendChild(overlay);

	function acceptTerms() {
		var doNotShowAgainCheckbox = document.getElementById('doNotShowAgainCheckbox');
		var isChecked = doNotShowAgainCheckbox.checked;
		document.body.removeChild(overlay);
		if (isChecked) {
			localStorage.setItem('termsAccepted', 'true');
		}
	}


	button.addEventListener('click', function (event) {
    console.log(" - IS OPEN AI TERMS CHECKED: " + openAICheckbox.checked)
		if (!openAICheckbox.checked) {
			console.log(' - OPENAI TERMS NEED TO BE ACCEPTED');
			event.preventDefault();
			openAICheckboxLabel.classList.add('error');
			setTimeout(function () {
				openAICheckboxLabel.classList.remove('error');
			}, 1000); // Remove the error class after 1 second
		} else {
			console.log(' - OPENAI TERMS ACCEPTED');
			acceptTerms();
		}
	});
  openAICheckbox.addEventListener('change', function () {
    console.log(openAICheckbox.innerHTML);
    console.log('- CHECKBOX CLICKED, CHECKED: ', openAICheckbox.checked);
    button.disabled = !openAICheckbox.checked;
});
	var termsAccepted = localStorage.getItem('termsAccepted');
	if (termsAccepted === 'true') {
		document.body.removeChild(overlay);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
  console.log('INITIALIZING TERMS OVERLAY NOW');
	init();
}
