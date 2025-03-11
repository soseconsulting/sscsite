/*$Id$*/
var delivery_availability = (function () {

    /* Delivery Availability Popup local storage constants */

    var DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE = "delivery_postal_code"; //No I18N
    var CLOSED_DELIVERY_AVAILABILITY_POPUP = "close_delivery_availability_popup"; //No I18N
    var DELIVERY_AVAILABILITY_POPUP_ADDRESS_ID = "delivery-availabilitty-address-id"; //No I18N
    var is_delivery_availability_popup_open = false;
    var is_product_delivery_check_in_progress = false;
    var previously_fetched_postal_code = "";

    // Types for Delivery Availability
    var PRODUCT_TYPE = 0;
    var CATEGORY_TYPE = 1;
    var COLLECTION_TYPE = 2;
    var PRODUCTS_LIST_TYPE = 3;
    var COLLECTION_WIDGET_TYPE = 4;
    var CATEGORY_WIDGET_TYPE = 5;
    var CART_TYPE = 6;

    // Ecommerce resource pages
    var PRODUCT_PAGE = "product";   // No I18N
    var CATEGORY_PAGE = "category"; // No I18N
    var COLLECTION_PAGE = "collection"; // No I18N
    var SEARCH_PRODUCTS_PAGE = "search-products";   // No I18N
    var CART_PAGE = "cart"; // No I18N
    var CHECKOUT_PAGE = "checkout"; // No I18N
    var PAYMENT_STATUS_PAGE = "payment-status"; // No I18N
    var auto_update_pincode_timer = null;

    function _handleDeliveryAvailability(elem) {
        var deliverable_availability_elem = document.querySelector("[data-zs-delivery-postalcode]"); // No I18N
        if (deliverable_availability_elem && window.zs_view != "checkout") {
            var postal_code = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE);
            if (postal_code == null && localStorage.getItem(CLOSED_DELIVERY_AVAILABILITY_POPUP) != 'true' ) {
                showDeliveryAvailabilityPopup(elem);
            } else if (postal_code != null) {
                checkDeliveryAvailabilityOnLoad();
            }
            var delivery_location_availability_elms = document.querySelectorAll("[data-zs-checkout-availablity]");// No I18N
            for (var i = 0; i < delivery_location_availability_elms.length; i++) {
                delivery_location_availability_elms[i].addEventListener('click', showDeliveryAvailabilityPopup, false);
            }
            var product_details_delivery_availability_elems = document.querySelectorAll("[data-zs-product-details-delivery-availablity]");// No I18N
            for (var i = 0; i < product_details_delivery_availability_elems.length; i++) {
                product_details_delivery_availability_elems[i].addEventListener('click', showDeliveryAvailabilityPopup, false);
            }
            var postal_code_elems = document.querySelectorAll("[data-zs-delivery-location-postalcode]");// No I18N
            for (var i = 0; i < postal_code_elems.length; i++) {
                postal_code_elems[i].addEventListener("keyup", validatePostalCodeOnKeyupEvent);
            }
        }
    }

    function validatePostalCodeOnKeyupEvent(e){
        if (e.code === "Enter" && !is_product_delivery_check_in_progress) {
            if(auto_update_pincode_timer){
                clearTimeout(auto_update_pincode_timer);
            }
            if(validatePostalCode(this.value)){
                checkDeliveryAvailabilityUsingPostalCode(this.value, null, document);
            }
        }else if(!is_product_delivery_check_in_progress && !this.closest("[data-zs-delivery-availability-popup]")){
            if(validatePostalCode(this.value) && this.value.length >= 3 && previously_fetched_postal_code != this.value){
                if(auto_update_pincode_timer){
                    clearTimeout(auto_update_pincode_timer);
                }
                auto_update_pincode_timer = setTimeout(function(elem){
                    checkDeliveryAvailabilityUsingPostalCode(elem.value, null, document)
                },1500,this);
            }else{
                clearTimeout(auto_update_pincode_timer);
            }
        }
    }

    function validatePostalCode(postal_code){
        var regex = /[^0-9a-zA-Z?*-]+/;

        var error_elems = null;
        if(!is_delivery_availability_popup_open){
            error_elems = document.querySelectorAll("[data-zs-delivery-availability-product-details-error-message]");// No I18N
        }else{
            error_elems = document.querySelectorAll("[data-zs-delivery-availability-popup-error-message]");// No I18N
        }
        for (var i = 0; i < error_elems.length; i++) {
            if (regex.test(postal_code)) {
                error_elems[i].innerText = i18n.get('delivery_location_availability.label.error.invalid.postal_code');
                error_elems[i].style.removeProperty("display");
            }else{
                error_elems[i].style.display = "none";
            }
        }
        return !regex.test(postal_code);
    }

    function showDeliveryAvailabilityPopup(elem) {
        var delivery_availability_popup_elem = document.querySelector("[data-zs-delivery-availability-popup]");// No I18N
        var params = {};
        var postal_code = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE);
        if (postal_code != null) {
            params.postal_code = postal_code;
        }
        var address_id = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_ADDRESS_ID);
        if (address_id != null) {
            params.address_id = address_id;
        }
        if(auto_update_pincode_timer){
            clearTimeout(auto_update_pincode_timer);
        }
        if (!delivery_availability_popup_elem) {
            $X.get({
                url: '/deliveryAvailabilityPopup', // No I18N
                params: params,
                handler: function (args) {
                    var deliverable_availability_elem = $D.getById("delivery_availability_popup");
                    if (deliverable_availability_elem && this.status == 200) {
                        is_delivery_availability_popup_open = true;
                        deliverable_availability_elem.innerHTML = this.responseText;
                        var apply_postal_code_elem = deliverable_availability_elem.querySelector("[data-zs-delivery-location-apply-postalcode]");// No I18N
                        if (apply_postal_code_elem) {
                            apply_postal_code_elem.addEventListener('click', checkDeliveryAvailability, false);
                        }
                        var delivery_availability_close_elem = deliverable_availability_elem.querySelector("[data-zs-delivery-availability-close]");// No I18N
                        if (delivery_availability_close_elem) {
                            delivery_availability_close_elem.addEventListener('click', function () {
                                localStorage.setItem(CLOSED_DELIVERY_AVAILABILITY_POPUP, true);
                                closeDeliveryAvailablityPopup();
                            }, false);
                        }

                        var postal_code_elems = deliverable_availability_elem.querySelectorAll("[data-zs-delivery-location-postalcode]");// No I18N
                        for (var i = 0; i < postal_code_elems.length; i++) {
                            postal_code_elems[i].addEventListener("keyup", validatePostalCodeOnKeyupEvent);
                        }
                        $E.bind(document, 'keyup', closePopupOnEscape);                   

                        var delivery_availability_address_containers = document.getElementsByName("delivery-availability-address");
                        delivery_availability_address_containers.forEach(function (delivery_availability_address_container) {
                            $E.unbind(delivery_availability_address_container, "change", checkDeliveryAvailability);
                            $E.bind(delivery_availability_address_container, "change", checkDeliveryAvailability);
                        });
                        var deliveryAvailabilityPopupLoadedEvent = new CustomEvent("zp-event-delivery-availability-popup-open", {});// No I18N
                        document.dispatchEvent(deliveryAvailabilityPopupLoadedEvent);
                    }
                    var deliveryAvailabilityPopupLoadedEvent = new CustomEvent("zp-event-delivery-availability-popup-loaded", {});// No I18N
                    document.dispatchEvent(deliveryAvailabilityPopupLoadedEvent);
                }
            });
            var deliveryAvailabilityPopupOnLoadEvent = new CustomEvent("zp-event-delivery-availability-popup-on-load", {});// No I18N
            document.dispatchEvent(deliveryAvailabilityPopupOnLoadEvent);
        } else {
            is_delivery_availability_popup_open = true;
            delivery_availability_popup_elem.style.removeProperty("display");// No I18N
            var postal_code = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE);
            var postal_code_elems = delivery_availability_popup_elem.querySelectorAll("[data-zs-delivery-location-postalcode]");// No I18N
            for (var i = 0; i < postal_code_elems.length; i++) {
                postal_code_elems[i].value = (postal_code != null)?postal_code:"";
            }
            var popup_heading = delivery_availability_popup_elem.querySelector("[data-zs-delivery-location-popup-heading]");// No I18N
            if(popup_heading){
                popup_heading.innerHTML = (postal_code && postal_code != "") ? i18n.get("delivery_location_availability.label.delivery.location.change"):i18n.get("delivery_location_availability.label.delivery.location.select");
            }
            var delivery_availability_address_containers = document.getElementsByName("delivery-availability-address");
            delivery_availability_address_containers.forEach(function (delivery_availability_address_container) {
                delivery_availability_address_container.checked = false;
                if (localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_ADDRESS_ID) == delivery_availability_address_container.value) {
                    delivery_availability_address_container.checked = true;
                }
            });
            var deliveryAvailabilityPopupLoadedEvent = new CustomEvent("zp-event-delivery-availability-popup-open", {});// No I18N
            document.dispatchEvent(deliveryAvailabilityPopupLoadedEvent);
        }
    }

    function closePopupOnEscape(e){
        e = e || window.event;
        if (e.keyCode == 27 && !is_product_delivery_check_in_progress && is_delivery_availability_popup_open) {
            closeDeliveryAvailablityPopup();
        }
    }

    function checkDeliveryAvailabilityOnLoad() {

        var postal_code = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE);
        var address_id = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_ADDRESS_ID);
        if (postal_code == null || postal_code == "") {
            return;
        }else if (document.querySelectorAll("[data-zs-product-id]").length == 0) {
            validatePostalCodeForNonStoreSpecificPages(postal_code,address_id);
            return;
        }

        var current_page = window.zs_view;

        switch (current_page) {
            case PRODUCT_PAGE:
                var product = window.zs_product;
                var product_id = product.product_id;
                getProductDeliveryAvailabilityStatus(product_id, postal_code, PRODUCT_TYPE, null, document.querySelector("[data-zs-product-id]"));//No I18N
                break;
            case CATEGORY_PAGE:
                var category = window.zs_category;
                var category_id = category.category_id;
                getProductDeliveryAvailabilityStatus(category_id, postal_code, CATEGORY_TYPE);
                break;
            case COLLECTION_PAGE:
                var collection = window.zs_collection;
                var collection_id = collection.id;
                getProductDeliveryAvailabilityStatus(collection_id, postal_code, COLLECTION_TYPE);
                break;
            case SEARCH_PRODUCTS_PAGE:
                break;
            case CART_PAGE:
                var cart_id = getUrlParam("cart_id", "");// No I18N
                getProductDeliveryAvailabilityStatus(cart_id, postal_code, CART_TYPE);
                break;
            case CHECKOUT_PAGE:
                break;
            case PAYMENT_STATUS_PAGE:
                break;
            default:
                getWidgetDeliveryAvailability(postal_code, COLLECTION_WIDGET_TYPE, CATEGORY_WIDGET_TYPE, PRODUCTS_LIST_TYPE);
        }
    }

    function checkDeliveryAvailability(elem) {
        var postal_code = null, address_id = null;
        if (this.id == "delivery-availability-apply-postalcode") {
            localStorage.removeItem(DELIVERY_AVAILABILITY_POPUP_ADDRESS_ID);
            var popup_container = document.querySelector("[data-zs-delivery-availability-popup]");// No I18N
            if (popup_container) {
                var postal_code_elem = popup_container.querySelector("[data-zs-delivery-location-postalcode]");// No I18N
                if (postal_code_elem) {
                    postal_code = postal_code_elem.value;
                }
            }
        } else if (this.name == "delivery-availability-address") {
            address_id = this.value;
            postal_code = this.getAttribute("data-zs-address-delivery-postalcode");
        }
        if(validatePostalCode(postal_code)){
            if(auto_update_pincode_timer){
                clearTimeout(auto_update_pincode_timer);
            }
            checkDeliveryAvailabilityUsingPostalCode(postal_code, address_id, document);
        }
    }

    function checkDeliveryAvailabilityUsingPostalCode(postal_code, address_id, elem) {
        if(localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE) != postal_code){
            if (postal_code != null && postal_code != "") {
                if(document.querySelectorAll("[data-zs-product-id]").length > 0){
                    if (window.zs_view == "cart") {
                        var cart_id = getUrlParam("cart_id", "");// No I18N
                        getProductDeliveryAvailabilityStatus(cart_id, postal_code, CART_TYPE, address_id);
                    } else {
                        getAllProductsDeliveryAvailability(document, postal_code, address_id)
                    }
                    var checkDeliveryAvailabilityOnLoadEvent = new CustomEvent("zp-event-check-delivery-availability-loading", {});// No I18N
                    document.dispatchEvent(checkDeliveryAvailabilityOnLoadEvent);
                }else{
                    validatePostalCodeForNonStoreSpecificPages(postal_code,address_id);
                }
            } else {
                clearDeliveryAvailability(document);
                if(is_delivery_availability_popup_open){
                    closeDeliveryAvailablityPopup();
                }
                previously_fetched_postal_code = "";
            }
        }else{
            if(address_id != null){
                localStorage.setItem(DELIVERY_AVAILABILITY_POPUP_ADDRESS_ID, address_id);
            }
            if(is_delivery_availability_popup_open){
                closeDeliveryAvailablityPopup();
            }
        }
    }

    function validatePostalCodeForNonStoreSpecificPages(postal_code,address_id){
        var checkDeliveryAvailabilityOnLoadEvent = new CustomEvent("zp-event-check-delivery-availability-loading", {});// No I18N
        document.dispatchEvent(checkDeliveryAvailabilityOnLoadEvent);
        var params = {};
        params.postal_code = postal_code;
        params.type = 7;
        $X.get({
            url: "/storefront/api/v1/getDeliveryAvailabilityStatus",//NO I18N
            params: params,
            headers: zsUtils.getCSRFHeader(),
            args: { "postal_code": postal_code, "address_id": address_id },//No I18N
            handler: function(args){
                var response = JSON.parse(this.responseText);
                if(response.status_code == 0){
                    if(args.postal_code != null && args.postal_code != ""){
                        localStorage.setItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE,args.postal_code);
                        previously_fetched_postal_code = args.postal_code;

                    }
                    if(args.address_id != null && args.address_id != ""){
                        localStorage.setItem(DELIVERY_AVAILABILITY_POPUP_ADDRESS_ID, args.address_id);
                    }
                    var delivery_location_availability_elm = document.querySelectorAll("[data-zs-delivery-postalcode]");// No I18N
                    for(var i=0; i<delivery_location_availability_elm.length; i++){
                        delivery_location_availability_elm[i].innerHTML = i18n.get('delivery_location_availability.label.postal_code.select', args.postal_code);// No I18N
                    }
                    var checkDeliveryAvailabilitySuccessEvent = new CustomEvent("zp-event-check-delivery-availability-success", { // No I18N
                        detail: {
                            postal_code: args.postal_code
                        }
                    });
                    document.dispatchEvent(checkDeliveryAvailabilitySuccessEvent);
                    closeDeliveryAvailablityPopup();
                }else{
                    var error_elems = document.querySelectorAll("[data-zs-delivery-availability-popup-error-message]");// No I18N
                    for (var i = 0; i < error_elems.length; i++) {
                        error_elems[i].innerText = (response.developer_message == "") ? i18n.get('delivery_location_availability.label.error.invalid.postal_code'):response.developer_message;
                        error_elems[i].style.removeProperty("display");
                    }
                    var checkDeliveryAvailabilityFailureEvent = new CustomEvent("zp-event-check-delivery-availability-failure", { // No I18N
                        detail: {
                            postal_code: args.postal_code
                        }
                    });
                    document.dispatchEvent(checkDeliveryAvailabilityFailureEvent);
                    clearDeliveryAvailability(document);
                }
            }
        });
    }

    function checkQuickLookDeliveryAvailablity() {
        var deliverable_availability_elem = document.querySelector("[data-zs-delivery-postalcode]"); // No I18N
        if (deliverable_availability_elem && window.zs_view != "checkout") {
            var quick_look_container = document.getElementById('product_quick_look');// No I18N
            var quick_look_product_container = quick_look_container.querySelector("[data-zs-product-id]"); // No I18N
            var product_id = quick_look_product_container.getAttribute("data-zs-product-id");
            var product_details_delivery_availability_elems = document.querySelectorAll("[data-zs-product-details-delivery-availablity]");// No I18N
            for (var i = 0; i < product_details_delivery_availability_elems.length; i++) {
                product_details_delivery_availability_elems[i].addEventListener('click', showDeliveryAvailabilityPopup, false);
            }
            var postal_code = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE);
            var postal_code_elem = quick_look_container.querySelector("[data-zs-delivery-location-postalcode]");// No I18N
            if(postal_code_elem){
                postal_code_elem.addEventListener("keyup", validatePostalCodeOnKeyupEvent);
            }
            if (postal_code != null && postal_code != "") {
                getProductDeliveryAvailabilityStatus(product_id, postal_code, PRODUCT_TYPE, null, quick_look_product_container);
            }
        }
    }

    function getRecommendedProductDeliveryAvailability() {
        var deliverable_availability_elem = document.querySelector("[data-zs-delivery-postalcode]"); // No I18N
        if (deliverable_availability_elem && window.zs_view != "checkout") {
            var recommended_products_container = document.querySelector("[data-zs-recommended-products]"); // No I18N
            var recommended_products = recommended_products_container.querySelectorAll("[data-zs-product-id]"); // No I18N
            var product_ids = [];
            for (var i = 0; i < recommended_products.length; i++) {
                var product_id = recommended_products[i].getAttribute("data-zs-product-id");
                if(!product_ids.includes(product_id)){
                    product_ids.push(product_id);
                }
            }
            var postal_code = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE);
            if(postal_code != null && postal_code != ""){
                for(var i=0;i< product_ids.length;i=i+200){
                    var temp = product_ids.slice(i,i+200);
                    getProductDeliveryAvailabilityStatus(temp.toString(), postal_code, PRODUCTS_LIST_TYPE);
                }
            }
        }
    }

    function getAllProductsDeliveryAvailability(elem, postal_code, address_id) {
        var deliverable_availability_elem = document.querySelector("[data-zs-delivery-postalcode]"); // No I18N
        if (deliverable_availability_elem && window.zs_view != "checkout") {
            var product_containers = elem.querySelectorAll("[data-zs-product-id]"); // No I18N
            var product_ids = [];
            for (var i = 0; i < product_containers.length; i++) {
                var product_id = product_containers[i].getAttribute("data-zs-product-id");
                if ((i == 0 && window.zs_view == "product" && product_id == zs_product.product_id) || product_containers[i].closest("#product_quick_look")) {
                    getProductDeliveryAvailabilityStatus(product_id, postal_code, PRODUCT_TYPE, address_id, product_containers[i]);
                    continue;
                }
                if(!product_ids.includes(product_id)){
                    product_ids.push(product_id);
                }
            }
            if (postal_code == null) {
                postal_code = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE);
            }
            if (postal_code != null && postal_code != "") {
                for(var i=0;i< product_ids.length;i=i+200){
                    var temp = product_ids.slice(i,i+200);
                    getProductDeliveryAvailabilityStatus(temp.toString(), postal_code, PRODUCTS_LIST_TYPE, address_id);
                }
            }
        }
    }

    function getWidgetDeliveryAvailability(postal_code, collection_widget_type, category_widget_type, products_list_type) {
        var i, chunk_size = 200;
        var collection_nodes = document.querySelectorAll("[data-element-type=storecollection]");	//NO I18N
        collection_nodes.forEach(function (collection_node) {
            var collection_id = collection_node.getAttribute("data-zs-collection-id");	//NO I18N
            getProductDeliveryAvailabilityStatus(collection_id, postal_code, COLLECTION_WIDGET_TYPE);
        })
        var category_nodes = document.querySelectorAll("[data-element-type=storecategory]");	//NO I18N
        category_nodes.forEach(function (category_node) {
            var category_id = category_node.getAttribute("data-zs-category-id");	//NO I18N
            getProductDeliveryAvailabilityStatus(category_id, postal_code, CATEGORY_WIDGET_TYPE);
        })
        var product_containers = document.querySelectorAll("[data-element-type=storeproduct]");	//NO I18N
        if (product_containers.length != 0) {
            var product_ids = [];
            product_containers.forEach(function (product_container) {
                var product_node = product_container.querySelector("[data-zs-product-id]");	//NO I18N
                var product_id = product_node ? product_node.getAttribute("data-zs-product-id") : null;	//NO I18N
                if(product_node && !product_ids.includes(product_id)){
                    product_ids.push(product_id);
                }
            });
            if (product_ids.length > chunk_size) {
                for (i = 0; i < product_ids.length; i += chunk_size) {
                    var formatted_product_ids = product_ids.slice(i, i + chunk_size);
                    getProductDeliveryAvailabilityStatus(formatted_product_ids, postal_code, PRODUCTS_LIST_TYPE);
                }
            } else {
                getProductDeliveryAvailabilityStatus(product_ids, postal_code, PRODUCTS_LIST_TYPE);
            }
        }
    }

    function getProductDeliveryAvailabilityStatus(id, postal_code, type, address_id, product_container) {
        var params = {};
        if(type == PRODUCTS_LIST_TYPE){
            params.ids = id;
        }else if(id != ""){
            params.id = id;
        }
        params.type = type;
        params.postal_code = postal_code;
        is_product_delivery_check_in_progress = true;
        enableOrDisablePostalCodeInputElements(true);
        $X.get({
            url: "/storefront/api/v1/getDeliveryAvailabilityStatus",//NO I18N
            params: params,
            headers: zsUtils.getCSRFHeader(),
            args: { "type": params.type, "container": product_container, "postal_code": postal_code, "address_id": address_id, "is_delivery_availability_popup_open" : is_delivery_availability_popup_open},//No I18N
            handler: deliverAvailabilityHandler
        });
    }

    function deliverAvailabilityHandler(args) {
        var response = JSON.parse(this.responseText);
        if (response.status_code == 0) {
            var payload = response.payload;
            if (args.type == 0) {
                if (response.payload && response.payload.product) {
                    renderProducts(response.payload.product, args.container);
                }
            } else if (args.type == 1 || args.type == 5) {
                var category = payload.category;
                var category_id = category.category_id;
                var products = category.products;
                var group_containers;
                var category_containers = document.querySelectorAll("[data-zs-category-id='" + category_id + "']");	// No I18N
                if (category_containers.length > 0) {
                    group_containers = category_containers;
                } else {
                    group_containers = [];
                    group_containers.push(document);
                }
                for (var i = 0; i < group_containers.length; i++) {
                    var group_container = group_containers[i];
                    var target_container = group_container ? group_container : document;
                    renderProductList(products, target_container);
                }
            } else if (args.type == 2 || args.type == 4) {
                var collection = payload.collection;
                var collection_id = collection.collection_id;
                var products = collection.products;
                var group_containers;
                var collection_containers = document.querySelectorAll("[data-zs-collection-id='" + collection_id + "']");	// No I18N
                if (collection_containers.length > 0) {
                    group_containers = collection_containers;
                } else {
                    group_containers = [];
                    group_containers.push(document);
                }
                for (var i = 0; i < group_containers.length; i++) {
                    for (var j = 0; j < products.length; j++) {
                        var group_container = group_containers[i];
                        var target_container = group_container ? group_container : document;
                        renderProductList(products, target_container);
                    }
                }
            } else if (args.type == 3) {
                if (response.payload && response.payload.products) {
                    renderProductList(response.payload.products, document);
                }
            } else if (args.type == 6) {
                if (response.payload && response.payload.cart && response.payload.cart.items) {
                    var cart_items = response.payload.cart.items;
                    renderCartPage(cart_items);
                }
            }

            var checkDeliveryAvailabilitySuccessEvent = new CustomEvent("zp-event-check-delivery-availability-success", { // No I18N
                detail: {
                    postal_code: args.postal_code
                }
            });
            document.dispatchEvent(checkDeliveryAvailabilitySuccessEvent);

            var delivery_location_availability_elm = document.querySelectorAll("[data-zs-delivery-postalcode]");// No I18N
            for(var i=0; i<delivery_location_availability_elm.length; i++){
                delivery_location_availability_elm[i].innerHTML = i18n.get('delivery_location_availability.label.postal_code.select', args.postal_code);// No I18N
            }

            var product_details_delivery_availability_elms = document.querySelectorAll("[data-zs-product-details-delivery-availablity]");// No I18N
            for (var i = 0; i < product_details_delivery_availability_elms.length; i++) {
                product_details_delivery_availability_elms[i].innerHTML = i18n.get('delivery_location_availability.label.delivery.location.change');// No I18N
            }

            var postal_code_elems = document.querySelectorAll("[data-zs-delivery-location-postalcode]");// No I18N
            for (var i = 0; i < postal_code_elems.length; i++) {
                postal_code_elems[i].value = args.postal_code;
            }

            var error_elems = document.querySelectorAll("[data-zs-delivery-availability-product-details-error-message],[data-zs-delivery-availability-popup-error-message]");// No I18N
            for (var i = 0; i < error_elems.length; i++) {
                error_elems[i].style.display = "none";
            }

            if (args.address_id != null) {
                localStorage.setItem(DELIVERY_AVAILABILITY_POPUP_ADDRESS_ID, args.address_id);
            }
            if (args.postal_code != null) {
                localStorage.setItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE, args.postal_code);
                previously_fetched_postal_code = args.postal_code;
            }
            if(args.is_delivery_availability_popup_open){
                closeDeliveryAvailablityPopup();
            }
        } else {
            var checkDeliveryAvailabilityFailureEvent = new CustomEvent("zp-event-check-delivery-availability-failure", { // No I18N
                detail: {
                    postal_code: args.postal_code
                }
            });
            document.dispatchEvent(checkDeliveryAvailabilityFailureEvent);
            
            var error_elems = null;
            if(!is_delivery_availability_popup_open){
                error_elems = document.querySelectorAll("[data-zs-delivery-availability-product-details-error-message]");// No I18N
            }else{
                error_elems = document.querySelectorAll("[data-zs-delivery-availability-popup-error-message]");// No I18N
            }
            for (var i = 0; i < error_elems.length; i++) {
                error_elems[i].innerText = (response.developer_message == "") ? i18n.get('delivery_location_availability.label.error.invalid.postal_code'):response.developer_message;
                error_elems[i].style.removeProperty("display");
                if(is_delivery_availability_popup_open){
                    error_elems[i].scrollIntoView({
                        behavior: 'smooth' // No I18N
                    });
                }
            }
            clearDeliveryAvailability(document);
            previously_fetched_postal_code = args.postal_code;
        }
        enableOrDisablePostalCodeInputElements(false);
        is_product_delivery_check_in_progress = false;
    }

    function enableOrDisablePostalCodeInputElements(is_enable){
        var postal_code_input_elems = document.querySelectorAll("[data-zs-delivery-location-postalcode]");// No I18N
        for (var i = 0; i < postal_code_input_elems.length; i++) {
            if(is_enable){
                postal_code_input_elems[i].setAttribute("disabled","true");
            }else{
                postal_code_input_elems[i].removeAttribute("disabled");
            }
        }
    }

    function renderProductList(products, target_container) {
        for (var i = 0; i < products.length; i++) {
            var product_id = products[i].product_id;
            var product_containers = target_container.querySelectorAll("[data-zs-product-id='" + product_id + "']");// No I18N
            for (var j = 0; j < product_containers.length; j++) {
                if ((j == 0 && window.zs_view == "product" && product_id == zs_product.product_id) || product_containers[j].closest("#product_quick_look")) {
                    renderProducts(products[i], product_containers[j]);
                    continue;
                }
                if (!products[i].variants[0].is_deliverable) {
                    product_containers[j].setAttribute("data-zs-not-deliverable", "");
                } else {
                    product_containers[j].removeAttribute("data-zs-not-deliverable");
                }
            }
        }
    }

    function renderProducts(product, product_container) {
        if (product_container == null) {
            product_container = document.querySelector("[data-zs-product-id='" + product.product_id + "']");// No I18N
        }
        if (product_container) {
            var variants = product.variants;
            var productVariantId = -1;
            var addToCartElem = product_container.querySelector("[data-zs-product-variant-id]");// No I18N
            if (addToCartElem) {
                productVariantId = addToCartElem.getAttribute('data-zs-product-variant-id'); // No I18N
            } else {
                productVariantId = product_option.getVariantIdfromURL();
            }
            for (var i = 0; i < variants.length; i++) {
                var delivery_availability_element = document.querySelector("[data-zs-delivery-availability-variant-id='" + variants[i].variant_id + "']");// No I18N
                if (delivery_availability_element) {
                    delivery_availability_element.setAttribute("data-zs-delivery-availability", variants[i].is_deliverable);
                    delivery_availability_element.setAttribute("data-zs-delivery-stock-availability-status", variants[i].is_available_for_purchase);
                    if (variants[i].is_deliverable && variants[i].is_available_for_purchase) {
                        delivery_availability_element.innerText = i18n.get('delivery_location_availability.product.deliverable.message');
                        delivery_availability_element.removeAttribute("data-zs-not-deliverable-message");
                        delivery_availability_element.removeAttribute("data-zs-unavailable-message");
                        if (!product.has_variants || variants[i].variant_id == productVariantId) {
                            product_container.setAttribute("data-zs-deliverable", "");
                            product_container.removeAttribute("data-zs-not-deliverable");
                            delivery_availability_element.setAttribute("data-zs-deliverable-message", "");
                        }
                    } else {
                        delivery_availability_element.innerText = (!variants[i].is_deliverable) ? i18n.get('delivery_location_availability.product.not_deliverable.message'):i18n.get('delivery_location_availability.product.currently_unavailable.message');
                        delivery_availability_element.removeAttribute("data-zs-deliverable-message");
                        delivery_availability_element.removeAttribute("data-zs-not-deliverable-message");
                        delivery_availability_element.removeAttribute("data-zs-unavailable-message");
                        if (!product.has_variants || variants[i].variant_id == productVariantId) {
                            product_container.setAttribute("data-zs-not-deliverable", "");
                            product_container.removeAttribute("data-zs-deliverable");
                            if(!variants[i].is_deliverable){
                                delivery_availability_element.setAttribute("data-zs-not-deliverable-message", "");
                            }else{
                                delivery_availability_element.setAttribute("data-zs-unavailable-message", "");
                            }
                        }
                    }
                }

            }
        }
    }

    function renderCartPage(line_items) {
        var non_deliverable_items = [];
        for (var i = 0; i < line_items.length; i++) {
            var line_item_container = document.querySelector("[data-zs-product-id='" + line_items[i].variant_id + "']");// No I18N
            if (line_item_container) {
                if (line_items[i].is_available_for_purchase) {
                    line_item_container.removeAttribute("data-zs-not-deliverable");
                } else {
                	var non_deliverable_line_item = {};
                	non_deliverable_line_item.item_id = line_items[i].variant_id;
                	non_deliverable_line_item.name = line_items[i].name;
                	non_deliverable_items.push(non_deliverable_line_item);
                    line_item_container.setAttribute("data-zs-not-deliverable", "");
                }
            }
        }
        var common_error_message_container = document.querySelector("[data-zs-cart-delivery-availability-common-error-message]");// No I18N
        if (common_error_message_container) {
            var checkout_button = document.querySelector("[data-zs-checkout]");// No I18N
        	if (non_deliverable_items.length > 0) {
                common_error_message_container.style.removeProperty("display");// No I18N
                var non_deliverable_item_list_container = document.querySelector("[data-zs-cart-non-deliverable-items]");// No I18N
                if (non_deliverable_item_list_container) {
                    non_deliverable_item_list_container.innerHTML = "";
                    for (var i = 0; i < non_deliverable_items.length; i++) {
                    	var li_element = document.createElement("li");
                    	li_element.appendChild(document.createTextNode(non_deliverable_items[i].name));
                    	li_element.setAttribute("data-zs-delivery-availability-cart-item-id", non_deliverable_items[i].item_id);// No I18N
                    	non_deliverable_item_list_container.appendChild(li_element);                 	
                    }
                }
                if(checkout_button){
                    checkout_button.disabled = true;
                }
        	} else {
                if(checkout_button){
                    checkout_button.removeAttribute("disabled");
                }
        		common_error_message_container.style.display = "none";
        	}
    	}
    }

    function closeDeliveryAvailablityPopup() {
        var delivery_availability_popup_elem = document.querySelector("[data-zs-delivery-availability-popup]");// No I18N
        if (delivery_availability_popup_elem) {
            is_delivery_availability_popup_open = false;
            delivery_availability_popup_elem.style.display = "none";
        }

        var error_elems = document.querySelectorAll("[data-zs-delivery-availability-popup-error-message],[data-zs-delivery-availability-product-details-error-message]");// No I18N
        for (var i = 0; i < error_elems.length; i++) {
            error_elems[i].style.display = "none";
        }
        var postal_code_elems = document.querySelectorAll("[data-zs-delivery-location-postalcode]");// No I18N
        for (var i = 0; i < postal_code_elems.length; i++) {
            postal_code_elems[i].value = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE)?localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE):"";
        }
        var deliveryAvailabilityPopupLoadedEvent = new CustomEvent("zp-event-delivery-availability-popup-close", {});// No I18N
        document.dispatchEvent(deliveryAvailabilityPopupLoadedEvent);
    }

    function getUrlParam(parameter, defaultvalue) {
        var urlparameter = defaultvalue;
        if (window.location.href.indexOf(parameter) > -1) {
            urlparameter = getUrlVars()[parameter];
        }
        return urlparameter;
    }

    function getUrlVars() {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
            vars[key] = value;
        });
        return vars;
    }

    function clearDeliveryAvailability(elem) {
        var product_containers = elem.querySelectorAll("[data-zs-product-id]");// No I18N
        for (var i = 0; i < product_containers.length; i++) {
            product_containers[i].removeAttribute("data-zs-not-deliverable");
            product_containers[i].removeAttribute("data-zs-deliverable");
            var delivery_availability_variant_containers = $D.getAll('[data-zs-delivery-availability-variant-id]', product_containers[i]);
            for(var j=0; j< delivery_availability_variant_containers.length; j++){
                delivery_availability_variant_containers[j].setAttribute("data-zs-delivery-availability","");
                delivery_availability_variant_containers[j].setAttribute("data-zs-delivery-stock-availability-status","");
            }
        }
        var common_cart_error_message_container = document.querySelector("[data-zs-cart-delivery-availability-common-error-message]");// No I18N
        if(common_cart_error_message_container){
            common_cart_error_message_container.style.display = "none";
        }
        var checkout_button = document.querySelector("[data-zs-checkout]");// No I18N
        if(checkout_button){
            checkout_button.removeAttribute("disabled");// No I18N
        }
        var delivery_location_availability_elm = document.querySelectorAll("[data-zs-delivery-postalcode]");// No I18N
        for(var i=0; i<delivery_location_availability_elm.length; i++){
            delivery_location_availability_elm[i].innerHTML = i18n.get('delivery_location_availability.label.delivery.location.select');// No I18N
        }
        var product_details_delivery_availability_elem = document.querySelector("[data-zs-product-details-delivery-availablity]");// No I18N
        if (product_details_delivery_availability_elem) {
            product_details_delivery_availability_elem.innerHTML = i18n.get('delivery_location_availability.label.delivery.location.select');// No I18N
        }
        localStorage.removeItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE);
        localStorage.removeItem(DELIVERY_AVAILABILITY_POPUP_ADDRESS_ID);
    }

    return {
        handleDeliveryAvailability: _handleDeliveryAvailability,
        checkQuickLookDeliveryAvailablity: checkQuickLookDeliveryAvailablity,
        getRecommendedProductDeliveryAvailability: getRecommendedProductDeliveryAvailability,
        getAllProductsDeliveryAvailability: getAllProductsDeliveryAvailability,
        checkDeliveryAvailabilityOnLoad: checkDeliveryAvailabilityOnLoad,
        clearDeliveryAvailability: clearDeliveryAvailability
    }

})();
