/*$Id$*/
var Disqus = (function() {
	return {
		init: function( appCont ) {
			var disqusCont = document.createElement('div');
			disqusCont.id  = 'disqus_thread';
			var siteName = appCont.getAttribute( 'data-sitename' );
			var disqusScript = document.createElement('script');
			disqusScript.innerHTML = '(function() {'+
			    'var d = document, s = d.createElement("script");'+
			    's.src = "//'+ siteName +'.disqus.com/embed.js";'+
			    's.setAttribute("data-timestamp", +new Date());'+
			    '(d.head || d.body).appendChild(s);'+ //NO I18N
			'})();';
			
			appCont.appendChild(disqusCont);
			appCont.appendChild(disqusScript);
		}
	};

})();
