/*$Id$*/
'use strict'; // No I18N
var cart = (function() {
	var ZS_EVENT_CUSTOM_FIELD_VALIDATION_ERROR  = "zs-event-custom-field-validation-error"; // No I18N

	/* Pixel event constants */

	var PIXEL_TRACK_EVENT = 'track'; //No I18N
	var PIXEL_ADD_TO_CART_EVENT = 'AddToCart'; //No I18N
	var PIXEL_PURCHASE_EVENT = 'Purchase'; //No I18N
	var PIXEL_SEARCH_EVENT = 'Search'; //No I18N
	var PIXEL_CHECKOUT_EVENT = 'InitiateCheckout'; //No I18N
	var PIXEL_VIEW_CONTENT_EVENT = 'ViewContent'; //No I18N

	/* Pixel local storage constants */

	var PIXEL_STORAGE_CONST = "fbpxl" //No I18N
	var PIXEL_PURCHASE_PREFIX = 'fbpxl_purchase_'; //No I18N
	var PIXEL_CHECKOUT_PREFIX = 'fbpxl_checkout_'; //No I18N

	/* Pixel payload constants */

	var PIXEL_SEARCH_PAYLOAD = 'search_string'; //No I18N
	var PIXEL_CURRENCY_PAYLOAD = 'currency'; //No I18N
	var PIXEL_VALUE_PAYLOAD = 'value'; //No I18N
	var PIXEL_CONTENT_ID_PAYLOAD = 'content_ids'; //No I18N
	var PIXEL_CONTENT_TYPE_PAYLOAD = 'content_type'; //No I18N
	var PIXEL_CONTENT_TYPE_PAYLOAD_VALUE = 'product'; //No I18N
	var PIXEL_CONTENT_TYPE_PAYLOAD_GROUP = 'product_group'; //No I18N

	/* Mobile App Interface constants */

	var CART_COUNT = 'cart_count'; //No I18N
	var HOST_NAME = 'host_name'; //No I18N

	/* Delivery Availability Popup local storage constants */

	var DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE = "delivery_postal_code"; //No I18N

	var ALLOW_DECIMAL_QUANTITY = false;

	var _getCartDetails = function() {
		_getCartCount(function (cartCount) {
			updateCartSpanElement(cartCount);
		});
	}

	function getUrlVars() {
	    var vars = {};
	    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
	        vars[key] = value;
	    });
	    return vars;
	}

	function getUrlParam(parameter, defaultvalue){
	    var urlparameter = defaultvalue;
	    if(window.location.href.indexOf(parameter) > -1){
	        urlparameter = getUrlVars()[parameter];
	        }
	    return urlparameter;
	}

	function sendCartCountToMobileApp(cartCount){
		if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.cartCountController) {
			window.webkit.messageHandlers.cartCountController.postMessage({HOST_NAME:window.location.hostname,CART_COUNT:cartCount})
		}else if (window.CartCountInterface != undefined ) {
        	window.CartCountInterface.setCartCount(window.location.hostname,cartCount);  
    	}
	}

	var _getCartCount = function(handler) {
		var checkout_id = getUrlParam("cart_id", "");// No I18N
		var queryString = "";
		if(checkout_id != "" && checkout_id != undefined){
			queryString = "?cart_id="+checkout_id;// No I18N
		}
		$X.get({
			url: '/storefront/api/v1/cart'+queryString, // No I18N
			args: {
				handler: handler
			},
			handler: function(args) {
				var res = JSON.parse(this.responseText);
				var cartCount = 0;
				var cartInfo = (res.payload) ? res.payload : res.cart_details;
				if(isAnalyticsEnabled() || isPixelEnabled()) {
					setCartInfoInWindowObj(cartInfo);
				}
				// new cart
				if(cartInfo.items){
					cartCount = cartInfo.items.length;
				}
				args.handler(cartCount);
				_deployCartCountEvent(cartCount);
				sendCartCountToMobileApp(cartCount);
			}
		});
	}

	var _deployCartCountEvent = function(cartCount) {
    var cartCountEvent = new CustomEvent("zp-event-cart-count", { // No I18N
      detail: {
        cart_count: cartCount,
        view: window.zs_view || "store_page" // No I18N
      }
    });
    document.dispatchEvent(cartCountEvent);
	}

	function getTargetContainer(element) {
		var targetContainer = (element) ? element.closest("[data-zs-product-id]") : "";	// No I18N
		return targetContainer;
	}

	function bulkAddProductToCart(params) {
		$X.post({
			url: '/store-user/api/v1/cart/bulkAddProductToCart', // No I18N
			bodyJSON: params,
			headers: zsUtils.getCSRFHeader(),
			handler: function() {
					var res = JSON.parse(this.responseText);
					if(res.cart_details && res.cart_details.items) {
						var cartInfo = res.cart_details;
						updateCartSpanElement(cartInfo.items.length);
						_deployCartCountEvent(cartInfo.items.length);
						/*
						 * addToCartSuccessEvent
						 */
					}
					/*
					 *	else {
					 * 		addToCartFailureEvent
					 *	}
					 */
			}
		});
	}

	var _addProductToCart = function() {
		if(!isCookieEnabled()) {
			return;
		}
		var addToCartButton = this;
		var productVariantId = this.getAttribute('data-zs-product-variant-id'); // No I18N
		var targetContainer = getTargetContainer(this);
		var productId = (targetContainer && targetContainer!="") ? targetContainer.getAttribute("data-zs-product-id") : ""; // No I18N
		var quantityElement;
		if(targetContainer == this) {
			// custom template [old]
			quantityElement = document.querySelector("[data-zs-quantity][data-zs-product-id='" + productId + "']"); // No I18N
		} else if(targetContainer && targetContainer!="") {
			// new template
    	quantityElement = targetContainer.querySelector("[data-zs-quantity]"); // No I18N
		}
    var quantity = 1;
    if(quantityElement) {
        quantity = quantityElement.value;
    }
		if(productVariantId === "") {
			var addToCartWithInvalidVariant = new CustomEvent("zp-event-add-to-cart-invalid-variant", { // No I18N
				detail: {
					target: addToCartButton,
					productId: productId,
					view: window.zs_view || "store_page" // No I18N
				}
			});
			document.dispatchEvent(addToCartWithInvalidVariant);
			return;
		}
		if(!_testQuantity(quantityElement, targetContainer)) {
			return;
		}

		var variantCustomFields = custom_field.getCartCustomFields(productVariantId);
		if(variantCustomFields.errors.length > 0) {
			_dispatch(ZS_EVENT_CUSTOM_FIELD_VALIDATION_ERROR, {
				'custom_fields'       : variantCustomFields.custom_field_list, //NO I18N
				'error_custom_fields' : variantCustomFields.errors //NO I18N
			});
			return;
		} else {
			//for clear custom fields error message
			_dispatch(ZS_EVENT_CUSTOM_FIELD_VALIDATION_ERROR, {
				'custom_fields'       : variantCustomFields.custom_field_list //NO I18N
			});
		}

		var addToCartLoadingEvent = new CustomEvent("zp-event-add-to-cart-loading", { // No I18N
			detail: {
				target: addToCartButton,
        productId: productId,
				productVariantId: productVariantId,
				view: window.zs_view || "store_page" // No I18N
			}
		});
		document.dispatchEvent(addToCartLoadingEvent);
		$E.unbind(addToCartButton, "click", _addProductToCart); // No I18N

        /*
         * 1 - True
         * 2 - False
         * Changing checkbox field value from integer to boolean
         */
		var custom_fields_values = variantCustomFields.custom_fields_value;
		for(var counter = 0; counter < custom_fields_values.length; counter++) {
		    var custom_fields_value = custom_fields_values[counter];
		    if(custom_fields_value.data_type && custom_fields_value.data_type == "check_box") {
		        custom_fields_value.value = (custom_fields_value.value == 1);
		    }
		}

		var params = {
			product_variant_id: productVariantId,
			quantity		  : quantity,
			custom_fields     : custom_fields_values
		};

		if(document.querySelector("[data-zs-delivery-postalcode]") && localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE) != ""){
			params.postal_code = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE);
		}

		var cart_id = getUrlParam("cart_id", "");// No I18N
		if(cart_id != ""){
			params.cart_id = cart_id;
		}

		$X.post({
			url: '/storefront/api/v1/cart', // No I18N
			bodyJSON: params,
			headers: zsUtils.getCSRFHeader(),
			args: {
				button: addToCartButton
			},
			handler: function(args) {
				var res = JSON.parse(this.responseText);
				if ((res.payload && res.payload.items) || (res.cart_details && res.cart_details.items) ) {
					var cartInfo = (res.payload) ? res.payload : res.cart_details;
					updateCartSpanElement(cartInfo.items.length);
			    	_deployCartCountEvent(cartInfo.items.length);
			    	sendCartCountToMobileApp(cartInfo.items.length);
			        if(isAnalyticsEnabled() || isPixelEnabled()) {
					    pushAddToCartEventForAnalytics(productId, quantity, targetContainer, cartInfo.items.length, productVariantId, cartInfo.code);
					}
					var addToCartSuccessEvent = new CustomEvent("zp-event-add-to-cart-success", { // No I18N
						detail: {
							cart: cartInfo,
			        productId: productId,
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					});
					document.dispatchEvent(addToCartSuccessEvent);
				} else {
					//if template have not custom fields 
					if(res.error && res.error.code == CONST.BOOKS_API_RESPONSE.STOREFRONT_CUSTOM_FIELD_ERROR) {
						res.cart_details = res.error;
					}
					//handle for min-max quantity error code
					res = _changeErrorMsg(res);

					var addToCartFailureEvent = new CustomEvent("zp-event-add-to-cart-failure", { // No I18N
						detail: {
							response: res,
			        productId: productId,
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					});
					document.dispatchEvent(addToCartFailureEvent);
				}
	      $E.bind(args.button, "click", _addProductToCart); // No I18N
			},
			error: {
				// below code for future case
				handler: function(args) {
					var addToCartFailureEvent = new CustomEvent("zp-event-add-to-cart-failure", { // No I18N
						detail: {
							target: args.button,
			        productId: productId,
							view: window.zs_view || "store_page" // No I18N
						}
					});
					document.dispatchEvent(addToCartFailureEvent);
          $E.bind(args.button, "click", _addProductToCart); // No I18N
				},
				condition: function() {
					return this.status >= 300;
				}
			}
		});
	}

	var _changeErrorMsg = function(res) {
		var error_message = res.error.message;
		if(res.error && error_message) {
			var matches = error_message.match(/(\d,?)+/);
			if(res.error.code == CONST.BOOKS_API_RESPONSE.STOREFRONT_MINIMUM_QUANTITY_ERROR) {
				var min_value = matches && matches[0];
				res.error.message = i18n.get('cart.error_message.minimum_quantity', min_value);
			} else if(res.error.code == CONST.BOOKS_API_RESPONSE.STOREFRONT_MAXIMUM_QUANTITY_ERROR) {
				var max_value = matches && matches[0];
				res.error.message = i18n.get('cart.error_message.maximum_quantity', max_value);
			} else if(res.error.code == CONST.BOOKS_API_RESPONSE.STOREFRONT_MINIMUM_CART_VALUE_ERROR) {
				var substrings = error_message.split(" ");
				var amount = substrings.filter(function(string){
					return /\d/.test(string);
				});
				res.error.message = i18n.get('checkout.error_message.minimum_order_value', amount[0].slice(0,amount[0].length-1));
        	}else if(res.error.code == CONST.BOOKS_API_RESPONSE.STOREFRONT_INSUFFICIENT_STOCK_ERROR) {
				var product_name_match = error_message.match(/\((.*)\)/);
				var product_name = product_name_match && product_name_match[1];
				res.error.message = i18n.get('cart.error_message.insufficient_stock', product_name && product_name.trim());
			}else if(res.error.code == CONST.BOOKS_API_RESPONSE.STOREFRONT_PRODUCT_NOT_DELIVERABLE_ERROR) {
				var product_name_match = error_message.match(/\((.*)\)/);
				var product_name = product_name_match && product_name_match[1];
				res.error.message = i18n.get('cart.error_message.non_deliverable', product_name && product_name.trim());
			}
		}
		return res;
	}

	var _testQuantity = function(quantityElement, targetContainer) {
		if(!quantityElement) {
			return true;
		}
		var quantity = quantityElement.value;
		var numberPattern = /^\d*.?\d*$/;
		var condition = !numberPattern.test(quantity);
		if(!condition) {
			condition = quantity.length == 0 || Number(quantity) == 0;
		}
    if(!condition && !ALLOW_DECIMAL_QUANTITY) {
      condition = (quantity % 1) != 0;
    }
    var productId = (targetContainer && targetContainer!="") ? targetContainer.getAttribute("data-zs-product-id") : ""; // No I18N
		if(condition) {
			var invalidProductQuantityEvent = new CustomEvent("zp-event-invalid-product-quantity", { // No I18N
				detail: {
					quantity: quantity,
					productId: productId,
					quantityElement: quantityElement,
					target: this,
					view: window.zs_view || "store_page" // No I18N
				}
			});
			document.dispatchEvent(invalidProductQuantityEvent);
			return false;
		}
		return true;
	}

	function clickIncDec(e){
		var targetContainer = getTargetContainer(this);
		var delay = this.hasAttribute("data-zs-delay") ? this.getAttribute("data-zs-delay") : 100; // No I18N
		var quantity_input = (targetContainer && targetContainer != "") ? targetContainer.querySelector("[data-zs-quantity]") : "";
		updateWatch.call(quantity_input,e,delay)
	}

	function updateWatch(e,delay) {
		var elem = this;
		delay = delay || (elem.hasAttribute("data-zs-delay") ? elem.getAttribute("data-zs-delay") : 1200); // No I18N
		if (elem.statusCode) {
			clearInterval(elem.statusCode)
		}
		if(elem.xmlr){
			elem.xmlr.abort()
		}
		elem.statusCode = setInterval(function () {
			if (elem.value != elem.getAttribute("data-zs-old_value")) {
				_updateProductInCart.call(elem)
			}
			clearInterval(elem.statusCode)
			elem.statusCode = 0
		}, delay);
	}

	var _updateProductInCart = function (e, callback) {
        var productVariantId = this.getAttribute('data-zs-product-variant-id'); // No I18N
				var productLineItemId = this.getAttribute('data-zs-product-lineitem-id'); // No I18N
        var targetContainer = getTargetContainer(this);
        var updateCartButton = this.hasAttribute("data-zs-quantity") ? null : this; // No I18N
        var quantityElement, productId;
        if (targetContainer == null) {
            // Custom template [old]
            productId = this.getAttribute("data-zs-product-id"); // No I18N
						if (productLineItemId) {
							quantityElement = document.querySelector("[data-zs-product-lineitem-id='" + productLineItemId + "'][data-zs-quantity]"); // No I18N
						}
						if (!quantityElement) {
							quantityElement = document.querySelector("[data-zs-product-variant-id='" + productVariantId + "'][data-zs-quantity]"); // No I18N
						}

        } else if (targetContainer && targetContainer != "") {
            // New template
            productId = targetContainer.getAttribute("data-zs-product-id"); // No I18N

						if (productLineItemId) {
							quantityElement = targetContainer.querySelector("[data-zs-product-lineitem-id='" + productLineItemId + "'][data-zs-quantity]"); // No I18N
						}

						if (!quantityElement) {
							quantityElement = targetContainer.querySelector("[data-zs-product-variant-id='" + productVariantId + "'][data-zs-quantity]"); // No I18N
						}
        }
        if (!quantityElement) {
            quantityElement = this.previousElementSibling;
        }
        if (!_testQuantity(quantityElement, targetContainer)) {
			callback && callback();
            return;
        }
        (updateCartButton) && $E.unbind(updateCartButton, "mousedown", _updateProductInCart); // No I18N
        var updateToCartLoadingEvent = new CustomEvent("zp-event-update-to-cart-loading", { // No I18N
            detail: {
                target: updateCartButton || quantityElement,
                productId: productId,
                productVariantId: productVariantId,
                view: window.zs_view || "store_page" // No I18N
            }
        });
        document.dispatchEvent(updateToCartLoadingEvent);
        var params = {
            product_variant_id: productVariantId,
            quantity: quantityElement.value
        };

				if (productLineItemId) {
					params['line_item_id'] = productLineItemId;
				}
        var cart_id = getUrlParam("cart_id", "");// No I18N
        if (cart_id != "") {
            params.cart_id = cart_id;
        }

				if(document.querySelector("[data-zs-delivery-postalcode]") && localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE) != ""){
					params.postal_code = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE);
				}

        $X.put({
            url: '/storefront/api/v1/cart', // No I18N
            bodyJSON: params,
            headers: zsUtils.getCSRFHeader(),
            args: {
                button: updateCartButton,
                quantity_elem : quantityElement
            },
            handler: function (args) {
                var res = JSON.parse(this.responseText);
                var updateProductEvent;
                if (res.status_code === "0") {
                    var items = (res.payload) ? res.payload.items : res.cart_details.items;
                    for (var i in items) {
											var item = items[i];
											if (productLineItemId) {
												if (productLineItemId === item.line_item_id) {
													var subtotal = document.querySelectorAll('[data-zs-sub-total-lineitem-' + params.line_item_id + ']')[0]; //NO I18N
													subtotal.innerHTML = item.approximate_total_formatted;
													var cartItemPrice = document.querySelectorAll('[data-zs-cart-selling-price-lineitem-' + params.line_item_id + ']'); //NO I18N
													for (var k = 0; k < cartItemPrice.length; k++) {
															cartItemPrice[k].innerHTML = item.selling_price_formatted;
													}
	
													var cartItemContainers = document.querySelectorAll("[data-zs-product-wrapper-lineitem-id='" + params.line_item_id + "']"); //NO I18N
													for (var j = 0; j < cartItemContainers.length; j++) {
														var cartItemDiscountContainer = cartItemContainers[j].querySelectorAll('[data-zs-product-discount-lineitem-' + params.line_item_id + ']'); //NO I18N
														for (var k = 0; k < cartItemDiscountContainer.length; k++) {
															if(item.label_price != 0 && (item.label_price > item.selling_price)){
																var discount = ((item.label_price - item.selling_price)/ item.label_price) * 100;
																cartItemDiscountContainer[k].innerHTML = discount.toFixed(1) + "% " + i18n.get("product.label.off");
															}else{
																cartItemDiscountContainer[k].innerHTML = "";
															}
														}
														var cartItemLabelPriceContainer = cartItemContainers[j].querySelectorAll('[data-zs-cart-label-price-lineitem-' + params.line_item_id + ']'); //NO I18N
														for (var k = 0; k < cartItemLabelPriceContainer.length; k++) {
															if(item.label_price != 0 && (item.label_price > item.selling_price)){
																cartItemLabelPriceContainer[k].innerHTML = item.label_price_formatted;
															}else{
																cartItemLabelPriceContainer[k].innerHTML = "";
															}
														}
													}
													var buttonSpan = (args.button || args.quantity_elem).parentElement;
													if (buttonSpan) {
															var quantityDiv = buttonSpan.parentElement;
															var quantityInput = quantityDiv.querySelector("[data-zs-quantity]"); // No I18N
															if (quantityInput) {
																	var quantity = item.quantity;
																	if (item.quantity != item.double_quantity) {
																			quantity = item.double_quantity;
																	}
																	quantityInput.setAttribute("data-zs-old_value", quantity)
																	quantityInput.value = quantity;
																	if (quantityInput.value == 1){
																		_introduceDeleteIcon(productVariantId, productLineItemId);
																	}
																	if (quantityInput.value > 1){
																		_removeDeleteIcon(productVariantId, productLineItemId);
																	}
															}
													}
	
													//update original price attribute and call onChangeEvent of currency converter
													subtotal.setAttribute('data-original-price', item.approximate_total);
													multi_currency.convertCurrencyPrice();
												}

											} else if (params.product_variant_id === item.variant_id) {
												var subtotal = document.querySelectorAll('[data-zs-sub-total-item-' + params.product_variant_id + ']')[0]; //NO I18N
												subtotal.innerHTML = item.approximate_total_formatted;
												var cartItemPrice = document.querySelectorAll('[data-zs-cart-selling-price-' + params.product_variant_id + ']'); //NO I18N
												for (var k = 0; k < cartItemPrice.length; k++) {
														cartItemPrice[k].innerHTML = item.selling_price_formatted;
												}
												var cartItemContainers = document.querySelectorAll("[data-zs-product-id='" + params.product_variant_id + "']"); //NO I18N
												for (var j = 0; j < cartItemContainers.length; j++) {
													var cartItemDiscountContainer = cartItemContainers[j].querySelectorAll('[data-zs-product-discount-' + params.product_variant_id + ']'); //NO I18N
													for (var k = 0; k < cartItemDiscountContainer.length; k++) {
														if(item.label_price != 0 && (item.label_price > item.selling_price)){
															var discount = ((item.label_price - item.selling_price)/ item.label_price) * 100;
															cartItemDiscountContainer[k].innerHTML = discount.toFixed(1) + "% " + i18n.get("product.label.off");
														}else{
															cartItemDiscountContainer[k].innerHTML = "";
														}
													}
													var cartItemLabelPriceContainer = cartItemContainers[j].querySelectorAll('[data-zs-cart-label-price-' + params.product_variant_id + ']'); //NO I18N
													for (var k = 0; k < cartItemLabelPriceContainer.length; k++) {
														if(item.label_price != 0 && (item.label_price > item.selling_price)){
															cartItemLabelPriceContainer[k].innerHTML = item.label_price_formatted;
														}else{
															cartItemLabelPriceContainer[k].innerHTML = "";
														}
													}
												}
												var buttonSpan = (args.button || args.quantity_elem).parentElement;
												if (buttonSpan) {
														var quantityDiv = buttonSpan.parentElement;
														var quantityInput = quantityDiv.querySelector("[data-zs-quantity]"); // No I18N
														if (quantityInput) {
																var quantity = item.quantity;
																if (item.quantity != item.double_quantity) {
																		quantity = item.double_quantity;
																}
																quantityInput.setAttribute("data-zs-old_value", quantity);
																quantityInput.value = quantity;
																if (quantityInput.value == 1){
																	_introduceDeleteIcon(productVariantId);
																}
																if (quantityInput.value > 1){
																	_removeDeleteIcon(productVariantId);
																}
														}
												}

												//update original price attribute and call onChangeEvent of currency converter
												subtotal.setAttribute('data-original-price', item.approximate_total);
												multi_currency.convertCurrencyPrice();
											}
										}
                  // cart subtotal
									var cartSubTotalElement = document.querySelectorAll('[data-zs-cart-subtotal]'); // No I18N
									for (var i = 0; i < cartSubTotalElement.length; i++) {
										if (cartSubTotalElement[i]) {
											cartSubTotalElement[i].innerText = (res.payload) ? res.payload.sub_total_formatted : res.cart_details.sub_total_formatted;
										}
									}
									var amt_saved = parseFloat(res.payload.total_amtsaved);
									var saved_amount_container = document.querySelector("[data-zs-savedamount-container]"); // No I18N
									if(amt_saved != 0){
										var savedAmount = res.payload.total_amtsaved_formatted;
										if(saved_amount_container) {
												saved_amount_container.style.display = "";
										}
										var saved_amount = document.querySelector("[data-zs-savedamount]"); // No I18N
										if(saved_amount) {
												saved_amount.innerText = savedAmount;
										}
									} else {
											if(saved_amount_container) {
													saved_amount_container.style.display = "none";
											}
									}
                    var cartDetails = (res.payload) ? res.payload : res.cart_details;
                    sendCartCountToMobileApp(cartDetails.items.length);
                    updateProductEvent = new CustomEvent("zp-event-update-to-cart-success", { // No I18N
                        detail: {
                            cart: cartDetails,
                            productId: productId,
                            target: args.button || args.quantity_elem,
                            view: window.zs_view || "store_page" // No I18N
                        }
                    });
                } else {
                    // if(args.button.hasAttribute("data-zs-quantity")){
                    if(args.quantity_elem && args.quantity_elem.hasAttribute("data-zs-old_value")){
                        args.quantity_elem.value = args.quantity_elem.getAttribute("data-zs-old_value");
                    }
                    //handle for min-max quantity error codes
                    res = _changeErrorMsg(res);
    
                    updateProductEvent = new CustomEvent("zp-event-update-to-cart-failure", { // No I18N
                        detail: {
                            response: res,
                            productId: productId,
                            target: args.button || args.quantity_elem,
                            view: window.zs_view || "store_page" // No I18N
                        }
                    });
                }
                document.dispatchEvent(updateProductEvent);
								callback && callback();
                args.button &&  $E.bind(args.button, "mousedown", _updateProductInCart); // No I18N
            },
            error: {
                handler: function (args) {
										if(args.quantity_elem && args.quantity_elem.hasAttribute("data-zs-old_value")){
                        args.quantity_elem.value = args.quantity_elem.getAttribute("data-zs-old_value");
                    }
                    var updateProductEvent = new CustomEvent("zp-event-update-to-cart-failure", { // No I18N
                        detail: {
                            target: args.button || args.quantity_elem,
                            productId: productId,
                            view: window.zs_view || "store_page" // No I18N
                        }
                    });
                    document.dispatchEvent(updateProductEvent);
										callback && callback();
                    args.button && $E.bind(args.button, "mousedown", _updateProductInCart); // No I18N
                },
                condition: function () {
                    return this.status >= 300;
                }
            }
        });
  }

	function _introduceDeleteIcon(productVariantId, productLineItemId){
		var cart_item_delete_elm, cart_item_dec_elm, cart_item_qty_dec_elm;
		if (productLineItemId) {
			cart_item_delete_elm = document.querySelector("[data-zs-cart-lineitem-delete='" + productLineItemId + "']"); // No I18N
			cart_item_dec_elm = document.querySelector("[data-zs-cart-item-decr-lineitem='" + productLineItemId + "']"); // No I18N
			cart_item_qty_dec_elm = document.querySelector("[data-zs-cart-qty-dec-btn-lineitem='" + productLineItemId + "']"); // No I18N
		}

		if (!cart_item_delete_elm) {
			cart_item_delete_elm = document.querySelector("[data-zs-cart-item-delete='" + productVariantId + "']"); // No I18N
		}

		if(cart_item_delete_elm) {
		    cart_item_delete_elm.style.display = "block";
		}

		if (!cart_item_dec_elm) {
			cart_item_dec_elm = document.querySelector("[data-zs-cart-item-decr='" + productVariantId + "']"); // No I18N
		}

		if(cart_item_dec_elm) {
		    cart_item_dec_elm.style.display = "none";
		}
	
		if (!cart_item_qty_dec_elm) {
			cart_item_qty_dec_elm = document.querySelector("[data-zs-cart-qty-dec-btn='" + productVariantId + "']"); // No I18N
		}

		if(cart_item_qty_dec_elm) {
		    cart_item_qty_dec_elm.style.display = "none";
		}
	}

	function _removeDeleteIcon(productVariantId, productLineItemId){
		var cart_item_delete_elm, cart_item_dec_elm, cart_item_qty_dec_elm;

		if (productLineItemId) {
			cart_item_delete_elm = document.querySelector("[data-zs-cart-lineitem-delete='" + productLineItemId + "']"); // No I18N
			cart_item_dec_elm = document.querySelector("[data-zs-cart-item-decr-lineitem='" + productLineItemId + "']"); // No I18N
			cart_item_qty_dec_elm = document.querySelector("[data-zs-cart-qty-dec-btn-lineitem='" + productLineItemId + "']"); // No I18N
		}

		if (!cart_item_delete_elm) {
			cart_item_delete_elm = document.querySelector("[data-zs-cart-item-delete='" + productVariantId + "']"); // No I18N
		}

		if(cart_item_delete_elm) {
		  cart_item_delete_elm.style.display = "none";
		}

		if (!cart_item_dec_elm) {
			cart_item_dec_elm = document.querySelector("[data-zs-cart-item-decr='" + productVariantId + "']"); // No I18N
		}
	    
		if(cart_item_dec_elm) {
		  cart_item_dec_elm.style.display = "block";
		}

		if (!cart_item_qty_dec_elm) {
			cart_item_qty_dec_elm = document.querySelector("[data-zs-cart-qty-dec-btn='" + productVariantId + "']"); // No I18N
		}

		if(cart_item_qty_dec_elm) {
		    cart_item_qty_dec_elm.style.display = "block";
		}
	}

	function getReqHeaders (){
		var headers = zsUtils.getCSRFHeader();
		var checkout_id = getUrlParam("cart_id",""); //NO I18N
		if( checkout_id != "" ){
			headers["X-Cart-Id"] = checkout_id;// No I18N
		}
		return headers;
	}

	var _deleteProductInCart = function() {
		var elem = this;
		var productVariantId = elem.getAttribute('data-zs-product-variant-id'); // No I18N
		var productLineItemId = this.getAttribute('data-zs-product-lineitem-id'); // No I18N
		var quantityElem;
		if (productLineItemId) {
			quantityElem = document.querySelector("[data-zs-product-lineitem-id='" + productLineItemId + "'][data-zs-quantity]"); // No I18N
		} else {
			quantityElem = document.querySelector("[data-zs-product-variant-id='" + productVariantId + "'][data-zs-quantity]"); // No I18N
		}
		
		var hasDeleteicon = this.hasAttribute('data-zs-delete-icon')// No I18N
		if(quantityElem && quantityElem.statusCode){
			clearInterval(quantityElem.statusCode);
			quantityElem.statusCode = 0;
		}
		var productId = elem.getAttribute("data-zs-product-id"); // No I18N
		$E.unbind(elem, "click", _deleteProductInCart); // No I18N
		var deleteFromCartLoadingEvent = new CustomEvent("zp-event-delete-from-cart-loading", { // No I18N
			detail: {
				target: elem,
        		productId: productId,
				productVariantId: productVariantId,
				view: window.zs_view || "store_page" // No I18N
			}
		});
		document.dispatchEvent(deleteFromCartLoadingEvent);

		var deleteUrl = '/storefront/api/v1/cart?product_variant_id='+productVariantId; // No I18N
		if (productLineItemId) {
			deleteUrl = deleteUrl+"&line_item_id="+productLineItemId; // No I18N

		}

		$X.del({
			url: deleteUrl,
			headers: getReqHeaders(),
			args: {
				button: elem
			},
			handler: function (args) {
				var res = JSON.parse(this.responseText);
				if (res.status_code === "0") {
					var product_container;
					if (productLineItemId) {
						product_container = document.querySelector("[data-zs-product-wrapper-lineitem-id='" + productLineItemId + "']"); // No I18N

					} else {
						product_container = document.querySelector("[data-zs-product-id='" + productVariantId + "']"); // No I18N
					}

					if(product_container) {
							product_container.style.display = "none";
					}
					if(isAnalyticsEnabled()) {
					    pushRemoveFromCartEventForAnalytics(productVariantId);
					}
					_getCartCount(function (cartCount) {
						updateCartSpanElement(cartCount);
						_deployCartCountEvent(cartCount);
						sendCartCountToMobileApp(cartCount);
						var deleteProductEvent = new CustomEvent("zp-event-delete-from-cart-success", { // No I18N
							detail: {
								response: res,
		            			productId: productId,
								target: args.button,
								view: window.zs_view || "store_page" // No I18N
							}
						});
						document.dispatchEvent(deleteProductEvent);
					})
					
					cartSubTotal();
				} else {
					var deleteProductEvent = new CustomEvent("zp-event-delete-from-cart-failure", { // No I18N
						detail: {
							response: res,
			        		productId: productId,
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					});
					document.dispatchEvent(deleteProductEvent);
				}
				$E.bind(args.button, "click", _deleteProductInCart); // No I18N
			},
			error: {
				handler: function (args) {
					var deleteProductEvent = new CustomEvent("zp-event-delete-from-cart-failure", { // No I18N
						detail: {
							response: res,
			        productId: productId,
							target: args.button,
							view: window.zs_view || "store_page" // No I18N
						}
					})
					document.dispatchEvent(deleteProductEvent);
					$E.bind(args.button, "click", _deleteProductInCart); // No I18N
				},
				condition: function () {
					return this.status >= 300;
				}
			}
		});
		
	}

	function updateCartSpanElement(cartCount) {
	    var viewCartCountElem = document.querySelectorAll('[data-zs-view-cart-count]');// No I18N
	    if(viewCartCountElem) {
			for (var i = 0; i < viewCartCountElem.length; i++){
        		viewCartCountElem[i].innerText = cartCount;
        		viewCartCountElem[i].style.visibility = (cartCount == 0) ? "hidden" : "visible";
			}
      	}
	}

	var _showOrderDetails = function() {
		document.querySelectorAll('[data-zs-order-area]')[0].style.display = 'block';
		document.querySelectorAll('[data-zs-message-area]')[0].style.display = 'none';
		document.querySelectorAll('[data-zs-comments]')[0].style.visibility = 'hidden';
		document.querySelectorAll('[data-zs-status]')[0].style.visibility = 'hidden';
		document.querySelectorAll('[data-zs-reasonforcancel]')[0].style.visibility = 'hidden';
		document.querySelectorAll('[data-zs-cancel-submit]')[0].style.visibility = 'hidden';
		var reasonList = document.querySelectorAll('[data-zs-reasonforcancellist]'); // No I18N
		for (var i = 0; i < reasonList.length; i++) {
			reasonList[i].style.visibility = 'hidden';
		}
		var commentsAreas = document.querySelectorAll('[data-zs-comments-area]'); // No I18N
		for (var i = 0; i < commentsAreas.length; i++) {
			commentsAreas[i].style.visibility = 'hidden';
		}
		var statusAreas = document.querySelectorAll('[data-zs-status-area]'); // No I18N
		for (var i = 0; i < statusAreas.length; i++) {
			statusAreas[i].style.visibility = 'hidden';
		}
		var productList = document.querySelectorAll('[data-zs-choose-product]'); // No I18N
		for (var i = 0; i < productList.length; i++) {
			productList[i].style.visibility = 'hidden';
		}
		var quantityAreas = document.querySelectorAll('[data-zs-quantity]'); // No I18N
		for (var i = 0; i < quantityAreas.length; i++) {
			quantityAreas[i].setAttribute('style', "border:#000000;");
			quantityAreas[i].disabled = false;
		}
	}

	var _validateSearch = function(e) {
        var searchPage = false;
        if(window.zs_view && window.zs_view == "search-products") {
            e.preventDefault();
            searchPage = true;
        }
		var searchButton, searchInput;
		var searchContainer = this.closest("[data-search]");// No I18N
		if(searchContainer){
			searchInput = searchContainer.querySelector('[data-zs-search-input]');// No I18N
			searchButton = searchContainer.querySelector('[data-zs-search]');// No I18N
		}else{
			searchInput = ($D.get('[data-zs-search-input]')) ? $D.get('[data-zs-search-input]') : this.form && this.form[0]; // No I18N
			searchButton = ($D.get('[data-zs-search]')) ? $D.get("[data-zs-search]") : this.form && this.form[1]; // No I18N
		}
        var searchTerm = searchInput && searchInput.value;
        searchTerm = searchTerm && searchTerm.trim();
        if(searchTerm == "") {
        	e.preventDefault();
          return false;
        }
		var element = (searchPage) ? $D.get('[data-zs-search-products]') : undefined; // No I18N
		var detail = {
			element 	: element,
			inputElem 	: searchInput,
			submitElem 	: searchButton,
			searchTerm  : searchTerm
		};
		_dispatch("zp-event-search-pending", detail);//NO I18N
        searchTerm = encodeURI(searchTerm);
        if(searchPage) {
            window.history.pushState("", "", "/search-products?q="+searchTerm);
            if(element) {
                submitSearchQuery(element, searchTerm, searchInput, searchButton);
            }
            return false;
        }
        return true;
    }

	var _cancelORReturnRequestEnable = function() {
		document.querySelectorAll('[data-zs-order-area]')[0].style.display = 'block';
		document.querySelectorAll('[data-zs-message-area]')[0].style.display = 'none';
		document.querySelectorAll('[data-zs-comments]')[0].style.visibility = '';
		document.querySelectorAll('[data-zs-status]')[0].style.visibility = '';
		document.querySelectorAll('[data-zs-reasonforcancel]')[0].style.visibility = '';
		document.querySelectorAll('[data-zs-cancel-submit]')[0].style.visibility = '';
		var reasonList = document.querySelectorAll('[data-zs-reasonforcancellist]'); // No I18N
		for (var i = 0; i < reasonList.length; i++) {
			reasonList[i].style.visibility = '';
		}
		var commentsAreas = document.querySelectorAll('[data-zs-comments-area]'); // No I18N
		for (var i = 0; i < commentsAreas.length; i++) {
			commentsAreas[i].style.visibility = '';
		}
		var statusAreas = document.querySelectorAll('[data-zs-status-area]'); // No I18N
		for (var i = 0; i < statusAreas.length; i++) {
			statusAreas[i].style.visibility = '';
		}
		var productList = document.querySelectorAll('[data-zs-choose-product]'); // No I18N
		for (var i = 0; i < productList.length; i++) {
			productList[i].style.visibility = '';
		}
		var quantityAreas = document.querySelectorAll('[data-zs-quantity]'); // No I18N
		for (var i = 0; i < quantityAreas.length; i++) {
			quantityAreas[i].removeAttribute('style');
			quantityAreas[i].removeAttribute('disabled');
		}
	}

	var _submitCancelOrReturnData = function() {
		var data = {};
		var productDetails = [];
		var productList = document.querySelectorAll('[data-zs-choose-product]'); // No I18N
		for (var i = 0; i < productList.length; i++) {
			if (productList[i].checked) {
				var listElem = productList[i].parentNode.parentNode;
				var productDetail = {};
				var itemIds = productList[i].getAttribute('data-zs-product-variant-id');
				//productDetail["line_item_id"] = itemIds[0].trim();
				productDetail.item_id = itemIds.trim();
				productDetail.quantity = parseInt(listElem.querySelectorAll('[data-zs-quantity]')[0].value);
				//productDetail["reason"] = listElem.getElementsByTagName('select')[0].value;
				//productDetail["comments"] = listElem.getElementsByTagName('textarea')[0].value
				productDetails[productDetails.length] = productDetail;
			}
		}
		if (productDetails.length === 0) {
			alert('Please choose product for cancel'); // No I18N
			return;
		} else {
			data.line_items = productDetails;
			$X.post({
				url: '/store-user/api/v1/returns/addReturnItem/' + location.pathname.split("/")[2], // No I18N
				bodyJSON: data,
				handler: function () {
					var res = JSON.parse(this.responseText);
					/*if (res.message === 0 ) {
					    console.log("success");
					}
					else{
					    console.log("error");
					}*/
				}
			});

		}
	}

	var _showMessageArea = function() {
		document.querySelectorAll('[data-zs-order-area]')[0].style.display = 'none';
		document.querySelectorAll('[data-zs-message-area]')[0].style.display = 'block';
	}

	var _submitMessage = function() {
		var subject = document.querySelectorAll('[data-zs-message-subject]')[0].value;
		var message = document.querySelectorAll('[data-zs-message-textarea]')[0].value;
		params = {};
		params.message = subject + "|" + message;
		$X.post({
			url: '/store-user/api/v1/returns/addMessage/' + location.pathname.split("/")[2], // No I18N
			params: params,
			handler: function () {
				var res = JSON.parse(this.responseText);
				/*if (res.message === 0 ) {
				    console.log("success");
				}
				else{
				    console.log("error");
				}*/
			}
		});
	}

	function submitSearchQuery(element, searchTerm, inputElem, submitElem) {
      	if(searchTerm) {
      	    searchTerm = searchTerm.replace(/\s\s+/g, ' ');
      	}
      	var url, searchType, searchQuery;
		if(inputElem && inputElem != ''){
      		searchType = inputElem.getAttribute('data-zs-search-input-type');// No I18N
      		searchQuery = inputElem.getAttribute('data-zs-search-query');// No I18N
		}

		searchType = getUrlParam("search_type") != null ? getUrlParam("search_type") : searchType;//NO I18N
		if(searchType && searchType!='' && getUrlParam("pf") == null) {
       	    searchTerm = searchTerm && searchTerm.replace("&search_type", '');
       	    /* Commented since filters url(pf) getting changed to search type url */
       	    /* if(!(window.location.search.includes("&search_type"))) {
       	        window.history.pushState("", "", "/search-products?q="+searchTerm+'&search_type='+searchType);
       	     }*/
       	    url = "/api/search-products?q=" + searchTerm + '&search_type=' + searchType;//NO I18N
      	} else if(searchQuery && searchQuery!='' && getUrlParam("pf") == null) {
       	    searchTerm = searchTerm && searchTerm.replace("&search_query", '');
       	    searchQuery = searchQuery.split('{0}').join(searchTerm);
       	    if(!(window.location.search.includes("&search_query"))) {
       	       window.history.pushState("", "", "/search-products?q="+searchTerm+'&search_query='+searchQuery);
       	    }
       	    url = "/api/search-products?q=" + searchTerm + '&search_query=' + searchQuery;//NO I18N
      	} else {
      	    url = "/api/search-products?q=" + searchTerm;//NO I18N
      	}
      	var delivery_availability_postal_code = document.querySelector("[data-zs-delivery-postalcode]");// No I18N
      	if(delivery_availability_postal_code){
      		var postal_code = delivery_availability_postal_code.getAttribute("data-zs-delivery-postalcode");
      		if(postal_code ==  ""){
      			postal_code = localStorage.getItem(DELIVERY_AVAILABILITY_POPUP_POSTAL_CODE);
      		}
      		if(postal_code != "" && postal_code != null){
      			url += "&postal_code=" + postal_code;// No I18N
      		}
      	}
      	
      	$X.get({
          	url: url,
          	args: {
          	    element: element
          	},
          	handler: function (args) {
              	var el = args.element;
              	var response = JSON.parse(this.responseText);
              	el.innerHTML = response.content;
              	product_list_coupon.clearLoadedIds();
				product_list_coupon.init(el);
              	productQuickLookAddToCart(el);
				var detail = {
					element 	: element,
					inputElem 	: inputElem,
					submitElem 	: submitElem,
					searchTerm  : searchTerm
				};
				var pixel_payload = {};
				pixel_payload[PIXEL_SEARCH_PAYLOAD] = searchTerm;
				pushEventToPixel(PIXEL_SEARCH_EVENT, pixel_payload);
      			_dispatch("zp-event-search-success", detail);//NO I18N
              	product_option.init();
              	product_option.resetAddToCart("", document);
				image_lazy_load.init();
				initSortByPorducts && initSortByPorducts();
				product_review && product_review.clearCache && product_review.clearCache();
          	}
  	    });
  	}

	function setHrefCart(viewcartelem) {
		viewcartelem.addEventListener('click', function () {
		    if (window.location.pathname.startsWith("/fb-store")) {
		        window.location.href = "/fb-store/cart"; // No I18N
		    } else {
			    window.location.href = "/cart"; // No I18N
			}
		}, false);
	}

	function _checkWhetherOrgIsLiveOrTest() {
		$X.get({
			url: "/store-user/api/v1/organizations/meta", // No I18N
			handler: function () {
				var res = JSON.parse(this.responseText);
				if (res.status_code == 0) {
					var organization = res.data.organization;
					if (organization.org_mode) {
						if(organization.org_mode.toLowerCase() == "test") {
							_createNotificationBar("This is a test demonstration store. No orders will be fulfilled.", true); //NO I18N
						}
					}
					if(organization.shipment_type) {
						window.org_shipment_type = organization.shipment_type;
					}
					var hostedpage_settings = res.data.hostedpage_settings;
					ALLOW_DECIMAL_QUANTITY = hostedpage_settings.allow_decimal_quantity;
				}
			}
		})
	}

	function _getRecommendedProducts() {
    	var product = window.zs_product;
     	var recommendedDivs = $D.getAll("[data-zs-recommended-products]"); // No I18N
      	var length = recommendedDivs.length;
      	if (product && length > 0) {
        	$X.post({
            	url: "/api/recommended-products?product_id=" + product.product_id, // No I18N
            	headers: zsUtils.getCSRFHeader(),
            	handler: function() {
                	var response = this.responseText && JSON.parse(this.responseText);
                	if (response && response.status_code == 0) {
                		for (var i = 0; i < length; i++) {
                        	if (response.content && response.content.length > 0) {
                            	recommendedDivs[i].innerHTML = response.content;
			      				custom_data.getRecommendedProductIds();
			      				delivery_availability.getRecommendedProductDeliveryAvailability();
			      				product_list_coupon && product_list_coupon.init(recommendedDivs[i]);
                            	productQuickLookAddToCart(recommendedDivs[i]);
                            	product_option.initForElement(recommendedDivs[i]);
                           		recommendedDivs[i].style.display = ""; // No I18N
			      				image_lazy_load.init();

			      				var recommendedProductsLoadedEvent = new CustomEvent("zp-event-recommended-products-loaded", { // No I18N
			      					detail: {
			      						target: recommendedDivs[i],
			      						view: window.zs_view || "store_page" // No I18N
			      					}
			      				});
			      				document.dispatchEvent(recommendedProductsLoadedEvent);
                        	}
                    	}
                	}else{
                		product_option.initForElement(document);
                	}
            	}
        	});
        	var recommendedProductsOnLoadEvent = new CustomEvent("zp-event-recommended-products-on-load", { // No I18N
        		detail: {
        			view: window.zs_view || "store_page" // No I18N
        		}
        	});
        	document.dispatchEvent(recommendedProductsOnLoadEvent);
    	}else if(product){
    		product_option.initForElement(document);
    	}
	}

	function _checkForInternetExplorerCustomEvent () {
	    // https://stackoverflow.com/a/26596324
        if ( typeof window.CustomEvent === "function" ) { return false; } // No I18N

        function CustomEvent ( event, params ) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent("CustomEvent"); // No I18N
            evt.initCustomEvent( event, params.bubbles || false, params.cancelable || false, params.detail );
            return evt;
        }

        CustomEvent.prototype = window.Event.prototype;

        window.CustomEvent = CustomEvent;
	}

	function isAnalyticsEnabled() {
	    var isEnabled = false;
		/*
		 * For Google Analytics - Enhanced Ecommerce
		 */
		if(typeof gtag != "undefined") {
			isEnabled = true;
		}
		return isEnabled;
	}

	function isPixelEnabled(){
		return (typeof fbq != "undefined") ? true : false; //No I18N
	}

	function pushEventToPixel(event_type, payload){
        if(isPixelEnabled()){
        	var data = localStorage.getItem(PIXEL_STORAGE_CONST);
    		var fbpxl = (data == null) ? {} : JSON.parse(data);
            if(event_type === PIXEL_PURCHASE_EVENT){
                var fbpxl_key = PIXEL_PURCHASE_PREFIX + payload.transaction_id;
                var fbpxl_value = fbpxl[fbpxl_key];
                if(!fbpxl_value || fbpxl_value == "false") {
                	var pixel_payload = {};
					pixel_payload[PIXEL_CURRENCY_PAYLOAD] = payload.currency;
					pixel_payload[PIXEL_VALUE_PAYLOAD] = payload.value;
					pixel_payload[PIXEL_CONTENT_TYPE_PAYLOAD] = PIXEL_CONTENT_TYPE_PAYLOAD_VALUE;
					var content_id_array = payload.items.map(function(item){
                        return item.variant_id;
                    });
					var unique_ids = Array.from(new Set(content_id_array));
					pixel_payload[PIXEL_CONTENT_ID_PAYLOAD] = unique_ids.join(",");
                    fbq(PIXEL_TRACK_EVENT, event_type, pixel_payload);
                    fbpxl[fbpxl_key] = "true";
                    if(payload.checkout_id){
                    	var fbpxl_checkout_key = "fbpxl_checkout_"+payload.checkout_id; //No I18N
                    	var fbpxl_checkout_value = fbpxl[fbpxl_checkout_key];
	                    var fbpxl_payment_key = "fbpxl_payment_"+payload.checkout_id; //No I18N
	                    var fbpxl_payment_value = fbpxl[fbpxl_payment_key];
	                    if(fbpxl_checkout_value && fbpxl_checkout_value=="true") {
	                    	delete fbpxl[fbpxl_checkout_key];
	                    }
	                    if(fbpxl_payment_value && fbpxl_payment_value=="true") {
	                    	delete fbpxl[fbpxl_payment_key];
	                    }
                    }
                    localStorage.setItem(PIXEL_STORAGE_CONST, JSON.stringify(fbpxl));
                }
            } else {
                fbq(PIXEL_TRACK_EVENT, event_type, payload);
            }
        }
	}

    function pushShoppingDataForAnalytics(payload, event_type) {

		if(isAnalyticsEnabled()) {

            /*
             * For Google Analytics - Enhanced Ecommerce
             */
			gtag('event', event_type, payload);	// No I18N

		}
	}

	function getItemDetails(quantity, variant_id) {
		if(!window.zs_product) {
			return;
		}
		var items = [];
		var item = {};
		var variant_name = "";
		var item_id = "";
		var item_price = "";
		if(variant_id && variant_id != "") {
			var variants = window.zs_product.variants;
			for(var i = 0; i < variants.length; i++) {
				if(variants[i].variant_id == variant_id) {
					item_price = variants[i].selling_price;
					var options = variants[i].options;
					for(var j = 0; j < options.length; j++) {
						variant_name = variant_name.concat(options[j].value);
						if(j+1 < options.length) {
							variant_name = variant_name.concat("-");
						}
					}
					break;
				}
			}
			item_id = variant_id;
			if(variant_name != "") {
				item_id = item_id + "-" + variant_name;
			}
		} else {
			item_id = window.zs_product.product_id;
			item_price = window.zs_product.selling_price;
		}
	  item.id = item_id;
	  item.name = window.zs_product.name;
	  item.price = item_price;
	  item.category = window.zs_product.category_name;
		if(variant_name != "") {
			item.variant = variant_name;
		}
		if(window.zs_product.brand != "") {
			item.brand = window.zs_product.brand;
		}
		if(quantity && quantity != "") {
			item.quantity = quantity;
		}
		items.push(item);
		return items;
	}

	function getAttributeValue(element) {
		var attribute_value = "";
		var selected_attribute;
		if (element && element.options) {
				selected_attribute = element.options[element.selectedIndex];
				attribute_value = (selected_attribute) ? attribute_value.concat(selected_attribute.innerText) : "";
		} else {
				var inputs = element.querySelectorAll("input"); // No I18N
				for (var i = 0; i < inputs.length; i++) {
						if (inputs[i].checked) {
								selected_attribute = inputs[i];
								break;
						}
				}
				attribute_value = (selected_attribute) ? selected_attribute.getAttribute("data-text") : "";
		}
		return attribute_value;
	}

	function getVaraintName(targetContainer) {
		var variant_name = "";
		var attribute_containers = targetContainer.querySelectorAll("[data-zs-attribute-name]");	// No I18N
		for(var i = 0; i < attribute_containers.length; i++) {
			var attribute_container = attribute_containers[i];
			var attribute_value = getAttributeValue(attribute_container);
			attribute_value = attribute_value.trim();
			variant_name = variant_name.concat(attribute_value);
			if(i+1 < attribute_containers.length) {
				variant_name = variant_name.concat("-");
			}
		}
		return variant_name;
	}

	function setCartInfoInWindowObj(cartInfo) {
		if(window.zs_view == "checkout" || window.zs_view == "cart") {
			var items = [];
			var line_items = cartInfo.items;
			var currency_code = cartInfo.code;
			var total_price = cartInfo.sub_total;
			var content_id_array = [];
			for(var i = 0; i < line_items.length; i++) {
				var item = {};
				var line_item = line_items[i];
				var line_item_options = line_item.options;

				// To get product id
				var line_item_url = line_item.url;
				var url_split = line_item_url.split('/');
				var url_param_split = (url_split) ? url_split[2].split('?') : "";
				item.product_id = (url_param_split) ? url_param_split[0] : "";
				content_id_array[i] = line_item.variant_id;

				if(line_item_options && line_item_options.length > 0) {
					// Line item with variants
					var line_item_name = line_item.name;
					var temp_index = line_item_name.indexOf('-');
					var item_name = line_item_name.substr(0, temp_index);
					var variant_name = line_item_name.substr(temp_index+1);
					item.id = line_item.variant_id + "-" + variant_name;
					item.name = item_name;
					item.varaint = variant_name;
				} else {
					// Line item without variants
					item.id = item.product_id;
					item.name = line_item.name;
				}
				item.varaint_id = line_item.variant_id;
				if(line_item.category && line_item.category != "") {
					item.category = line_item.category;
				}
				if(line_item.brand && line_item.brand != "") {
					item.brand = line_item.brand;
				}
				item.price = line_item.selling_price;
				item.quantity = line_item.quantity;
				items.push(item);
			}
			window.zs_cart_items = items;
			if(window.zs_view == "checkout"){
				var unique_ids = Array.from(new Set(content_id_array));
				var pixel_payload = {};
				pixel_payload[PIXEL_CURRENCY_PAYLOAD] = currency_code;
				pixel_payload[PIXEL_VALUE_PAYLOAD] = total_price;
				pixel_payload[PIXEL_CONTENT_TYPE_PAYLOAD] = PIXEL_CONTENT_TYPE_PAYLOAD_VALUE;
				pixel_payload[PIXEL_CONTENT_ID_PAYLOAD] = unique_ids.join(",");
				pushEventToPixel(PIXEL_CHECKOUT_EVENT,pixel_payload);
			}
		} else if(window.zs_view == "payment-status") {
			pushPurchaseDataForAnalytics();
		}
	}

	function pushPurchaseDataForAnalytics() {
		/*
		 * For Google Analytics - Enhanced Ecommerce
		 * Event type = "purchase"
		 */
		 var params = {};
 		 var pathname = location.pathname;
 	 	 var pathname_split = pathname.split('/');
 		 params.checkout_id = (pathname_split) ? pathname_split[pathname_split.length-1] : "";
		 $X.get({
		 		url   	: "/storefront/api/v1/checkout/fetchPurchaseData",//NO I18N
		 		params	: params,
		 		headers : zsUtils.getCSRFHeader(),
		 		handler	: function() {
		 				var response = JSON.parse(this.responseText);
		 				if(response.status_code == 0) {
		 					var payload = response.payload;
							pushShoppingDataForAnalytics(payload, "purchase");	// No I18N
							pushEventToPixel(PIXEL_PURCHASE_EVENT, payload);
						}
		 		}
		 });
	}

	function pushRemoveFromCartEventForAnalytics(given_variant_id) {
		/*
		 * For Google Analytics - Enhanced Ecommerce
		 * Event type = "remove_from_cart"
		 */
		var payload = {};
		var removed_item = {};
		var removed_items = [];
		var items = window.zs_cart_items;
		for(var i = 0; i < items.length; i++) {
			var item = items[i];
			if(item.varaint_id == given_variant_id) {
				removed_item = item;
				break;
			}
		}
		/*
		 * Remove "varaint_id" node from each line items
		 * as it is not needed for GA EE data push
		 */
		delete removed_item.varaint_id;
		removed_items.push(removed_item);
		payload.items = removed_items;
		pushShoppingDataForAnalytics(payload, "remove_from_cart");	// No I18N
	}

	function pushAddToCartEventForAnalytics(productId, quantity, targetContainer, cart_count, given_variant_id, currency_code) {
		/*
		 * For Google Analytics - Enhanced Ecommerce
		 * Event type = "add_to_cart"
		 */
		var items = [];
		var payload = {};
		var page_url = window.location.href;
		if(page_url.includes(productId)) {
			// Add to cart done in product details layout
			var attributes_count = (window.zs_product && window.zs_product.attributes) ? window.zs_product.attributes.length : 0;
			if(attributes_count > 0 && given_variant_id && given_variant_id != "") {
				payload.items = getItemDetails(quantity, given_variant_id);
				payload.items[0].variant_id = given_variant_id;
			} else {
				payload.items = getItemDetails(quantity);
				payload.items[0].variant_id = (given_variant_id && given_variant_id != "") ? given_variant_id : window.zs_product.variants[0].variant_id;
			}
			payload.items[0].product_id = productId;
		} else {
			// Add to cart done in product list layout
			var price = "";
			var name = "";
			var varaint_name = "";
			if(targetContainer && targetContainer != "") {
				varaint_name = getVaraintName(targetContainer);
				var nameContainer = targetContainer.querySelector(".theme-product-name");	// No I18N
				name = (nameContainer) ? nameContainer.innerText : "";
				if(varaint_name != "") {
					// Product with variants
					var priceContainerForSelectedVariant = targetContainer.querySelector("[data-zs-pricings][data-zs-variant-id='"+ given_variant_id +"']");	// No I18N
					if(priceContainerForSelectedVariant != null){
						var original_price_container = priceContainerForSelectedVariant.querySelector("[data-zs-original-price]"); //NO I18N
						var selling_price_container = priceContainerForSelectedVariant.querySelector("[data-zs-selling-price]"); //NO I18N
						price = (original_price_container)? original_price_container.getAttribute("data-zs-original-price"):selling_price_container.getAttribute("data-zs-selling-price");
					}
				} else {
					// Product without variants
					var original_price_container = targetContainer.querySelector("[data-zs-original-price]"); //NO I18N
					var selling_price_container = targetContainer.querySelector("[data-zs-selling-price]");  //NO I18N
					price = (original_price_container)? original_price_container.getAttribute("data-zs-original-price") : selling_price_container.getAttribute("data-zs-selling-price");
				}
			}
			var item = {};
			var item_id = "";
			if(varaint_name != "") {
				// Product with variants
				item.varaint = varaint_name;
				item_id = item_id.concat(given_variant_id).concat("-").concat(varaint_name);
			} else {
				// Product without variants
				item_id = productId;
			}
			item.id = item_id;
			item.name = name;
			item.price = price;
			item.quantity = quantity;
			item.product_id = productId;
			item.variant_id = given_variant_id;
			items.push(item);
			payload.items = items;
		}
		if(isPixelEnabled()){
			var price = payload.items[0].price;
			var quantity = payload.items[0].quantity;
			var total_price = price * quantity;
			var pixel_payload = {};
			pixel_payload[PIXEL_CURRENCY_PAYLOAD] = currency_code;
			pixel_payload[PIXEL_VALUE_PAYLOAD] = total_price;
			pixel_payload[PIXEL_CONTENT_TYPE_PAYLOAD] = PIXEL_CONTENT_TYPE_PAYLOAD_VALUE;
			pixel_payload[PIXEL_CONTENT_ID_PAYLOAD] = payload.items[0].variant_id;
			pushEventToPixel(PIXEL_ADD_TO_CART_EVENT, pixel_payload);
		}
		payload.value = cart_count;
		payload.currency = currency_code;
 		pushShoppingDataForAnalytics(payload, "add_to_cart");	// No I18N
	}

	function pushProductPageViewForAnalytics(given_variant_id) {
		/*
		 * For Google Analytics - Enhanced Ecommerce
		 * Event type = "view_item"
		 */
		if(window.zs_view != "product") {
			return;
		}
		var payload = {};
		var send_data = false;
		var attributes_count = (window.zs_product && window.zs_product.attributes) ? window.zs_product.attributes.length : 0;
		if(attributes_count > 0) {
			// Product with variants
			if(given_variant_id && given_variant_id != "") {
				payload.items = getItemDetails("", given_variant_id);
				send_data = true;
			}
		} else {
			// Product without variants
			payload.items = getItemDetails();
			send_data = true;
		}
		if(send_data == true) {
			pushShoppingDataForAnalytics(payload, "view_item");	// No I18N
		}
	}

	function pushViewContentEventForPixel(given_variant_id) {
		if(window.zs_view != "product") {
			return;
		}
		var pixel_payload = {};
		pixel_payload[PIXEL_CONTENT_TYPE_PAYLOAD] = PIXEL_CONTENT_TYPE_PAYLOAD_VALUE;
		var send_data = false;
 		var attributes_count = (window.zs_product && window.zs_product.attributes) ? window.zs_product.attributes.length : 0;
 		if(attributes_count > 0){
 			if (given_variant_id && given_variant_id != ""){
 				pixel_payload[PIXEL_CONTENT_ID_PAYLOAD] = given_variant_id;
 				pushEventToPixel(PIXEL_VIEW_CONTENT_EVENT, pixel_payload);
 			}
 		} else {
 			pixel_payload[PIXEL_CONTENT_ID_PAYLOAD] = (given_variant_id && given_variant_id != "") ? given_variant_id : window.zs_product.variants[0].variant_id;
 			pushEventToPixel(PIXEL_VIEW_CONTENT_EVENT, pixel_payload);
 		}
 	}

	 function checkout(){
		if(!checkout.pending){
			if (window.location.pathname.startsWith("/fb-store")) {
				var win = window.open("/checkout", "_blank"); // No I18N
				win.focus();
			} else {
				var checkout_id = getUrlParam("cart_id", "");// No I18N
				var queryString = "";
				if(checkout_id != "" && checkout_id != undefined){
					queryString = "?checkout_id="+checkout_id;// No I18N
				}
				window.location.href = "/checkout" + queryString;
			}
		}else{
			checkout.pending--;
		}
	 }

	var init = function() {
		isCookieEnabled() ? _checkWhetherOrgIsLiveOrTest() : _createNotificationBar("Cookies are disabled in your browser. Please enable cookies to continue.", false); //NO I18N
		if(isAnalyticsEnabled()) {
		    pushProductPageViewForAnalytics();
		}
		if(isPixelEnabled()){
			pushViewContentEventForPixel();
		}
		delivery_availability.handleDeliveryAvailability();
		custom_data.getCustomDataForEcommerceResource();
		_checkForInternetExplorerCustomEvent();
		_getRecommendedProducts();
		_getCartDetails();
		/*
			 var script = document.createElement('script');
			 script.onload = function(){ _getCartDetails()};
			 script.src="ht"+"tp://ljraajesh-1000.csez.zohocorpin.com:8080/zs-site/assets/v1/js/lib.js";
			 document.body.appendChild(script);
		 */
		// View cart
		var viewCartElem = document.querySelectorAll('[data-zs-view-cart]'); // No I18N
		for(var i = 0; i < viewCartElem.length; i++) {
			setHrefCart(viewCartElem[i]);
		}
		// Add to cart
		var addToCartElem = document.querySelectorAll('[data-zs-add-to-cart]'); // No I18N
		for(var i = 0; i < addToCartElem.length; i++) {
			addToCartElem[i].addEventListener('click', _addProductToCart, false);
		}
		// Update in cart
		var quantityInCart = document.querySelectorAll('[data-zs-quantity]'); // No I18N
		var prodVarId= document.querySelectorAll('[data-zs-product-id]');// No I18N
		var prodLineItemId = document.querySelectorAll('[data-zs-product-wrapper-lineitem-id]');// No I18N
		if(window.zs_view == "cart"){
			for(var i = 0; i < quantityInCart.length; i++) {
			    if(!prodVarId[i]) {
			        break;
			    }
				var qtyinitem = quantityInCart[i].getAttribute('value')
				if (qtyinitem > "1"){
					_removeDeleteIcon(prodVarId[i].getAttribute('data-zs-product-id'), prodLineItemId[i] && prodLineItemId[i].getAttribute('data-zs-product-wrapper-lineitem-id'));
				} else {
					_introduceDeleteIcon(prodVarId[i].getAttribute('data-zs-product-id'), prodLineItemId[i] && prodLineItemId[i].getAttribute('data-zs-product-wrapper-lineitem-id'));
				}
			}
			for(var i = 0; i < quantityInCart.length; i++) {
				var prod_var_id = quantityInCart[i].getAttribute("data-zs-product-variant-id");
				var updateBtt = document.querySelector("[data-zs-product-variant-id='"+ prod_var_id +"'][data-zs-update]"); // No I18N
				if(!updateBtt){
					quantityInCart[i].addEventListener("keydown", updateWatch, false);
					quantityInCart[i].setAttribute("data-zs-old_value", quantityInCart[i].value)
				}else{
					updateBtt.addEventListener('mousedown', _updateProductInCart, false);
				}
			}

			var cartqtyIncDec = document.querySelectorAll('.theme-cart-qty-inc-dec'); // No I18N
			for(var i = 0; i < cartqtyIncDec.length; i++) {
				cartqtyIncDec[i].addEventListener('click', clickIncDec, false);
			}
		}
		// Delete in cart
		var deleteInCartElem = document.querySelectorAll('[data-zs-delete]'); // No I18N
		for(var i = 0; i < deleteInCartElem.length; i++) {
			deleteInCartElem[i].addEventListener('click', _deleteProductInCart, false);
		}
		var deleteInCartInput = document.querySelectorAll('[data-zs-delete-icon]'); // No I18N
		for(var i = 0; i < deleteInCartInput.length; i++) {
			deleteInCartInput[i].addEventListener('click', _deleteProductInCart, false);
		}
		// Continue shopping
		var continueShoppingElem = document.querySelectorAll('[data-zs-continue-shopping]')[0];
		if(continueShoppingElem) {
			continueShoppingElem.addEventListener('click', function() {
			    this.disabled = true;
			    if (window.location.pathname.startsWith("/fb-store")) {
			        window.location.href = "/fb-store"; // No I18N
			    } else {
				    window.location.href = "/"; // No I18N
				}
			}, false);
		}
		// Checkout
		var checkoutElem = document.querySelectorAll('[data-zs-checkout]');// No I18N
		for(var i = 0; i < checkoutElem.length; i++) {
			if(checkoutElem[i]) {
				checkoutElem[i].addEventListener('click', _checkoutClickListener , false);
			}
		}
		// Enabled cancel or return order
		var cancelElem = document.querySelectorAll('[data-zs-cancel]')[0];
		if(cancelElem) {
			cancelElem.addEventListener('click', _cancelORReturnRequestEnable, false);
		}
		// Collect cancel or return order details
		var returnElem = document.querySelectorAll('[data-zs-cancel-submit]')[0];
		if(returnElem) {
			returnElem.addEventListener('click', _submitCancelOrReturnData, false);
		}
		// My order
		var orderElem = document.querySelectorAll('[data-zs-order]')[0];
		if(orderElem) {
			orderElem.addEventListener('click', _showOrderDetails, false);
		}
		// Search
		var searchElem = document.querySelectorAll('[data-zs-search]'); // No I18N
		for(var i = 0; i < searchElem.length; i++) {
			searchElem[i].addEventListener('click', _validateSearch, false);
		}
		// Message
		var messageElem = document.querySelectorAll('[data-zs-message]')[0];
		if(messageElem) {
			messageElem.addEventListener('click', _showMessageArea, false);
			var messageSubmitButton = document.querySelectorAll('[data-zs-message-submit]')[0];
			if(messageSubmitButton) {
				messageSubmitButton.addEventListener('click', _submitMessage, false); // No I18N
			}
		}

		if(window.zs_view == "cart"){
			scrollToHideSummary();
			cartSubTotal();
		}
		handleProductReview();
		//Payment Status
		checkPaymentStatus();
	}

	var _checkoutClickListener = function () {
		this.disabled = true;
		checkout.pending = 0
		var updateCallback = function(){
			checkout.pending--;
			checkout();
		}
		var quantityInCart = document.querySelectorAll('[data-zs-quantity]'); // No I18N
		for(var i=0;i<quantityInCart.length;i++){
			if(quantityInCart[i].statusCode){
				checkout.pending++
				_updateProductInCart.call(quantityInCart[i], null, updateCallback)
				clearInterval(quantityInCart[i].statusCode)
			}
		}
		(!checkout.pending) && checkout();
	}


	var scrollToHideSummary = function() {
		var cart_summary_btn = document.querySelector('[data-cart-summary-button]');// No I18N
		if(cart_summary_btn) {
            var observer = new IntersectionObserver(handler, {
                threshold: [0, 1]
            });
            observer.observe(cart_summary_btn);
            function handler(entries, observer) {
                var bottomBox = document.querySelector('[data-fixed-mobile-cart-summary]');// No I18N
                if (!bottomBox){
                    return;
                }
                entries.forEach(function(entry) {
                  var ratio = entry.intersectionRatio;
                  if (ratio >= 1) {
                    bottomBox.className = bottomBox.className.replace('show','hide');
                  } else if (ratio <= 0) {
                    bottomBox.className = bottomBox.className.replace('hide','show');
                  }
                });
            }
		}
	}

	var handleProductReview = function(element) {

		element = element || document;
    var elements = element.querySelectorAll("[data-zs-review-id]"); // No I18N
    if(elements && elements.length > 0) {
      if(typeof product_review != "undefined") { // No I18N
        product_review.initForElement(element);
      } else {
        var div = document.createElement("div"); // No I18N
        div.setAttribute("data-zs-app", "product_review"); // No I18N
        zsApp.init(div);
      }
		}
		bindCustomFieldDateElement(element);
	}

	var productQuickLookAddToCart = function(element) {
		if(!element) {
			/*
			 *  Called from viewProductQuickLook() in store.js template file
			 */
			 custom_data.getQuickLookProductPrice();
			 delivery_availability.checkQuickLookDeliveryAvailablity();
		}
		element = element || document.getElementById('product_quick_look');// No I18N
		var addToCartElem = element.querySelectorAll('[data-zs-add-to-cart]'); // No I18N
		for(var i = 0; i < addToCartElem.length; i++) {
			addToCartElem[i].addEventListener('click', _addProductToCart, false);
			if(addToCartElem[i].getAttribute('data-zs-product-variant-id') === "") {
				// this function call at product_option.js for varaint choose options enabled
				product_option.initForElement(document.getElementById('product_quick_look')); // No I18N
			}
		}
		//quick view/recommend product price conversion
		multi_currency && multi_currency.convertCurrencyPrice();
		handleProductReview(element);
	}

	function isCookieEnabled() {
		var cookieEnabled = (navigator.cookieEnabled) ? true : false;
		if(typeof navigator.cookieEnabled == "undefined" && !cookieEnabled) {
			document.cookie = "storecookie";
			cookieEnabled = (document.cookie.indexOf("storecookie") != -1) ? true : false;
		}
		return cookieEnabled;
	}

	/*
	 * If any error occurs, need to show it in the notification bar at the page top
	 * @param msg string
	 * @param isCloseIcon boolean, is check to close icon for test organization mode
	 */
	function _createNotificationBar(msg, isCloseIcon) {
		var topBanner = document.createElement("div"); // No I18N
		topBanner.id = "notificationBar";
		topBanner.setAttribute("style", "overflow: hidden; position: fixed; top: 0px; width: 100%; background-color: #0b3b5b; text-align: center;padding:1px; z-index: 100001");
		var notificationBarTxt = '<div style="color: #fff389;text-shadow: 1px 1px 1px #000;font-size: 13px;font-family: Lucida Grande,Segoe UI,Arial,Helvetica,sans-serif;position:relative;padding: 0 36px;">' + msg; //NO I18N
		if(isCloseIcon) {
			notificationBarTxt += '<div id="bindNotificationBar" style="position: absolute;top: 3px;right: 9px;width: 16px;height: 16px;background: #000;display: flex;justify-content: center;align-items: center;cursor: pointer;color: #FFF;">x</div>'; //NO I18N
		}
		notificationBarTxt += '</div>'; //No I18N
		topBanner.innerHTML = notificationBarTxt;
		var body = document.querySelector("body"); // No I18N
		body.insertBefore(topBanner, body.firstChild);
		// Bind close icon after html content added to DOM
		if($D.getById('bindNotificationBar')) {
			$E.bind($D.getById('bindNotificationBar'), "click", _closeNotificationBar); // No I18N
		}
	}

	function _closeNotificationBar() {
		if($D.getById('notificationBar')) {
			$D.remove($D.getById('notificationBar'));
		}
	}

	function mailMerchantAboutFailureTransaction() {
		var params = {};
		var href = location.href;
		var href_split = href.split('/');
		params.checkout_id = (href_split) ? href_split[href_split.length-1] : "";
		$X.post({
				url   	: "/store-user/api/v1/checkout/mailFailureTranscation",//NO I18N
				params	: params,
				headers : zsUtils.getCSRFHeader(),
				handler	: function() {
					  var response = JSON.parse(this.responseText);
						var amount_detected_message_container = document.querySelector("[data-zs-label-amount-detected]"); // No I18N
						if(!response && !amount_detected_message_container) {
							return;
						}
						if(response.status_code == 0) {
							var mail_sent_success_message = amount_detected_message_container.getAttribute("data-zs-mail-sent-success-message");
							amount_detected_message_container.innerText = (mail_sent_success_message) ? mail_sent_success_message : "";
						} else {
							var mail_sent_failure_message = amount_detected_message_container.getAttribute("data-zs-mail-sent-failure-message");
							amount_detected_message_container.innerText = (mail_sent_failure_message) ? mail_sent_failure_message : "";
						}
				}
		});
	}
	
	function _dispatch(event, data) {
		$E.dispatch(document, event, data);
	}

    function bindCustomFieldDateElement(context) {
		var dateIconElements = context.querySelectorAll("[data-element-id=date]"); //NO I18N
		if(dateIconElements.length > 0 && typeof datepickerJS == "undefined") {
			var div = document.createElement("div"); // No I18N
			div.setAttribute("data-zs-app", "datepicker_app"); // No I18N
			zsApp.init(div);
		}

		var dateInputs = context.querySelectorAll('[data-zs-app="datepicker_app"]'); //NO I18N
		dateInputs.forEach(function(dateInput) {
			$E.bind(dateInput, "click", function(event) {
                var iconElement = $D.get('[data-element-id="date"]', event.currentTarget.parentNode);
                initiateCustomFieldsDatePicker(iconElement, event.currentTarget.parentNode, event.currentTarget)
			});
		})
		
		dateIconElements.forEach( function(dateElement) {
			$E.bind(dateElement, "click", function(event) {
				initiateCustomFieldsDatePicker(event.currentTarget, event.currentTarget.parentNode);
			}); 
		});


        custom_field.uploadDownloadAttachmentFields(context);

	}

	function initiateCustomFieldsDatePicker(icon, context, dateInput) {
		if(!dateInput) {
			dateInput = $D.get('[data-field-type="date"]', context);
		}
		//for remove error message
		dateInput && $E.fireEvent(dateInput, "change") //NO I18N

		datepickerJS && datepickerJS.init(icon,'date', context, 'data-custom-fields-datepicker'); //NO I18N
	}

	function getPaymentStatus(){
        var params = {};
        var href = location.href;
        var url_split = href.split('/');
        var url_param_split = (url_split) ? url_split[url_split.length-1].split('?') : "";
        params.checkout_id = (url_param_split) ? url_param_split[0] : "";
        $X.get({
            url: '/store-user/api/v1/checkout/transactionStatus', // No I18N
            params	: params,
            headers : zsUtils.getCSRFHeader(),
            handler: function(args) {
                var res = JSON.parse(this.responseText);
                if(res.status_code == 0) {
                    location.reload();
                }
            }
        });

    }
	
	function checkPaymentStatus(){
		if (window.zs_view == 'payment-status') {
			if(window.transaction_status && window.transaction_status == "pending"){ //NO I18N
			    var counter = 0;
                var looper = setInterval(function(){
                    counter++;
                    getPaymentStatus();
                    if (counter >= 60){
                        clearInterval(looper);
                    }

                }, 5000);
			}
		}
	}

	function cartSubTotal() {
		$X.get({
			url: "/storefront/api/v1/cart",// No I18N
			handler: function() {
			  var res = JSON.parse(this.responseText);
			  if(!res || res.status_code!=0) {
				return;
			  }
			  var res_payload = res.payload;
			  var item_count = res_payload.count || "0";
			  var sub_total = res_payload.sub_total_formatted || "";
			//   document.querySelector("[data-zs-cart-itemcount]").innerText = item_count;
			//   document.querySelector("[data-zs-cart-subtotal]").innerText = sub_total;
			  var cartItemCount = document.querySelectorAll("[data-zs-cart-itemcount]")// No I18N
			  var cartSubTotal = document.querySelectorAll("[data-zs-cart-subtotal]")// No I18N
			  for (var i = 0; i < cartItemCount.length; i++ ){
			  	cartItemCount[i].innerText = item_count;
			  }
			  for (var i = 0; i < cartSubTotal.length; i++ ){
			  	cartSubTotal[i].innerText = sub_total;
			  }
			  var amt_saved = parseFloat(res.payload.total_amtsaved);
			  var saved_amount_container = document.querySelector("[data-zs-savedamount-container]"); // No I18N
			  if(amt_saved != 0){
				var savedAmount = res_payload.total_amtsaved_formatted;
				if(saved_amount_container) {
				    saved_amount_container.style.display = "";
				}
                var saved_amount = document.querySelector("[data-zs-savedamount]"); // No I18N
                if(saved_amount) {
                    saved_amount.innerText = savedAmount;
                }
			  } else {
				if(saved_amount_container) {
				    saved_amount_container.style.display = "none";
				}
			  }
			} 
		})

	}

	return {
		init: init,
		productQuickLookAddToCart: productQuickLookAddToCart,
		submitSearchQuery   	 : submitSearchQuery,
		mailMerchantAboutFailureTransaction : mailMerchantAboutFailureTransaction,
		bulk : bulkAddProductToCart,
		update: _updateProductInCart,
		delete: _deleteProductInCart,
		pushProductPageViewForAnalytics: pushProductPageViewForAnalytics,
		pushViewContentEventForPixel : pushViewContentEventForPixel,
		cartSubTotal : cartSubTotal,
		getParamValue : getUrlParam
	}
})();

zsUtils.onDocumentReady(cart.init);
