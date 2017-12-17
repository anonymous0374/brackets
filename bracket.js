// Author Caleb lau (laukokfong@dbs.com)
// This is an internal framework created for the IBGT - AOS java project

// global variables
/*
*  mappings between template name and the corresponding HTML string.
*  The HTML string represents a HTML section, which will be filled with value
*  and repeated.  -> so that a datagrid is generated on HTML page.
*/
var templateMap = {};

/*
 * mappings between the ng-anchor name, and the HTML element(usually a table row)
 * who contains it.
 */
var anchorMap = {};

/*
* mappings between the ng-template name, and its latest row index.
* So that when we add new rows to the grid, we know the index of the new row.
*/
var ngTempSeries = {}; // Store the index count for each of the ngTemplate

/*
* mappings between validation error message code and value
*/
var ngVErrorMessageMap = {};

/*
* log of one time validation error messages, it will be cleared every time 
* before another logging.
*/
var vResult = [];

// end global variables

// Get the json property value from the json object(pObj) by resolving
// the annotation(tExp).
// If the json property does not exist, add it, and return null.
// e.g., 1, the property does not exist:
// input: 
//        tExp = 'student.lastName'
//        pObj = {}
// output:
//        return value: null
//        tExp = 'lastName'
//        pObj = {"student": {"lastName": null}} 
// e.g., 2, the property already exists:
// input: 
//       tExp = 'student.lastName';
//       pObj = {"student": {"firstName":"kai", "lastName":"zhou"}}
// output: 
//       return value: "Zhou"
//       tExp = 'lasstName'
//       pObj = {"student": {"firstName":"kai", "lastName":"zhou"}}
function getJsonProperty(pObj, tExp) {
    if (pObj == "" || typeof pObj == 'undefined') { return null; }
    var curObj = pObj;

    while (tExp.indexOf(".") != -1) {
        var dPos = tExp.indexOf(".");
        var cProp = tExp.substring(0, dPos);
        tExp = tExp.substring(dPos + 1);


        var ngTemplate = getIndexNumOfNgTemplate(cProp);
        if (ngTemplate == null) {
            // This is a normal property
            if (curObj[cProp] == null) {
                curObj[cProp] = {};
            }
            curObj = curObj[cProp];
        } else {
            // This is an array
            // e.g. aName_0
            var aName = getArrayObjName(cProp);
            if (curObj[aName] == null || curObj[aName] == "") {
                curObj[aName] = [];
            }
            curObj = curObj[aName];
            var indexNum = parseInt(getArrayIndex(cProp));
            if (curObj[indexNum] == null || typeof curObj[indexNum] == 'undefined') {
                curObj[indexNum] = {};
            }
            curObj = curObj[indexNum];
        }
    }

    var retValue = curObj[tExp];
    if (typeof curObj[tExp] != 'undefined') {
        return curObj[tExp];
    } else {
        curObj[tExp] = null;
        return null;
    }

}

// 
var getGridArray = function (obj, gridTemplate) {
    //remove the fill json object's table prefix
    var propExpression = '',
        innerArray = undefined;

    propExpression = gridTemplate.split('.');
    len = propExpression.length;
    for (i = 0; i < len; i++) {
        var exp = propExpression[i];
        obj = i < len - 1 ? obj[exp] : obj[exp.substring(0, exp.length - 1)];
    }

    if (obj && $.isArray(obj)) {
        return obj;
    } else {
        return undefined;
    }

};

// Set a value to the json object(pObj) property which is
// indicated by the annotation(tExp).
// If such property does not exist, add it, and then assign.
// e.g. pObj = {}; tExp = 'student.lastName'; value = 'zhou';
//      output: pObj = {"student":{"lastName":"zhou"}};
function setJsonProperty(pObj, tExp, value) {
    var curObj = pObj;

    while (tExp.indexOf(".") != -1) {
        var dPos = tExp.indexOf(".");
        var cProp = tExp.substring(0, dPos);
        tExp = tExp.substring(dPos + 1);

        // Check if this is array
        var ngTemplate = getIndexNumOfNgTemplate(cProp);
        if (ngTemplate == null) {
            // This is a normal property
            if (curObj[cProp] == null) {
                curObj[cProp] = {};
            }
            curObj = curObj[cProp];
        } else {
            // This is an array
            // e.g. aName_0
            var aName = getArrayObjName(cProp);
            if (curObj[aName] == null || curObj[aName] == "") {
                curObj[aName] = [];
            }
            curObj = curObj[aName];
            var indexNum = parseInt(getArrayIndex(cProp));
            if (curObj[indexNum] == null || typeof curObj[indexNum] == 'undefined') {
                curObj[indexNum] = {};
            }
            curObj = curObj[indexNum];
        }
    }

    curObj[tExp] = value;
}

function getIndexNumOfNgTemplate(inputStr) {
    if (inputStr == null) {
        return null;
    }
    var splitPos = inputStr.indexOf("_");
    if (splitPos < 0) {
        return null;
    }
    // There's a _ in the bind name

    // Now find the .
    var dotPos = inputStr.indexOf(".", splitPos);

    // get the index number (if there's any)
    var indexNumber = inputStr.substring(splitPos + 1, dotPos);

    return indexNumber;
}

// Given the input array remove all the empty elements from the array
function removeNullFromArray(inputArray) {
    var resultArray = [];
    for (var i = 0; i < inputArray.length; i++) {
        if (inputArray[i]) {
            resultArray.push(inputArray[i]);
        }
    }
    return resultArray;
}

// Given the object, if there's any property that is an array perform a cleanup
function cleanupObj(inputObj) {
    if (typeof inputObj != 'object') {
        return;
    }

    for (var objProp in inputObj) {
        if (inputObj.hasOwnProperty(objProp)) {
            var varObj = inputObj[objProp];

            if (varObj != null) {
                // Don't do anything if object is null

                // If this is an array then perform the array clean up
                if ($.isArray(varObj)) {
                    inputObj[objProp] = removeNullFromArray(varObj);
                } else {
                    cleanupObj(varObj);
                }

            }
        }
    }
}

//e.g. input: inputStr="aName_29"
//     output: return "aName"
function getArrayObjName(inputStr) {
    var splitPos = inputStr.indexOf("_");
    return inputStr.substring(0, splitPos);
}

//e.g. input: inputStr="aName_29"
//     output: return "29"
function getArrayIndex(inputStr) {
    var splitPos = inputStr.indexOf("_");
    return inputStr.substring(splitPos + 1);
}

// Get the index number from a 'Grid Field'.
// A grid field is field with an annotation in such format:
//   exp='sample.obj_29.myValue' or exp='obj_29.myValue'
// If it's an invalid exp, it returns null.
// e.g.1, input: inputStr="sample.obj_29.myValue", valid format
//      output: return "29"
// e.g.2, input: inputStr="sample.obj_.myValue", invalid format
//      output: return null
// e.g.3, input: inputStr="sample.obj.myValue", invalid format
//      output: return null
function getIndexFromGridField(inputStr) {
    var indexNumber = 0;

    if (inputStr == null) {
        return null;
    }
    var splitPos = inputStr.indexOf("_");
    if (splitPos < 0) {
        return null;
    }
    // There's a _ in the bind name

    // Now find the . after the _
    var dotPos = inputStr.indexOf(".", splitPos);
    if (dotPos != -1) {
        // get the index number (if there's any)
        indexNumber = inputStr.substring(splitPos + 1, dotPos);
        if (!$.isNumeric(indexNumber)) {
            return null;
        }
    } else {
        return null;
    }

    return indexNumber;
}

var setJsonObjWithDivs = function (sObj, divIds, extractStatic, vResult) {
    var i = 0;
    var elemts = {}; // elments within one div

    for (i = 0; i < divIds.length; i++) {
        if (divIds[i] == '' || divIds[i] === null ||
                typeof divIds[i] == 'undefined') {
            elems = document.body.getElementsByTagName("*");
        } else if (divIds[i].length > 0) {
            elems = document.getElementById(divIds[i]).getElementsByTagName("*");
        }

        setJsonObjWithElems(sObj, elems, extractStatic, vResult);
    }

    removeTemporaryProps(sObj);
}

// Display the validation result onto the div
var bracketPopulateVResult = function (elem, vResult, prefix, isAppend) {
    if (!isAppend) {
        $(elem).empty();
    }

    var htmlTag = "<ul>";

    // Iterate through the validation result list
    for (var i = 0; i < vResult.length; i++) {

        // Get the rule desc
        var vDesc = vResult[i].desc;
        if (vDesc != null) {
            vDesc = $.trim(vDesc);
        }

        // Convert the desc from the ngVErrorMessageMap
        if (vDesc[0] == '@') {
            vDesc = ngVErrorMessageMap[vDesc.substring(1)];
        }

        if (prefix !== undefined && prefix != null) {
            vDesc = prefix + "->" + vDesc;
        }

        // Construct the html element
        htmlTag = htmlTag + "<li onclick='bracketGotoV(" + i + ")'>" + vDesc +
            "</li>";
        // vResult.push(vResult[i].target);
    }

    htmlTag = htmlTag + "</ul>";
    $(elem).append(htmlTag);
    if (vResult.length > 0) {
        $(elem).show();
    }
};


