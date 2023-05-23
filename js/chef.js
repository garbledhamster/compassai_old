document.addEventListener("DOMContentLoaded", function () {

    let aiConfig = {
        "AI-Name": "Eva",
        "AI-Personality": "Friendly",
        "AI-Goals": ["Content Creation", "Recipe Conversion"],
        "Output Formats": ["Text", "JSON"],
        "Output Format Templates": {
            "Text": "Template1",
            "JSON": "Template2"
        },
        "Input Formats": ["Text", "JSON"],
        "AI Context": "Recipe Conversion",
        "AI Domain Expertise": ["Cooking", "Food"],
        "AI Tone": "Informal",
        "User Profiling": {
            "Preferences": "Recipes",
            "Background": "Food Enthusiast",
            "Interests": "Cooking, Nutrition"
        },
        "Feedback Mechanism": "Star Rating",
        "Interaction History": [
            {
                "Interaction1": {
                    "Query": "What's the weather?",
                    "Response": "It's sunny."
                }
            },
            {
                "Interaction2": {
                    "Query": "Set an alarm",
                    "Response": "Alarm set for 7 AM."
                }
            }
        ],
        "Memories": [
            {
                "Memory1": "User's favorite book is 1984."
            },
            {
                "Memory2": "User prefers coffee over tea."
            }
        ]
    };

    saveAIConfig(aiConfig);

});
