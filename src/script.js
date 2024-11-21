let AutoCompleteField;
let Data;

(async () => {
    const src = chrome.runtime.getURL("/src/classes.js");
    const module = await import(src);
    Data = module.Data;
    AutoCompleteField = module.AutoCompleteField;
})();

let settings;
let addedHtmlElements = [];
let htmlElementsWithListeners = [];
let changesToBeMade = false;

chrome.storage.sync.get(["forms-autocomplete-settings"], (result) => {
    if (result["forms-autocomplete-settings"] == null) {
        const data = [
            new Data("Names", ["your-name"]),
            new Data("E-mail", ["your.personal@email.com"])
        ];
        const emailsData = data.find(data => data.identifier == "E-mail");
        const nameData = data.find(data => data.identifier == "Names");
        const fields = [
            new AutoCompleteField("email", emailsData),
            new AutoCompleteField("e-mail", emailsData),
            new AutoCompleteField("e mail", emailsData),
            new AutoCompleteField("name", nameData),
            new AutoCompleteField("nome", nameData)
        ];
        settings = {
            active: true,
            fields,
            data
        };
        settingsChanged();
    }
    else
        settings = result["forms-autocomplete-settings"];

    if (settings.active)
        generateAutocomplete(settings.fields);

    window.addEventListener("focus", () => {
        console.log("Got focus");
        if (changesToBeMade) {
            if (settings.active)
                generateAutocomplete(settings.fields);
            else {
                for (let element of addedHtmlElements) {
                    element.remove();
                }
                for (let obj of htmlElementsWithListeners) {
                    for (let listener of obj.listeners) {
                        obj.element.removeEventListener(listener.event, listener.function);
                    }
                }
                addedHtmlElements = [];
                htmlElementsWithListeners = [];
                changesToBeMade = false;
            }
        }
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        changesToBeMade = true;
        settings = changes["forms-autocomplete-settings"].newValue;
    });
});

function generateAutocomplete(fields) {
    for (let element of addedHtmlElements) {
        element.remove();
    }
    for (let obj of htmlElementsWithListeners) {
        for (let listener of obj.listeners) {
            obj.element.removeEventListener(listener.event, listener.function);
        }
    }
    addedHtmlElements = [];
    htmlElementsWithListeners = [];
    for (let field of fields) {
        try {
            const specialInput = getSpecialInput(field.fieldName);
            if (specialInput.tagName.toLowerCase() != "input" && specialInput.tagName.toLowerCase() != "textarea")
                continue;

            const autocompleteSelectionElement = document.createElement("select");
            autocompleteSelectionElement.className = "autocomplete-select-element";

            for (let value of field.completeValues.values) {
                const optionElement = document.createElement("option");
                optionElement.value = value;
                optionElement.innerHTML = value;
                autocompleteSelectionElement.appendChild(optionElement);
            }

            autocompleteSelectionElement.addEventListener("mouseover", () => {
                field.isMouseOverField = true;
            });

            autocompleteSelectionElement.addEventListener("mouseleave", () => {
                field.isMouseOverField = false;
            });

            autocompleteSelectionElement.addEventListener("click", () => {
                insertSelectionValueIntoInput(specialInput, autocompleteSelectionElement);
            });

            const focusFunction = () => {
                field.isMouseOverField = false;
                specialInput.parentNode.parentNode.appendChild(autocompleteSelectionElement);
                addedHtmlElements.push(autocompleteSelectionElement);
            };

            specialInput.addEventListener("focus", focusFunction);

            const focusoutFunction = () => {
                if (!field.isMouseOverField)
                    specialInput.parentNode.parentNode.removeChild(autocompleteSelectionElement);
            };

            specialInput.addEventListener("focusout", focusoutFunction);

            const keydownFunction = (e) => {
                if (e.key.toLowerCase() == "tab")
                    insertSelectionValueIntoInput(specialInput, autocompleteSelectionElement);
            };

            specialInput.addEventListener("keydown", keydownFunction);

            htmlElementsWithListeners.push({
                element: specialInput,
                listeners: [
                    { event: "focus", function: focusFunction },
                    { event: "focusout", function: focusoutFunction },
                    { event: "keydown", function: keydownFunction }
                ]
            })
        }
        catch (error) {
            console.log(error);
        }
    }
}

function insertSelectionValueIntoInput(selectedInput, selectionElement) {
    selectedInput.parentNode.parentNode.removeChild(selectionElement);
    selectedInput.value = "";
    selectedInput.focus();
    document.execCommand('insertText', false, selectionElement.options[selectionElement.selectedIndex].value);
}

function getSpecialInput(inputName) {
    try {
        return [...[...document.querySelectorAll("span")].filter(span => span.innerHTML.toLowerCase().includes(inputName) && span.parentNode.getAttribute("role") == "heading")[0].parentNode.parentNode.parentNode.parentNode.children].filter(child => child.getAttribute("jscontroller") != null)[0].querySelector("input,textarea");
    }
    catch (error) {
        throw "Não foi possivel encontrar este input";
    }
}