var bracketGotoV = function (elemInd) {
    var elem = vResult[elemInd].target;
    var isHide = false;

    if ($(elem).attr("style").indexOf("display") != -1 &&
        $(elem).attr("style").indexOf("none") != -1) {
        isHide = true;
    }

    elem.scrollIntoView();
    if ($(elem).parent().attr("class") != null &&
        $(elem).parent().attr("class").indexOf("k-dropdown") != -1) {
        $(elem).data("kendoDropDownList").focus();
    }
    else {
        elem.focus();
    }

    if (isHide) {
        $(elem).parent()[0].scrollIntoView();
        $(elem).parent()[0].focus();
    }
};

// Perform the validation against an element:
// An element may be annotated this way:
// <input type='text' ng-rule='isEmail|The email format is incorrect';required|The email field is mandatory' />
// So this field must be filed, and the value must be a valid email address.
// If fastReturn === true, the function returns false as soon as it detects an invalid element.
// This function may return: undefined or false, only when returning false means there're invalid elements.
var bracketValidateElem = function (elem, errList, fastReturn) {
    // An HTML element may have multiple validation rules.
    // Each validation rule has corresponding error message.
    // e.g., <input type='text' ng-rule='isEmail|The email format is incorrect;
    // required|This email is mandatory.' />
    var vRule = $.trim(elem.getAttribute("ng-rules")),
        vRules = [],
        tmp = [],
        theRule,
        theDesc = '',
        i = 0,
        l = 0,
        ruleSeparator = ';',
        ruleDescSeparator = '|';

    if (typeof errList == 'undefined') {
        return true;
    }

    if (typeof vRule == 'string' && vRule.length > 0) {
        vRules = vRule.split(ruleSeparator);
    } else {
        return true;
    }

    l = vRules.length;
    for (i = 0; i < l; i++) {
        tmp = vRules[i].split(ruleDescSeparator);
        if (tmp[0] == 'required') {
            if ($(elem)[0].tagName == "SPAN" && $(elem).text() == "") {
                errList.push({
                    target: elem, desc: tmp[1],
                    rule: 'required'
                });
                if (fastReturn) {
                    return false;
                }
            }
            if ($(elem)[0].tagName != "SPAN" && (($(elem).val() == null) ||
                ($(elem).val() == ""))) {
                errList.push({
                    target: elem, desc: tmp[1],
                    rule: 'required'
                });
                if (fastReturn) {
                    return false;
                }
            }
        } else if (tmp[0] == 'isEmail') {
            if (!/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i.test($(elem).val())) {
                if ($(elem).val() != '') {
                    errList.push({ target: elem, desc: tmp[1], rule: 'isEmail' });
                    if (fastReturn) {
                        return false;
                    }
                }
            }
        } else if (tmp[0] == 'isAlphaNumeric') {
            if (/[^a-zA-Z0-9\-\/]/.test($(elem).val().replace(/\s+/g, ''))) {
                //if (/[^a-zA-Z0-9]/gi.test($(elem).val())) {
                if ($(elem).val() != '') {
                    errList.push({ target: elem, desc: tmp[1], rule: 'isAlphaNumeric' });
                    if (fastReturn) {
                        return false;
                    }
                }
            }
        } else if (tmp[0].toLowerCase() == 'isnumber') {
            if (!($.isNumeric($(elem).val()) || $(elem).val() == '')) {
                errList.push({
                    target: elem, desc: tmp[1],
                    rule: 'isNumber'
                });
                if (fastReturn) {
                    return false;
                }
            }
        } else if (tmp[0].substring(0, 9).toLowerCase() == 'minlength') {
            var len = parseInt(tmp[0].split('=')[1]);
            if ($(elem).val().length > 0 && $(elem).val().length < len) {
                errList.push({
                    target: elem, desc: tmp[1],
                    rule: 'minlength'
                });
                if (fastReturn) {
                    return false;
                }
            }
        } else if (tmp[0].substring(0, 9).toLowerCase() == 'dateafter') {
            var earlierDateId = tmp[0].split('=')[1].replaceAll('.', '\\.'),
                earlierDate = $('#' + earlierDateId).val(),
                laterDate = $(elem).val(),
                valid = true;

            if (laterDate === '' || earlierDate === '') {
                valid = false;
            } else if (compare2Dates(laterDate, earlierDate) != 1) {
                valid = false;
            }

            if (!valid) {
                errList.push({
                    target: elem, desc: tmp[1],
                    rule: 'dateAfter'
                });
                if (fastReturn) {
                    return false;
                }
            }
        } else if (tmp[0].substring(0, 9).toLowerCase() == 'pastdate') {
            if (typeof $(elem).val() != 'undefined' && $(elem).val() != '') {
                var dtTom = new Date(new Date().getTime() + (24 * 60 * 60 * 1000));
                var dtData = parseDate($(elem).val());
                if (dtData > dtTom) {
                    errList.push({
                        target: elem, desc: tmp[1],
                        rule: 'pastDate'
                    });
                    if (fastReturn) {
                        return false;
                    }
                }
            }
        } else if (tmp[0].substring(0, 12).toLowerCase() == 'numberlarger') {
            var smallValId = tmp[0].split('=')[1].replaceAll('.', '\\.');
            if (parseInt($(elem).val()) <= parseInt($("#" + smallValId).val())) {
                errList.push({
                    target: elem, desc: tmp[1],
                    rule: 'numberLarger'
                });
                if (fastReturn) {
                    return false;
                }
            }
        } else if (tmp[0] == 'isBirth') {
            var elemDate = $(elem).val();
            if (!(elemDate == null || elemDate == '')) {
                elemDate = $(elem).data("kendoDatePicker").value();
                if (elemDate == null) {
                    return true;
                }

                var nowDate = new Date();
                if ($(elem).attr("data-role") == "datepicker") {
                    if (!(elemDate > new Date('1800/1/1') && elemDate < nowDate && (nowDate.getFullYear() - elemDate.getFullYear()) < 200)) {
                        errList.push({
                            target: elem,
                            desc: tmp[1],
                            rule: 'isBirth'
                        });
                        if (fastReturn) {
                            return false;
                        }
                    }
                }
            }
        } else {
            // TODO other validations
        }
    }

    return true;
};

function parseDate(s) {
    var months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    var p = s.split('-');
    return new Date(p[2], months[p[1].toLowerCase()], p[0]);
}

var extractElem = setJsonObjWithDivs;

var setJsonObjWithElems = function (sObj, elems, extractStatic, validResult) {
    for (var i = 0; i < elems.length; i++) {
        var cElem = elems[i];
        var nodeName = cElem.nodeName;
        var indexNumber = '';
        var bindName = cElem.getAttribute("ng-bind") ||
            cElem.getAttribute("ng-model") ||
            cElem.getAttribute("ng-template") ||
            cElem.getAttribute("ng-anchor");

        if (bindName === null || bindName == '') {
            continue; // the element has to be ng- annotated
        }

        bracketValidateElem(cElem, validResult);

        indexNumber = getIndexFromGridField(bindName);
        if (indexNumber == "") {
            // This is an input for the repeat structure(instead of a specific 
            // element in the repeat structure).
            // Ignore it by setting the bindName to null.
            // e.g. sample.obj_
            bindName = null;
        }

        // If there's no ng-bind then do not need to extact the value from the DOM
        if (bindName != null) {
            var bindValue = $(cElem).val();

            if (nodeName == "TEXTAREA") {
                setJsonProperty(sObj, bindName, bindValue);
            }

            if (nodeName == "INPUT") {
                var inputType = $(cElem).attr("type");
                // Default to empty string
                if (inputType == null) {
                    inputType = "";
                }
                inputType = inputType.toLowerCase();
                if ((inputType == "") || (inputType == "text")) {
                    setJsonProperty(sObj, bindName, bindValue);
                }
                // check box
                if (inputType == "checkbox") {
                    if (cElem.checked == true) {
                        setJsonProperty(sObj, bindName, bindValue);
                    } else {
                        setJsonProperty(sObj, bindName, null);
                    }
                }
                // radiobutton          
                if (inputType == "radio") {
                    if (cElem.checked == true) {
                        setJsonProperty(sObj, bindName, bindValue);
                    }
                }
            }

            if (nodeName == "SELECT") {
                setJsonProperty(sObj, bindName, bindValue);
            }
        }

        // If set to true then also extract the SPAN and DIV DOM into the javascript
        // Normally not needed (only needed by the controlpanel)
        if (extractStatic == true) {
            var modelName = cElem.getAttribute("ng-model");
            if (modelName != null) {
                if ((nodeName == "DIV") || (nodeName == "SPAN")) {
                    setJsonProperty(sObj, modelName, $(cElem).text());
                }
            }
        }
    }
};

