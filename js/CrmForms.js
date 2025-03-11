/*$Id$*/

var CrmForms = (function(){

	"use strict"; //NO I18N
	function renderForm(node, data){
		node.innerHTML = "<h4 align='center'>" + i18n.get('forms.common.loading') + "</h4>";
		data.next && data.next();
		var params = {},
			heading_tag_open = "<h4 align='center'>", //NO I18N
			heading_tag_close = "</h4>"; //NO I18N
		params.type = node.getAttribute("data-formtype");
		params.crmFormId = node.getAttribute("data-formid");
        params.operation = "render"; //NO I18N
		if(!params.type || !params.crmFormId){
			node.innerHTML = (window.zs_rendering_mode == "live") ? "" : parent.cms_i18n('ui.crm.add.errormessage',heading_tag_open,heading_tag_close); //NO I18N
			return;
		}
		$X.get({
        	url     : '/siteapps/crm',//NO I18N
        	params  : params,
        	handler : renderFormRes,
        	args	: { node : node, data : data }
    	});
	}

	function renderFormRes(args){
        var response = this.responseText,
            node = args.node, afterAppLoad = args.data.loaded;
        node.innerHTML = response;
        var formEle = node.getElementsByTagName("form")[0];
        var captchaEl = getCaptchaElement(formEle);
        if(window.zs_rendering_mode == "live"){
            if(response != ""){
                bindFormEvents(formEle);
            }
        }
        else{
            var formEle = node.getElementsByTagName("form")[0];
            formEle.addEventListener("submit",function(e){
                e.preventDefault();
            });
        }
        if(captchaEl) {
        	zsUtils.onImageLoad(captchaEl.parentNode, afterAppLoad)
        } else {
        	afterAppLoad();
        }
    }

	function bindFormEvents(formEle){
        
		//Form submit
		formEle.addEventListener("submit",function(e){
	    	var valid = validateCrmForm(formEle);
	    	if(!valid){
	    		e.preventDefault();
	    	}
		});

        //Datepicker events
        var dateTimeElements = formEle.querySelectorAll("[data-element-id=datetime]"); //NO I18N
        for(var i=0;i<dateTimeElements.length;i++){
            bindDateEvents(dateTimeElements[i],"datetime"); //NO I18N
        }
        var dateElements = formEle.querySelectorAll("[data-element-id=date]"); //NO I18N
        for(var i=0;i<dateElements.length;i++){
            bindDateEvents(dateElements[i],"date"); //NO I18N
        }
        var captchaEl = getCaptchaElement(formEle);
        if(captchaEl){
           captchaEl.addEventListener("click",function(e){
               captchaReload(captchaEl);
           });
        }

        var privacyEl = formEle.querySelector("[data-element-id=privacy]"); //NO I18N
        if(privacyEl) {
            formEle.querySelector("[type=submit]").disabled = true; //NO I18N
            privacyEl.addEventListener("change",function(e){
                if(e.target.checked) {
                    formEle.querySelector("[type=submit]").disabled = false; //NO I18N
                } else {
                    formEle.querySelector("[type=submit]").disabled = true; //NO I18N
                }
            });
        }

        var resetBtn = formEle.querySelector("[type=reset]"); //NO I18N
        resetBtn.addEventListener("click",function(e){
            e.preventDefault();
            formEle.reset();
            if(formEle.querySelector("[data-element-id=privacy]")) {
                formEle.querySelector("[type=submit]").disabled = true; //NO I18N
            }
        });
    }

    function getCaptchaElement(formEle) {
    	return formEle.querySelector("[data-element-id$=captcha]"); //NO I18N
    }

    function bindDateEvents(element,type){
    	if(type == "date"){
    		element.addEventListener("click",function(event){
                datepickerJS.init(event.currentTarget,'date'); //NO I18N
            });
    	}else{
    		element.addEventListener("click",function(event){
                datepickerJS.init(event.currentTarget,'datetime'); //NO I18N
            });
    	}
    }

    function captchaReload(captchaEl){
       var imgElem=captchaEl.parentNode.getElementsByTagName('img')[0];
        if(imgElem){
            if(imgElem.src.indexOf('&d') !== -1 ){
                imgElem.src=imgElem.src.substring(0,imgElem.src.indexOf('&d'))+'&d'+new Date().getTime();
            }else{
                imgElem.src=imgElem.src+'&d'+new Date().getTime();
            }
        }
    }

	function validateCrmForm(formEle){
		for(var i=0;i<formEle.elements.length;i++){
			var elem = formEle.elements[i];
			var errElem = document.getElementById(elem.name+"-error");
        	if(errElem){
            	errElem.parentNode.removeChild(errElem);
    		}
    		var regx = new RegExp("([0-1][0-9]|[2][0-3]):([0-5][0-9]):([0-5][0-9])");
	        var time = regx.exec(elem.value);
	        if(elem.getAttribute("format") && time !==null){
	            var hr=parseInt(time[1]);
	            var ampm;
	            ampm= (hr>11)?"pm":"am"; //NO I18N
	            hr=(hr>11)?(hr-12):hr;
	            hr=(hr===0)?(12):hr;
	            document.getElementsByName(elem.name)[0].value=elem.value.replace(time[0],"");
	            document.getElementsByName(elem.name+"minute")[0].value=time[2];
	            document.getElementsByName(elem.name+"hour")[0].value=""+hr;
	            document.getElementsByName(elem.name+"ampm")[0].value=ampm;
	        }
	        var dataReqd = elem.getAttribute("data-required");
	        if(dataReqd=="true"){
	        	var errMsg = "",
                    element_label = (elem.getAttribute("data-field-label") != null && elem.getAttribute("data-field-label") != "") ? elem.getAttribute("data-field-label") : elem.name;
	            if(elem.value==""){
                    if(elem.type == "file") {
                        errMsg = i18n.get("crm.error.attachfile");
                    } else {
                        errMsg = i18n.get("crm.error.textempty",element_label);
                    }
	            }else if(elem.type =="checkbox" && elem.checked == false){
	                errMsg = i18n.get("crm.error.checkboxempty",element_label);
	            }else if(elem.nodeName=="SELECT" && (elem.options[elem.selectedIndex].text=="-None-" || elem.options[elem.selectedIndex].text=="-Select-")){
	                errMsg = i18n.get("crm.error.checkboxempty",element_label);
	            }
	            if(errMsg != ""){
	            	errElem = document.createElement("div");
	                errElem.id = elem.name+"-error";
	                errElem.setAttribute("tag","eleErr");///NO I18N		
	            	errElem.className += " zpform-errormsg"; //NO I18N
	                errElem.innerHTML = errMsg;
	                elem.parentNode.appendChild(errElem);
	                return false;
	            }
        	}
		}
		return true;
	}

	return {
        init   : renderForm
    };
})();
