
class PremiumHelper {
    constructor(){
        global.explorer.prependFilter(this.hook.bind(this))
    }
    open(){
        global.open('https://megacubo.tv/online/'+ global.lang.locale + '/')
    }
    entry(){
        if(!global.ui.listenerCount('premium-helper')){
            global.ui.on('premium-helper', () => this.open())
        }
        return {
            name: global.lang.ENABLE_PREMIUM_FEATURES,
            type: 'action',
            fa: 'fas fa-rocket',
            action: () => {
                global.ui.emit('dialog', [
                    {template: 'question', text: global.lang.ENABLE_PREMIUM_FEATURES, fa: 'fas fa-rocket'},
                    {template: 'message', text: global.lang.ENABLE_PREMIUM_MESSAGE},
                    {template: 'option', id: 'ok', fa: 'fas fa-check-circle', text: 'OK'}
                ], 'premium-helper', 'retry') 
            }
        }
    }
    hook(entries, path){
        return new Promise((resolve, reject) => {
            if(path == global.lang.OPTIONS){
                entries.splice(entries.length - 1, 0, this.entry())
            }
            resolve(entries)
        })
    }
}

if(require('fs').existsSync(global.APPDIR + '/modules/premium')){
	require('bytenode')
    PremiumHelper = require(global.APPDIR + '/modules/premium/premium')
}

module.exports = PremiumHelper