var setJsonObj = function (sObj, divId, extractStatic, validResult, isHandleGrid) {
    var elems = {};
    if (divId == '' || divId === null || typeof divId == 'undefined') {
        elems = document.body.getElementsByTagName("*");
    } else if (divId.length > 0) {
        elems = document.getElementById(divId).getElementsByTagName("*");
    }

    setJsonObjWithElems(sObj, elems, extractStatic, validResult, isHandleGrid);

    cleanupObj(sObj);
};

// 
var setJsonObjWithValidation = function (sObj, divId, extractStatic,
    errMsgDivId, isHandleGrid, prefix, errList) {
    if (typeof errList === 'undefined') {
        errList = [];
    }

    setJsonObj(sObj, divId, extractStatic, errList, isHandleGrid);

    if (errList.length > 0) {
        triggerValidate(errMsgDivId, errList, prefix);
        return false;
    }

    return true;
}

/*
* trigger the validate
* parameter: 
*            errMsgDivId: show validated error messagge div id.
*            validResult: an array with all validated information.
*/
var triggerValidate = function (errMsgDivId, validResult, prefix) {
    if (!$.isArray(validResult))
        return;

    if (validResult.length > 0 && validResult[0].target != null) {
        bracketPopulateVResult($("#" + errMsgDivId)[0], validResult, prefix);
        vResult = validResult;
    }
    else {
        $("#" + errMsgDivId).empty();
    }
}

// sObj (javascript obj) stores into HTML element, the property value of JSON object
// is stored to the specific element's value property.
// javascript -> DOM
function setDOM(sObj, codeList) {
    setDOMInternal(sObj, codeList, document.body.getElementsByTagName("input"));
    setDOMInternal(sObj, codeList, document.body.getElementsByTagName("span"));
    setDOMInternal(sObj, codeList, document.body.getElementsByTagName("div"));
    setDOMInternal(sObj, codeList, document.body.getElementsByTagName("select"));
    setDOMInternal(sObj, codeList, document.body.getElementsByTagName("textarea"));
    setDOMInternal(sObj, codeList, document.body.getElementsByTagName("table"));
    setDOMInternal(sObj, codeList, document.body.getElementsByTagName("tbody"));
}

// set json object to the part of DOM specified by divId.
// divId is the id of any HTML elements, not necessarily a div.
var setDOMById = function (sObj, codeList, divId) {
    var elems = {};
    if (divId == '' || divId === null || typeof divId == 'undefined') {
        elems = document.body.getElementsByTagName("*");
    }
    else {
        elems = document.getElementById(divId).getElementsByTagName("*");
    }

    setDOMInternal(sObj, codeList, elems);
    lookupDiv2(divId);
};

function setDOMInternal(sObj, codeList, elems) {
    var templateMapIte = {};
    var cElem = null;
    var ngTemplate = null;
    var ngAnchor = null;
    var bindName = null;
    var nodeName = null;
    var bindValue = null;
    var inputType = null;
    var i = 0;

    for (i = 0; i < elems.length; i++) {
        cElem = elems[i];
        ngTemplate = cElem.getAttribute("ng-template");
        ngAnchor = cElem.getAttribute("ng-anchor");
        bindName = cElem.getAttribute("ng-bind");
        nodeName = cElem.nodeName;
        bindValue = null;

        if (ngTemplate != null) {
            templateMapIte[ngTemplate] = cElem;
        }

        if (ngAnchor != null) {
            anchorMap[ngAnchor] = $(cElem);
        }

        if (bindName != null) {
            bindValue = getJsonProperty(sObj, bindName);
            if (bindValue != null) {
                if (nodeName == "TEXTAREA") {
                    $(cElem).val(bindValue);
                }

                if (nodeName == "INPUT") {
                    inputType = cElem.getAttribute("type");
                    // Default to empty string
                    if (inputType == null) {
                        inputType = "";
                    }
                    inputType = inputType.toLowerCase();
                    // input text box
                    if ((inputType == "") || (inputType == "text")) {
                        // cElem.setAttribute('value', bindValue);
                        $(cElem).val(bindValue); // zk, for compatibility
                    }
                    // check box
                    if ((inputType == "checkbox") || (inputType == "radio")) {
                        if (bindValue.toLowerCase() == cElem.value.toLowerCase()) {
                            cElem.checked = true;
                        } else {
                            cElem.checked = false;
                        }
                    }

                }

            }
            else {
                if (nodeName == "INPUT") {
                    inputType = cElem.getAttribute("type");
                    if (inputType == null) {
                        inputType = "";
                    }
                    inputType = inputType.toLowerCase();
                    // input text box
                    //if ((inputType == "") || (inputType == "text")) {
                    //    $(cElem).val("");
                    //}
                    // check box
                    if ((inputType == "checkbox") || (inputType == "radio")) {
                        cElem.checked = false;
                    }
                }
            }
        }

        // For select elements 
        if (nodeName == "SELECT") {
            // Find out if there's a code value
            if (bindValue === null) {
                bindValue = "";
            }

            if (cElem.getAttribute("init") === null) {
                populateSelect(cElem, codeList, bindValue);
                // cElem.setAttribute("init", true)
            } else {
                // cElem.value = bindValue;
                if ($(cElem).parent().attr("class") != null &&
                    $(cElem).parent().attr("class").indexOf("k-dropdown") != -1) {
                    $(cElem).kendoDropDownList();
                    $(cElem).data("kendoDropDownList").value(bindValue);
                } else {
                    cElem.value = bindValue;
                }
            }
        }

        if (bindValue !== null && bindValue !== undefined && $(cElem).data("role") === "datepicker") {
            $(cElem).data("kendoDatePicker").value(bindValue);
        }

        // Treat static value only
        var modelName = cElem.getAttribute("ng-model");
        if (modelName != null) {
            var modelValue = getJsonProperty(sObj, modelName);
            if (modelValue != null) {
                if ((nodeName == "SPAN") || (nodeName == "DIV")) {
                    $(cElem).empty();
                    $(cElem).append(modelValue);
                }
            }
        }
    }

    // Store the template HTML string into templateMap, and then remove template from page
    dealWithGridRowTemplate(templateMapIte, isViewMode);
	
	// Initiate secondary SELECT elements if any
	initiateSecondarySELECTs($(elems).find('SELECT[primaryOf]'));
}

// (1) Register all row template for all grids
// (2) If it's view mode, hide all elements who is marked as 
//   hasViewMode from the template
var dealWithGridRowTemplate = function (templateElemMap, isViewMode) {
    if (isViewMode === undefined) {
        return;
    }

    var prop = '',
        templateElem = {},
        newTemplate = '';

    for (prop in templateElemMap) {
        if (templateElemMap.hasOwnProperty(prop)) {
            // register the grid row template
            templateElem = templateElemMap[prop];
            newTemplate = $(templateElem).html();
            templateMap[prop] = newTemplate;
            // Remove the element
            $(templateElem).remove();
        }
    }
}

// Deal with a <SELECT> element.
// When bindValue != $(cElem).val() --> the selected option is changed since
// last time. --> Find the current selected option and set the selected
// attribute to it.
// Otherwise, leave it.
function populateSelect(cElem, codeList, bindValue) {
    var bOption = cElem.getAttribute("ng-option"),
        optionArray,
        firstElem = null,
        appendElem = null,
        selectedItem = false,
        j,
        optionItem,
        selectedItem,
        firstOption = null;

    if (bOption != null) { // only take care SELECT with ng-option annotation
        $(cElem).empty();

        optionArray = getJsonProperty(codeList, bOption);
        if (optionArray === null) { // didn't get datasource in static file
            return;
        }

        for (j = 0; j < optionArray.length; j++) {
            optionItem = optionArray[j];
            selectedFlag = "";
            if (optionItem === undefined) {
                continue;
            }
            // Find the current selected option:
            // The option is selected when either:
            // its value equals to the bind value, or
            // when using a default option(when optionItem.selected == 'selected').
            if (bindValue == optionItem.value || (
                bindValue == '' && optionItem.selected == 'selected' &&
                !cElem.getAttribute('init'))) {
                selectedFlag = "selected";
                selectedItem = true;

                // If it's the latter case, set the bindValue to default value too
                if (bindValue == '') {
                    bindValue = optionItem.value;
                }
            }

            appendElem = $("<option value='" + optionItem.value + "' " +
                selectedFlag + " >" + optionItem.code + "</option>");
            $(cElem).append(appendElem);
            if (firstElem == null) {
                firstElem = appendElem; // from now on firstElem != null
            }

        }

        // Make the first option, aka ---Select-- for the SELECT
        if (selectedItem == false) {
            firstOption = $("<option value='' selected>--Select--</option>");
        } else {
            firstOption = $("<option value=''>--Select--</option>");
        }

        if (firstElem != null) {
            firstOption.insertBefore(firstElem);
        } else {
            $(cElem).append(firstOption);
        }

        if (bindValue != null) {
            //add if SELECT tag is kendo UI, set value to tag
            if ($(cElem).parent().attr("class") != null &&
                $(cElem).parent().attr("class").indexOf("k-dropdown") != -1) {
                $(cElem).kendoDropDownList();
                $(cElem).data("kendoDropDownList").value(bindValue);
            } else {
                cElem.value = bindValue;
            }
        }
    }
}

