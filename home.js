'use strict';
(()=>{
 for(const button of document.querySelectorAll('[data-home-dialog]'))button.onclick=()=>document.getElementById(button.dataset.homeDialog).showModal();
 for(const button of document.querySelectorAll('[data-close-dialog]'))button.onclick=()=>button.closest('dialog').close();
 const settings=document.getElementById('home-feel-settings');
 if(settings&&globalThis.MahjongFeel)MahjongFeel.mount(settings);
})();
