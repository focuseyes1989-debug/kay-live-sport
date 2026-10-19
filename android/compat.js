/* Runs before all app scripts, including on Android TV's WebView 81. */
(function(){
 window.kayAndroid=true;
 if(!String.prototype.replaceAll)Object.defineProperty(String.prototype,'replaceAll',{value:function(search,replacement){if(search instanceof RegExp)return this.replace(search,replacement);return this.split(String(search)).join(String(replacement));},configurable:true,writable:true});
 function replaceChildren(){var fragment=document.createDocumentFragment();for(var i=0;i<arguments.length;i++){var item=arguments[i];fragment.appendChild(item instanceof Node?item:document.createTextNode(String(item)));}while(this.firstChild)this.removeChild(this.firstChild);this.appendChild(fragment);}
 [Element.prototype,Document.prototype,DocumentFragment.prototype].forEach(function(proto){if(!proto.replaceChildren)Object.defineProperty(proto,'replaceChildren',{value:replaceChildren,configurable:true,writable:true});});
 if(!Object.hasOwn)Object.hasOwn=function(object,key){return Object.prototype.hasOwnProperty.call(object,key);};
 function viewport(){var root=document.documentElement;root.style.setProperty('--app-height',window.innerHeight+'px');root.style.setProperty('--app-width',window.innerWidth+'px');}
 viewport();window.addEventListener('resize',viewport);if(window.visualViewport)window.visualViewport.addEventListener('resize',viewport);
 document.addEventListener('DOMContentLoaded',function(){var box=document.createElement('div');box.style.cssText='position:absolute;visibility:hidden;display:flex;flex-direction:column;row-gap:1px';for(var i=0;i<2;i++){var item=document.createElement('div');item.style.height='1px';box.appendChild(item);}document.body.appendChild(box);document.documentElement.classList.toggle('kay-no-flex-gap',box.scrollHeight!==3);box.remove();});
 window.kayPopoverOpen=function(el){if(!el)return false;if(el.classList.contains('kay-popover-open'))return true;try{return el.matches(':popover-open');}catch(error){return false;}};
 if(!HTMLElement.prototype.showPopover){
  document.documentElement.classList.add('kay-legacy-popover');
  function toggleEvent(el,open){var event=new Event('toggle');event.newState=open?'open':'closed';el.dispatchEvent(event);}
  HTMLElement.prototype.showPopover=function(){this.classList.add('kay-popover-open');toggleEvent(this,true);};
  HTMLElement.prototype.hidePopover=function(){this.classList.remove('kay-popover-open');toggleEvent(this,false);};
  document.addEventListener('click',function(event){var target=event.target.closest('[popovertarget]'),menu=document.getElementById('settings-menu');if(target){event.preventDefault();var pop=document.getElementById(target.getAttribute('popovertarget'));if(pop)window.kayPopoverOpen(pop)?pop.hidePopover():pop.showPopover();}else if(menu&&window.kayPopoverOpen(menu)&&!menu.contains(event.target))menu.hidePopover();});
  document.addEventListener('keydown',function(event){var menu=document.getElementById('settings-menu');if(event.key==='Escape'&&menu&&window.kayPopoverOpen(menu)){menu.hidePopover();document.getElementById('settings-menu-button').focus();event.preventDefault();}});
 }
})();