var initiateSecondarySELECTs = function (primarySELECTs) {
    $(primarySELECTs).each(function (index, item) {
        initiateSecondarySELECT(item);
    });
};

// Initiate a secondary SELECT element by the corresponding
// primary SELECT element.
var initiateSecondarySELECT = function (primarySELECT) {
    var mappingTbl = primarySELECT.getAttribute('mappingTbl');  
    var primaryOf = primarySELECT.getAttribute('primaryOf');
    var allOptions = [];
    var shortlistedOptions = [];
    var primaryVal = primarySELECT.value;
    var j = 0;
    var optionItem = {}; // the option element
    var secondarySELECT = {}; // the secondary SELECT element
    // if the selected secondary SELECT element value falls into the shortlisted options
    var bSecondaryValueValid = false; 
    
    if (primaryOf && primaryOf.length > 0) {
        secondarySELECT = $('#' + primaryOf);
        secondaryNgOption = secondarySELECT[0].getAttribute('ng-option');
        secondaryValue = secondarySELECT[0].value;
    }   
    
    // Get the shortlisted options for the secondary SELECT element depends
    // on the selected primary SELECT element.
    shortlistedOptions = getOption4SecondarySELECT(primaryVal, mappingTbl,
        secondaryNgOption);
    
    // Check if the value of the secondary SELECT element falls into
    // the shortlisted options.
    // If so, leave it alone, otherwise, re-initialize it.  
    $(shortlistedOptions).each(function (index, item) {     
        if (item.value === secondaryValue) {
            bSecondaryValueValid = true;
            return false;
        }
    });
    
    // Always re-initialize the secondary SELECT element with shortlisted options       
    $(secondarySELECT).empty(); 
    optionItem = $("<option value=''>--Select--</option>");
    $(secondarySELECT).append(optionItem);
    for (j = 0; j < shortlistedOptions.length; j++) {       
        optionItem = $("<option value='" + shortlistedOptions[j].value + "'>" + 
            shortlistedOptions[j].code + "</option>");
        $(secondarySELECT).append(optionItem);
    }
    if (bSecondaryValueValid) {
        $(secondarySELECT).val(secondaryValue);
    } else {
        $(secondarySELECT).val('');
    }
    
    return true;
};

// Description:
//   Get shortlisted options of the secondary SELECT element according to the 
// selected value of the primary SELECT element.
// Inputs:
//   primaryValue, the selected value of the primary SELECT element.
//   mappingTbl, the mapping object between the primar and secondary SELECT 
// elements.
//   ngOptionSecondary, the ng-option attribute of the secondary SELECT element.
// Outputs:
//  The array of the shortlisted {value: '', code: ''} options for the 
// secondary SELECT element.
var getOption4SecondarySELECT = function (primaryValue, mappingTbl,
    ngOptionSecondary) {
    var objMappingTbl = {};
    var secondaryValues = []; // values of the secondary options
    var allSecondaryOptions = {}; // 
    var shortListedSecondaryOptions = [];    
    var code = '';
    var i = 0;
    var l = 0;

    objMappingTbl = getJsonProperty(codeList, mappingTbl) || null;
    allSecondaryOptions = getJsonProperty(codeList, ngOptionSecondary) || null;        

    // Get the corresponding values of the secondary SELECT element by the 
    // value of the primary SELECT element.
    l = objMappingTbl.length || 0;
    for (i = 0; i < l; i++) {
        if (objMappingTbl[i].code === primaryValue) {
            secondaryValues.push(objMappingTbl[i].value);
        }
    }

    if (secondaryValues.length === 0) {
        return false;
    }
        
    for (i = 0; i < secondaryValues.length; i++) {
        $(allSecondaryOptions).each(function (index, item){
            if (item.value === secondaryValues[i]) {
                code = item.code;
                shortListedSecondaryOptions.push({
                    'value' : secondaryValues[i],
                    'code' : code
                });
            }
        });        
    }
    
    return shortListedSecondaryOptions;

};

// take the ngTemplate, sub the values from templateElemMap into the template
// and replace the generated HTML into the targetDivId
function removeAnchor(ngAnchor) {
    var anchorElem = anchorMap[ngAnchor];
    if (anchorElem == null) {
        // no operation since the anchor is invalid
        return;
    }

    // Remove the element from the HTML
    anchorElem.remove();

    // Remove the anchor from the anchorMap
    delete anchorMap[ngAnchor];
}

// convert the ngBind / ngModel into active elements
function convertActive(ngMap, divId) {
    if (typeof divId == 'undefined') {
        convertActiveInternal(ngMap, codeList, document.body.getElementsByTagName("input"));
        convertActiveInternal(ngMap, codeList, document.body.getElementsByTagName("span"));
        convertActiveInternal(ngMap, codeList, document.body.getElementsByTagName("div"));
        convertActiveInternal(ngMap, codeList, document.body.getElementsByTagName("select"));
        convertActiveInternal(ngMap, codeList, document.body.getElementsByTagName("textarea"));
        convertActiveInternal(ngMap, codeList, document.body.getElementsByTagName("table"));
    } else {
        convertActiveInternal(ngMap, codeList, document.getElementById(divId).
            getElementsByTagName("*"));
    }

}

function convertActiveInternal(ngMap, codeList, elems) {
    var epl = [];
    var i = 0;

    // Collect all the elements that needs to be processed into the variable "epl"
    for (i = 0; i < elems.length; i++) {
        var cElem = elems[i];
        var bindName = cElem.getAttribute("ng-model");
        var bindStatus = ngMap[bindName];
        if (bindStatus != null) {
            // Convert this from ng-model to ng-bind
            epl.push(cElem);
        }
    }

    // 
    for (i = 0; i < epl.length; i++) {
        var eplElem = epl[i];
        var attrs = obtainAttr(eplElem);
        var x = 0;

        // Conver this into a input / select / textarea
        var newElemTxt = "";
        var elemType = $(eplElem).attr("elemType") != null ?
            $(eplElem).attr("elemType").toLowerCase() : "";

        if (elemType == "") {
            elemType = $(eplElem).attr("type").toLowerCase();
        }

        eplElem.removeAttribute("elemType");
        var txtValue = $(eplElem).text();
        var ngName = eplElem.getAttribute("ng-model");
        if (ngName === null || ngName == '') {
            return;
        }

        eplElem.setAttribute("ng-bind", ngName);
        eplElem.removeAttribute("ng-model");

        if (elemType == "textarea") {
            newElemTxt = "<textarea></textarea>";
        } else if (elemType == "select") {
            newElemTxt = "<select></select>";
        } else if (elemType == "text") {
            newElemTxt = "<input />";
        } else if (elemType == "checkbox" || elemType == "radio") {
            $(eplElem).removeAttr('disabled');
        }
        var jqElem = $(eplElem);
        var jqNewElem = $(newElemTxt);
        jqNewElem.insertAfter(jqElem);

        // jqElem.after(jqNewElem);
        jqNewElem.val(txtValue);
        if (elemType != "checkbox" && elemType != "radio") {
            jqElem.remove();
        }

        for (x = 0; x < attrs.length; x++) {
            jqNewElem.attr(attrs[x].name, attrs[x].value);
        }
        if (elemType == "select") {
            var opValue = jqNewElem.attr("option-value");
            populateSelect(jqNewElem[0], codeList, opValue);
        }
    }
}

// convert INPUT,TEXTAREA,SELECT tag to SPAN tag with special attribute "elemType"
function convertStatic(ngMap, divId) {
    if (typeof divId == 'undefined') {
        convertStaticInternal(ngMap, document.body.getElementsByTagName("input"));
        convertStaticInternal(ngMap, document.body.getElementsByTagName("select"));
        convertStaticInternal(ngMap, document.body.getElementsByTagName("textarea"));
    } else {
        // clean up the div by removing those span generated by 
        // convertStaticInternal before
        $('#' + divId.replaceAll('.', '\\.')).find('SPAN[forViewMode="true"]').remove();
        convertStaticInternal(ngMap, document.getElementById(divId).
            getElementsByTagName("*"));
    }

}

