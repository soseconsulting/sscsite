/*$Id$*/
var CreatorForms = (function(){

    "use strict"; //NO I18N
    var form_submitted,
        form_access_type,
        scriptLoaded = false,
        scriptLoading = false,
        form_divs = [],
        form_data = [],
        jquerySrc = (/Trident\/|MSIE/.test(window.navigator.userAgent)) ? "/siteforms/appcreator/live/common/js/jqueryie.js":"/siteforms/appcreator/live/common/js/jquery.js", //NO I18N
        scriptSrc = [jquerySrc,"/siteforms/appcreator/live/common/js/form.js","/siteforms/appcreator/live/common/js/generatejs.js","/siteforms/appcreator/live/common/js/searchableInput.js","/siteforms/appcreator/live/common/js/app.js","/siteforms/appcreator/live/common/js/securityutil.js"]; //NO I18N

    function loadScript(src){
        scriptLoading = true;
        var script =document.createElement('script');
        document.head.appendChild( script );
        script.src = src;
        script.onload = function(){
            if(scriptSrc.length >0){
                loadScript(scriptSrc.shift());
            }
            else{
                scriptLoaded = true;
                for(var i=0; i<form_divs.length; i++){
                    renderForm(form_divs[i],form_data[i]);
                }
                setFormSubmitRes();
            }
        }
    }

    function checkIfScriptLoaded(node, data){
        node.innerHTML = "<h4 align='center'>" + i18n.get('forms.common.loading') + "</h4>";
        data.next && data.next();
        if(window.zs_rendering_mode == "live"){
            if(!scriptLoaded){
                form_divs.push(node);
                form_data.push(data);
                !scriptLoading && loadScript(scriptSrc.shift());
            }else{
                renderForm(node, data);
            }
        }else{
            renderForm(node, data);
        }
    }

    function renderForm(node, data){
        var params = {};
        params.formId = node.getAttribute("data-app-sub-type");
        $X.get({
            url     : '/siteapps/forms', //NO I18N
            params  : params,
            handler : renderFormRes,
            args    : {node: node, data: data}
        });
    }

    function renderFormRes(args){
        var node = args.node;
        var response = this.responseText;
        node.innerHTML = response;
        var formEle = node.getElementsByTagName("form")[0];
        loadCaptcha(formEle, args.data);
        if(window.zs_rendering_mode == "live"){
            if(response != ""){
                i18n.selectOption = i18n.get("forms.common.optionselect");
                i18n.invalidmsg = i18n.get("forms.error.msg");
                i18n.pleasewait = i18n.get("forms.wait.msg");
                bindFormEvents(formEle);
                ZCForm.inZohoCreator = false;
                var onLoadExist = formEle.getAttribute("onLoadExist");
                var appLinkName = node.querySelector("input[name=appLinkName]").getAttribute("value"); //NO I18N
                var formLinkName = node.querySelector("input[name=formLinkName]").getAttribute("value"); //NO I18N
                var formDispName = formEle.getAttribute("dispname");
                var formAccessType = node.querySelector("input[name=recType]").getAttribute("value"); //NO I18N
                var formID = node.querySelector("input[name=formid]").getAttribute("value"); //NO I18N
                ZCForm.zcFormAttributes.genScriptURL = "/siteforms/generateJS.do"; //NO I18N
                ZCForm.zcFormAttributes.formParentDiv = false;
                ZCForm.zcFormAttributes.customCalendar = true;
                ZCForm.zcFormAttributes.browseralert = false;
                ZCForm.zcFormAttributes.ajaxreload = true;
                ZCForm.zcFormAttributes.fieldContainer = "div"; //NO I18N
                ZCForm.zcFormAttributes.eleErrTemplate = "<div class=\"zpform-errormsg\" tag=\"eleErr\"> insertMessage </div>";
                relodCurrentForm = false;
                var paramsMapString = "formID=" + formID + ",appLinkName=" + appLinkName + ",formDispName="+ formDispName + ",formAccessType=1,formLinkName="+formLinkName; //NO I18N
                ZCForm.addToFormArr(paramsMapString, formLinkName);
                if(onLoadExist === "true"){
                    doActionOnLoad(formID, ZCForm.getForm(formLinkName, formAccessType));
                }else{
                    ZCForm.enableForm(formLinkName,formAccessType);
                }
                ZCForm.regFormEvents(formLinkName,formAccessType);
            }
        }
        else{
            var formEle = node.getElementsByTagName("form")[0];
            cancelEvent(formEle,"submit"); //NO I18N
            var elname = formEle.getAttribute("elname")+"_fileUpload"; //NO I18N
            var fileElements = document.querySelectorAll("[data-element-id="+elname+"]"); //NO I18N
            for(var i=0;i<fileElements.length;i++){
                cancelEvent(fileElements[i],"click"); //NO I18N
            }
        }
    }

    function cancelEvent(element,event){
        element.addEventListener(event,function(e){
            e.preventDefault();
        });
    }

    function loadCaptcha(formEle, data){
        if(formEle){
            var afterAppLoad = data && data.loaded;
            var formid = formEle.querySelector("input[name=formid]").getAttribute("value"); //NO I18N
            var captchaElName = formEle.getAttribute("elname")+"_captcha"; //NO I18N
            var captchaEl = formEle.querySelector("[elname='zc-captcha']"); //NO I18N
            if(captchaEl){
                var params = {};
                params.time = new Date().getTime();
                params.formid = formid;
                $X.get({
                    url     : '/siteforms/getcaptcha.do', //NO I18N
                    params  : params,
                    handler : function() {
                        var captcha_url = decodeURIComponent(this.responseText),
                            captcha_url_params_array = captcha_url.split("?")[1].split("&"),
                            cdigest = captcha_url_params_array[0].split("=")[1],
                            cdigest_element = formEle.querySelector("input[name=cdigest]"); //NO I18N
                        cdigest_element.value = cdigest;
                        captchaEl.src = captcha_url;
                        zsUtils.onImageLoad(captchaEl.parentNode, afterAppLoad);
                    }
                });
            } else {
                afterAppLoad();
            }
        }
    }

    function bindFormEvents(formEle){
        formEle.addEventListener("submit",function(e){
            form_submitted = formEle.getAttribute("elname");
            form_access_type = formEle.querySelector("input[name=recType]").getAttribute("value"); //NO I18N
        });
        //Datepicker events
        var dateTimeElName = formEle.getAttribute("elname")+"_datetime"; //NO I18N
        var dateTimeElements = formEle.querySelectorAll("[data-element-id="+dateTimeElName+"]"); //NO I18N
        for(var i=0;i<dateTimeElements.length;i++){
            bindEvents(dateTimeElements[i],"datetime"); //NO I18N
        }
        var dateElName = formEle.getAttribute("elname")+"_date"; //NO I18N
        var dateElements = formEle.querySelectorAll("[data-element-id="+dateElName+"]"); //NO I18N
        for(var i=0;i<dateElements.length;i++){
            bindEvents(dateElements[i],"date"); //NO I18N
        }
        //File upload events
        bindFileUpload(formEle.getAttribute("elname")+"_fileUpload",false); //NO I18N
        var fileRemoveElName = formEle.getAttribute("elname")+"_fileRemove"; //NO I18N
        var fileRemoveElements = formEle.querySelectorAll("[data-element-id="+fileRemoveElName+"]"); //NO I18N
        for(var i=0;i<fileRemoveElements.length;i++){
            bindEvents(fileRemoveElements[i],"fileremove"); //NO I18N
        }
    }

    function bindEvents(element,type){
        switch(type){
                case "date" : //NO I18N
                    element.addEventListener("click",function(event){
                        datepickerJS.init(event.currentTarget,'date'); //NO I18N
                    });
                   break;
                case "datetime" : //NO I18N
                    element.addEventListener("click",function(event){
                        datepickerJS.init(event.currentTarget,'datetime'); //NO I18N
                    });
                   break;
                case "fileupload" : //NO I18N
                    element.addEventListener("change",function(event){
                        ZCForm.browseAttachEvent(event.target);
                    });               
                   break;
                case "fileremove" : //NO I18N
                    element.addEventListener("click",function(event){
                        ZCForm.removeUploadedFile(event.currentTarget);
                    });
                   break;
        }
    }

    function bindFileUpload(elname,clear_file_input){
        var fileElements = document.querySelectorAll("[data-element-id="+elname+"]"); //NO I18N
        for(var i=0;i<fileElements.length;i++){
            if(clear_file_input){
                fileElements[i].previousElementSibling.value = ""; //NO I18N
                fileElements[i].setAttribute("zc-Attached-Type","browse");
                fileElements[i].setAttribute("zc-DocId","");
                fileElements[i].setAttribute("isAttached","false");
                fileElements[i].setAttribute("changed","false");
                fileElements[i].value = ""; //NO I18N
            }
            bindEvents(fileElements[i],"fileupload"); //NO I18N
        }
    }

    function setFormSubmitRes(){
        if(window.ZCApp){
            window.ZCApp.contextPath = "/siteforms";// No I18N
            if(window.ZCForm){
                ZCForm.callbackFunc = function(formLinkName, formAccessType, paramsMap, infoMsg, errorMsg, succMsg, succMsgDuration){
                    if(!formLinkName){
                        return;
                    }
                    var msgElId = "formMsg_"+formLinkName; //NO I18N
                    var formMsgEle = document.querySelector("[data-element-id="+msgElId+"]"); //NO I18N
                    formMsgEle.style.color = "green";
                    var successMsg = (succMsg==="zc_success")?"":succMsg;//NO I18N
                    formMsgEle.innerText = successMsg;
                    formMsgEle.parentNode.style.display = "";
                    setTimeout(function(){formMsgEle.parentNode.style.display="none"}, 5000);
                    var formElem = fnGetElementByAttribute("elname", formLinkName, "form");//NO I18N
                    formElem.reset();
                    relodCurrentForm = false;
                    bindFileUpload(formLinkName+"_fileUpload",true); //NO I18N
                    loadCaptcha(formElem);
                    ZCForm.regFormEvents(formLinkName,form_access_type);
                }
                ZCApp.showErrorDialog = function(headerMsg, message){
                    var msgElId = "formMsg_"+form_submitted; //NO I18N
                    var formMsgEle = document.querySelector("[data-element-id="+msgElId+"]"); //NO I18N
                    formMsgEle.style.color = "red";
                    formMsgEle.innerText = message;
                    formMsgEle.parentNode.style.display = "";
                    setTimeout(function(){formMsgEle.parentNode.style.display="none"}, 5000);
                    bindFileUpload(form_submitted + "_fileUpload",false); //NO I18N
                }
                ZCForm.showFieldErr = function(fieldEl, errMsg){
                    if(fieldEl.length > 0){
                        var errEl = ZCForm.zcFormAttributes.eleErrTemplate;
                        errEl = errEl.replace("insertMessage", errMsg);
                        var parentEl = $D.findParent(fieldEl[0], "zpform-field-container");
                        parentEl.innerHTML += errEl;
                        var field_type = fieldEl.attr("fieldtype"); //NO I18N
                        switch(field_type){
                            case "10" :
                                var date_element = parentEl.querySelector("[data-element-id="+form_submitted+"_date"+"]"); //NO I18N
                                bindEvents(date_element,"date"); //NO I18N
                                break;
                            case "18" : 
                                var file_element = parentEl.querySelector("[data-element-id="+form_submitted+"_fileUpload"+"]"); //NO I18N
                                file_element.addEventListener("change",function(e){
                                    ZCForm.browseAttachEvent(file_element);
                                });
                                var file_remove_element = parentEl.querySelector("[data-element-id="+form_submitted+"_fileRemove"+"]"); //NO I18N
                                file_remove_element.addEventListener("click",function(event){
                                    ZCForm.removeUploadedFile(file_remove_element);
                                });
                                ZCForm.regFormEvents(form_submitted,form_access_type);
                                break;
                            case "22" :
                                var date_element = parentEl.querySelector("[data-element-id="+form_submitted+"_datetime"+"]"); //NO I18N
                                bindEvents(date_element,"datetime"); //NO I18N
                        }
                    }
                }
                ZCForm.removeUploadedFile = function(fileEl){
                    if(fileEl instanceof jQuery){
                        fileEl = fileEl.context;
                    }
                    var parent = fileEl.parentNode,
                        fileInputEl = parent.querySelector("input[type=file]"); //NO I18N
                    fileInputEl.setAttribute("zc-Attached-Type","browse");
                    fileInputEl.setAttribute("zc-DocId","");
                    fileInputEl.setAttribute("isAttached","false");
                    fileInputEl.value = ""; //NO I18N
                    var fileInputElClone = fileInputEl.cloneNode(false);
                    parent.replaceChild(fileInputElClone,fileInputEl);
                    var fileRemoveElement = fileInputElClone.nextElementSibling;
                    $D.css(fileRemoveElement,"display","none");
                    parent.querySelector("input[subtype=file]").value = ""; //NO I18N  
                    fileInputElClone.addEventListener("change",function(e){
                        fileInputElClone.setAttribute("changed","changed");
                        ZCForm.browseAttachEvent(fileInputElClone);
                    });
                }
            }
        }
        window.openWindowTask = function(urlString, windowType, windowSpecificArgument){
            if(windowType == "New window"){
                window.open(urlString, "_blank");
            }
            else if(windowType == "Parent window"){
                window.open(urlString, "_parent");
            }
            else if(windowType == "Same window"){
                window.location.href = urlString;
            }
        }
        window.clearComponent = function(formName, fieldName, recType){
            var el = ZCForm.clearField(formName, fieldName, recType);
            if(!el){
                var divElName = formName+"-"+fieldName+"div"; //NO I18N
                var divEl=document.querySelector("[data-element-id="+divElName+"]") //NO I18N
                if(divEl && ((divEl.getAttribute("fieldtype")=="radio") || (divEl.getAttribute("fieldtype")=="checkbox"))){
                    divEl.innerHTML="";
                }
            }
            if($(el).attr("type") == "picklist" || $(el).attr("type") == "select-one")
            {
                $(el).append(ZCUtil.createElem("option", "value=-Select-", "-"+i18n.selectOption+"-"));
            }
            if(!form_element[el])
            {
                form_element[el]=el;
            }
        }
        window.addValueToTheFieldElem = function(formName, fieldName, value, recType, combinedValue, isAppend){
            var fieldElem = document.getElementById( formName + ":" + fieldName + "_recType_comp" );
            var divElName = formName+"-"+fieldName+"div"; //NO I18N
            var divEl=document.querySelector("[data-element-id="+divElName+"]"); //NO I18N
            if(divEl){
                if((divEl.getAttribute("fieldtype")=="radio") || (divEl.getAttribute("fieldtype")=="checkbox")){
                    sitesadd(formName, fieldName, value, divEl.getAttribute("fieldtype"), recType, divEl);
                }
                else{
                    addValue(formName, fieldName, fieldElem, value, recType, combinedValue, null,null,isAppend);
                }
            }
        }
        var sitesadd = function(formName, fieldName, value, type, recType, e){
            var id=type+"El_"+fieldName+"_"+value+"_"+recType;//NO I18N
            var inputEl = $("<input id=\""+id+"\" name=\""+fieldName+"\" formcompid=\""+$(e).attr("formcompid")+"\"delugetype=\""+$(e).attr("delugetype")+"\" onchangeexists=\""+$(e).attr("onchangeexists")+"\"  fieldtype=\""+$(e).attr("fieldtypeno")+"\" value=\""+value+"\" isformulaexist=\""+$(e).attr("isformulaexist")+"\" type=\""+type+"\"/><label>"+value+"</label>"); //NO I18N
            var choiceDiv = document.createElement("div");
            choiceDiv.className = "zpform-choice-container"; //NO I18N
            choiceDiv.appendChild(inputEl[0]);
            choiceDiv.appendChild(inputEl[1]);
            $(e).append(choiceDiv);
        }
        window.docid = function(A){
            return document.getElementById(A);
        }
    }

    var fnGetElementByAttribute = function(attrName, attrValue, tagName){
        var attrElem;
        var elems;
        var elemArr = document.getElementsByTagName(tagName);
        for(var j=0; j<elemArr.length; j++){
            elems = elemArr[j];
            var eleAttr = elems.getAttribute(attrName);
            if(eleAttr && eleAttr==attrValue){
                attrElem = elems;
                break;
            }
        }
        return attrElem;
    }

    return {
        init  : checkIfScriptLoaded
    };
})();
