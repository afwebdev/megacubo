class ClassesHandler {
	constructor(){}
	hasClass(element, cls) {
		return !!element.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'))
	}
	addClass(element, cls) {
		if (!this.hasClass(element, cls)) element.className += " "+ cls
	}
	removeClass(element, cls) {
		if (this.hasClass(element, cls)) {
			var reg = new RegExp('(\\s|^)'+ cls +'(\\s|$)')
			element.className = element.className.replace(reg, ' ')
		}
	}
}

class WindowManager extends ClassesHandler {
	constructor(){
		super()
		this.win = nw.Window.get()
		this.leftWindowDiff = 0
		this.miniPlayerActive = false
		this.initialSize = [this.win.width, this.win.height]
		this.miniPlayerRightMargin = 18
		this.inFullScreen = false
		this.nwcf = require('nw-custom-frame')
		this.nwcf.attach(window, {
			"icon": "assets/images/default_icon_white.png",
			"size": 30, // You can specify the size in em,rem, etc...
			"frameIconSize": 21 // You can specify the size in em,rem, etc...
		})
		this.addAction('miniplayer-on', () => {
			this.win.setAlwaysOnTop(true);
			this.win.setShowInTaskbar(false);
			this.fixMaximizeButton();
		})
		this.addAction('miniplayer-off', () => {
			this.win.setAlwaysOnTop(false);
			this.win.setShowInTaskbar(true);
			this.fixMaximizeButton();
		})
		this.waitApp(() => {
			this.app.css(' :root { --frameless-window-titlebar-height: 30px; } ', 'frameless-window')
			this.app.streamer.on('fullscreenchange', fs => {
				console.warn('FULLSCREEN CHANGE', fs)
				this.inFullScreen = fs
				this.updateTitlebarHeight()
			})
			this.app.addEventListener('idle-start', this.idleChange.bind(this))
			this.app.addEventListener('idle-stop', this.idleChange.bind(this))
			this.app.streamer.on('state', this.idleChange.bind(this))
			//this.app.document.documentElement.className = (this.app.document.documentElement.className || '') + ' frameless-window'
			this.app.restart = this.restart.bind(this)
			this.patch()
			this.app.document.body.focus()
		})
	}
	restart(){
		console.log('restartApp')  
		this.win.hide()
		process.on("exit", function () {
			require("child_process").spawn(process.execPath, nw.App.argv, {
				shell: false,
				detached: true
			})
		})
		process.exit()
	}
	idleChange(){
		setTimeout(() => {
			let idle = this.app.isIdle
			if(idle){			
				if(!this.hasClass(document.body, 'idle') && this.app.streamer.state == 'playing'){
					this.addClass(document.body, 'idle')
				}
			} else {		
				if(this.hasClass(document.body, 'idle')){
					this.removeClass(document.body, 'idle')
				}
			}
			this.updateTitlebarHeight()
		}, 250)
	}
	updateTitlebarHeight(){
		let idle = this.app.isIdle
		if (this.inFullScreen || (idle && this.app.streamer.state.indexOf('video-playing') != -1)) {
			this.app.css(' :root { --frameless-window-titlebar-height: 0px; } ', 'frameless-window')
		} else {
			this.app.css(' :root { --frameless-window-titlebar-height: 30px; } ', 'frameless-window')
		}
	}
	waitApp(fn){
		if(this.waitAppTimer){
			clearTimeout(this.waitAppTimer)
		}
		if(!this.container){
			this.container = document.querySelector('iframe').contentWindow
		}
		if(this.container.document.querySelector('iframe') && this.container.document.querySelector('iframe').contentWindow){
			this.app = this.container.document.querySelector('iframe').contentWindow
			if(this.app.streamer){
				fn()
			} else {
				this.app.addEventListener('appready', fn)
			}
		} else if(!this.container){
			document.querySelector('iframe').addEventListener('load', () => {
				this.waitApp(fn)
			})
		} else {
			this.waitAppTimer = setTimeout(this.waitApp.bind(this, fn), 250)
		}
	}
	addAction(name, fn, useCapture){
		document.addEventListener(name, fn, useCapture)
	}
	doAction(name){
		var event = new CustomEvent(name)
		document.dispatchEvent(event)
	}
	isPlaying(){
		return this.app.streamer.state != ''
	}
	osd(){
		if(!this._osd){
			this._osd = document.querySelector('iframe').contentWindow.document.querySelector('iframe').contentWindow.osd
		}
		return this._osd
	}
	isFullScreen(){
		return (this.win && this.win.width >= screen.width && this.win.height >= screen.height) || !!(this.win.isKioskMode || this.win.isFulscreen)
	}
	setFullScreen(enter){
		console.warn('setFullscreen()', enter);
		if(!enter){
			this.inFullScreen = this.miniPlayerActive = false;
			this.doAction('miniplayer-off');
			this.win.leaveKioskMode(); // bugfix, was remembering to enter fullscreen irreversibly
			this.win.leaveFullscreen();
			console.log('FSOUT');
			this.fixMaximizeButton()
			console.log('FSOUT');
		} else {
			this.inFullScreen = true;
			this.win.enterFullscreen()
			this.osd().show(this.app.lang.ESC_TO_EXIT, 'fas fa-info-circle', 'esc-to-exit', 'normal')
		}
		var f = () => {
			console.log('FSOUT1');
			var _fs = this.isFullScreen();
			this.win.setAlwaysOnTop(_fs || miniPlayerActive);
			this.win.requestAttention(_fs);
			if(_fs) {
				this.win.blur();
				this.win.focus()
			}
			console.log('FSOUT1OK');
		}
		setTimeout(f, 500);
		setTimeout(f, 1000);
		setTimeout(f, 2000);
		this.win.show()
	}
	restore(){
		console.warn('restore()');
		if(this.isFullScreen()){
			this.setFullScreen(false)
		} else if(this.miniPlayerActive) {
			this.leaveMiniPlayer()
		} else {
			this.win.width = this.initialSize[0]
			this.win.height = this.initialSize[1]
			this.centralizeWindow(this.win.width, this.win.height)
		}
		this.showMaximizeButton()
	}
	centralizeWindow(w, h){
		console.warn('centralizeWindow()');
		var x = Math.round((screen.availWidth - (w || window.outerWidth)) / 2);
		var y = Math.round((screen.availHeight - (h || window.outerHeight)) / 2);
		//window.moveTo(x, y)
		this.win.x = x;
		this.win.y = y;
		console.log('POS', x, y);
	}
	getVideoRatio(){
		const v = document.querySelector('iframe').contentWindow.document.querySelector('video')
		return v && v.offsetWidth ? (v.offsetWidth / v.offsetHeight) : (16 / 9)
	}
	enterMiniPlayer(){
		this.win.hide()
		setTimeout(() => { 
			this.miniPlayerActive = true;  
			this.doAction('miniplayer-on');
			var h = screen.availHeight / 3, w = this.getVideoRatio() * h;
			window.resizeTo(w, h);
			window.moveTo(screen.availWidth - w - this.miniPlayerRightMargin, screen.availWidth - h)
		}, 100)
		setTimeout(() => { 
			this.win.show() 
		}, 250)
	}
	prepareLeaveMiniPlayer(){
		this.miniPlayerActive = false;  
		this.win.setAlwaysOnTop(false)
		this.doAction('miniplayer-off')
	}
	leaveMiniPlayer(){
		this.prepareLeaveMiniPlayer()
		this.win.width = this.initialSize[0]
		this.win.height = this.initialSize[1]
		this.centralizeWindow(this.win.width, this.win.height)
	}
	fixMaximizeButton(){
		if(this.isMaximized() || this.miniPlayerActive){
			this.showRestoreButton()
		} else {
			this.showMaximizeButton()
		}
	}
	toggleMiniPlayer(){
		if(this.miniPlayerActive){
			this.leaveMiniPlayer()
		} else {
			this.enterMiniPlayer()
		}
	}
	toggleFullScreen(){
		this.setFullScreen(!this.isFullScreen());
	}
	isMaximized(){
		if(this.win.x > 0 || this.win.y > 0) return false;
		var w = window, widthMargin = 6, heightMargin = 6;
		return (w.outerWidth >= (screen.availWidth - widthMargin) && w.outerHeight >= (screen.availHeight - heightMargin));
	}
	maximize(){
		if(!this.isMaximized()){
			if(!this.miniPlayerActive){
				this.initialSize = [this.win.width, this.win.height]
			}
			this.win.setMaximumSize(0, 0);
			this.win.x = this.win.y = this.leftWindowDiff;
			process.nextTick(() => {
				this.win.width = screen.availWidth + (this.leftWindowDiff * -2);
				this.win.height = screen.availHeight + (this.leftWindowDiff * -2);
				this.win.x = this.win.y = this.leftWindowDiff;
			})
		}
		this.showRestoreButton()
	}
	minimizeWindow(){
		if(this.miniPlayerActive){
			this.prepareLeaveMiniPlayer()
			this.win.hide()
			this.restore()
			setTimeout(() => {
				this.win.show()
				this.win.minimize()
			}, 0)
		} else {
			this.enterMiniPlayer()
		}
	}
	showMaximizeButton(){
		var e = document.querySelector('.nw-cf-maximize');
		if(e){ // at fullscreen out or unminimize the maximize button was disappearing
			e.style.display = 'inline-block';
			document.querySelector('.nw-cf-restore').style.display = 'none';
		}
	}
	showRestoreButton(){
		var e = document.querySelector('.nw-cf-restore');
		if(e){
			e.style.display = 'inline-block';
			document.querySelector('.nw-cf-maximize').style.display = 'none';
		}
	}
	patchButton(sel, fn, label){
		let old_element = document.querySelector(sel), new_element = old_element.cloneNode(true)
		old_element.parentNode.replaceChild(new_element, old_element)
		new_element.addEventListener('click', fn);
		['title', 'aria-label'].forEach(k => new_element.setAttribute(k, label))
	}
	patch(){    
		if(!document.querySelector(".nw-cf-maximize")){
			return setTimeout(this.patch.bind(this), 250)
		}    
		this.patchButton(".nw-cf-maximize", this.maximize.bind(this), this.app.lang.MAXIMIZE)
		this.patchButton(".nw-cf-restore", () => {
			setTimeout(this.fixMaximizeButton.bind(this), 50);
			this.restore()
		}, this.app.lang.RESTORE)
		this.patchButton(".nw-cf-minimize", () => {
			this.minimizeWindow()
		}, this.app.lang.MINIMIZE)
		this.patchButton(".nw-cf-close", () => {
			this.close()
		}, this.app.lang.CLOSE)
		this.patch = () => {}
	}
	forceClose(){
		nw.App.closeAllWindows()
		this.win.close(true)
	}
	close(){
		console.error('nw close()')
		try {
			this.app.exit()
			setTimeout(() => this.forceClose(), 3000)
		} catch(e) {
			this.forceClose()
		}
	}
}