// Replace INPUT with SPAN.
// Steps:
// (1) collect elements need to be converted
// (2) loop through the collected elements
//   >> if the element is an input, check if it's a lookup
//       --> if true, get the val from the displaying textbox, 
//       e.g., backend textbox shows: CN, displaying textbox shows: CHINA
//       CHINA will be the text shows on the new SPAN
//       --> else, the value of the element will be the text of the new SPAN
//   >> else if the element is a checkbox or radio button
//       --> disable it
function convertStaticInternal (ngMap, elems) {
    var epl = [],
        elemInput = {},
        i = 0,
        j = 0,
        option = '',
        toRemove = false; // to remove elements other than checkbox or radio btn    

    // Collect all the elements that needs to be processed into the variable "epl"
    if (ngMap === null) {
        epl = elems;
    } else {
        for (i = 0; i < elems.length; i++) {
            var cElem = elems[i];
            var bindName = cElem.getAttribute("ng-bind") ||
                cElem.getAttribute("ng-model");
            var bindStatus = ngMap[bindName];
            // collect the elements need to be converted
            if (bindStatus == 'y') {
                epl.push(cElem);
            }
        }
    }

    for (i = 0; i < epl.length; i++) {
        toRemove = false; // reset toRemove to false
        var eplElem = epl[i];
        var elemType = eplElem.type;
        var htmlNewSpan = '';
        var textNewSpan = '';
        var ngName = eplElem.getAttribute("ng-bind") ||
            eplElem.getAttribute("ng-model");;
        var displayingTextboxId = '';

        // excludes backend Textboxes, don't convert them        
        if (typeof eplElem.type == 'undefined' || (
            eplElem.type == 'text' &&
            $(eplElem).attr('id') &&
            $(eplElem).attr('id').substring(0, 3) == 'val')) {
            continue;
        }

        if (elemType == 'checkbox' ||
            elemType == 'radio' ||
            elemType == 'button') {
            eplElem.setAttribute('disabled', 'disabled');
        } else if (eplElem.type == 'text') {
            toRemove = true;
            if (eplElem.getAttribute('data-role') === 'aolookup') {
                displayingTextboxId = eplElem.getAttribute('id').
                    replaceAll('res', 'val').replaceAll('.', '\\.');
                textNewSpan = $('#' + displayingTextboxId).val();
            } else {
                textNewSpan = $(eplElem).val();
            }
        } else if (eplElem.type == 'select-one') {
            toRemove = true;
            var len = $(eplElem)[0].options.length,
                j = 0;
            for (j = 0; j < len; j++) {
                if ($(eplElem)[0].options[j].value == $(eplElem).val()) {
                    textNewSpan = $(eplElem)[0].options[j].text;
                }
            }
            textNewSpan = textNewSpan == '--Select--' ? '' : textNewSpan;
        } else if (eplElem.tagName === 'TEXTAREA') {
            /*
            toRemove = true;
            textNewSpan = $(eplElem).val();
            */
            // disable TEXTAREA instead of replacing it wit SPAN
            eplElem.setAttribute('disabled', 'disabled');
        }

        htmlNewSpan = "<SPAN forViewMode='true'>" + textNewSpan + "</SPAN>";

        // Insert the new <SPAN> after the <INPUT>, but sometimes kendo wrapped
        // the <INPUT> with parent nodes, in this case, we need to detect and 
        // remove the parent node.
        // So, what we do is: detect the correct <INPUT> first, then insert
        // the <SPAN> after it, finally, delete the <INPUT>, or its parent if
        // it's wrapped by kendo UI.
        if (toRemove) {
            // for kendo dropdown list or date picker            
            if ($(eplElem).parent().attr("class") && (
                    $(eplElem).parent().attr("class").indexOf("k-dropdown") != -1 ||
                        $(eplElem).parent().attr("class").indexOf("k-datepicker") != -1)) {
                elemInput = $(eplElem).parent();
                eplElem = elemInput;
            } else if ($(eplElem).parent().parent().attr("class") &&
                $(eplElem).parent().parent().attr("class").
                    indexOf("k-datepicker") != -1) {
                elemInput = $(eplElem).parent().parent();
                eplElem = elemInput;
            }

            // append SPAN to the INPUT if not done so yet
            if ($(eplElem).next().text() !== $(htmlNewSpan).text() &&
                $(eplElem).parent().next().text() !== $(htmlNewSpan).text()) {
                $(eplElem).after($(htmlNewSpan));
            }
            // $(eplElem).remove(); // perform the removal
            $(eplElem).hide(); // hide instead of remove
        }
    }
}

function convertStaticByDivId(divId) {
    var ActiveObj = {};
    $("#" + divId + " INPUT[ng-bind]").each(function () {
        var currentAttr = $(this).attr("ng-bind");
        ActiveObj[currentAttr] = 'y';
    });

    $("#" + divId + " SELECT[ng-bind]").each(function () {
        var currentAttr = $(this).attr("ng-option");
        ActiveObj[currentAttr] = 'y';

    });
    $("#" + divId + " TEXTAREA[ng-bind]").each(function () {
        var currentAttr = $(this).attr("ng-bind");
        ActiveObj[currentAttr] = 'y';
    });

    convertStatic(ActiveObj);
}

function convertActiveByDivId(divId) {
    var staticObj = {};
    $("#" + divId + " SPAN[ng-model]").each(function () {
        var currentAttr = $(this).attr("ng-model");
        staticObj[currentAttr] = 'y';
    });
    $("#" + divId + " INPUT[ng-model]").each(function () {
        var currentAttr = $(this).attr("ng-model");
        staticObj[currentAttr] = 'y';
    });
    $("#" + divId + " SELECT[ng-model]").each(function () {
        var currentAttr = $(this).attr("ng-model");
        staticObj[currentAttr] = 'y';
    });
    $("#" + divId + " TEXTAREA[ng-model]").each(function () {
        var currentAttr = $(this).attr("ng-model");
        staticObj[currentAttr] = 'y';
    });

    convertActive(staticObj);
}

// get a element all attributes and add header "elemAttr" for converting to static element
function getAttrForStatic(elem) {
    var attrs = obtainAttr(elem);
    return "elemAttr=\"" + attrs + "\"";
}

// obtain a element all attributes
function obtainAttr(elem) {
    var atts = elem.attributes,
	    i = 0,
		j = 0,
		index = 0;

    for (i = 0; i < atts.length; i++) {
        if (atts[i].name.indexOf('ng-model') != -1 ||
		    atts[i].name.indexOf('ng-bind') != -1) {
            atts.removeNamedItem(atts[i].name);
        }
    }

    return atts;
}

// obtain SELECT tag selected code from selected value
function obtainCode(codeList, ngOption, ngValue) {
    var valueList = codeList[ngOption];
    if (typeof valueList == 'undefined') {
        return;
    }
    for (var i = 0; i < valueList.length; i++) {
        var opItem = valueList[i];
        if (opItem.value == ngValue) {
            return opItem.code;
        }
    }
    return "";
}

// obtain SELECT tag selected value from selected code
function obtainValue(codeList, ngOption, ngCode) {
    var valueList = codeList[ngOption];
    for (var i = 0; i < valueList.length; i++) {
        var opItem = valueList[i];
        if (opItem.code == ngCode) {
            // return opItem.value;
            return $(opItem).val(); // zhou kai, for compatibility
        }
    }
    return "";
}

/*
* function feedGrid(jsonObj, gridInfo, isAppend);
* Purpose: Load JSON object into data grid.
* Author: zhou kai(zhoukai@ncs.com.sg)
* Date: 2015-09-28
* Flag: isAppend, specifies if this feeding is to update or append.
* isAppend == true, it's to append a new row to the grid,
* isAppend == false, it's to update an existing row.
* Since the parameter: isAppend is added later, so the default value: undefined
* should not affect the existing behavior of it.
* isAppend is optional.
*/
function feedGrid(jsonObj, gridInfo, isAppend) {
    var i = 0,
        id = 0,
        len = 0,
        rowCounter = 0, // count of existing rows of the grid
        obj = jsonObj;
    propExpression = gridInfo.ngTemplate, // property expression, e.g., student.detail_.name
    anchorElem = {}, // the ng-anchor element
    subExpression = '', // e.g., student.detail_.name -> detail_.name -> .name
    rowTemplate = '', // HTML template of one grid row
    indexName = '', // 
    hiddenFieldId = '',
    rowIndex = gridInfo.curRowIndex,
    isPrimaryRadioButton = {};

    // (1) Check if the anchor & ngTemplate exist
    anchorElem = anchorMap[gridInfo.ngAnchor];
    if (anchorElem === null ||
        templateMap[gridInfo.ngTemplate] === null ||
        jsonObj === null ||
        typeof anchorElem == 'undefined') {
        return undefined; // maybe throw exception here
    }

    // (2) Determine if this feeding is an 'update' or an 'append':
    //   if isAppend is undefined, check the current index
    //     if current index == '' --> set isAppend to true
    //     else --> set isAppend to false       
    if (typeof isAppend == 'undefined') {
        if (rowIndex == '') {
            isAppend = true;
        } else {
            isAppend = false;
        }
    }

    log(gridInfo.ngTemplate + ': isAppend = ' + isAppend);
    // (3) Get the grid array if the user doesn't passes obj in an array format
    // if cannot get an array, exit function.        
    if ($.isArray(obj)) {
        // do nothing
    } else {
        // get the grid array
        obj = getGridArray(obj, propExpression);
        if (!$.isArray(obj)) {
            log(gridInfo.ngTemplate + ': no rows added.');
            return;
        }
    }
    // If the code comes here, obj must be an array.

    //get the row counter to make sure how many row the table add
    rowCounter = ngTempSeries[gridInfo.ngTemplate];
    if (rowCounter === null || typeof rowCounter == 'undefined') {
        rowCounter = -1;
    }

    for (i = 0; i < obj.length; i++) { // per array item per new grid row
        if (isAppend) {
            indexName = gridInfo.ngTemplate + (++rowCounter); //if add grid row, get a new index name, 
        }
        else {
            // if update grid row, let index name equal current row index name
            indexName = rowIndex;
        }

        // get the row content which need to add to grid
        concreteRow = fillRowTemplate(indexName, gridInfo.ngTemplate, obj[i], gridInfo);

        var newGridRow = $(concreteRow);
        //if it's update row, add the new row behind old row, and remove old row
        if (!isAppend) {
            $(anchorMap[indexName]).after(newGridRow);
            removeAnchor(indexName);
            log(gridInfo.ngTemplate + ': row ' + rowCounter + ' updated.');
        }
        else { // if it's add new row, add the row to grid's tail
            $(anchorElem).append(newGridRow);
            log(gridInfo.ngTemplate + ': row ' + rowCounter + ' added.');
            addItemToArray(gridInfo.ids, rowCounter);
            showNoDataFoundMsg(gridInfo.ngAnchor);
        }
        anchorMap[indexName] = newGridRow;

        // deal with the hidden field.
        // if the hidden field already has stringified value(not {json}, just
        // use it(bug here, this is assuming the existing string is the latest),
        // else, stringify the obj for the whole row.
        hiddenFieldId = (indexName + '.json').replaceAll('.', '\\.');
        // stringify the whole obj if the obj not has a property named json
        if (gridInfo.isRowStringified && concreteRow.indexOf('json') > -1) {
            if (obj[i].json == null || obj[i].json == "" || obj[i].json == "{json}") {
                obj[i].json = JSON.stringify(obj[i]);
            }
            $('#' + hiddenFieldId).text(obj[i].json);
        }

        // register the latest row index
        ngTempSeries[gridInfo.ngTemplate] = rowCounter;
    }

};

