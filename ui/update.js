const androidUpdater=typeof window!=='undefined' && !!window.kayAndroid;
let updateNotificationsEnabled=true;
try{const saved=JSON.parse(localStorage.getItem('live-sport.update-notifications'));if(typeof saved==='boolean')updateNotificationsEnabled=saved;}catch{}
function initializeUpdateNotificationToggle(){
 const button=$('toggle-update-notifications');
 const update=()=>{button.setAttribute('aria-pressed',String(updateNotificationsEnabled));button.title='Update notifications: '+(updateNotificationsEnabled?'On':'Off');button.setAttribute('aria-label',button.title);};
 button.onclick=()=>{
  updateNotificationsEnabled=!updateNotificationsEnabled;
  try{localStorage.setItem('live-sport.update-notifications',JSON.stringify(updateNotificationsEnabled));}catch{}
  if(!updateNotificationsEnabled)$('update-notification').hidden=true;
  update();
 };
 update();
}
let availableUpdate=null,downloadedUpdate=null,updateBusy=false,updateCancelling=false;
function setUpdateBusy(busy,label){
 updateBusy=busy;$('check-update').disabled=busy;$('download-update').disabled=busy;$('open-update-folder').disabled=busy;$('install-update').disabled=busy;$('close-update-dialog').disabled=busy;
 $('update-status').setAttribute('aria-busy',String(busy));
 if(label)$('update-status').textContent=label;
}
async function checkUpdates(notify=false){
 if(updateBusy)return;
 $('update-download-progress').hidden=true;availableUpdate=null;downloadedUpdate=null;$('download-update').hidden=true;$('open-update-folder').hidden=true;$('install-update').hidden=true;$('update-notes').textContent='';
 setUpdateBusy(true,'Checking GitHub Releases...');
 try{
  const result=await rpc('check_update');$('app-version').textContent='Version '+result.current;
  $('update-current').textContent='Installed: '+result.current;
  $('settings-menu-button').classList.toggle('update-available',result.status==='available');
  if(result.status==='available'){
   availableUpdate=result;$('update-status').textContent='Version '+result.latest+' is available.';
   $('update-notes').textContent=result.notes||'No release notes provided.';$('download-update').hidden=false;
   if(notify&&!$('update-dialog').open)showUpdateNotification(result.latest);
  }else if(result.status==='up_to_date')$('update-status').textContent='You are using the latest published version.';
  else if(result.status==='missing_asset')$('update-status').textContent='Version '+result.latest+(androidUpdater?' has no Android APK download yet.':' has no Windows x64 download yet.');
  else $('update-status').textContent='No releases have been published yet.';
 }catch(e){$('update-status').textContent='Could not check for updates: '+e.message;}
 finally{setUpdateBusy(false);}
}
function updateDownloadProgress(data){
 if(!androidUpdater||!updateBusy||updateCancelling||data.version!==availableUpdate?.latest)return;
 const total=Number(data.total),done=Number(data.downloaded);
 if(!Number.isFinite(total)||total<=0||!Number.isFinite(done)||done<0)return;
 $('cancel-update-download').hidden=data.phase==='verifying';
 const percent=Math.min(100,Math.floor(done/total*100));
 $('update-download-progress').hidden=false;$('update-download-bar').value=percent;
 $('update-download-percent').textContent=percent+'%';
 $('update-download-size').textContent=(done/1048576).toFixed(1)+' MB / '+(total/1048576).toFixed(1)+' MB';
 $('update-status').textContent=data.phase==='verifying'?'Download complete. Verifying APK...':'Downloading APK...';
}
if(typeof window!=='undefined')window.kayUpdateProgress=updateDownloadProgress;
async function downloadUpdate(){
 if(updateBusy||!availableUpdate)return;
 updateCancelling=false;$('cancel-update-download').hidden=!androidUpdater;$('cancel-update-download').disabled=false;$('download-update').hidden=androidUpdater;downloadedUpdate=null;
 setUpdateBusy(true,'Downloading and verifying update...');
 $('update-download-progress').hidden=!androidUpdater;$('update-download-bar').value=0;$('update-download-percent').textContent='0%';$('update-download-size').textContent='Preparing download...';
 try{
  downloadedUpdate=await rpc('download_update',{version:availableUpdate.latest});
  if(androidUpdater){$('update-download-bar').value=100;$('update-download-percent').textContent='100%';}
  $('update-status').textContent=androidUpdater?'APK verified. Tap Install update, then confirm in Android. Your saved settings will remain.':'Download verified. Choose Install & Restart to update. Your saved settings will remain.';
  $('update-notes').textContent=downloadedUpdate.path;$('download-update').hidden=true;$('open-update-folder').hidden=!!androidUpdater;$('install-update').hidden=false;
 }catch(e){$('update-download-progress').hidden=true;$('download-update').hidden=false;$('update-status').textContent=updateCancelling||e.message==='Download cancelled'?'Download cancelled. Tap Download update to resume.':'Update download failed: '+e.message;}
 finally{$('cancel-update-download').hidden=true;updateCancelling=false;setUpdateBusy(false);}
}
function openUpdateDialog(recheck=true){
 $('update-notification').hidden=true;
 $('settings-menu').hidePopover();
 if(!$('update-dialog').open)$('update-dialog').showModal();
 if(recheck)checkUpdates();
}
let updateNotifiedVersion=null;
function showUpdateNotification(version){
 if(!updateNotificationsEnabled||updateNotifiedVersion===version)return;
 updateNotifiedVersion=version;
 $('update-notification-text').textContent='KAY LIVE SPORT '+version+' is available. Click to update.';
 $('update-notification').hidden=false;
 if(typeof playNotificationSound==='function')playNotificationSound();
}
$('check-update').onclick=()=>openUpdateDialog();
$('open-update-notification').onclick=()=>openUpdateDialog(false);
$('dismiss-update-notification').onclick=()=>{$('update-notification').hidden=true;};
$('download-update').onclick=downloadUpdate;
$('cancel-update-download').onclick=async()=>{
 if(!updateBusy||updateCancelling)return;
 updateCancelling=true;$('cancel-update-download').disabled=true;$('update-status').textContent='Cancelling download...';
 try{await rpc('cancel_download_update');}catch(e){updateCancelling=false;$('cancel-update-download').disabled=false;$('update-status').textContent='Could not cancel download: '+e.message;}
};
$('open-update-folder').onclick=async()=>{if(!downloadedUpdate)return;try{await rpc('open_update_folder',{version:downloadedUpdate.version});}catch(e){$('update-status').textContent=e.message;}};
$('close-update-dialog').onclick=()=>{$('update-dialog').close();$('settings-menu-button').focus();};
setTimeout(()=>checkUpdates(true),1500);

async function installUpdate(){
 if(updateBusy||!downloadedUpdate)return;
 setUpdateBusy(true,'Verifying update and preparing to restart...');
 try{const result=await rpc('install_update',{version:downloadedUpdate.version});if(androidUpdater){$('update-status').textContent=result.permissionRequired?'Allow updates from KAY LIVE SPORT in Android settings, return here, then tap Install update again.':'Android installer opened. Confirm Update to keep your settings. After installation, tap Open.';setUpdateBusy(false);}}
 catch(e){$('update-status').textContent='Could not install update: '+e.message;setUpdateBusy(false);}
}
$('install-update').onclick=installUpdate;
$('update-dialog').addEventListener('cancel',event=>{if(updateBusy)event.preventDefault();});

initializeUpdateNotificationToggle();

if(androidUpdater)$('install-update').textContent='Install update';
