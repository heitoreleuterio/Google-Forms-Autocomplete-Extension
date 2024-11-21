export class AutoCompleteField {
    isMouseOverField = false;

    constructor(fieldName, fieldCompleteValues) {
        this.fieldName = fieldName;
        this.completeValues = fieldCompleteValues;
    }
}

export class Data {
    constructor(dataIdentifier, dataValues) {
        this.identifier = dataIdentifier;
        this.values = dataValues;
    }
}

export class Page {
    constructor(pageName, selected, updateFunction, addFunction, removeFunction) {
        this.pageName = pageName;
        this.selected = selected;
        this.updateFunction = updateFunction;
        this.addFunction = addFunction;
        this.removeFunction = removeFunction;
    }
}