/*
* Fill the grid row template with concrete data, to create a new grid row.
*/
function fillRowTemplate(indexName, ngTemplate, data, gridInfo) {
    var rowTemplate = "";
    rowGrid = {},
    dropDownListElem = {},
    prop = {};

    rowTemplate = $.trim(templateMap[ngTemplate]).substring(7);
    rowTemplate = rowTemplate.substring(0, rowTemplate.length - 8);

    if (data.json != null && data.json !== null && data.json !== '' && data.json !== '{json}') {
        data = JSON.parse(data.json);
    }

    for (prop in data) {
        if (data.hasOwnProperty(prop)) {
            for (subProp in data[prop]) {
                if (data[prop].hasOwnProperty(subProp)) {
                    if (isNullOrEmpty(data[prop][subProp])) {
                        rowTemplate = rowTemplate.replaceAll("{" + subProp + "}",
                        "");
                    } else {
                        rowTemplate = rowTemplate.replaceAll("{" + subProp + "}",
                            data[prop][subProp]);
                    }
                }
            }

            if (isNullOrEmpty(data[prop])) {
                rowTemplate = rowTemplate.replaceAll("{" + prop + "}",
               "");
            } else {
                rowTemplate = rowTemplate.replaceAll("{" + prop + "}",
                    data[prop]);
            }
        }
    }
    // (1) replace _. to indexName.
    // (2) replace '_' to '\'' +indexName + '\''
    // (3) replace "_" to '\'' +indexName + '\''
    rowTemplate = rowTemplate.replaceAll("_.", indexName + ".");
    rowTemplate = rowTemplate.replaceAll("\'_\'", "\'" + indexName + "\'");
    rowTemplate = rowTemplate.replaceAll("\"_\"", "\'" + indexName + "\'");
    rowTemplate = replaceOtherPart(rowTemplate, data);

    // set row template controls value
    rowGrid = $(rowTemplate);
    // if the data is marked as invalid, give a special class to it(this is only for relationship details grid):
    if (data &&
        data.ngValid &&
        data.ngValid === false &&
        gridInfo.gridId === 'gridRelationshipDetails') {
        rowGrid.addClass('ngInvalid');
    }

    for (prop in data) {
        if (data.hasOwnProperty(prop)) {
            dropDownListElem = rowGrid.find("select[ng-bind*='" + prop + "']");
            if (dropDownListElem.length != 0) {
                dropDownListElem.find("option[value='" + data[prop] + "']").attr("selected", "selected");
            }

            var inputElem = rowGrid.find("input[ng-bind*='" + prop + "']");
            if (inputElem.length != 0) {
                if (inputElem.attr("type") == "checkbox" || inputElem.attr("type") == "radio") {
                    if (data[prop] == "on" || data[prop] == "On" || data[prop] == "ON")
                        inputElem.attr("checked", "checked");
                }
                else {
                    //inputElem.val(data[prop]);
                    inputElem.attr("value", data[prop])
                }
            }
        }
    }

    return rowGrid[0].outerHTML;
}

function replaceOtherPart(rowTemplate, obj) {
    var reg = /\{fn:([\w\(\)]+)\}/;
    return rowTemplate.replace(reg, function (val, val1) {
        replaceOtherPart.fn = function () { };
        eval("replaceOtherPart.fn =" + val1 + ";");
        return replaceOtherPart.fn.call(obj);
    });
}

/*
* Another variation of feedGrid.
* The difference is that:
*   The caller only needs to provide an array and the information of the grid.
* The function will construct the array into a grid-ready object to feed into
* the grid.
* 2016-01-05 Zhou Kai adds isAppend, which is a flag indicating this feed is a 
* update of existing row, or a appendent of a new row.
* For detailed description of this flag, refer to the comment of feedGrid function.
*/
function feedGridWOPrefix(dataSource, gridInfo, isAppend) {
    var obj = {};
    var gridReadyObj = {};
    if (dataSource != null) {
        gridReadyObj = constructGridReadyObj(dataSource, gridInfo.ngTemplate);
    }
    feedGridandLookup(gridReadyObj, gridInfo, isAppend);
}

// Construct a grid ready json object out of an array or a 
// single object.
// Grid ready json object means the structure of the object 
// matches that of the ngTempalte.
function constructGridReadyObj(arr, tExp) {
    var pObj = {},
        curObj = pObj;

    // Constructure the structure out of tExp(which
    // is usually a ngTempalte of the grid)
    while (tExp.indexOf(".") != -1) {
        var dPos = tExp.indexOf(".");
        var cProp = tExp.substring(0, dPos);
        tExp = tExp.substring(dPos + 1);

        curObj[cProp] = {};
        curObj = curObj[cProp];
    }

    // assumes tExp always ends with _
    tExp = tExp.substring(0, tExp.indexOf('_'));
    curObj[tExp] = [];

    if ($.isArray(arr) == true) {
        // the caller passes in an array
        curObj[tExp] = arr;
    }
    else if (typeof arr == 'object') {
        // the caller passes in a single object
        curObj[tExp].push(arr);
    }

    return pObj;
}

/*
* function feedGridandLookup(jsonObj, gridInfo);
* Purpose: Load JSON object into data grid and to lookup codes and display values 
 * Author: Mahen
* Date: 2015-10-19
* 2016-01-05 Zhou Kai adds isAppend, which is a flag indicating this feed is a 
* update of existing row, or a appendent of a new row.
* For detailed description of this flag, refer to the comment of feedGrid function.
*/
function feedGridandLookup(jsonObj, gridInfo, isAppend) {
    feedGrid(jsonObj, gridInfo, isAppend);
    doLookupforGrid(gridInfo.gridId);
}

/*
* function doLookupforGrid(gridId);
* Purpose: Do lookup based on the data and the code group category and return the displayable field
 * Author: Mahen
* Date: 2015-10-19
*/
function doLookupforGrid(gridId) {
    var table = $('#' + gridId)[0]; // zhou kai, for compatitility issue
    if (table == null) {
        return;
    }
    var spans = table.getElementsByTagName('span');
    for (var i = 0; i < spans.length; i++) {
        if ($(spans[i]).html().indexOf('[') != -1) {
            var innerText = $(spans[i]).html();
            var seperatorPosition = innerText.indexOf(',');
            var ngOption = innerText.substring(1, seperatorPosition);
            var ngValue = $.trim(innerText.substring(seperatorPosition + 1, innerText.indexOf(']')));
            var returnVal = obtainCode(codeList, ngOption, ngValue);
            $(spans[i]).html(returnVal);
        }
    }
}

//through the grid has data or not to decide show "No Data Found" message or not
// parameters : 
//          anchorName : the table ng-anchor value
function showNoDataFoundMsg(anchorName) {
    if (anchorName == null)
        return;
    var noDataId = anchorName.replaceAll(".", "\\.") + "_NoData";
    var anchorElem = $("tbody[ng-anchor='" + anchorName + "']");
    if (anchorElem.length == 0)
        anchorElem = $("table[ng-anchor='" + anchorName + "']");
    var isContainData = anchorElem.find("td").length > 0 ? true : false;
    if (!isContainData) {
        $("#" + noDataId).removeAttr("style");
        anchorElem.attr("style", "display:none");
    }
    else {
        $("#" + noDataId).attr("style", "display:none");
        anchorElem.removeAttr("style");
    }
}

