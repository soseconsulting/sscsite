/*$Id$*/

var product_option = (function () {
    var DEFAULT_VARIANT_ID = "-1"; // No I18N
    var INVALID_VARIANT_ID = "-2"; // No I18N
    var backOrderAvailable = false;
    var push_state = true;

    if (window.zs_rendering_mode == "live") {
        window.onerror = function(message, source, lineno, colno, error) {
            var formData = new FormData();
            var errorUrl = '/sites/client/errors'; //No I18N
    
            formData.append('url', window.location.href); //No I18N
            formData.append('browser', window.navigator.userAgent);//No I18N
            formData.append('source', source);//No I18N
    
            if (error.stack) {
                formData.append('trace', error.stack);//No I18N
            }
            formData.append('message', message);//No I18N
    
            var xhr = new XMLHttpRequest();
            xhr.open('POST', errorUrl, true);
            xhr.send(formData);
    
            // If we return true, then that will prevent the browser’s default error handling.
            return false;
        }
    }

    function hideElement (element) {
        element.style.display = "none"; // No I18N
    }

    function hideElements (elements) {
        Array.prototype.slice.call(elements).forEach(hideElement);
    }

    function showElement (element) {
        element.style.display = "block"; // No I18N
    }

    function showElements (elements) {
        Array.prototype.slice.call(elements).forEach(showElement);
    }

    function compareArray (a, b) {
        if (a === b) {
            return true;
        }
        if (a == null || b == null) {
            return false;
        }
        if (a.length != b.length) {
            return false;
        }
        for (var i = 0; i < a.length; i++) {
            if (a[i] != b[i]) {
                return false;
            }
        }
        return true;
    }

    function checkInArray (array, value) {
        for (var i=0; i<array.length; i++) {
            if (array[i] == value) {
                return true;
            }
        }
        return false;
    }

    function checkArrayInArray (bigArray, subSetArray) {
        var check = true;
        if (subSetArray.length == 0 && bigArray.length == 0) {
            return true;
        }
        if (subSetArray.length == 0 || bigArray.length == 0) {
            return false;
        }
        for (var i=0; i<subSetArray.length; i++) {
            check &= checkInArray(bigArray, subSetArray[i]);
        }
        return check;
    }

    function getTargetContainer(element) {
      var targetContainer = (element) ? element.closest("[data-zs-product-id]") : ""; // No I18N
      return targetContainer;
    }

    function getTargetContainerFromProductId(productId) {
      var targetContainer = (productId) ? document.querySelector("[data-zs-product-id='" + productId + "']") : ""; // No I18N
      return targetContainer;
    }

    function showPricingsForVariantId (productId, variantId, targetContainer) {
        if (variantId == INVALID_VARIANT_ID && !backOrderAvailable) {
            variantId = DEFAULT_VARIANT_ID;
        }
        var pricings;
        var sellingprice;
        if(targetContainer == -1){
          pricings = document.querySelectorAll("[data-zs-pricings][data-zs-product-id='" + productId + "']"); // No I18N
        } else {
          pricings = (targetContainer && targetContainer!="") ? targetContainer.querySelectorAll("[data-zs-pricings]") : ""; // No I18N
        }
        if (pricings.length == 0) {
            pricings = document.querySelectorAll("[data-zs-pricings]"); // No I18N
        }
        for (var i = 0; i < pricings.length; i++) {
            var pricing = pricings[i];
            var attributeVariantId = pricing.getAttribute("data-zs-variant-id") // No I18N
            pricing.style.display = "none"; // No I18N
            if (variantId == attributeVariantId) {
                pricing.style.display = "block"; // No I18N
                //return selling price to perform coupon reorder
                var sellingPriceElm = $D.get('[data-zs-selling-price]', pricing);
                sellingprice = sellingPriceElm && sellingPriceElm.getAttribute('data-zs-selling-price');
            }
        }
        return sellingprice;
    }

    function showSKUForVariantId (variantId) {
        if (variantId == INVALID_VARIANT_ID) {
            variantId = DEFAULT_VARIANT_ID;
        }
        var skus = document.querySelectorAll("[data-zs-skus]"); // No I18N
        for (var i = 0; i < skus.length; i++) {
            var sku = skus[i];
            var attributeVariantId = sku.getAttribute("data-zs-variant-id"); // No I18N
            sku.style.display = "none"; // No I18N
            if (variantId == attributeVariantId) {
                sku.style.display = "block"; // No I18N
            }
        }
    }

    function getAllVariants (productId, targetContainer) {
        var variant;
        if(targetContainer == -1) {
            // Custom template [old]
            variant = document.querySelectorAll("[data-zs-variants][data-zs-product-id='" + productId + "']")[0]; // No I18N
        } else {
            // New template
            variant = (targetContainer && targetContainer!="") ? targetContainer.querySelectorAll("[data-zs-variants]")[0] : ""; // No I18N
        }
        var options = (variant && variant!="") ? variant.options : "";
        var variants = {};
        for (var i = 0; i < options.length; i++) {
            var option = options[i];
            variants[option.value] = JSON.parse(option.getAttribute("data-zs-attributes")); // No I18N
        }
        return variants;
    }

    function getVariantIdFromAttributeIds (productId, attributeIds, targetContainer) {
        attributeIds.sort();
        var variant;
        if(targetContainer == -1) {
            // Custom template [old]
            variant = document.querySelectorAll("[data-zs-variants][data-zs-product-id='" + productId + "']")[0]; // No I18N
        } else {
            // New template
            variant = (targetContainer && targetContainer!="") ? targetContainer.querySelectorAll("[data-zs-variants]")[0] : ""; // No I18N
        }
        var options = (variant && variant!="") ? variant.options : "";
        var numberOfAttributes = 0;
        for (var i = 0; i < options.length; i++) {
            var option = options[i]
            var value = JSON.parse(option.getAttribute("data-zs-attributes")); // No I18N
            value.sort();
            numberOfAttributes = value.length;
            if (compareArray(attributeIds, value)) {
                return option.value;
            }
        }
        if (numberOfAttributes != attributeIds.length) {
            return DEFAULT_VARIANT_ID;
        } else {
            return INVALID_VARIANT_ID;
        }
    }

    function getSelectedOptions (productId, targetContainer) {
        var selectedOptions = [];
        var attributeSelects;
        if(targetContainer == -1) {
            // Custom template [old]
            attributeSelects = document.querySelectorAll("[data-zs-attribute-select][data-zs-product-id='" + productId + "']"); // No I18N
        } else {
            // New template
            attributeSelects = (targetContainer && targetContainer!="") ? targetContainer.querySelectorAll("[data-zs-attribute-select]") : ""; // No I18N
        }
        for (var i = 0; i < attributeSelects.length; i++) {
            var attributeSelect = attributeSelects[i];
            var selectedOption = getSelectedOption(attributeSelect);
            if (selectedOption && selectedOption.value != DEFAULT_VARIANT_ID) {
                selectedOptions.push(selectedOption.value);
            }
        }
        return selectedOptions;
    }

    function getSelectedOptionsAsMap () {
        var selectedOptions = {};
        var attributeSelects = document.querySelectorAll("[data-zs-attribute-select]"); // No I18N
        for (var i = 0; i < attributeSelects.length; i++) {
            var attributeSelect = attributeSelects[i];
            var selectedOption = getSelectedOption(attributeSelect);
            if (selectedOption && selectedOption.value != DEFAULT_VARIANT_ID) {
                if (selectedOption.text) {
                    selectedOptions[attributeSelect.getAttribute("data-zs-attribute-name")] = selectedOption.text; // No I18N
                } else {
                    selectedOptions[attributeSelect.getAttribute("data-zs-attribute-name")] = selectedOption.getAttribute("data-text"); // No I18N
                }
            }
        }
        return selectedOptions;
    }

    function getSelectedOption (element) {
        if (element.options) {
            return element.options[element.selectedIndex];
        } else {
            var inputs = element.querySelectorAll("input"); // No I18N
            for (var i = 0; i < inputs.length; i++) {
                if (inputs[i].checked) {
                    return inputs[i];
                }
            }
        }
    }

    function addSchemaDetailsInJsonLd(variant_id, callback){

        var jsonld = PRODUCT_JSON_LD;
        if(jsonld == null){
            return;
        }
        var productList = new Array();
        for(var i=0;i <jsonld.length;i++){
            var product = jsonld[i];
            if(product && (product.productID==variant_id || product['@type']=='Organization')){
                productList.push(product);
            }
        }
        callback(productList);
    }

    function setBackJsonld(jsonld){
        var jsonldStr = JSON.stringify(jsonld);
        if(document.querySelector('script#schemagenerator') != null){  //No I18N
            document.querySelector('script#schemagenerator').innerText = jsonldStr;    // No I18N
        } else if(document.querySelector('script[type="application/ld+json"]') != null){  //No I18N
            document.querySelector('script[type="application/ld+json"]').innerText = jsonldStr;  //No I18N
        }
    }

    function changeAttributeWithSelect (select, init) {
        var targetContainer = getTargetContainer(select);
        var selectedOption = getSelectedOption(select);
        var productId;
        if(targetContainer == select) {
            // Custom template [old]
            targetContainer = -1;
            productId = (selectedOption) ? selectedOption.getAttribute("data-zs-product-id") : ""; // No I18N
        } else {
            // New template
            productId = (targetContainer && targetContainer!="") ? targetContainer.getAttribute("data-zs-product-id") : ""; // No I18N
        }

        if (!selectedOption) {
          setVariantIdToAddToCart(productId, DEFAULT_VARIANT_ID, targetContainer);
          return;
        }
        var optionIds = getSelectedOptions(productId, targetContainer);
        reOrderImageByAttributes(productId, optionIds, targetContainer);
        showOnlyValidAttributes(productId, optionIds, targetContainer);

        var isBlurredOption = selectedOption.classList.contains("blur-option"); // No I18N
        var variantId = getVariantBasedOnChangedAttribute(productId, optionIds, targetContainer, init);

        var attributeSelectEvent = new CustomEvent("zp-event-attribute-selected", { // No I18N
            detail: {
                currentOption: selectedOption,
                selectedOptions: optionIds,
                productId: productId,
                variantId: variantId,
                variants: getAllVariants(productId, targetContainer),
                target: select,
                view: window.zs_view || "store_page" // No I18N
            }
        });
        document.dispatchEvent(attributeSelectEvent);

        var customTargetContainer = (targetContainer == -1) ? doc : targetContainer;
        var delivery_availability_elements = $D.getAll('[data-zs-delivery-availability-variant-id]', customTargetContainer);
        for(i=0;i<delivery_availability_elements.length;i++){
            var delivery_availability_element = delivery_availability_elements[i];
            if(delivery_availability_element.getAttribute("data-zs-delivery-availability-variant-id") == variantId ) {
                var is_deliverable = delivery_availability_element.getAttribute("data-zs-delivery-availability");
                var is_available_for_purchase = delivery_availability_element.getAttribute("data-zs-delivery-stock-availability-status");
                if(is_deliverable == "true" && is_available_for_purchase == "true"){
                    targetContainer.setAttribute("data-zs-deliverable","");
                    targetContainer.removeAttribute("data-zs-not-deliverable");
                    delivery_availability_element.setAttribute("data-zs-deliverable-message","");
                }else if(is_deliverable == "false" || (is_deliverable == "true" && is_available_for_purchase == "false")){
                    targetContainer.setAttribute("data-zs-not-deliverable","");
                    targetContainer.removeAttribute("data-zs-deliverable");
                    if(is_deliverable == "false"){
                        delivery_availability_element.setAttribute("data-zs-not-deliverable-message","");
                    }else{
                        delivery_availability_element.setAttribute("data-zs-unavailable-message","");
                    }
                }
            }else{
                delivery_availability_element.removeAttribute("data-zs-not-deliverable-message");
                delivery_availability_element.removeAttribute("data-zs-deliverable-message");
                delivery_availability_element.removeAttribute("data-zs-unavailable-message");
            }
        }

        if (variantId == INVALID_VARIANT_ID && isBlurredOption && !backOrderAvailable) {
            // optionIds = [selectedOption.value];
            // var removedOptions = removeOtherSelectedOptions(optionIds);
            selectedOption.selected = false;
            selectedOption.checked = false;
            var removedOptions = getSelectedOptionsAsMap();
            showOnlyValidAttributes(productId, optionIds, targetContainer);
            variantId = getVariantBasedOnChangedAttribute(productId, optionIds, targetContainer);
            var attributeName = select.getAttribute("data-zs-attribute-name"); // No I18N
            // alertAboutInvalidVariant(attributeName, selectedOption.value, selectedOption.text, removedOptions);
            var attributeGroupInvalidEvent = new CustomEvent("zp-event-attribute-group-invalid", { // No I18N
                detail: {
                    attributeName: attributeName,
                    selectedOption: selectedOption,
                    productId: productId,
                    optionId: selectedOption.value,
                    optionName: selectedOption.text,
                    removedOptions: removedOptions,
                    variants: getAllVariants(productId, targetContainer),
                    target: select,
                    view: window.zs_view || "store_page" // No I18N
                }
            });
            document.dispatchEvent(attributeGroupInvalidEvent);
        } else {
            hideElements(document.querySelectorAll("[data-zs-error-attribute]")); // No I18N
        }
        setVariantIdToAddToCart(productId, variantId, targetContainer);
        if(window.zs_product && window.zs_product.product_id == productId){
            addSchemaDetailsInJsonLd(variantId, setBackJsonld);
        }
        !init && (typeof common != "undefined" && common.init());  // No I18N
    }

    function changeAttribute () {
        changeAttributeWithSelect(this, false);
    }

    function setVariantIdToAddToCart (productId, variantId, targetContainer) {
        if (variantId == DEFAULT_VARIANT_ID || variantId == INVALID_VARIANT_ID) {
            variantId = "";
        }
        var addToCartHolders;
        if(targetContainer == -1) {
            // Custom template [old]
            addToCartHolders = document.querySelectorAll(" [data-zs-product-variant-id][data-zs-product-id='" + productId + "']"); // No I18N
        } else {
            // New template
            addToCartHolders = (targetContainer && targetContainer!="") ? targetContainer.querySelectorAll(" [data-zs-product-variant-id]") : ""; // No I18N
        }
        for (var i = 0; i < addToCartHolders.length; i++) {
            var holder = addToCartHolders[i];
            holder.setAttribute("data-zs-product-variant-id", variantId); // No I18N
        }
        if(window.zs_product && window.zs_product.product_id == productId) {
            if(variantId == ""){
                window.zs_variant = {};
            }else{
                for(var i=0;i<zs_product.variants.length; i++){
                    if(variantId == zs_product.variants[i].variant_id){
                        window.zs_variant =  zs_product.variants[i];
                        break;
                    }
                }
                if(typeof cart != "undefined") {
                    cart.pushProductPageViewForAnalytics(variantId);
                    cart.pushViewContentEventForPixel(variantId);
                }
            }
        }
    }

    function alertAboutInvalidVariant (attributeName, optionId, optionName, removedOptions) {
        var combination = "";
        for (var removedOption in removedOptions) {
            combination += removedOptions[removedOption] + " " + removedOption + " "; // No I18N
        }
        var result = optionName + "  " + attributeName + " is not available for the " + combination; // No I18N
        var errorAttributes = document.querySelectorAll("[data-zs-error-attribute]"); // No I18N
        for (var i = 0; i < errorAttributes.length; i++) {
            var element = errorAttributes[i];
            element.innerHTML = result;
        }
        showElements(errorAttributes);
    }

    function showOnlyValidAttributes (productId, optionIds, targetContainer) {
        var attributeOptions = getAttributeOptionBasedOnExisting(productId, optionIds, targetContainer);
        var elements;
        if(targetContainer == -1) {
            // Custom template [old]
            elements = document.querySelectorAll("[data-zs-attribute-option][data-zs-product-id='" + productId + "']"); // No I18N
        } else {
            // New template
            elements = (targetContainer && targetContainer!="") ? targetContainer.querySelectorAll("[data-zs-attribute-option]") : ""; // No I18N
        }
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (checkInArray(attributeOptions, element.value)) {
                // element.disabled = false;
                element.classList.remove("blur-option"); // No I18N
            } else {
                // element.disabled = true;
                element.classList.add("blur-option"); // No I18N
            }
        }
    }

    function reOrderImageByAttributes (productId, optionIds, targetContainer) {
        var variants;
        if(targetContainer == -1) {
            // Custom template [old]
            variants = document.querySelector("[data-zs-variants][data-zs-product-id='" + productId + "']"); // No I18N
        } else {
            // New template
            variants = (targetContainer && targetContainer!="") ? targetContainer.querySelector("[data-zs-variants]") : ""; // No I18N
        }
        var options = (variants && variants!="") ? variants.options : "";
        var imageIds = [];
        for (var i=0; i<options.length; i++) {
            var option = options[i];
            var attributes = JSON.parse(option.getAttribute("data-zs-attributes")); // No I18N
            if (checkArrayInArray(attributes, optionIds)) {
                var jsonImagesAttribute = option.getAttribute("data-zs-images"); // No I18N
                if (jsonImagesAttribute) {
                    var variantImageIds = JSON.parse(jsonImagesAttribute);
                    imageIds = imageIds.concat(variantImageIds);
                }
            }
        }
        if(Array.from) {
            imageIds = Array.from(new Set(imageIds));            
        }
        var imageReorderEvent = new CustomEvent("zp-event-image-ordered", { // No I18N
            detail: {
                productId: productId,
                image_ids: imageIds,
                view: window.zs_view || "store_page" // No I18N
            }
        });
        document.dispatchEvent(imageReorderEvent);
    }

    function getAttributeOptionBasedOnExisting (productId, optionIds, targetContainer) {
        var attributeOptions = new Set();
        var variants;
        if(targetContainer == -1) {
            // Custom template [old]
            variants = document.querySelectorAll("[data-zs-variants][data-zs-product-id='" + productId +"']")[0]; // No I18N
        } else {
            // New template
            variants = (targetContainer && targetContainer!="") ? targetContainer.querySelector("[data-zs-variants]") : ""; // No I18N
        }
        var options = (variants && variants!="") ? variants.options : "";
        for (var i=0; i<options.length; i++) {
            var option = options[i];
            var value = JSON.parse(option.getAttribute("data-zs-attributes")); // No I18N
            if (checkArrayInArray(value, optionIds)) {
                for (var j=0; j<value.length; j++) {
                    attributeOptions.add(value[j].toString());
                }
            }
        }
        if(Array.from) {
            attributeOptions = Array.from(attributeOptions);
        }
        return attributeOptions;
    }

    function removeOtherSelectedOptions (optionIds) {
        var removedOptions = {};
        var attributeSelects = document.querySelectorAll("[data-zs-attribute-select]"); // No I18N
        for (var i = 0; i < attributeSelects.length; i++) {
            var attributeSelect = attributeSelects[i];
            var selectedOption = getSelectedOption(attributeSelect);
            if (selectedOption && !checkInArray(optionIds, selectedOption.value)) {
                selectedOption.selected = false;
                selectedOption.checked = false;
                if (selectedOption.text) {
                    selectedOptions[attributeSelect.getAttribute("data-zs-attribute-name")] = selectedOption.text; // No I18N
                } else {
                    selectedOptions[attributeSelect.getAttribute("data-zs-attribute-name")] = selectedOption.getAttribute("data-text"); // No I18N
                }
            }
        }
        return removedOptions;
    }

    function getVariantBasedOnChangedAttribute (productId, selectedOptions, targetContainer, init) {
        var variantId;
        if(productId == getProductIdFromURL()){
            if(init){
                variantId = getVariantIdfromURL();
            }else{
                variantId = getVariantIdFromAttributeIds(productId, selectedOptions, targetContainer);
                var new_url = window.location.pathname +( variantId>0 ? "?variant="+variantId : ""); // No I18N
                if(window.location.pathname + window.location.search != new_url && push_state){
                    window.history.pushState({"product_id":getProductIdFromURL()}, "", new_url); // No I18N
                }
            }
            
        }else{
            variantId = getVariantIdFromAttributeIds(productId, selectedOptions, targetContainer);
        }
        var sellingprice = showPricingsForVariantId(productId, variantId, targetContainer);
        showSKUForVariantId(variantId);
        reorderCouponBasedOnDiscount(sellingprice, targetContainer);

        var selectedVariantEvent = new CustomEvent("zp-event-selected-variant", { // No I18N
            detail: {
                productId: productId,
                variant_id: variantId,
                view: window.zs_view || "store_page" // No I18N
            }
        });
        document.dispatchEvent(selectedVariantEvent);
        return variantId;
    }

    function reorderCouponBasedOnDiscount(sellingPrice, targetContainer) {
        var couponsContainer;
        var moreCouponContainer;
        var final_discount = [];

        if(targetContainer == -1) {
            couponsContainer = $D.get('[data-zs-coupons-list]');
        } else {
            couponsContainer = (targetContainer && targetContainer != "")? $D.get('[data-zs-coupons-list]',targetContainer) : "";
        }
        var clonedContainer = couponsContainer && couponsContainer.cloneNode(true);
        var discountElms = $D.getAll('[data-zs-discount-value]', clonedContainer);
        if(discountElms.length == 0) {
            return;
        }

        for(var i=0; i< discountElms.length; i++) {
            var discount = discountElms[i];
            var discount_value = discount.getAttribute('data-zs-discount-value');
            var discount_type = discount.getAttribute('data-zs-discount-type');
            if(discount_type == "percentage") {
                discount_value = (parseFloat(discount_value) * parseFloat(sellingPrice)) / 100;
            } else {
                discount_value = parseFloat(discount_value);
            }
            discount.setAttribute('data-zs-final-discount', discount_value);
            final_discount.push(discount_value);
        }

        moreCouponContainer = $D.get('[data-zs-more-coupons]', couponsContainer);
        if(moreCouponContainer && discountElms.length > 1) {
            moreCouponContainer.innerHTML = '';
        }
        var final_unique_discount = Array.from(new Set(final_discount));
        final_unique_discount.sort(function(a, b){return b-a}).forEach(function(value, index) {
            var matching_elm = $D.getAll("[data-zs-final-discount='" + value +"']", clonedContainer);
            for(var i=0; i<matching_elm.length; i++) {
                var element = matching_elm[i];
                if(index == 0 && i == 0) {
                    //replace first coupon
                    couponsContainer && couponsContainer.replaceChild(element, couponsContainer.childNodes[0]);
                } else {
                    moreCouponContainer && moreCouponContainer.appendChild(element);
                }
            }
        });
        product_coupons && product_coupons.showCouponTimer(couponsContainer);
        //reset to hide coupon
        var couponContainerToggle = $D.getByClass("theme-prod-coupons-container-toggle", couponsContainer)[0];
        var couponShowBtn = $D.getByClass("theme-prod-coupons-show-btn", couponsContainer)[0];
        var couponHideBtn = $D.getByClass("theme-prod-coupons-hide-btn", couponsContainer)[0];
        couponHideBtn && hideElement(couponHideBtn);
        if(couponContainerToggle) {
            couponContainerToggle.parentNode.style.height = "0px";
        }
        couponShowBtn && showElement(couponShowBtn);
    }

    function getProductIdFromURL(){
        if(window.location.pathname.indexOf("/products/") == 0){
            var urlArr = window.location.pathname.split( "/" );
            return isNaN(urlArr[3])? urlArr[2] : urlArr[3];
        }
        return -1;
    }

    function getVariantIdfromURL(){
        var key = "variant"; // No I18N
        var variant_id = decodeURIComponent(
            window.location.search.replace(
                new RegExp("^(?:.*[&\\?]" + encodeURIComponent(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), // No I18N
                "$1" // No I18N
            )
        );
        return variant_id != "" ? variant_id : DEFAULT_VARIANT_ID;
    }

    function _handleVariantInQuery (element) {
        if(!element){
            element = document;
        }
        var variants = element.querySelector("[data-zs-variants]") // No I18N
        if (window.location.pathname.indexOf("/products/") != 0 || variants == undefined) {
            if(window.zs_view == 'product' && zs_product && !zs_product.has_variants){
                window.zs_variant = zs_product.variants[0];
            }
            return;
        }
        
        var requiredVariantId = getVariantIdfromURL();
        var requiredVariantOption = null;
        if(requiredVariantId == DEFAULT_VARIANT_ID){
            for (var i = 0; i < variants.options.length; i++) {
                var option = variants.options[i];
                var stock_elem = document.querySelector("[data-variant-id-stock=\"" + option.value + "\"]");// No I18N
                if (stock_elem && stock_elem.getAttribute("data-stock-avail") == "false") {// No I18N
                    requiredVariantOption = option;
                    break;
                }
            }
            if(requiredVariantOption == null){ 
                requiredVariantOption = variants.options[0]; 
            }
            push_state= false;
        }else{
            for (var i = 0; i < variants.options.length; i++) {
                var option = variants.options[i];
                if (option.value === requiredVariantId) {
                    requiredVariantOption = option;
                    break;
                }
            }
        }

        if (requiredVariantOption == null) {
            return;
        }

        var attributes = JSON.parse(requiredVariantOption.getAttribute("data-zs-attributes")); // No I18N
        for (var i = 0; i < attributes.length; i++) {
            var attributeId = attributes[i];
            var attributeOption = document.querySelector("[data-zs-attribute-option][value=\"" + attributeId + "\"]") // No I18N
            if(attributeOption){
                attributeOption.setAttribute('data-zs-attribute-selected',''); // No I18N
                if (attributeOption.tagName == "OPTION"){
                    attributeOption.parentElement.selectedIndex = attributeOption.index;
                    $E.dispatch(attributeOption.parentElement,"change");  // No I18N
                } else{
                    attributeOption.click();
                }
            }
        }
        if(requiredVariantId == DEFAULT_VARIANT_ID){
            push_state = true;
        }
    }

    var PRODUCT_JSON_LD;
    function initOnLoad () {
        /** else if condition is added as fallback check **/
        if(document.querySelector('script#schemagenerator') != null){  //No I18N
            PRODUCT_JSON_LD = JSON.parse(document.querySelector('script#schemagenerator').innerText); //No I18N
        } else if(document.querySelector('script[type="application/ld+json"]') != null){  //No I18N
            PRODUCT_JSON_LD = JSON.parse(document.querySelector('script[type="application/ld+json"]').innerText);  //No I18N
        }
        initForElement(document);
        window.onpopstate = function(event) {
            if(event.state && event.state.product_id && event.state.product_id != -1){
                push_state = false;
                _handleVariantInQuery(document);
                push_state = true;
            }
        };
    }

    function initForElement (element) {
        var attributeSelects = element.querySelectorAll("[data-zs-attribute-select]"); // No I18N
        for (var i = 0; i < attributeSelects.length; i++) {
            var attributeSelect = attributeSelects[i];
            attributeSelect.addEventListener("change", changeAttribute, false); // No I18N
            changeAttributeWithSelect(attributeSelect, true);
        }
        _handleVariantInQuery(document);
    }

    function resetAddToCartImpl(productId, target) {
      setVariantIdToAddToCart(productId, DEFAULT_VARIANT_ID, target);
      showPricingsForVariantId(productId, DEFAULT_VARIANT_ID, target);
      var optionIds = getSelectedOptions(productId, target);
      reOrderImageByAttributes(productId, optionIds, target);
    }

    function resetAddToCart (productId, target) {
        if(productId == target) {
            // Custom template [old]
            target = -1;
            resetAddToCartImpl(productId, target);
        } else {
            // New template
            var productContainers = new Array();
            if(target == document) {
              productContainers = target.querySelectorAll("[data-zs-product-id]");  // No I18N
            } else {
              productContainers.push(target);
            }
            for (var i = 0; i < productContainers.length; i++) {
              var variantsContainer = productContainers[i].querySelector("[data-zs-variants]");
              var options = (variantsContainer) ? variantsContainer.options : "";
              if(options.length > 1) {
                var productId = productContainers[i].getAttribute("data-zs-product-id");
                productId = productId || "";
                target = productContainers[i]; //getTargetContainerFromProductId(productId);
                resetAddToCartImpl(productId, target);
              }
            }
        }
    }

    function setVariantToProduct(element, productId, variantId){
        var variants = element.querySelector("[data-zs-variants]") // No I18N
        if (variants == undefined) {
            return;
        }

        var requiredVariantOption = null
        for (var i = 0; i < variants.options.length; i++) {
            var option = variants.options[i];
            if (option.value === variantId) {
                requiredVariantOption = option;
                break;
            }
        }
        if (requiredVariantOption != null || variantId == DEFAULT_VARIANT_ID) {
            setVariantIdToAddToCart(productId, variantId, element);
            showPricingsForVariantId(productId, variantId, element);
            // var optionIds = getSelectedOptions(productId, element);
            var optionIds = JSON.parse(option.getAttribute("data-zs-attributes")); // No I18N
            optionIds.sort();        
            reOrderImageByAttributes(productId, optionIds, element);
        }
        if (requiredVariantOption == null) {
            return -1;
        }        
    }

    return {
        init : initOnLoad,
        initForElement : initForElement,
        resetAddToCart: resetAddToCart,
        getVariantIdfromURL: getVariantIdfromURL,
        setVariantToProduct : setVariantToProduct
    };
})();

onDocumentReady(product_option.init);

var contentWindowInitted = false

function onDocumentReady(callback) {
    
    if(window.zs_rendering_mode==='canvas' && !contentWindowInitted){//NO I18N
        $E.bind(document, 'contentWindow:initted', onInit)
    } else {
        $E.callOnLoad(callback)
    }

    function onInit() {
        contentWindowInitted = true
        $E.unbind(document, 'contentWindow:initted', onInit)
        callback()
    }
}
