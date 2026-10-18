let availableUpdate=null,downloadedUpdate=null,updateBusy=false;
function setUpdateBusy(busy,label){
 updateBusy=busy;$('check-update').disabled=busy;$('download-update').disabled=busy;$('open-update-folder').disabled=busy;$('install-update').disabled=busy;$('close-update-dialog').disabled=busy;
 $('update-status').setAttribute('aria-busy',String(busy));
 if(label)$('update-status').textContent=label;
}
async function checkUpdates(){
 if(updateBusy)return;
 availableUpdate=null;downloadedUpdate=null;$('download-update').hidden=true;$('open-update-folder').hidden=true;$('install-update').hidden=true;$('update-notes').textContent='';
 setUpdateBusy(true,'Checking GitHub Releases...');
 try{
  const result=await rpc('check_update');$('app-version').textContent='Version '+result.current;
  $('update-current').textContent='Installed: '+result.current;
  $('settings-menu-button').classList.toggle('update-available',result.status==='available');
  if(result.status==='available'){
   availableUpdate=result;$('update-status').textContent='Version '+result.latest+' is available.';
   $('update-notes').textContent=result.notes||'No release notes provided.';$('download-update').hidden=false;
  }else if(result.status==='up_to_date')$('update-status').textContent='You are using the latest published version.';
  else if(result.status==='missing_asset')$('update-status').textContent='Version '+result.latest+' has no Windows x64 download yet.';
  else $('update-status').textContent='No releases have been published yet.';
 }catch(e){$('update-status').textContent='Could not check for updates: '+e.message;}
 finally{setUpdateBusy(false);}
}
async function downloadUpdate(){
 if(updateBusy||!availableUpdate)return;
 setUpdateBusy(true,'Downloading and verifying update...');
 try{
  downloadedUpdate=await rpc('download_update',{version:availableUpdate.latest});
  $('update-status').textContent='Download verified. Choose Install & Restart to update. Your saved settings will remain.';
  $('update-notes').textContent=downloadedUpdate.path;$('download-update').hidden=true;$('open-update-folder').hidden=false;$('install-update').hidden=false;
 }catch(e){$('update-status').textContent='Update download failed: '+e.message;}
 finally{setUpdateBusy(false);}
}
$('check-update').onclick=()=>{$('settings-menu').hidePopover();$('update-dialog').showModal();checkUpdates();};
$('download-update').onclick=downloadUpdate;
$('open-update-folder').onclick=async()=>{if(!downloadedUpdate)return;try{await rpc('open_update_folder',{version:downloadedUpdate.version});}catch(e){$('update-status').textContent=e.message;}};
$('close-update-dialog').onclick=()=>{$('update-dialog').close();$('settings-menu-button').focus();};
setTimeout(checkUpdates,1500);

async function installUpdate(){
 if(updateBusy||!downloadedUpdate)return;
 setUpdateBusy(true,'Verifying update and preparing to restart...');
 try{await rpc('install_update',{version:downloadedUpdate.version});}
 catch(e){$('update-status').textContent='Could not install update: '+e.message;setUpdateBusy(false);}
}
$('install-update').onclick=installUpdate;
$('update-dialog').addEventListener('cancel',event=>{if(updateBusy)event.preventDefault();});