/*
* Function: reloadGrid
* 
* Description: 
* Clear up the existing data(if any) of the grid, and fill it with new datasource.
* Plus clear up the ids, and curIndex property of the gridInfo object.
*/
var reloadGrid = function (datasource, gridInfo) {
    // (1) get the ng-template for the grid.
    // (2) find and remove all html pieces from ngAnchorMap which the index 
    //   contains  ng-template.
    // (3) clear up the current index and ids array.
    // (4) feed the grid with datasource.  
    // step (1) 
    var ngTemplate = gridInfo.ngTemplate,
        props = [],
        prop = '',
        i = 0,
        gridData = {};

    if ($.isArray(datasource)) {
        gridData = datasource;
    } else {
        gridData = getJsonProperty(datasource,
            getArrayObjName(gridInfo.ngTemplate));
    }

    // an existance checking before processing
    if (gridData === null) {
        return;
    }

    // step (2)
    for (prop in anchorMap) {
        if (anchorMap.hasOwnProperty(prop)) {
            if (prop.indexOf(ngTemplate) > -1) {
                props.push(prop);
            }
        }
    }

    for (i = 0; i < props.length; i++) {
        $(anchorMap[props[i]]).remove();
        delete anchorMap[props[i]];
    }

    ngTempSeries[gridInfo.ngTemplate] = -1;


    // step (3)
    gridInfo.curRowIndex = '';
    gridInfo.ids = [];

    // step (4)
    // if value is empty string, do not feed grid
    for (var i = 0; i < gridData.length; i++) {
        if (gridData[i] != null && gridData[i] != "") {
            for (var jsonObj in gridData[i]) {
                if (gridData[i][jsonObj] != "" && gridData[i][jsonObj] != null) {
                    feedGridWOPrefix(gridData, gridInfo);
                    return;
                }
            }

        }
    }

    showNoDataFoundMsg(gridInfo.ngAnchor);
};

/*
* Get the interested array from the JSON object,
* the structure of jsonObj should map to ngTemplate.
*/
function getJsonArrFromGrid(jsonObj, ngTemplate) {
    // the bottom hierarchy must be an array
    var hierarchies = ngTemplate.split('.');
    var depth = hierarchies.length;
    var result = {};
    var i = 0;
    var arrayName = '';

    if (depth <= 0) {
        return null;
    }

    for (i = 0; i < depth; i++) {
        if (i < depth - 1) {
            result = jsonObj[hierarchies[i]];
            jsonObj = result;
        } else {
            arrayName = hierarchies[i];
            if (arrayName.slice(-1) == '_') {
                arrayName = arrayName.substring(0, arrayName.length - 1);
            }
            result = jsonObj[arrayName];
        }
    }

    return result;
}

/*
* get the first array from target JSON object
*/
var getFirstArrFromObj = function (targetObj) {
    if ($.isArray(targetObj))
        return targetObj;

    if (targetObj == null || typeof targetObj != "object") {
        return null;
    }

    var pObj = targetObj;
    var TempArr = null;
    var propName = [];

    for (var prop in pObj) {
        if (pObj.hasOwnProperty(prop)) {
            if ($.isArray(pObj[prop])) {
                return pObj[prop];
            }
            propName.push(prop);
        }
    }

    for (var i = 0; i < propName.length; i++) {
        TempArr = getFirstArrFromObj(pObj[propName[i]]);
        if (TempArr != null) {
            return TempArr;
        }
    }
}

/*
* Remove HTML template from AnchorMaps by index.
*/
var deleteGridRow = function (gridInfo, rowId, alertinfo, callback) {

    var id = 0, anchorName = '';
    var info = "Are you sure you want to delete this record?";
    var yes = "Yes";
    var no = "No";
    if (alertinfo !== undefined) {
        if (alertinfo.info !== undefined) {
            info = alertinfo.info;
        }
        if (alertinfo.yes !== undefined) {
            yes = alertinfo.yes;
        }
        if (alertinfo.no !== undefined) {
            no = alertinfo.no;
        }
    }

    function doDelete () {
        anchorName = $("#" + rowId.replaceAll(".", "\\.")).parent().attr("ng-anchor");
        removeAnchor(rowId);
        try {
            id = rowId.split('_')[1];
            gridInfo.ids = removeItemFromArray(gridInfo.ids, id);
        } catch (e) {
        }

        log(gridInfo.ngTemplate + ': row ' + id + ' is deleted.');
        showNoDataFoundMsg(anchorName);
    }

    $.jconfirm(info, function (e) {
        if (e) {
            if (callback !== undefined) {
                callback(doDelete);
            } else {
                doDelete();
            }
        }
    }, { proceed: yes, cancel: no });
}

/*
* Update HTML template in AnchorMaps by index.
*/
var getJsonFromGridRow = function (rowId, ngTemplate) {
    var jsonFromGridRow = {};
    setJsonObj(jsonFromGridRow, rowId, true);
    jsonFromGridRow = getJsonArrFromGrid(jsonFromGridRow, ngTemplate)[0];

    return jsonFromGridRow;
};

// copy the row specified by row index, and append it to the last row.
var cpGridRow = function (rowId, gridInfo) {
    // (1) get the json object from the grid by row id(perform copy)
    // (2) get the ng-template and the new index name
    // (3) fill in the ng-template with json object value(perform paste)
    // (4) append the filled ng-template into the anchorMap(perform paste)
    // (5) update the index in ngTempSeries(manage index)
    // (6) do look up for the grid
    // (7) process hidden field

    // define variables
    var json4Row = {},
        rowTemplate,
        rowCounter = 0,
        newIndexName = '',
        newRow = '',
        stringifiedRow = '',
        id = '',
        jsonObj = {}, // id for the hidden field if any
        tmpObj = {};

    // end define variables

    // step (1)
    json4Row = getJsonFromGridRow(rowId, gridInfo.ngTemplate);
    if (gridInfo.gridId === 'gridAddressDetails') {
        tmpObj = JSON.parse(json4Row.json);
        tmpObj.addressType = '';
        json4Row.json = JSON.stringify(tmpObj);
    }

    // step (2)
    rowCounter = ngTempSeries[gridInfo.ngTemplate];
    if (rowCounter === null || typeof rowCounter == 'undefined') {
        rowCounter = -1;
    }
    newIndexName = gridInfo.ngTemplate + (++rowCounter);

    // step(3)
    // remove isPrimary property, when copying a grid row, the clone will
    // never be isPrimary
    delete json4Row.isPrimary;
    if (json4Row.hasOwnProperty('json')) {
        jsonObj = JSON.parse(json4Row.json);
        delete jsonObj.isPrimary;
        json4Row.json = JSON.stringify(jsonObj);
    }
    rowTemplate = fillRowTemplate(newIndexName, gridInfo.ngTemplate, json4Row, gridInfo);

    // step (4)
    newRow = $(rowTemplate)
    anchorMap[newIndexName] = newRow;
    $(anchorMap[gridInfo.ngAnchor]).append(newRow);
    addItemToArray(gridInfo.ids, rowCounter);

    // step (5)
    ngTempSeries[gridInfo.ngTemplate] = rowCounter;

    // step (6)
    doLookupforGrid(gridInfo.gridId);

    // step (7)
    if (gridInfo.isRowStringified &&
        $(anchorMap[gridInfo.ngAnchor]).html().
            indexOf(rowId + '.json') > -1) {
        // get json string for row from the hidden field
        id = (rowId + '.json').replaceAll('.', '\\.');
        stringifiedRow = $('#' + id).text();
        // never copy isPrimary property
        var obj = JSON.parse(stringifiedRow);
        delete obj.isPrimary;
        if (gridInfo.gridId === 'gridAddressDetails') {
            obj.addressType = '';
        }
        stringifiedRow = JSON.stringify(obj);
        // end never copy isPrimary property
        id = (newIndexName + '.json').replaceAll('.', '\\.');
        $('#' + id).text(stringifiedRow);
    }

    return newIndexName;
};

