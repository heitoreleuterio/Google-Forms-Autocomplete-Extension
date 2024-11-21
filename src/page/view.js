import { AutoCompleteField, Data, Page } from "../classes.js"

const toggleContainer = document.querySelector("#toggle-container");
const tabsContainer = document.querySelector("#tabs-container");
const actualTabContainer = document.querySelector("#actual-tab-container");
const addController = document.querySelector("#add-controller");
const removeController = document.querySelector("#remove-controller");

chrome.storage.sync.get(["forms-autocomplete-settings"], (result) => {
    let settings;
    let currentElement = null;
    let pages = [
        new Page("fields", true, updateFields, addField, removeField),
        new Page("data", false, updateData, addData, removeData)
    ];

    for (let tab of tabsContainer.children) {
        tab.addEventListener("click", () => {
            const page = pages.find(page => page.pageName == tab.value);
            if (page != null) {
                [...tabsContainer.children]
                    .find(actualTab => actualTab.classList.contains("selected-tab")).classList.remove("selected-tab");
                tab.classList.add("selected-tab");
                pages.forEach(actualPage => { actualPage.selected = false });
                page.selected = true;
                page.updateFunction();
                addController.onclick = page.addFunction;
                removeController.onclick = page.removeFunction;
            }
        });
    }

    function settingsChanged() {
        chrome.storage.sync.set({ "forms-autocomplete-settings": settings });
    }

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

    function togglePressed() {
        const key = "active";
        settings[key] = !settings[key];
        toggleContainer.className = settings["active"] ? "checked" : "unchecked";
        settingsChanged();
    }

    function changeCurrentElement(newElement) {
        currentElement = newElement;
    }

    function updateFields() {
        actualTabContainer.innerHTML = "";
        for (let field of settings.fields) {
            const fieldContainer = document.createElement("div");
            fieldContainer.className = "field-container";
            const fieldName = document.createElement("input");
            fieldName.className = "field-name";
            fieldName.value = field.fieldName;
            fieldName.placeholder = "field name";
            const fieldData = document.createElement("select");
            fieldData.className = "field-data";
            for (let data of settings.data) {
                const option = document.createElement("option");
                option.value = data.identifier;
                option.innerText = data.identifier;
                fieldData.appendChild(option);
            }
            if (field.completeValues != null)
                fieldData.selectedIndex = [...fieldData.options].findIndex(option => option.value == field.completeValues.identifier);
            fieldContainer.appendChild(fieldName);
            fieldContainer.appendChild(fieldData);
            actualTabContainer.appendChild(fieldContainer);
            fieldName.addEventListener("focus", () => {
                changeCurrentElement(field);
            });
            fieldName.addEventListener("input", () => {
                field.fieldName = fieldName.value;
                settingsChanged();
            });
            fieldData.addEventListener("change", () => {
                field.completeValues = settings["data"].find(value => value.identifier == fieldData.options[fieldData.selectedIndex].value);
                settingsChanged();
            });
        }
        currentElement = null;
    }

    function updateData() {
        actualTabContainer.innerHTML = "";
        for (let data of settings.data) {
            const dataContainer = document.createElement("div");
            dataContainer.className = "data-container";
            dataContainer.setAttribute("data-identifier", data.identifier);
            const dataTitle = document.createElement("input");
            dataTitle.type = "text";
            dataTitle.className = "data-title";
            dataTitle.value = data.identifier;
            dataTitle.addEventListener("input", () => {
                const fieldsToModify = settings.fields
                    .filter(field => field.completeValues.identifier == data.identifier);
                data.identifier = dataTitle.value;
                dataContainer.setAttribute("data-identifier", data.identifier);
                fieldsToModify.forEach(field => {
                    field.completeValues.identifier = data.identifier;
                });
                settingsChanged();
            });
            dataContainer.appendChild(dataTitle);
            const expandButton = document.createElement("button");
            expandButton.className = "data-expand";
            expandButton.innerHTML = String.raw`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 96 960 960">
                    <path d="M480 711 240 471l43-43 197 198 197-197 43 43-240 239Z"/>
                </svg>
            `;
            expandButton.addEventListener("click", () => {
                if (dataContainer.getAttribute("expanded") != "") {
                    dataContainer.setAttribute("expanded", "");
                    expandButton.setAttribute("rotate", "");
                    currentElement = data;
                }
                else {
                    dataContainer.removeAttribute("expanded");
                    expandButton.removeAttribute("rotate");
                    currentElement = null;
                }
                const expandedContainers = [...actualTabContainer.querySelectorAll('.data-container[expanded=""]')]
                    .filter(container => container != dataContainer);
                expandedContainers.forEach(container => container.removeAttribute("expanded"));
            });
            dataContainer.appendChild(expandButton);
            const dataList = document.createElement("ul");
            dataList.className = "data-list";
            for (let c = 0; c < data.values.length; c++) {
                let value = data.values[c];
                const listItem = document.createElement("li");
                const removeButton = document.createElement("button");
                removeButton.className = "data-remove";
                removeButton.innerHTML = String.raw`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 96 960 960">
                    <path d="M261 936q-24.75 0-42.375-17.625T201 876V306h-41v-60h188v-30h264v30h188v60h-41v570q0 24-18 42t-42 18H261Zm438-630H261v570h438V306ZM367 790h60V391h-60v399Zm166 0h60V391h-60v399ZM261 306v570-570Z"/>
                </svg>
                `;
                listItem.appendChild(removeButton);
                const valueInput = document.createElement("input");
                valueInput.type = "text";
                valueInput.spellcheck = false;
                valueInput.placeholder = "here";
                valueInput.className = "data-input";
                valueInput.value = value;
                valueInput.addEventListener("input", () => {
                    data.values[c] = valueInput.value;
                    const fieldsToModify = settings.fields
                        .filter(field => field.completeValues.identifier == data.identifier);
                    fieldsToModify.forEach(field => {
                        field.completeValues.values = data.values;
                    });
                    settingsChanged();
                });
                removeButton.addEventListener("click", () => {
                    data.values.splice(c, 1);
                    const fieldsToModify = settings.fields
                        .filter(field => field.completeValues.identifier == data.identifier);
                    fieldsToModify.forEach(field => {
                        field.completeValues.values = data.values;
                    });
                    settingsChanged();
                    updateDataValues(data);
                });
                listItem.addEventListener("mouseenter", () => {
                    removeButton.setAttribute("appear", "");
                });
                listItem.addEventListener("mouseleave", () => {
                    removeButton.removeAttribute("appear");
                });
                listItem.appendChild(valueInput);
                dataList.appendChild(listItem);
            }
            dataContainer.appendChild(dataList);
            actualTabContainer.appendChild(dataContainer);
        }
    }

    function updateDataValues(data) {
        const dataContainer = actualTabContainer.querySelector(`.data-container[data-identifier="${data.identifier}"]`);
        if (dataContainer != null) {
            const dataList = dataContainer.querySelector(".data-list");
            dataList.innerHTML = "";
            for (let c = 0; c < data.values.length; c++) {
                let value = data.values[c];
                const listItem = document.createElement("li");
                const removeButton = document.createElement("button");
                removeButton.className = "data-remove";
                removeButton.innerHTML = String.raw`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 96 960 960">
                    <path d="M261 936q-24.75 0-42.375-17.625T201 876V306h-41v-60h188v-30h264v30h188v60h-41v570q0 24-18 42t-42 18H261Zm438-630H261v570h438V306ZM367 790h60V391h-60v399Zm166 0h60V391h-60v399ZM261 306v570-570Z"/>
                </svg>
                `;
                listItem.appendChild(removeButton);
                const valueInput = document.createElement("input");
                valueInput.type = "text";
                valueInput.spellcheck = false;
                valueInput.placeholder = "here";
                valueInput.className = "data-input";
                valueInput.value = value;
                valueInput.addEventListener("input", () => {
                    data.values[c] = valueInput.value;
                    const fieldsToModify = settings.fields
                        .filter(field => field.completeValues.identifier == data.identifier);
                    fieldsToModify.forEach(field => {
                        field.completeValues.values = data.values;
                    });
                    settingsChanged();
                });
                removeButton.addEventListener("click", () => {
                    data.values.splice(c, 1);
                    const fieldsToModify = settings.fields
                        .filter(field => field.completeValues.identifier == data.identifier);
                    fieldsToModify.forEach(field => {
                        field.completeValues.values = data.values;
                    });
                    settingsChanged();
                    updateDataValues(data);
                });
                listItem.addEventListener("mouseenter", () => {
                    removeButton.setAttribute("appear", "");
                });
                listItem.addEventListener("mouseleave", () => {
                    removeButton.removeAttribute("appear");
                });
                listItem.appendChild(valueInput);
                dataList.appendChild(listItem);
            }
        }
    }

    function addField() {
        const key = "fields";
        settings[key].push(new AutoCompleteField(null, settings.data[0]));
        updateFields();
        settingsChanged();
    }

    function removeField() {
        const key = "fields";
        const index = settings[key].indexOf(currentElement);
        if (index != -1) {
            settings[key].splice(index, 1);
            updateFields();
            settingsChanged();
        }
    }

    function addData() {
        const key = "data";
        if (currentElement == null) {
            settings[key].push(new Data("identifier-here", ["your-value-here"]));
            updateData();
        }
        else {
            const index = settings[key].indexOf(currentElement);
            if (index != -1) {
                settings[key][index].values.push("your-value-here");
                updateDataValues(settings[key][index]);
            }
        }
        settingsChanged();
    }

    function removeData() {
        const key = "data";
        if (currentElement != null) {
            const index = settings[key].indexOf(currentElement);
            settings[key].splice(index, 1);
            updateData();
            settingsChanged();
            currentElement = null;
        }
    }

    toggleContainer.addEventListener("click", togglePressed);
    addController.onclick = addField;
    removeController.onclick = removeField;

    toggleContainer.className = settings["active"] ? "checked" : "unchecked";

    updateFields();
});