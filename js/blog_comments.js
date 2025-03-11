/*$Id$*/
var blog_comments = (function() {
    return {
        init: function( appCont ) {
        	var count_elements = appCont.querySelectorAll('span[data-post-id]');//NO I18N
        	var resource_ids = [];
        	for(var value of count_elements.values()) { 
   				resource_ids.push(value.getAttribute('data-post-id'));
			}

			var params = {};
			params.resource_ids = resource_ids.join();

			$X.get({
			    url     : "/siteapps/commentbox/commentscount",//NO I18N
				params  : params,
				handler : getCountsHandler,
				args	: { count_elements : count_elements }
			});
        }
    };

    function getCountsHandler (args) {
    	var response = JSON.parse(this.responseText);
    	if(response.status_code == '0') {
    		var count_elements = args.count_elements;
    		var count_map = response.commentbox_comments_count;
    		for (var value of count_elements.values()) {
    			var post_id = value.getAttribute('data-post-id');
    			var count = count_map[post_id];
    			value.innerHTML = count;
    		}
    	}
    }

})();