// Populate the specific row of a grid to another div with id=divId.
// input: 
//   rowId: the index of the specific row in the grid.
//   ngTemplate: ng-template annotation of the grid, WITHOUT the postfix _
//   divId: where the json object will be populated to.
// output:
//   The value of the specific row in populated to the UI specified by divId.
var populateGridRow = function (rowIndex, gridInfo) {
    clearUpDiv(gridInfo.inputDivId);
    showSectionByID(gridInfo.inputDivId, true);
    // (1) get the json object for the specific grid row
    // (2) construct the json object according to the annotation of theinput 
    // area
    // (3) set that json object to the editable area
    // (4) do lookup for code-value fields
    // (5) update global grid infomation

    // step (1)
    var json4Row = {},
        ngTemplate = gridInfo['ngTemplate'],
        hierarchies,
        i = 0,
        objTmp = {},
        elems = {},
        id = '',
        value = '',
        radioButton;

    if (gridInfo.isRowStringified &&
            $(anchorMap[gridInfo.ngAnchor]).html().
                indexOf(rowIndex + '.json') > -1) {
        // get json string for row from the hidden field
        id = (rowIndex + '.json').replaceAll('.', '\\.');
        json4Row = JSON.parse($('#' + id).text());
        id = '';
    } else {
        ngTemplate = ngTemplate.slice(0, ngTemplate.length - 1); // get rid of _
        json4Row = getJsonFromGridRow(rowIndex, ngTemplate);
    }

    // step (2)
    objTmp = { "temporary": {} };
    objTmp.temporary[gridInfo.gridId] = json4Row;

    // step (3)
    setDOMById(objTmp, codeList, gridInfo.inputDivId);

    // step (4) the 'datasource' is stored in the backend-field as a DOM property
    // called 'ngOption'.
    elems = $('#' + gridInfo.inputDivId)[0].getElementsByTagName('*');
    for (i = 0; i < elems.length; i++) {
        id = $(elems[i]).attr('id');
        if (id == '' || id === null || typeof id == 'undefined') { continue; }
        if (id.slice(0, 3) == 'val') {
            // it's the 'value' field, so find the corresponding 'code' field
            value = obtainCode(codeList, $(elems[i]).attr('ngOption'),
                $(elems[i]).val());
            id = id.replace('val', 'res');
            $('#' + id).val(value);
        }
    }

    // step (5)
    aos['grids'][gridInfo['gridId']]['curRowIndex'] = rowIndex;

};

//Populate the specific row of a grid to another div with id=divId.
//and look up for specific span to show right value
var populateGridRowForView = function (rowIndex, gridInfo) {
    populateGridRow(rowIndex, gridInfo);
    // do look up for text
    doLookupForViewText(gridInfo.inputDivId)
}

/*
* Do lookup for view text, 
* based on the data and the code group category and return the displayable field
*/
var doLookupForViewText = function (divId) {
    var spans = $("#" + divId).find("span[ngoption]");
    for (var i = 0; i < spans.length; i++) {
        var txtVal = $(spans[i]).text();
        var ngOption = $(spans[i]).attr("ngoption");
        var realVal = obtainCode(codeList, ngOption, txtVal);
        $(spans[i]).text(realVal);
    }
}

// show hide section by section id
function showSectionByID(id, flag) {
    if (flag === true) {
        document.getElementById(id).removeAttribute("style");
    }
    else if (flag === false) {
        document.getElementById(id).setAttribute("style", "display:none");
        // and need to alert the user that the keyed in value will be cleared
    }
}

// auto show hide section by section id
function toggleSectionByID(id) {
    var style = $("#" + id).attr("style") != null ?
            $("#" + id).attr("style").toLowerCase() :
            "";

    if (style.indexOf("display") > -1 &&
        style.indexOf("none") > -1) {
        $("#" + id).removeAttr("style");
    }

    else {
        $("#" + id).attr("style", "display:none");
    }
}

// Given a div id, construct a JSON object based on it,
// only that all property value equal to ''.
var constructJsonStructureWOValue = function (sObj, divId, extractStatic) {
    var jsonObj = {};
    setJsonObj(jsonObj, divId, extractStatic);
    setJsonObjToNullValue(jsonObj);
    merge2JsonObj(sObj, jsonObj);
}

// Given a div id, clear up the value on HTML elements
var clearUpDiv = function (divId, includingGrids) {
    var emptyObj = {},
        gridInfos = [];

    constructJsonStructureWOValue(emptyObj, divId, true);
    setDOMById(emptyObj, codeList, divId);

    if (includingGrids === true) {
        gridInfos = getGridInfoByDivId(divId);

        $(gridInfos).each(function (index) {
            clearGrid(gridInfos[index]);
        });
    }

};

// set json object to empty string 
// e.g. input: 
//       pObj = {"student": {"firstName":"kai", "lastName":"zhou"}}
// output:
//       pObj = {"student": {"firstName":"", "lastName":""}}
var setJsonObjToNullValue = function (sObj) {
    if ($.isArray(sObj)) {
        for (var i = 0; i < sObj.length; i++) {
            setJsonObjToNullValue(sObj[i]);
        }

        return;
    } else if (typeof (sObj) == 'object') {
        for (prop in sObj) {
            if (typeof (sObj[prop]) == 'object' && sObj[prop] != null) {
                setJsonObjToNullValue(sObj[prop]);
            } else {
                sObj[prop] = "";
            }
        }

        return;
    }
}

// merge "jsonObj2" filed and data to "jsonOjb1"
// e.g. 
//input:
//      jsonObj1 = {"case":{"test1":"123"}}
//      jsonObj2 = {"case":{"test2":"456"}}
//output:
//      jsonObj1 = {"case":{"test1":"123","test2":"456"}}
//      jsonObj2 = {"case":{"test2":"456"}}
//e.g. 2 
//input:
//      jsonObj1 = {"case":{"AAA":"123"}}
//      jsonObj2 = {"case":{"AAA":"456"}}
//output:
//      jsonObj1 = {"case":{"AAA":"456"}}
//      jsonObj2 = {"case":{"AAA":"456"}}
var merge2JsonObj = function (jsonObj1, jsonObj2) {
    // merge two arrays
    if ($.isArray(jsonObj1) && $.isArray(jsonObj2)) {
        for (var i = 0; i < jsonObj2.length; i++) {
            if (i >= jsonObj1.length) {
                break;
            }
            merge2JsonObj(jsonObj1[i], jsonObj2[i]);
        }
    } else if (typeof (jsonObj2) == 'object' && jsonObj2 != null &&
        $.isArray(jsonObj1) == false) {
        for (var obj in jsonObj2) {
            if (!jsonObj1.hasOwnProperty(obj)) {
                jsonObj1[obj] = jsonObj2[obj];
            } else {
                if (typeof (jsonObj1[obj]) == 'string' ||
                    jsonObj1[obj] == null) {
                    jsonObj1[obj] = jsonObj2[obj];
                }
                else {
                    merge2JsonObj(jsonObj1[obj], jsonObj2[obj]);
                }
            }
        }
    }
}

// Use obj2 to update obj1. The value of obj2 overwrites that of obj1. If
// obj1 does not have such property, add it.
var updateJsonObj = function (obj1, obj2) {
    var prop = '';

    for (prop in obj2) {
        if (obj2.hasOwnProperty(prop)) {
            if (typeof obj2[prop] == 'object' &&
                typeof obj2[prop] != 'function') {
                if (typeof obj1[prop] == 'undefined' ||
                    obj1[prop] == null) {
                    obj1[prop] = {};
                }
                updateJsonObj(obj1[prop], obj2[prop]);
            } else {
                obj1[prop] = obj2[prop];
            }
        }

    }
};

/*
*   Loop through all properties recursively, and if there is a object A having
* a property named 'json', and A is an element of an array, and
* the typeof such property is 'string'. 
*   Parse the 'json' string into object B, and use B to replace A within the
* array.
*/
var processJsonProp = function (obj) {
    var key = '', value = '', i = 0, l = 0, arrKey = '', parsedObj = {};

    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] == 'object' && !$.isArray(obj[key])) {
                processJsonProp(obj[key]);
            } else if ($.isArray(obj[key])) {
                l = obj[key].length;
                for (i = 0; i < l; i++) {
                    for (arrKey in obj[key][i]) {
                        if (obj[key][i].hasOwnProperty(arrKey) &&
                            arrKey == 'json') {
                            if (typeof obj[key][i].json != 'undefined' && obj[key][i].json != ''
                                && obj[key][i].json != '{json}') {
                                parsedObj = JSON.parse(obj[key][i].json);
                                delete parsedObj.json;
                                processJsonProp(parsedObj);
                                obj[key][i] = parsedObj;
                            }
                        }
                    }
                }
            }
        }
    }
};

function isNullOrEmpty(varstr) {
    if (varstr == 'undefined' || varstr == "null" || varstr == null) {
        return true;
    }
    return false;
}

var clearGrid = function (gridInfo) {
    var prop = '', props = [], ngTemplate = gridInfo.ngTemplate;

    for (prop in anchorMap) {
        if (anchorMap.hasOwnProperty(prop)) {
            if (prop.indexOf(ngTemplate) > -1) {
                props.push(prop);
            }
        }
    }

    for (i = 0; i < props.length; i++) {
        $(anchorMap[props[i]]).remove();

        delete anchorMap[props[i]];
    }

    ngTempSeries[gridInfo.ngTemplate] = -1;
    gridInfo.ids = [];
    gridInfo.curRowIndex = '';

    // log(gridInfo.ngTemplate + ' all rows are cleared.');
};

//plain delete of a grid record 
var directDeleteGridRow = function (gridInfo, rowId) {

    var id = 0, anchorName = '';
    anchorName = $("#" + rowId.replaceAll(".", "\\.")).parent().attr("ng-anchor");
    removeAnchor(rowId);
    try {
        id = rowId.split('_')[1];
        gridInfo.ids = removeItemFromArray(gridInfo.ids, id);
    } catch (e) {
    }

    log(gridInfo.ngTemplate + ': row ' + id + ' is deleted.');
    showNoDataFoundMsg(anchorName);

}