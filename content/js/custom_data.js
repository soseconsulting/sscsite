/*$Id$*/
var custom_data = (function() {

    var is_registered_customer = -1;
    var is_customer_pricebook_active = -1;

    function fetchPortalUser(callback) {
        if(is_registered_customer != -1) {
            if(is_registered_customer == 1) {
                isCustomerPriceAssociated(callback);
            } else {return;}
        }
        is_registered_customer = 0; //false
		if(window.is_portal_site) {
			$X.get({
	        	url     : '/portaluser/getCurrentPortalUser',//NO I18N
	        	handler : function() {
                    var portal_user_resp_obj = JSON.parse(this.responseText).current_user;
                    var disp_name = portal_user_resp_obj.user;
                    if(disp_name != "null"){
                        is_registered_customer = 1; //true
                        isCustomerPriceAssociated(callback);
                    }
                }
	    	});
		}
	}

	function isCustomerPriceAssociated(callback) {
        if(is_customer_pricebook_active != -1) {
            if(is_customer_pricebook_active == 1) {
                callback({});
            } else {return;}
        }
	    is_customer_pricebook_active = 0; //false

        $X.get({
            url 	: "/portaluser/userProfile", //NO I18N
            handler : function(){
                var response = JSON.parse(this.responseText);
                var is_pricebook_active = false;
                if(response.payload && response.payload.contacts_zos_response && response.payload.contacts_zos_response.contact) {
                    is_pricebook_active = response.payload.contacts_zos_response.contact.is_pricebook_active;
                }
                if(is_pricebook_active) {
                    is_customer_pricebook_active = 1; //true
                    callback({});
                }
            }
        });
	}

	function getCustomDataForEcommerceResource() {
        var callback = getCustomDataForCustomerPrice;
        fetchPortalUser(callback);
	}

	function getRecommendedProductIds() {
        var callback = setRecommendedProductsWithCustomerPrice;
        fetchPortalUser(callback);
	}

	function getQuickLookProductPriceForCustomer() {
        var callback = setQuickLookProductPriceForCustomer;
        fetchPortalUser(callback);
	}

  	function setQuickLookProductPriceForCustomer() {
	    var quick_look_container = document.getElementById('product_quick_look');// No I18N
	    var quick_look_product_conatiner = quick_look_container.querySelector("[data-zs-product-id]"); // No I18N
	    var product_id = quick_look_product_conatiner.getAttribute("data-zs-product-id");
        getProductCustomDataForCustomerPrice(product_id, quick_look_product_conatiner);
	}

  	function setRecommendedProductsWithCustomerPrice() {
		var recommended_products_container = document.querySelector("[data-zs-recommended-products]"); // No I18N
		var recommended_products = recommended_products_container.querySelectorAll("[data-zs-product-id]"); // No I18N
		var product_ids = "";
		for(var i = 0; i < recommended_products.length; i++) {
		var product_id = recommended_products[i].getAttribute("data-zs-product-id");
		if(product_ids != "") {
		product_ids = product_ids + ",";
		}
		product_ids = product_ids + product_id;
		}
		getProductsListCustomDataForCustomerPrice(product_ids);
  	}

  	function getCustomDataForCustomerPrice() {
	    // Types for custom data
	    var PRODUCT_TYPE = 0;
	    var CATEGORY_TYPE = 1;
	    var COLLECTION_TYPE = 2;
	    var PRODUCTS_LIST_TYPE = 3;
	    var COLLECTION_WIDGET_TYPE = 4;
		var CATEGORY_WIDGET_TYPE = 5;

	    // Ecommerce resource pages
	    var PRODUCT_PAGE = "product";	// No I18N
	    var CATEGORY_PAGE = "category";	// No I18N
	    var COLLECTION_PAGE = "collection";	// No I18N
	    var SEARCH_PRODUCTS_PAGE = "search-products";	// No I18N
	    var CART_PAGE = "cart";	// No I18N
	    var CHECKOUT_PAGE = "checkout";	// No I18N
	    var PAYMENT_STATUS_PAGE  = "payment-status";	// No I18N

	    var current_page = window.zs_view;

	    switch(current_page) {
			case PRODUCT_PAGE: var product = window.zs_product;
			                  var product_id = product.product_id;
			                  getProductCustomDataForCustomerPrice(product_id);
			                  break;
			case CATEGORY_PAGE:	var category = window.zs_category;
			                    var category_id = category.category_id;
			                    getCategoryCustomDataForCustomerPrice(category_id, CATEGORY_TYPE);
			                    break;
			case COLLECTION_PAGE: 	var collection = window.zs_collection;
			                      var collection_id = collection.id;
			                      getCollectionCustomDataForCustomerPrice(collection_id, COLLECTION_TYPE);
			                      break;
			case SEARCH_PRODUCTS_PAGE: break;
			case CART_PAGE: break;
			case CHECKOUT_PAGE: break;
			case PAYMENT_STATUS_PAGE: break;
			default: getWidgetCustomDataForCustomerPrice(COLLECTION_WIDGET_TYPE, CATEGORY_WIDGET_TYPE, PRODUCTS_LIST_TYPE);
	    }
  	}

  	function setCustomerPriceForProduct(product, target_container, product_container) {
	    var variants = product.variants;
	    var product_id = product.product_id;

	    if(!product_container) {
	    	product_container = target_container.querySelector("[data-zs-product-id='" + product_id + "']");	// No I18N
	    	if(!product_container){
	    		return;
	    	}
	    }
	    var SELLING_PRICE_ATTRIBUTE = product_container.querySelector("[data-zs-original-price]") ? "data-zs-original-price" : "data-zs-selling-price"; // No I18N

	    if(product.has_variant_price) {
			var starts_with = product.starts_with;
			var starts_with_price_formatted = product.starts_with_price_formatted;
			var ends_with = product.ends_with;
			var ends_with_price_formatted = product.ends_with_price_formatted;
			var placeholder_variant_pricing_container = product_container.querySelector("[data-zs-pricings][data-zs-variant-id='-1']");	// No I18N

			var selling_price_conatiner = placeholder_variant_pricing_container ? placeholder_variant_pricing_container.querySelectorAll("["+ SELLING_PRICE_ATTRIBUTE +"]") : product_container.querySelectorAll("["+ SELLING_PRICE_ATTRIBUTE +"]");	// No I18N
      		var j=0;
	        while(j < selling_price_conatiner.length) {
	          var starts_with_price_conatiner = selling_price_conatiner[j];
	          var ends_with_price_conatiner = selling_price_conatiner[j+1];
	          if(starts_with_price_conatiner){
		         starts_with_price_conatiner.innerText = starts_with_price_formatted;
		         starts_with_price_conatiner.setAttribute(SELLING_PRICE_ATTRIBUTE, starts_with);
	      	  }if(ends_with_price_conatiner){
	          	 ends_with_price_conatiner.innerText = ends_with_price_formatted;
	          	 ends_with_price_conatiner.setAttribute(SELLING_PRICE_ATTRIBUTE, ends_with);
	          }j = j + 2;
	        }
	    } else {
			var selling_price = variants[0].selling_price;
			var selling_price_formatted = variants[0].selling_price_formatted;
			var variant_id = variants[0].variant_id;
			var variant_pricing_container = product_container.querySelector("[data-zs-pricings][data-zs-variant-id='" + variant_id + "']");	// No I18N
			var selling_price_conatiner = variant_pricing_container ? variant_pricing_container.querySelectorAll("["+ SELLING_PRICE_ATTRIBUTE +"]") : product_container.querySelectorAll("["+ SELLING_PRICE_ATTRIBUTE +"]");	// No I18N
	      	for(var j = 0; j < selling_price_conatiner.length; j++) {
	        	selling_price_conatiner[j].innerText = selling_price_formatted;
				selling_price_conatiner[j].setAttribute(SELLING_PRICE_ATTRIBUTE, selling_price);
	      	}

			/* For products with variants but doesn't have variable price */
			if(product.has_variants){
				var placeholder_variant_pricing_container = product_container.querySelector("[data-zs-pricings][data-zs-variant-id='-1']");	// No I18N
				var placeholder_selling_price_conatiner = placeholder_variant_pricing_container ? placeholder_variant_pricing_container.querySelector("["+ SELLING_PRICE_ATTRIBUTE +"]") : product_container.querySelector("["+ SELLING_PRICE_ATTRIBUTE +"]");	// No I18N
				placeholder_selling_price_conatiner.innerText = selling_price_formatted;
				placeholder_selling_price_conatiner.setAttribute(SELLING_PRICE_ATTRIBUTE, selling_price);
			}
		}
		if(product.has_variants){
			for(var i = 0; i < variants.length; i++) {
			  var selling_price = variants[i].selling_price;
			  var selling_price_formatted = variants[i].selling_price_formatted;
			  var variant_id = variants[i].variant_id;
			  var variant_pricing_container = product_container.querySelector("[data-zs-pricings][data-zs-variant-id='" + variant_id + "']");	// No I18N
			  if(variant_pricing_container){
			      var selling_price_conatiner = variant_pricing_container.querySelector("["+ SELLING_PRICE_ATTRIBUTE +"]");	// No I18N
			      selling_price_conatiner.innerText = selling_price_formatted;
			      selling_price_conatiner.setAttribute(SELLING_PRICE_ATTRIBUTE, selling_price);
			  }
			}
		}
  	}

  	function customDataHandler(args){
  		var response = JSON.parse(this.responseText);
		 if(response.status_code == 0) {
		 	var payload = response.payload;
		 	if(args.type==0){
				var product = payload.product;
				var gen_content = payload.product_price_range_content;
				var target_container = document;
	 			setCustomerPriceForProduct(product, target_container, args.container);
	 			setCustomerPriceRanges(product,target_container,gen_content);
 			}else if(args.type==1 || args.type==5){
				var category = payload.category;
				var category_id = category.category_id;
				var products = category.products;
				var group_containers;
				var category_containers = document.querySelectorAll("[data-zs-category-id='" + category_id + "']");	// No I18N
				if(category_containers.length > 0) {
				    group_containers = category_containers;
				} else {
				    group_containers = [];
				    group_containers.push(document);
				}
				for(var i = 0; i < group_containers.length; i++){
					for(var j = 0; j < products.length; j++) {
						var product = products[j];
						var group_container = group_containers[i];
						var target_container = group_container ? group_container : document;
						setCustomerPriceForProduct(product, target_container);
					}
				}
 			}else if(args.type==2 || args.type==4){
				var collection = payload.collection;
				var collection_id = collection.collection_id;
				var products = collection.products;
				var group_containers;
				var collection_containers = document.querySelectorAll("[data-zs-collection-id='" + collection_id + "']");	// No I18N
				if(collection_containers.length > 0) {
				    group_containers = collection_containers;
				} else {
				    group_containers = [];
				    group_containers.push(document);
				}
		    	for(var i = 0; i < group_containers.length; i++){
					for(var j = 0; j < products.length; j++) {
						var product = products[j];
						var product_id = product.product_id;
						var group_container = group_containers[i];
						var target_container = group_container ? group_container : document;	// No I18N
           				setCustomerPriceForProduct(product, target_container);
					}
				}
 			}else if(args.type==3){
				var products = payload.products;
     			var target_container = document;
				for(var j = 0; j < products.length; j++) {
					var product = products[j];
					var elements = document.querySelectorAll("[data-zs-product-id='" + product.product_id + "']");	// No I18N
					if(elements.length > 1){
						for(var i = 0; i < elements.length; i++){
							setCustomerPriceForProduct(product, target_container, elements[i]);
						}
					}else{
						setCustomerPriceForProduct(product, target_container, elements[0]);
					}
				}
 			}
 		}
 		$E.dispatch(document.body, 'pricelist:afterLoad', {}); //NO I18N
  	}

  	function getProductCustomDataForCustomerPrice(id, product_container) {
		var params = {};
		params.id = id;
		params.type = 0;
		$X.get({
			 url   	: "/storefront/api/v1/getCustomData/customerPrice",//NO I18N
			 params	: params,
			 headers : zsUtils.getCSRFHeader(),
			 args    : {"type": params.type, "container": product_container},//No I18N
			 handler : customDataHandler
		});
	}

	function setCustomerPriceRanges(product,target_container,gen_content) {
		var price_range_container = target_container.querySelectorAll("[data-zs-pricelist]"); //NO I18N
		for(var i = 0; i < price_range_container.length; i++){
			if(!product.is_product_price_brackets_available){
				price_range_container[i].innerHTML = "";
			}else{
				price_range_container[i].innerHTML = gen_content;
			}
		}
	}

	function getCategoryCustomDataForCustomerPrice(id, type) {
		var params = {};
		params.id = id;
		params.type = type ? type : 1;
		$X.get({
			 url   	: "/storefront/api/v1/getCustomData/customerPrice",//NO I18N
			 params	: params,
			 headers : zsUtils.getCSRFHeader(),
			 args    : {"type": params.type},//No I18N
			 handler	: customDataHandler
		});
	}

	function getCollectionCustomDataForCustomerPrice(id, type) {
		var params = {};
		params.id = id;
		params.type = type ? type : 2;
		$X.get({
			 url   	: "/storefront/api/v1/getCustomData/customerPrice",//NO I18N
			 params	: params,
			 headers : zsUtils.getCSRFHeader(),
			 args    : {"type": params.type},//No I18N
			 handler	: customDataHandler
		});
	}

	function getProductsListCustomDataForCustomerPrice(ids, type) {
		var params = {};
		params.ids = ids;
		params.type = type ? type : 3;
		$X.get({
			 url   	: "/storefront/api/v1/getCustomData/customerPrice",//NO I18N
			 params	: params,
			 headers : zsUtils.getCSRFHeader(),
			 args    : {"type": params.type},//No I18N
			 handler	: customDataHandler
		});
	}

	function getWidgetCustomDataForCustomerPrice(collection_widget_type, category_widget_type, products_list_type) {
		var i, chunk_size = 20;
		var collection_nodes = document.querySelectorAll("[data-element-type=storecollection]");	//NO I18N
		collection_nodes.forEach(function (collection_node){
			var collection_id = collection_node.getAttribute("data-zs-collection-id");	//NO I18N
			getCollectionCustomDataForCustomerPrice(collection_id, collection_widget_type);
		})
		var category_nodes = document.querySelectorAll("[data-element-type=storecategory]");	//NO I18N
		category_nodes.forEach(function (category_node){
			var category_id = category_node.getAttribute("data-zs-category-id");	//NO I18N
			getCategoryCustomDataForCustomerPrice(category_id, category_widget_type);
		})
		var product_containers = document.querySelectorAll("[data-element-type=storeproduct]");	//NO I18N
		if(product_containers.length != 0){
			var product_ids = [];
			product_containers.forEach(function(product_container){
				var product_node = product_container.querySelector("[data-zs-product-id]");	//NO I18N
				var product_id = product_node ? product_node.getAttribute("data-zs-product-id") : null;	//NO I18N
				if(product_node){
					product_ids.push(product_id);
				}
			});
			if(product_ids.length > chunk_size){
				for(i=0;i<product_ids.length;i+=chunk_size){
					var formatted_product_ids = product_ids.slice(i,i+chunk_size);
					getProductsListCustomDataForCustomerPrice(formatted_product_ids, products_list_type);
				}
			}else{
				getProductsListCustomDataForCustomerPrice(product_ids, products_list_type);
			}
		}
	}

	return {
		getCustomDataForEcommerceResource: getCustomDataForEcommerceResource,
        getRecommendedProductIds: getRecommendedProductIds,
        getQuickLookProductPrice: getQuickLookProductPriceForCustomer,
        getProductsListCustomDataForCustomerPrice: getProductsListCustomDataForCustomerPrice
	}

})();
